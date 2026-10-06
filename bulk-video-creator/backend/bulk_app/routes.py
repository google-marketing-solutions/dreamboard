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

TODO(security): These endpoints have no authentication or rate limiting of
their own, consistent with the backend core of this repo, which
delegates both to the NodeJS BFF (frontend/server) or to Cloud Run IAM
(--no-allow-unauthenticated). Do not expose this service publicly without
one of them: each call can trigger paid Veo generations.
"""

import logging
import os
import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path
from fastapi.responses import JSONResponse

from bulk_app import paths
from bulk_app.models import (
    BulkUploadSheetRequest,
    BulkUploadSheetResponse,
    BulkVideoGenerationResponse,
)
from bulk_app.services.sheet_to_bulk import SheetToBulkHandler
from bulk_app.services.video_generator import BulkVideoGenerator

logger = logging.getLogger(__name__)

bulk_router = APIRouter(
    prefix="/bulk_video_generation", tags=["Bulk Video Generation"]
)

BulkIdPath = Annotated[str, Path(pattern=paths.BULK_ID_REGEX, max_length=115)]


def _internal_error(operation: str):
  """Logs the current exception and returns a generic error to the client.

  The detailed error is only in the server logs, referenced by error_id.
  """
  error_id = uuid.uuid4().hex
  logger.exception("%s failed (error_id=%s)", operation, error_id)
  message = f"Internal error while running {operation}. error_id={error_id}"
  if os.getenv("USE_AUTH_MIDDLEWARE"):
    # Same contract as the core routes for the NodeJS middleware.
    return JSONResponse(content={"status_code": 500, "error_message": message})
  raise HTTPException(status_code=500, detail=message)


@bulk_router.get("/bulk_health_check")
def bulk_health_check():
  """Health check of the bulk service."""
  return {"status": "Success!"}


@bulk_router.post("/bulk_upload_sheet", response_model=BulkUploadSheetResponse)
def bulk_upload_sheet(request: BulkUploadSheetRequest):
  """Loads a Google Sheet into a new bulk operation.

  Each data row becomes gs://{bucket}/{BULK_GCS_PREFIX}/{bulk_id}/row_N/ with
  its seed image and metadata. Status and logs are appended to the sheet.
  """
  try:
    bulk_id, status_summary = SheetToBulkHandler().process_sheet_to_bulk(
        request.sheet_url
    )
  except ValueError as ve:
    # Raised only for problems with the sheet content; safe to show.
    raise HTTPException(status_code=400, detail=str(ve)) from ve
  except Exception:  # pylint: disable=broad-exception-caught
    return _internal_error("bulk_upload_sheet")

  return BulkUploadSheetResponse(
      bulk_id=bulk_id,
      message=f"Sheet processed. bulk_id: {bulk_id}",
      status_summary=status_summary,
  )


@bulk_router.post(
    "/generate_videos_from_bulk/{bulk_id}",
    response_model=BulkVideoGenerationResponse,
)
def generate_videos_from_bulk(bulk_id: BulkIdPath):
  """Generates one video per row of a bulk operation with Veo."""
  try:
    videos, status_summary = (
        BulkVideoGenerator().generate_bulk_video_from_images_seed(bulk_id)
    )
  except ValueError as ve:
    raise HTTPException(status_code=400, detail=str(ve)) from ve
  except Exception:  # pylint: disable=broad-exception-caught
    return _internal_error("generate_videos_from_bulk")

  return BulkVideoGenerationResponse(
      videos=videos, status_summary=status_summary
  )
