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

"""FastAPI endpoints of Bulk Video Creator.

These endpoints have no authentication or rate limiting of their own,
consistent with the backend core of this repo, which delegates both to the
NodeJS BFF (frontend/server) or to Cloud Run IAM (--no-allow-unauthenticated).
Do not expose this service publicly without one of them: each call can trigger
paid Veo generations.
"""

import logging
import os
from typing import Annotated
import uuid

import fastapi
from fastapi import responses

from bulk_app import models
from bulk_app import paths
from bulk_app.services import sheet_to_bulk
from bulk_app.services import video_generator

logger = logging.getLogger(__name__)

bulk_router = fastapi.APIRouter(
    prefix="/bulk_video_generation", tags=["Bulk Video Generation"]
)

BulkIdPath = Annotated[
    str, fastapi.Path(pattern=paths.BULK_ID_REGEX, max_length=115)
]


def _internal_error(operation: str) -> responses.JSONResponse:
  """Logs the current exception and builds a generic error for the client.

  The detailed error is only in the server logs, referenced by error_id.

  Args:
      operation: Name of the operation that failed, shown to the client.

  Returns:
      A JSONResponse with the error, when USE_AUTH_MIDDLEWARE is set.

  Raises:
      fastapi.HTTPException: A 500 error, when USE_AUTH_MIDDLEWARE is not set.
  """
  error_id = uuid.uuid4().hex
  logger.exception("%s failed (error_id=%s)", operation, error_id)
  message = f"Internal error while running {operation}. error_id={error_id}"
  if os.getenv("USE_AUTH_MIDDLEWARE"):
    # Same contract as the core routes for the NodeJS middleware.
    return responses.JSONResponse(
        content={"status_code": 500, "error_message": message}
    )
  raise fastapi.HTTPException(status_code=500, detail=message)


@bulk_router.get("/bulk_health_check")
def bulk_health_check() -> dict[str, str]:
  """Returns the health status of the bulk service."""
  return {"status": "Success!"}


@bulk_router.post(
    "/bulk_upload_sheet", response_model=models.BulkUploadSheetResponse
)
def bulk_upload_sheet(
    request: models.BulkUploadSheetRequest,
) -> models.BulkUploadSheetResponse | responses.JSONResponse:
  """Loads a Google Sheet into a new bulk operation.

  Each data row becomes gs://{bucket}/{BULK_GCS_PREFIX}/{bulk_id}/row_N/ with
  its seed image and metadata. Status and logs are appended to the sheet.

  Args:
      request: The request with the Google Sheets URL.

  Returns:
      The new bulk id and the number of rows per status.

  Raises:
      fastapi.HTTPException: 400 if the sheet content is invalid.
  """
  try:
    handler = sheet_to_bulk.SheetToBulkHandler()
    bulk_id, status_summary = handler.process_sheet_to_bulk(request.sheet_url)
  except ValueError as ve:
    # Raised only for problems with the sheet content; safe to show.
    raise fastapi.HTTPException(status_code=400, detail=str(ve)) from ve
  except Exception:  # pylint: disable=broad-exception-caught
    return _internal_error("bulk_upload_sheet")

  return models.BulkUploadSheetResponse(
      bulk_id=bulk_id,
      message=f"Sheet processed. bulk_id: {bulk_id}",
      status_summary=status_summary,
  )


@bulk_router.post(
    "/generate_videos_from_bulk/{bulk_id}",
    response_model=models.BulkVideoGenerationResponse,
)
def generate_videos_from_bulk(
    bulk_id: BulkIdPath,
) -> models.BulkVideoGenerationResponse | responses.JSONResponse:
  """Generates one video per row of a bulk operation with Veo.

  Args:
      bulk_id: Id returned by bulk_upload_sheet.

  Returns:
      One video generation response per row and the number of rows per
      status.

  Raises:
      fastapi.HTTPException: 400 if the bulk does not exist or has no rows
          with seed images, or if the video configuration is invalid.
  """
  try:
    generator = video_generator.BulkVideoGenerator()
    videos, status_summary = generator.generate_bulk_video_from_images_seed(
        bulk_id
    )
  except ValueError as ve:
    raise fastapi.HTTPException(status_code=400, detail=str(ve)) from ve
  except Exception:  # pylint: disable=broad-exception-caught
    return _internal_error("generate_videos_from_bulk")

  return models.BulkVideoGenerationResponse(
      videos=videos, status_summary=status_summary
  )
