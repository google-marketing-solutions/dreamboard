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

"""Pure helpers for bulk GCS paths, ids and file names.

This module does not import the backend core so it can be unit tested
without cloud credentials.

GCS layout of a bulk operation (prefix configurable with BULK_GCS_PREFIX):

    gs://{GCS_BUCKET}/bulk-video-creator/{bulk_id}/
      row_1/
        metadata.json
        images_seeds/{image file}, image_metadata.json
        video_output/
      row_2/
      ...
"""

import datetime
import os
import re

ROW_ID_PREFIX = "row_"
BULK_ID_REGEX = r"^\d{14}_[A-Za-z0-9_-]{10,100}$"
DEFAULT_GCS_PREFIX = "bulk-video-creator"
_GCS_PREFIX_REGEX = r"^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*$"

# Image types accepted as Veo seed images, keyed by extension.
IMAGE_MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",
}
MIME_TO_EXTENSION = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}


def get_bucket_name() -> str:
  """Returns the GCS bucket name from the environment.

  Raises:
      RuntimeError: If GCS_BUCKET is not set (fail closed).
  """
  bucket = os.getenv("GCS_BUCKET")
  if not bucket:
    raise RuntimeError("GCS_BUCKET environment variable is not set")
  return bucket


def get_gcs_prefix() -> str:
  """Returns the root folder of all bulks in the bucket (env BULK_GCS_PREFIX).

  Raises:
      RuntimeError: If the configured prefix is not a safe relative path.
  """
  prefix = os.getenv("BULK_GCS_PREFIX", DEFAULT_GCS_PREFIX).strip().strip("/")
  if not re.fullmatch(_GCS_PREFIX_REGEX, prefix):
    raise RuntimeError("BULK_GCS_PREFIX must be like 'folder' or 'a/b'")
  return prefix


def get_bulk_base_path(bulk_id: str) -> str:
  """Returns gs://{bucket}/{prefix}/{bulk_id}/ (with trailing slash)."""
  return f"gs://{get_bucket_name()}/{get_bulk_blob_prefix(bulk_id)}"


def get_bulk_blob_prefix(bulk_id: str) -> str:
  """Returns the blob prefix (no gs://bucket) of a bulk operation."""
  return f"{get_gcs_prefix()}/{bulk_id}/"


def get_row_base_path(bulk_id: str, row_id: str) -> str:
  """Returns gs://.../{bulk_id}/{row_id}/."""
  return f"{get_bulk_base_path(bulk_id)}{row_id}/"


def get_row_images_path(bulk_id: str, row_id: str) -> str:
  """Returns gs://.../{bulk_id}/{row_id}/images_seeds/."""
  return f"{get_row_base_path(bulk_id, row_id)}images_seeds/"


def get_row_video_output_path(bulk_id: str, row_id: str) -> str:
  """Returns gs://.../{bulk_id}/{row_id}/video_output/."""
  return f"{get_row_base_path(bulk_id, row_id)}video_output/"


def get_row_metadata_path(bulk_id: str, row_id: str) -> str:
  """Returns gs://.../{bulk_id}/{row_id}/metadata.json."""
  return f"{get_row_base_path(bulk_id, row_id)}metadata.json"


def blob_name_from_gcs_uri(gcs_uri: str) -> str:
  """Returns the blob name of a gs:// URI that belongs to the bulk bucket.

  Args:
      gcs_uri: A gs://{bucket}/{blob} URI.

  Returns:
      The blob name, without the gs://{bucket}/ prefix.

  Raises:
      ValueError: If the URI is not a gs:// URI of the configured bucket.
  """
  prefix = f"gs://{get_bucket_name()}/"
  if not gcs_uri.startswith(prefix):
    raise ValueError("GCS URI does not belong to the configured bucket")
  return gcs_uri[len(prefix) :]


def make_row_id(row_index: int) -> str:
  """Returns the row id for a 1-based data row index (row_1, row_2...)."""
  return f"{ROW_ID_PREFIX}{row_index}"


def get_row_index_from_row_id(row_id: str) -> int:
  """Returns N from 'row_N'.

  Args:
      row_id: A row id like 'row_3'.

  Returns:
      The 1-based row index.

  Raises:
      ValueError: If the row id is malformed.
  """
  match = re.fullmatch(r"row_(\d{1,6})", row_id or "")
  if not match:
    raise ValueError(f"Invalid row id: {row_id!r}")
  return int(match.group(1))


def generate_bulk_id(spreadsheet_id: str) -> str:
  """Returns {YYYYMMDDHHmmss}_{spreadsheet_id}."""
  timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
  return f"{timestamp}_{spreadsheet_id}"


def get_spreadsheet_id_from_bulk_id(bulk_id: str) -> str:
  """Returns the spreadsheet id embedded in a bulk id.

  Args:
      bulk_id: A bulk id like '{YYYYMMDDHHmmss}_{spreadsheet_id}'.

  Returns:
      The spreadsheet id.

  Raises:
      ValueError: If the bulk id is malformed.
  """
  if not re.fullmatch(BULK_ID_REGEX, bulk_id or ""):
    raise ValueError("Invalid bulk_id format")
  return bulk_id.split("_", 1)[1]


def get_mime_type_from_filename(filename: str) -> str:
  """Returns the image MIME type from the extension, or octet-stream."""
  extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
  return IMAGE_MIME_TYPES.get(extension, "application/octet-stream")


def is_image_filename(filename: str) -> bool:
  """Returns whether the file name has a supported image extension."""
  return get_mime_type_from_filename(filename) != "application/octet-stream"


def safe_image_filename(url_path: str, mime_type: str) -> str:
  """Builds a safe blob file name for a downloaded image.

  The name is derived from the last URL path segment, restricted to
  [A-Za-z0-9._-], and its extension is forced to match the detected content
  type, so user input can never inject path separators or traversal
  sequences into the GCS object name.

  Args:
      url_path: The path component of the image URL.
      mime_type: The detected MIME type of the downloaded content.

  Returns:
      A file name like 'photo.jpg'.
  """
  extension = MIME_TO_EXTENSION.get(mime_type, "png")
  last_segment = url_path.replace("\\", "/").rsplit("/", 1)[-1]
  stem = last_segment.rsplit(".", 1)[0] if "." in last_segment else last_segment
  stem = re.sub(r"[^A-Za-z0-9_-]", "_", stem).strip("_")[:100]
  if not stem:
    stem = "image"
  return f"{stem}.{extension}"
