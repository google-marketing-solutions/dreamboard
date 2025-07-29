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

"""
Image Generation endpoints handled by the FastAPI Router.

This module defines FastAPI endpoints for interacting with image generation
and storage services, including health checks, image creation, downloads,
and uploads to Google Cloud Storage.
"""

import logging
import os
import utils
from fastapi import APIRouter, HTTPException, UploadFile
from models.request_models import UploadedFile
from services import storage_service

# Initialize the FastAPI router for file uploader endpoints.
file_uploader_router = APIRouter(prefix="/file_uploader")


@file_uploader_router.post("/upload_file/{bucket_path}")
async def upload_file(bucket_path: str, file: UploadFile) -> UploadedFile:
  """TODO"""
  try:
    file_name = file.filename.strip()
    logging.info(
        (
            "DreamBoard - FILE_UPLOADER_ROUTES: Starting file upload %s "
            "in GCS path %s..."
        ),
        file_name,
        bucket_path,
    )
    # Construct the full GCS path for the file.
    # workaround: replace @ with / to get the file path
    file_path = f"dreamboard/{bucket_path.replace("@", "/")}/{file_name}"
    # Upload the file content to GCS.
    blob = storage_service.storage_service.upload_from_frontend(
        file_path, file.file, file.content_type
    )
    # Construct the GCS URI.
    gcs_uri = f'gs://{os.getenv('GCS_BUCKET')}/{blob.name}'
    # Create an UploadedFile object with all relevant details.
    uploaded_file = UploadedFile(
        name=file_name,
        gcs_uri=gcs_uri,
        signed_uri=utils.get_signed_uri_from_gcs_uri(gcs_uri),
        gcs_fuse_path="", # TODO (ae) add later. We don't need this for now
        mime_type=file.content_type,
    )

    return uploaded_file
  except Exception as ex:
    logging.error(
        "DreamBoard - IMAGE_GEN_ROUTES: - UPLOAD FILE ERROR: %s", str(ex)
    )
    raise HTTPException(status_code=500, detail=str(ex)) from ex
