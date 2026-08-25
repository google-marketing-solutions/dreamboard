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
Module for the Data models used by the APIRouter to define the request
parameters.

This file defines Pydantic models specifically for structuring incoming
request payloads related to image generation via the API Router.
"""

from models import request_models
from models.image import image_gen_models
from pydantic import BaseModel

GEMINI_3_PRO_IMAGE_MODEL_NAME = "gemini-3-pro-image"
GEMINI_3_PRO_IMAGE_MODEL_NAME_PREVIEW = "gemini-3-pro-image-preview"


class ImageRequest(BaseModel):
  """
  Represents the basic structure for an Imagen API request.

  This model encapsulates a collection of `Scene` objects, where each
  scene contains the necessary parameters for image generation or editing.

  Attributes:
      scenes: A list of `Scene` objects, each defining a specific
              image generation task.
  """

  scenes: list[request_models.Scene]


class ImageGenerationOperation(BaseModel):
  """
  Represents a single image generation operation using the Gemini model.

  Attributes:
      id: A unique identifier for the operation.
      image_model: The name of the image generation model to use.
      image_gen_task: The type of generation task (e.g., "text-to-image").
      prompt: The text prompt describing the image to be generated.
      aspect_ratio: The desired aspect ratio of the generated image.
      resolution: The desired resolution of the generated image.
      response_modalities: The expected modalities in the response (e.g., ["IMAGE"]).
      reference_images: An optional list of reference images for image-to-image tasks.
  """

  id: str
  image_model: str = GEMINI_3_PRO_IMAGE_MODEL_NAME
  image_gen_task: str = "text-to-image"  # text-to-image, image-to-image
  prompt: str
  aspect_ratio: str = (
      "16:9"  # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
  )
  resolution: str = "1K"  # "1K", "2K", "4K"
  response_modalities: list[str] = ["IMAGE"]
  reference_images: list[image_gen_models.Image] | None = None
  use_grounding: bool = False


class ImageGenerationRequest(BaseModel):
  """
  Represents a request containing multiple image generation operations.

  Attributes:
      image_gen_operations: A list of `ImageGenerationOperation` objects to be executed.
  """

  image_gen_operations: list[ImageGenerationOperation]
