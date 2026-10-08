# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Loads a Google Sheet into the bulk GCS structure (step 1 of the bulk)."""

import datetime
import json
import logging
import os
from typing import Any

from google.cloud import storage

from bulk_app import core_adapter
from bulk_app import paths
from bulk_app import security
from bulk_app.services import sheets

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = (
    "image_url",
    "image_metadata",
    "video_output",
    "status",
    "logs",
)
DEFAULT_MAX_ROWS = 100

STATUS_READY = "READY_TO_GENERATE"
STATUS_SKIPPED = "SKIPPED"
STATUS_ERROR = "ERROR"


def get_max_rows() -> int:
  """Max data rows accepted per sheet (env BULK_MAX_ROWS)."""
  try:
    value = int(os.getenv("BULK_MAX_ROWS", str(DEFAULT_MAX_ROWS)))
  except ValueError:
    return DEFAULT_MAX_ROWS
  return value if value > 0 else DEFAULT_MAX_ROWS


class SheetToBulkHandler:
  """Copies each sheet row (seed image + metadata) to GCS."""

  def __init__(
      self, sheets_service: sheets.GoogleSheetsService | None = None
  ) -> None:
    self.sheets_service = sheets_service or sheets.GoogleSheetsService()
    self.bucket = core_adapter.get_bucket()

  def process_sheet_to_bulk(self, sheet_url: str) -> tuple[str, dict[str, int]]:
    """Processes a sheet and creates a bulk operation.

    Required columns: image_url, image_metadata, video_output, status, logs.

    Per row (independent, a failing row does not stop the others):
      * no image_url -> SKIPPED
      * any error -> ERROR (reason appended to the 'logs' cell)
      * otherwise -> READY_TO_GENERATE

    Args:
        sheet_url: A validated Google Sheets URL.

    Returns:
        (bulk_id, rows per status).

    Raises:
        ValueError: If the sheet is empty, too large or misses columns.
    """
    spreadsheet_id = security.validate_sheet_url(sheet_url)
    rows = self.sheets_service.get_rows(spreadsheet_id)
    if not rows:
      raise ValueError("Sheet contains no data rows")
    max_rows = get_max_rows()
    if len(rows) > max_rows:
      raise ValueError(f"Sheet has more than {max_rows} data rows")

    missing = [col for col in REQUIRED_COLUMNS if col not in rows[0]]
    if missing:
      raise ValueError(f"Sheet is missing required columns: {missing}")

    bulk_id = paths.generate_bulk_id(spreadsheet_id)
    logger.info(
        "Processing sheet into bulk_id %s (%d rows)", bulk_id, len(rows)
    )

    status_summary: dict[str, int] = {}
    row_updates = []
    for row_index, row in enumerate(rows, start=1):
      status, logs = self._process_row(bulk_id, row_index, row)
      status_summary[status] = status_summary.get(status, 0) + 1

      updates = {"status": (status, "\n")}
      if logs:
        updates["logs"] = (" | ".join(logs), "\n-----\n")
      row_updates.append({"row_index": row_index, "updates": updates})
      logger.info("Row %d processed with status %s", row_index, status)

    self.sheets_service.append_to_rows(spreadsheet_id, row_updates)
    logger.info("Bulk %s status summary: %s", bulk_id, status_summary)
    return bulk_id, status_summary

  def _process_row(
      self, bulk_id: str, row_index: int, row: dict[str, Any]
  ) -> tuple[str, list[str]]:
    """Uploads one row (seed image, image metadata, row metadata) to GCS.

    Args:
        bulk_id: The bulk id.
        row_index: 1-based data row index.
        row: The row values keyed by column header.

    Returns:
        A tuple (status, log lines) for the row.
    """
    row_id = paths.make_row_id(row_index)
    status = STATUS_READY
    logs: list[str] = []
    images_path = paths.get_row_images_path(bulk_id, row_id)

    image_url = str(row.get("image_url", "")).strip()
    if not image_url:
      status = STATUS_SKIPPED
      logs.append("image_url is required but was not provided")
    else:
      try:
        data, mime_type, url_path = security.download_image(image_url)
        filename = paths.safe_image_filename(url_path, mime_type)
        image_uri = f"{images_path}{filename}"
        blob = self._upload(image_uri, data, mime_type)
        logs.append(
            f"Image uploaded to {image_uri} (authenticated URL:"
            f" {blob.public_url})"
        )
      except security.UnsafeUrlError as ex:
        status = STATUS_ERROR
        logs.append(f"Image URL rejected: {ex}")
        logger.warning("Row %d image URL rejected: %s", row_index, ex)
      except Exception as ex:  # pylint: disable=broad-exception-caught
        status = STATUS_ERROR
        logs.append(f"Image download failed: {type(ex).__name__}")
        logger.exception("Row %d image download/upload failed", row_index)

    image_metadata = str(row.get("image_metadata", "")).strip()
    if image_metadata:
      try:
        try:
          metadata_obj = json.loads(image_metadata)
        except json.JSONDecodeError:
          metadata_obj = {"raw_metadata": image_metadata}
        self._upload(
            f"{images_path}image_metadata.json",
            json.dumps(metadata_obj, indent=2),
            "application/json",
        )
        logs.append("Image metadata uploaded")
      except Exception as ex:  # pylint: disable=broad-exception-caught
        status = STATUS_ERROR
        logs.append(f"Metadata upload failed: {type(ex).__name__}")
        logger.exception("Row %d metadata upload failed", row_index)

    row_metadata = {
        "row_id": row_id,
        "row_index": row_index,
        "image_url": row.get("image_url", ""),
        "image_metadata": row.get("image_metadata", ""),
        "video_output": row.get("video_output", ""),
        "status": status,
        "logs": " | ".join(logs),
        "created_at": datetime.datetime.now().isoformat(),
    }
    try:
      self._upload(
          paths.get_row_metadata_path(bulk_id, row_id),
          json.dumps(row_metadata, indent=2),
          "application/json",
      )
    except Exception:  # pylint: disable=broad-exception-caught
      logger.exception("Row %d metadata.json upload failed", row_index)
    return status, logs

  def _upload(
      self, gcs_uri: str, content: bytes | str, content_type: str
  ) -> storage.Blob:
    """Uploads content to a gs:// URI of the bulk bucket.

    Args:
        gcs_uri: Destination gs:// URI, inside the bulk bucket.
        content: The content to upload.
        content_type: MIME type of the content.

    Returns:
        The uploaded blob.
    """
    blob = self.bucket.blob(paths.blob_name_from_gcs_uri(gcs_uri))
    blob.upload_from_string(content, content_type=content_type)
    return blob
