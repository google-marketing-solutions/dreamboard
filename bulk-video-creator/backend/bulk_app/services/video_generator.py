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

"""Generates one Veo video per bulk row (step 2 of the bulk)."""

import datetime
import functools
import json
import logging

from bulk_app import core_adapter
from bulk_app import models
from bulk_app import paths
from bulk_app.services import sheets

logger = logging.getLogger(__name__)

STATUS_GENERATED = "VIDEO_GENERATED"
STATUS_ERROR = "ERROR"

# Every row uses this fixed prompt; per-row prompts are not supported yet
# (see the README's Known limitations section).
DEFAULT_PROMPT = (
    "Animate the static photograph with extremely subtle, cinematic motion. "
    "The feeling is **serene** and **aspirational**. "
    "Use a very **slow, gentle camera zoom (push-in)**, "
    "a **subtle parallax shift** between foreground and background, "
    "and a **soft, atmospheric breathing** effect. "
    "The overall movement must be minimal and dreamy, "
    "like a high-end film still coming to life."
)


class BulkVideoGenerator:
  """Generator of one Veo video per bulk row, which reports to the sheet.

  Attributes:
      veo_api_service: Core Veo service used to generate each video.
      sheets_service: Client used to write the results back to the sheet.
      bucket: GCS bucket configured in the core.
  """

  def __init__(
      self,
      veo_api_service: core_adapter.VeoAPIService | None = None,
      sheets_service: sheets.GoogleSheetsService | None = None,
  ) -> None:
    """Initializes the generator.

    Args:
        veo_api_service: Veo service to use. Defaults to the core's.
        sheets_service: Sheets client to use. Defaults to a new
            GoogleSheetsService with Application Default Credentials.
    """
    self.veo_api_service = veo_api_service or core_adapter.VeoAPIService()
    self.sheets_service = sheets_service or sheets.GoogleSheetsService()
    self.bucket = core_adapter.get_bucket()

  def generate_bulk_video_from_images_seed(
      self, bulk_id: str
  ) -> tuple[list[core_adapter.VideoGenerationResponse], dict[str, int]]:
    """Generates one video per row that has a seed image.

    Args:
        bulk_id: A validated bulk id.

    Returns:
        A tuple (one core VideoGenerationResponse per row, rows per status).

    Raises:
        ValueError: If the bulk does not exist or has no rows with images,
            or if the model/duration configuration is invalid.
    """
    # Validate configuration before any Veo call (fail fast, fail closed).
    core_adapter.get_video_model()
    core_adapter.get_video_duration_secs()

    row_requests = self._get_bulk_video_requests(bulk_id)
    if not row_requests:
      raise ValueError("No rows with seed images were found for this bulk_id")

    tasks = [
        functools.partial(self._generate_row_video, bulk_id, row_request)
        for row_request in row_requests
    ]
    responses = core_adapter.execute_tasks_in_parallel(tasks)
    status_summary = self._report_results(bulk_id, responses)
    return responses, status_summary

  def _get_bulk_video_requests(
      self, bulk_id: str
  ) -> list[models.BulkVideoRequest]:
    """Finds the rows of a bulk and the first seed image of each.

    Args:
        bulk_id: The bulk id.

    Returns:
        One request per row folder that has a seed image, sorted by row.
    """
    prefix = paths.get_bulk_blob_prefix(bulk_id)
    iterator = self.bucket.list_blobs(prefix=prefix, delimiter="/")
    list(iterator)  # Consume pages so .prefixes is populated.
    row_prefixes = sorted(iterator.prefixes)
    logger.info("Found %d row folders for bulk %s", len(row_prefixes), bulk_id)

    row_requests = []
    for row_prefix in row_prefixes:
      row_id = row_prefix.rstrip("/").rsplit("/", 1)[-1]
      try:
        paths.get_row_index_from_row_id(row_id)
      except ValueError:
        logger.warning("Ignoring unexpected folder %s", row_prefix)
        continue

      images_prefix = f"{row_prefix}images_seeds/"
      image_blobs = sorted(
          (
              blob
              for blob in self.bucket.list_blobs(prefix=images_prefix)
              if paths.is_image_filename(blob.name)
          ),
          key=lambda blob: blob.name,
      )
      if not image_blobs:
        logger.info("Row %s has no seed image, skipping", row_id)
        continue

      row_requests.append(
          models.BulkVideoRequest(
              bulk_id=bulk_id,
              row_id=row_id,
              prompt=DEFAULT_PROMPT,
              seed_image_uri=f"gs://{self.bucket.name}/{image_blobs[0].name}",
          )
      )
    return row_requests

  def _generate_row_video(
      self, bulk_id: str, row_request: models.BulkVideoRequest
  ) -> core_adapter.VideoGenerationResponse:
    """Generates the video of one row.

    Never raises: errors become a failed response, so one row cannot abort
    the whole bulk.

    Args:
        bulk_id: The bulk id.
        row_request: The row to generate.

    Returns:
        The core response, with done=False if the generation failed.
    """
    segment = None
    try:
      image_name = row_request.seed_image_uri.rsplit("/", 1)[-1]
      segment = core_adapter.build_image_to_video_segment(
          row_id=row_request.row_id,
          prompt=row_request.prompt,
          seed_image_uri=row_request.seed_image_uri,
          seed_image_name=image_name,
          seed_image_mime_type=paths.get_mime_type_from_filename(image_name),
      )
      response = self.veo_api_service.generate_video(
          bulk_id,
          paths.get_row_video_output_path(bulk_id, row_request.row_id),
          segment,
      )
      if response is None:
        return core_adapter.failed_response(
            segment, "Video generation failed after retries"
        )
      return response
    except Exception as ex:  # pylint: disable=broad-exception-caught
      logger.exception("Video generation failed for row %s", row_request.row_id)
      return core_adapter.failed_response(
          segment, f"Video generation failed: {type(ex).__name__}"
      )

  def _report_results(
      self,
      bulk_id: str,
      responses: list[core_adapter.VideoGenerationResponse],
  ) -> dict[str, int]:
    """Updates each row's metadata.json and appends results to the sheet.

    Errors while reporting are logged and do not fail the request, because
    the videos are already generated.

    Args:
        bulk_id: The bulk id.
        responses: One core response per generated row.

    Returns:
        The number of rows per status.
    """
    status_summary: dict[str, int] = {}
    row_updates = []

    for response in responses:
      if response.video_segment is None:
        continue
      row_id = response.video_segment.id
      row_index = paths.get_row_index_from_row_id(row_id)

      public_url = None
      video_uri = None
      if response.done and response.videos:
        status = STATUS_GENERATED
        video_uri = response.videos[0].gcs_uri
        public_url = self.bucket.blob(
            paths.blob_name_from_gcs_uri(video_uri)
        ).public_url
        logs = [response.execution_message, f"Video available at: {public_url}"]
      else:
        status = STATUS_ERROR
        logs = [response.execution_message]
      status_summary[status] = status_summary.get(status, 0) + 1

      try:
        self._update_row_metadata(
            bulk_id, row_id, status, logs, video_uri, public_url
        )
      except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Could not update metadata.json for row %s", row_id)

      updates = {
          "status": (status, "\n"),
          "logs": (" | ".join(logs), "\n-----\n"),
      }
      if public_url:
        updates["video_output"] = (public_url, " | ")
      row_updates.append({"row_index": row_index, "updates": updates})

    try:
      spreadsheet_id = paths.get_spreadsheet_id_from_bulk_id(bulk_id)
      self.sheets_service.append_to_rows(spreadsheet_id, row_updates)
    except Exception:  # pylint: disable=broad-exception-caught
      # Videos are already generated; do not fail the request.
      logger.exception("Could not update the sheet for bulk %s", bulk_id)

    logger.info("Bulk %s status summary: %s", bulk_id, status_summary)
    return status_summary

  def _update_row_metadata(
      self,
      bulk_id: str,
      row_id: str,
      status: str,
      logs: list[str],
      video_uri: str | None,
      public_url: str | None,
  ) -> None:
    """Merges the generation result into the row's metadata.json in GCS.

    Args:
        bulk_id: The bulk id.
        row_id: The row id.
        status: The new row status.
        logs: Log lines for the row.
        video_uri: gs:// URI of the generated video, if any.
        public_url: Authenticated URL of the generated video, if any.
    """
    blob = self.bucket.blob(
        paths.blob_name_from_gcs_uri(
            paths.get_row_metadata_path(bulk_id, row_id)
        )
    )
    existing = {}
    if blob.exists():
      existing = json.loads(blob.download_as_bytes())
    updated = {
        **existing,
        "status": status,
        "logs": " | ".join(logs),
        "video_uri": video_uri,
        "public_url": public_url,
        "updated_at": datetime.datetime.now().isoformat(),
    }
    blob.upload_from_string(
        json.dumps(updated, indent=2), content_type="application/json"
    )
