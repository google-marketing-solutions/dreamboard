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

import datetime
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from models.image import image_request_models
from models.image.image_gen_models import ImageGenerationResponse
from services import storage_service
from services.image.image_generator import ImageGenerator

# Initialize the FastAPI router for image generation endpoints.
image_gen_router = APIRouter(prefix="/image_generation")


def instantiate_image_generator() -> ImageGenerator:
  """For use in generating an ImageGenerator across all image routes"""
  return ImageGenerator()


ImageServiceDep = Annotated[
    ImageGenerator, Depends(instantiate_image_generator)
]


@image_gen_router.get("/image_health_check")
def image_health_check():
  """
  Endpoint to perform a health check for the Dreamboard service.

  Returns:
      A JSON response indicating the status of the health check.
  """

  return {"status": "Success!"}


@image_gen_router.post("/generate_image/{story_id}")
def generate_image(
    story_id: str,
    image_requests: image_request_models.ImageRequest,
    image_generator: ImageServiceDep,
) -> list[ImageGenerationResponse]:
  """
  Generates images based on provided request parameters for a given story.

  This endpoint takes image generation settings and triggers the image
  creation process via the `image_generator` service.

  Args:
      story_id: The unique identifier for the story.
      image_requests: An `ImageRequest` object containing parameters for
                      image generation.

  Returns:
      A list of `ImageGenerationResponse` objects detailing the status
      and results of the image generation.

  Raises:
      HTTPException (500): If an unexpected error occurs during image
                           generation.
  """
  try:
    gen_status = image_generator.generate_images_from_scenes(
        story_id, image_requests
    )
    return gen_status
  except Exception as ex:
    logging.error("DreamBoard - IMAGE_GEN_ROUTES: - ERROR: %s", str(ex))
    raise HTTPException(status_code=500, detail=str(ex)) from ex


@image_gen_router.post("/download_image")
async def download_image(image_uri: str):
  """
  Downloads an image from a given Google Cloud Storage (GCS) URI.

  Args:
      image_uri: The GCS URI of the image to be downloaded.

  Returns:
      A JSON response containing the downloaded image data or a status.

  Raises:
      HTTPException (500): If an error occurs during the image download
                           process.
  """
  try:
    logging.info("Received download request for URI: %s", image_uri)

    response = storage_service.storage_service.download_file(image_uri)

    return JSONResponse(content=response)

  except Exception as ex:
    logging.error(
        "DreamBoard - IMAGE_GEN_ROUTES: - IMAGE UPLOAD ERROR: %s", str(ex)
    )
    raise HTTPException(status_code=500, detail=str(ex)) from ex


@image_gen_router.post("/upload_image")
async def upload_image(
    storage_folder_name: str, image_file: UploadFile = File(...)
):
  """
  Uploads an image file to a specified GCS bucket folder.

  The image is renamed with a timestamp for uniqueness.

  Args:
      storage_folder_name: The name of the folder within the GCS bucket
                           where the image will be stored.
      image_file: The `UploadFile` object representing the image file
                  sent in the request.

  Returns:
      A dictionary containing the GCS URI, public URL, and a success
      message for the uploaded image.

  Raises:
      HTTPException (500): If an error occurs during the image upload
                           process.
  """
  try:
    # Initialize StorageService with the target folder name.
    image_storage = storage_service.StorageService(
        storage_folder_name=storage_folder_name
    )

    # Generate a unique filename using a timestamp for high uniqueness.
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    file_extension = (
        image_file.filename.split(".")[-1] if "." in image_file.filename else ""
    )
    new_filename = (
        f"{timestamp}.{file_extension}" if file_extension else timestamp
    )

    image_mime_type = image_file.content_type
    # Read the file content as bytes.
    image_data = await image_file.read()

    logging.info(
        "Uploading image to GCS bucket: %s, folder: %s, output_file: %s",
        image_storage.bucket_name,
        storage_folder_name,
        new_filename,
    )

    # Save the image to the specified GCS bucket and folder.
    url = image_storage.save_image_to_folder(
        new_filename, image_data, image_mime_type
    )

    logging.info("Uploaded image to Cloud Storage: %s.", url)

    # Return details of the uploaded image.
    return {
        "image_uri": (
            f"gs://{image_storage.bucket_name}/"
            f"{storage_folder_name}/{new_filename}"
        ),
        "public_url": url,
        "message": (
            f"Image '{image_file.filename}' successfully uploaded to '{url}'"
        ),
    }

  except Exception as ex:
    logging.error(
        "DreamBoard - IMAGE_GEN_ROUTES: - IMAGE UPLOAD ERROR: %s", str(ex)
    )
    raise HTTPException(status_code=500, detail=str(ex)) from ex
