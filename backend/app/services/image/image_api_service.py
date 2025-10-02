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
A class for managing communication with the Imagen API.

This class provides methods for sending requests to and receiving responses
from the Imagen API.
"""

import logging
import os
import time
from typing import List
import traceback

from google import genai
from google.genai import types
from models import request_models
from models.image.image_gen_models import IMAGE_REFERENCE_TYPES, ImageReference
from utils import get_images_bucket_path

from google.genai.types import GenerateImagesResponse

DEFAULT_MODEL_NAME = "imagen-3.0-generate-002"


class ImageService:
  """
  Handles interactions with the Imagen API for image generation and editing.

  This class initializes the Imagen client and provides methods to create
  reference image objects, generate new images, and edit existing ones.
  """

  client: genai.Client = None

  def __init__(self):
    """
    Initializes the ImageService by setting up the Google Generative AI
    client.

    The client is configured to use Vertex AI and retrieves project ID and
    location from environment variables.
    """
    self.client = genai.Client(
        vertexai=True,
        project=os.getenv("PROJECT_ID"),
        location=os.getenv("LOCATION"),
    )

  def _create_reference_objects(self, reference_images: List[ImageReference]):
    """
    Converts a list of custom ImageReference objects into Imagen
    API-compatible reference image objects.

    This method supports converting image data from bytes or Google Cloud
    Storage URIs into various Imagen reference types (RAW, MASK, STYLE,
    CONTROLLED, SUBJECT).

    Args:
        reference_images: A list of `ImageReference` objects, each
                          containing information about a reference image.

    Returns:
        A list of Imagen API reference image objects
        (e.g., `types.RawReferenceImage`, `types.MaskReferenceImage`, etc.)
        that can be used in `edit_image` calls.
    """
    final_reference = []
    current_reference = None
    # TODO: add try/catch block for robust error handling during reference
    # object creation.
    for ref in reference_images:
      # Check if the reference image is provided as bytes or a GCS URI.
      if ref.image_bytes is not None:
        ref_image = types.Image(
            mime_type=ref.mime_type, image_bytes=ref.image_bytes
        )
      elif ref.gcs_uri:
        ref_image = types.Image.from_file(location=ref.gcs_uri)
      else:
        # No valid image source provided for reference or not needed.
        ref_image = None

      # Map the custom reference type to the corresponding Imagen API
      # reference object.
      match ref.reference_type:
        case IMAGE_REFERENCE_TYPES.RAW.value:
          current_reference = types.RawReferenceImage(
              reference_id=ref.reference_id, reference_image=ref_image
          )
        case IMAGE_REFERENCE_TYPES.MASK.value:
          current_reference = types.MaskReferenceImage(
              reference_id=ref.reference_id,
              reference_image=ref_image,
              config=types.MaskReferenceConfig(
                  mask_mode=ref.mask_mode,
                  mask_dilation=ref.mask_dilation,
                  segmentation_classes=ref.segmentation_classes,
              ),
          )
        case IMAGE_REFERENCE_TYPES.STYLE.value:
          current_reference = types.StyleReferenceImage(
              reference_id=ref.reference_id,
              config=types.StyleReferenceConfig(
                  style_description=ref.description
              ),
              reference_image=ref_image,
          )
        case IMAGE_REFERENCE_TYPES.CONTROLLED.value:
          current_reference = types.ControlReferenceImage(
              reference_id=ref.reference_id,
              config=types.ControlReferenceConfig(
                  control_type=ref.reference_subtype,
                  enable_control_image_computation=ref.enable_control_image_computation,
              ),
              reference_image=ref_image,
          )
        case IMAGE_REFERENCE_TYPES.SUBJECT.value:
          current_reference = types.SubjectReferenceImage(
              reference_id=ref.reference_id,
              # reference_type=ref.reference_subtype,
              reference_image=ref_image,
              config=types.SubjectReferenceConfig(
                  subject_type=ref.reference_subtype,
                  subject_description=ref.description,
              ),
          )
        case _:
          # TODO: Log a warning or raise an error for unsupported
          # types.
          current_reference = None

      if current_reference:
        final_reference.append(current_reference)

    return final_reference

  def generate_image(self, generation_id: str, scene: request_models.Scene):
    """
    Generates or edits images based on the provided scene details and stores
    them.

    This method handles both direct image generation and image editing
    using reference images. It determines the output GCS URI, calls the
    appropriate Imagen API method, and then processes the generated images
    by updating the scene object with image IDs and URIs.

    Args:
        generation_id: A unique identifier for the current generation batch,
                    used to construct the Cloud Storage path.
        scene: A `Scene` object containing all necessary details for image
            generation or editing, including prompts, configuration, and
            potential reference image information.
    """

    # Determine the Cloud Storage URI for output images.
    if generation_id is None or generation_id == "":
      output_gcs_uri = scene.creative_dir.output_gcs_uri
    else:
      output_gcs_uri = (
          f"{get_images_bucket_path(generation_id)}/{scene.scene_num}"
      )

    logging.info("Starting image generation for folder %s...", output_gcs_uri)

    if scene.use_reference_image_for_image:
      # Prepare reference image objects if editing an existing image.
      ref_images = self._create_reference_objects(scene.reference_images)

      # TODO: Determine different types of edit mode when UI is ready.

      # Determine image compression quality based on content type.
      compression_quality = (
          None
          if scene.image_content_type == "image/png"
          else scene.creative_dir.output_compression_quality
      )

      # Define configuration parameters for image editing.
      edit_config_params = {
          "edit_mode": scene.edit_mode,
          "number_of_images": scene.creative_dir.number_of_images,
          "person_generation": scene.creative_dir.person_generation,
          "aspect_ratio": scene.creative_dir.aspect_ratio,
          "safety_filter_level": scene.creative_dir.safety_filter_level,
          "output_gcs_uri": output_gcs_uri,
          "negative_prompt": scene.creative_dir.negative_prompt,
          "language": scene.creative_dir.language,
          "output_compression_quality": compression_quality,
          "include_rai_reason": True,
      }

      # Call the Imagen API to edit the image.
      response = self.client.models.edit_image(
          model=DEFAULT_MODEL_NAME,
          prompt=scene.img_prompt,
          reference_images=ref_images,
          config=types.EditImageConfig(**edit_config_params),
      )

    else:
      # Define configuration parameters for image generation.
      generate_config_params = {
          "number_of_images": scene.creative_dir.number_of_images,
          "output_mime_type": scene.creative_dir.output_mime_type,
          "person_generation": scene.creative_dir.person_generation,
          "aspect_ratio": scene.creative_dir.aspect_ratio,
          "safety_filter_level": scene.creative_dir.safety_filter_level,
          "output_gcs_uri": output_gcs_uri,
          "negative_prompt": scene.creative_dir.negative_prompt,
          "language": scene.creative_dir.language,
          "output_compression_quality": (
              scene.creative_dir.output_compression_quality
          ),
          "enhance_prompt": scene.creative_dir.enhance_prompt,
          "include_rai_reason": True,
      }

      # Call the Imagen API to generate new images.
      response = self.client.models.generate_images(
          model=scene.creative_dir.model,
          prompt=scene.img_prompt,
          config=types.GenerateImagesConfig(**generate_config_params),
      )

    responsible_AI_reason = response.generated_images[0].rai_filtered_reason
    if responsible_AI_reason:
      raise ValueError(responsible_AI_reason)

    # Extract generated image data from the API response.
    image_parts = [image.image for image in response.generated_images]

    # Process and store the generated images.
    current_time = int(time.time())
    for i, part in enumerate(image_parts):
      # Generate a unique scene ID for each image.
      scene_id = f"{str(current_time)}{str(i)}"
      # Get the GCS URI of the generated image.
      scene_img_uri = part.gcs_uri

      # Update the scene object with generated image details.
      scene.scene_id.append(scene_id)
      scene.image_uri.append(scene_img_uri)
      scene.image_content_type = part.mime_type
      logging.debug("Scene Id: %s, image_uri: %s", scene_id, scene_img_uri)

  def generate_images_for_agent(
      self, scene: request_models.Scene, output_gcs_uri: str | None = None
  ) -> GenerateImagesResponse | None:
    """
    Generates images based on a text prompt using Imagen.

    Args:


    Returns:
        A list of image bytes (PNG format) if successful, None otherwise.
    """
    try:
      print(
          f"Generating {scene.creative_dir.number_of_images} image(s) for"
          f" prompt: '{scene.img_prompt[:100]}...'"
      )

      # Full list of possible params here:
      # https://github.com/googleapis/python-aiplatform/blob/667b66587021d37f765ba12aad0b244a00537089/vertexai/vision_models/_vision_models.py#L648
      # TODO: add ability to do product placement, masks, etc.
      generate_config_params = {
          "number_of_images": scene.creative_dir.number_of_images,
          "output_mime_type": scene.creative_dir.output_mime_type,
          "person_generation": scene.creative_dir.person_generation,
          "aspect_ratio": scene.creative_dir.aspect_ratio,
          "safety_filter_level": scene.creative_dir.safety_filter_level,
          "output_gcs_uri": output_gcs_uri,
          "negative_prompt": scene.creative_dir.negative_prompt,
          "language": scene.creative_dir.language,
          "output_compression_quality": (
              scene.creative_dir.output_compression_quality
          ),
          "enhance_prompt": scene.creative_dir.enhance_prompt,
          "include_rai_reason": False,
      }

      image_responses = self.client.models.generate_images(
          model=scene.creative_dir.model,
          prompt=scene.img_prompt,
          config=types.GenerateImagesConfig(**generate_config_params),
      )

      if not image_responses:
        print("Image generation returned no images.")
        return None

      # image_bytes_list = [img._image_bytes for img in images_response]
      # print(f"Successfully generated {len(image_bytes_list)} image(s).")
      return image_responses
    except Exception as e:
      print(f"Error generating image: {str(e)}")
      traceback.print_exc()
      return None