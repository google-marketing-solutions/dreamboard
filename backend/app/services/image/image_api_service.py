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
import uuid
from typing import List
from google import genai
from google.genai import types
from models import request_models
from models.image import image_request_models
from models.image import image_gen_models
import utils
from services.storage_service import storage_service

EDITING_MODEL_NAME = "imagen-3.0-capability-001"


class ImageAPIService:
  """
  Handles interactions with the Imagen API for image generation and editing.

  This class initializes the Imagen client and provides methods to create
  reference image objects, generate new images, and edit existing ones.
  """

  client: genai.Client = None

  def __init__(self):
    """
    Initializes the ImageAPIService by setting up the Google Generative AI
    client.

    The client is configured to use Vertex AI and retrieves project ID and
    location from environment variables.
    """
    self.client = genai.Client(
        vertexai=True,
        project=os.getenv("PROJECT_ID"),
        location=os.getenv("LOCATION"),
    )

  def _create_reference_objects(
      self, reference_images: List[image_gen_models.ImageReference]
  ):
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
        case image_gen_models.IMAGE_REFERENCE_TYPES.RAW.value:
          current_reference = types.RawReferenceImage(
              reference_id=ref.reference_id, reference_image=ref_image
          )
        case image_gen_models.IMAGE_REFERENCE_TYPES.MASK.value:
          current_reference = types.MaskReferenceImage(
              reference_id=ref.reference_id,
              reference_image=ref_image,
              config=types.MaskReferenceConfig(
                  mask_mode=ref.mask_mode,
                  mask_dilation=ref.mask_dilation,
                  segmentation_classes=ref.segmentation_classes,
              ),
          )
        case image_gen_models.IMAGE_REFERENCE_TYPES.STYLE.value:
          current_reference = types.StyleReferenceImage(
              reference_id=ref.reference_id,
              config=types.StyleReferenceConfig(
                  style_description=ref.description
              ),
              reference_image=ref_image,
          )
        case image_gen_models.IMAGE_REFERENCE_TYPES.CONTROLLED.value:
          current_reference = types.ControlReferenceImage(
              reference_id=ref.reference_id,
              config=types.ControlReferenceConfig(
                  control_type=ref.reference_subtype,
                  enable_control_image_computation=ref.enable_control_image_computation,
              ),
              reference_image=ref_image,
          )
        case image_gen_models.IMAGE_REFERENCE_TYPES.SUBJECT.value:
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
          f"{utils.get_images_bucket_path(generation_id)}/{scene.id}"
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
          model=EDITING_MODEL_NAME,
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

    responsible_AI_reason = (
        response.generated_images[0].rai_filtered_reason
        if response.generated_images
        else None
    )
    if responsible_AI_reason:
      raise ValueError(responsible_AI_reason)

    # Extract generated image data from the API response.
    image_parts = [image.image for image in response.generated_images]

    # Process and store the generated images.
    for part in image_parts:
      # Update the scene object with generated image details.
      scene.image_uris.append(part.gcs_uri)
      scene.image_content_type = part.mime_type
      logging.debug("Scene Id: %s, image uri: %s", scene.id, part.gcs_uri)

  def generate_images_gemini_editor(
      self,
      output_gcs_uri: str,
      image_gen_operation: image_request_models.ImageGenerationOperation,
  ) -> image_gen_models.GenericImageGenerationResponse:
    """"""
    client = genai.Client(
        vertexai=True,
        project=os.getenv("PROJECT_ID"),
        location="global",  # Nano Banana region is different...
    )
    # Use preview models until release
    if os.getenv("USE_PREVIEW_GEMINI_IMAGE_MODEL") == "True":
      image_gen_operation.image_model = (
          image_request_models.GEMINI_3_PRO_IMAGE_MODEL_NAME_PREVIEW
      )

    contents = [image_gen_operation.prompt]
    # Add reference images if any
    if image_gen_operation.reference_images:
      for ref_image_obj in image_gen_operation.reference_images:
        ref_image = types.Part.from_uri(
            file_uri=ref_image_obj.gcs_uri, mime_type=ref_image_obj.mime_type
        )
        contents.append(ref_image)

    # Call Nano Banana API
    response = client.models.generate_content(
        model=image_gen_operation.image_model,
        contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=image_gen_operation.response_modalities,
            image_config=types.ImageConfig(
                aspect_ratio=image_gen_operation.aspect_ratio,
                image_size=image_gen_operation.resolution,
            ),
            tools=[{"google_search": {}}],
        ),
    )
    # Process generated images
    images: list[image_gen_models.Image] = []
    for part in response.parts:
      if part.text is not None:
        print(part.text)
      elif image := part.as_image():
        # Since automatic storage is not supported, upload it to GCS
        format = image.mime_type.split("/")[1]
        image_name = f"{int(time.time())}.{format}"  # unique image name
        final_output_gcs_uri = f"{output_gcs_uri}/{image_name}"
        blob = storage_service.upload_from_bytes(
            final_output_gcs_uri, image.image_bytes, image.mime_type
        )
        gcs_uri = f"{utils.get_images_bucket()}/{blob.name}"
        img = image_gen_models.Image(
            id=uuid.uuid4(),
            name=image_name,
            gcs_uri=gcs_uri,
            signed_uri=utils.get_signed_uri_from_gcs_uri(gcs_uri),
            gcs_fuse_path="",
            mime_type=image.mime_type,
        )
        images.append(img)

    return image_gen_models.GenericImageGenerationResponse(
        id=image_gen_operation.id,
        images=images,
    )
