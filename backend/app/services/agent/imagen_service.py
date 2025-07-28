# Copyright 2025 Google Inc
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import traceback
from typing import Optional

import vertexai
from vertexai.preview.vision_models import ImageGenerationModel, ImageGenerationResponse


class ImagenService:

  def __init__(
      self, project_id: Optional[str] = None, location: Optional[str] = None
  ):
    """
    Initializes the ImagenService.

    Args:
        project_id: Google Cloud project ID. Reads from GOOGLE_CLOUD_PROJECT env var if None.
        location: Google Cloud location. Reads from GOOGLE_CLOUD_LOCATION env var if None (defaults to us-central1).
    """
    try:
      self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
      self.location = location or os.getenv(
          "GOOGLE_CLOUD_LOCATION", "us-central1"
      )

      if not self.project_id:
        raise ValueError(
            "Google Cloud project ID must be provided either as an argument "
            "or through the GOOGLE_CLOUD_PROJECT environment variable."
        )

      vertexai.init(project=self.project_id, location=self.location)

      self.model = ImageGenerationModel.from_pretrained(
          "imagen-4.0-generate-preview-05-20"
      )
    except Exception as e:
      print(f"Error initializing ImagenService: {str(e)}")
      traceback.print_exc()
      raise

  def generate_images(
      self,
      prompt: str,
      number_of_images: int = 1,
      seed: Optional[int] = None,
      aspect_ratio: str = "1:1",
      person_generation="allow_adult",
      safety_filter_level="block_few",
      add_watermark=True,
      negative_prompt: Optional[str] = None,
      guidance_scale: Optional[int] = None,
  ) -> Optional[ImageGenerationResponse]:
    """
    Generates images based on a text prompt using Imagen.

    Args:
        prompt: The text prompt to generate images from.
        number_of_images: The number of images to generate (e.g., 1-8, check model limits).
        seed: A random seed for reproducibility.
        aspect_ratio: The desired aspect ratio (e.g., "1:1", "16:9", "9:16", "3:4", "4:3").
        person_generation: A string indicating whether to allow the generation of images containing people.
        safety_filter_level: The level of safety filtering to apply (e.g., "block_few", "block_most").
        add_watermark: Whether to add a watermark to the generated images.
        negative_prompt: A prompt describing what to avoid in the image.
        guidance_scale: Controls how closely the image should follow the prompt (e.g., 0-20).

    Returns:
        A list of image bytes (PNG format) if successful, None otherwise.
    """
    try:
      print(
          f"Generating {number_of_images} image(s) for prompt:"
          f" '{prompt[:100]}...'"
      )

      # Full list of possible params here:
      # https://github.com/googleapis/python-aiplatform/blob/667b66587021d37f765ba12aad0b244a00537089/vertexai/vision_models/_vision_models.py#L648
      # TODO: add ability to do product placement, masks, etc.
      generation_params = {
          "prompt": prompt,
          "number_of_images": number_of_images,
          "seed": seed,
          "aspect_ratio": aspect_ratio,
          "person_generation": person_generation,
          "safety_filter_level": safety_filter_level,
          "add_watermark": add_watermark,
      }
      if negative_prompt:
        generation_params["negative_prompt"] = negative_prompt
      if guidance_scale is not None:
        generation_params["guidance_scale"] = guidance_scale

      images_response = self.model.generate_images(**generation_params)

      if not images_response:
        print("Image generation returned no images.")
        return None

      # image_bytes_list = [img._image_bytes for img in images_response]
      # print(f"Successfully generated {len(image_bytes_list)} image(s).")
      return images_response
    except Exception as e:
      print(f"Error generating image: {str(e)}")
      traceback.print_exc()
      return None
