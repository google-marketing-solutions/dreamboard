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

"""Single entry point from Bulk Video Creator into the backend core.

The core is the DreamBoard backend of this repository (`backend/app`).
Every import of its modules lives here. If the core changes its contract
(models, Veo service, storage), this is the only file to adapt.

The core is imported as top-level modules (`utils`, `services`, `models`,
`core`), so its folder must be on sys.path. By default it is
`<repo>/backend/app`; override with DREAMBOARD_CORE_PATH (the Docker image
sets it to /code/app).

The core reads PROJECT_ID, LOCATION and GCS_BUCKET when imported, so the
environment must be loaded before importing this module (see main.py).
"""

from collections.abc import Callable
import os
import pathlib
import sys
from typing import Any
import uuid

from google.cloud import storage

# bulk-video-creator/backend/bulk_app/core_adapter.py -> <repo>
_REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
_DEFAULT_CORE_PATH = _REPO_ROOT / "backend" / "app"
CORE_PATH = pathlib.Path(
    os.getenv("DREAMBOARD_CORE_PATH", str(_DEFAULT_CORE_PATH))
)
if str(CORE_PATH) not in sys.path:
  sys.path.insert(0, str(CORE_PATH))

# pylint: disable=wrong-import-position
from models.image import image_gen_models
from models.video import video_gen_models
from models.video import video_request_models
from services import storage_service
from services.video import veo_api_service
import utils
# pylint: enable=wrong-import-position

# Core types that the rest of the bulk uses through this adapter.
VeoAPIService = veo_api_service.VeoAPIService
VideoGenerationResponse = video_gen_models.VideoGenerationResponse

DEFAULT_VIDEO_MODEL = video_request_models.VEO_3_1_MODEL_NAME
DEFAULT_VIDEO_DURATION_SECS = 4
SUPPORTED_VIDEO_DURATIONS = frozenset({4, 6, 8})

SUPPORTED_VIDEO_MODELS = frozenset({
    video_request_models.VEO_3_1_MODEL_NAME,
    video_request_models.VEO_3_1_FAST_MODEL_NAME,
    video_request_models.VEO_3_MODEL_NAME,
    video_request_models.VEO_3_FAST_MODEL_NAME,
})

__all__ = [
    "VeoAPIService",
    "VideoGenerationResponse",
    "build_image_to_video_segment",
    "execute_tasks_in_parallel",
    "failed_response",
    "get_bucket",
    "get_signed_uri",
    "get_video_duration_secs",
    "get_video_model",
]


def get_bucket() -> storage.Bucket:
  """Returns the google.cloud.storage Bucket configured in the core."""
  return storage_service.storage_service.bucket


def get_signed_uri(gcs_uri: str) -> str:
  """Returns the core's signed (or mTLS in dev) URL for a gs:// URI."""
  return utils.get_signed_uri_from_gcs_uri(gcs_uri)


def execute_tasks_in_parallel(tasks: list[Callable[[], Any]]) -> list[Any]:
  """Runs callables in the core's thread pool and returns their results."""
  return utils.execute_tasks_in_parallel(tasks)


def get_video_model() -> str:
  """Returns the Veo model for bulk videos (env BULK_VIDEO_MODEL).

  Returns:
      The model name.

  Raises:
      ValueError: If the model is not supported by the core Veo service.
  """
  model = os.getenv("BULK_VIDEO_MODEL", DEFAULT_VIDEO_MODEL).strip()
  if model not in SUPPORTED_VIDEO_MODELS:
    raise ValueError(
        f"BULK_VIDEO_MODEL must be one of {sorted(SUPPORTED_VIDEO_MODELS)}"
    )
  return model


def get_video_duration_secs() -> int:
  """Returns the duration of bulk videos (env BULK_VIDEO_DURATION_SECS).

  Returns:
      The duration in seconds: 4, 6 or 8.

  Raises:
      ValueError: If the value is not one of the durations Veo 3.x accepts.
  """
  raw = os.getenv("BULK_VIDEO_DURATION_SECS", str(DEFAULT_VIDEO_DURATION_SECS))
  try:
    duration = int(raw)
  except ValueError as ex:
    raise ValueError("BULK_VIDEO_DURATION_SECS must be an integer") from ex
  if duration not in SUPPORTED_VIDEO_DURATIONS:
    raise ValueError("BULK_VIDEO_DURATION_SECS must be 4, 6 or 8")
  return duration


def build_image_to_video_segment(
    row_id: str,
    prompt: str,
    seed_image_uri: str,
    seed_image_name: str,
    seed_image_mime_type: str,
) -> video_request_models.VideoSegmentGenerationOperation:
  """Builds the core request for one image-to-video generation.

  Args:
      row_id: Row id, used as the segment id so responses can be matched.
      prompt: Text prompt.
      seed_image_uri: gs:// URI of the seed image.
      seed_image_name: File name of the seed image.
      seed_image_mime_type: MIME type of the seed image.

  Returns:
      A VideoSegmentGenerationOperation for VeoAPIService.generate_video.
  """
  seed_image = image_gen_models.Image(
      id=str(uuid.uuid4()),
      name=seed_image_name,
      gcs_uri=seed_image_uri,
      mime_type=seed_image_mime_type,
      signed_uri="",  # Veo reads the gs:// URI directly.
      gcs_fuse_path="",  # Not used by bulk generation.
  )
  return video_request_models.VideoSegmentGenerationOperation(
      id=row_id,
      video_model=get_video_model(),
      video_gen_task=video_request_models.VideoGenTasks.IMAGE_TO_VIDEO.value,
      prompt=prompt,
      seed_images=[seed_image],
      duration_in_secs=get_video_duration_secs(),
  )


def failed_response(
    segment: video_request_models.VideoSegmentGenerationOperation | None,
    message: str,
) -> VideoGenerationResponse:
  """Builds a core VideoGenerationResponse for a row that failed.

  Args:
      segment: The request of the row, or None if it could not be built.
      message: Error message to report for the row.

  Returns:
      A response with done=False and no videos.
  """
  return VideoGenerationResponse(
      done=False,
      operation_name="",
      execution_message=message,
      videos=[],
      video_segment=segment,
  )
