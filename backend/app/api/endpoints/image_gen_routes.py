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
import os
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
    logging.error(
        "DreamBoard - IMAGE_GEN_ROUTES-generate_image: - ERROR: %s", str(ex)
    )
    if os.getenv("USE_AUTH_MIDDLEWARE"):
      error_response = {
          "status_code": 500,
          "error_message": str(ex),
      }
      # Workaround to send the actual error message to NodeJS middleware request handler
      return JSONResponse(content=error_response)
    else:
      raise HTTPException(status_code=500, detail=str(ex)) from ex


@image_gen_router.post("/generate_images_from_scenes_gemini_editor/{story_id}")
def generate_images_from_scenes_gemini_editor(
    story_id: str,
    image_generation_request: image_request_models.ImageGenerationRequest,
    image_generator: ImageServiceDep,
) -> list[ImageGenerationResponse]:

  try:
    logging.info(
        (
            "DreamBoard - IMAGE_GEN_ROUTES-generate_images_from_scenes:"
            " Starting image generation for story %s..."
        ),
        story_id,
    )
    image_gen_resps = image_generator.generate_images_from_scenes_gemini_editor(
        story_id, image_generation_request
    )

    return image_gen_resps
  except Exception as ex:
    logging.error(
        "DreamBoard - IMAGE_GEN_ROUTES-generate_images_from_scenes: -"
        " ERROR: %s",
        str(ex),
    )
    if os.getenv("USE_AUTH_MIDDLEWARE"):
      error_response = {
          "status_code": 500,
          "error_message": str(ex),
      }
      # Workaround to send the actual error message to NodeJS middleware request handler
      return JSONResponse(content=error_response)
    else:
      raise HTTPException(status_code=500, detail=str(ex)) from ex
