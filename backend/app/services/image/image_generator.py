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
Class that manages all image generation tasks using Imagen API.

This module orchestrates the process of generating and editing images
by leveraging the Imagen API service. It handles scene segmentation,
API calls, and the structuring of responses.
"""

import logging
import uuid
import utils
import functools
from models import request_models
from models.image import image_request_models
from models.image import image_gen_models
from services.image.image_api_service import ImageAPIService


class ImageGenerator:
  """
  Manages all image generation and editing tasks using the Imagen API.

  This class provides methods to process image requests, interact with the
  Imagen API via `ImageAPIService`, and structure the generated image data
  into usable responses.
  """

  def __init__(self):
    """Initializes the ImageGenerator instance."""
    self.image_service = ImageAPIService()

  def generate_images_from_scenes(
      self, story_id: str, image_requests: image_request_models.ImageRequest
  ) -> list[image_gen_models.ImageGenerationResponse]:
    """
    Generates images based on the provided request parameters for multiple
    scenes.

    This is the main entry point for batch image generation or editing.
    It prepares scenes, calls the image generation service, and then
    formats the results into a list of `image_gen_models.ImageGenerationResponse` objects.

    Args:
        story_id: The unique identifier for the story.
        image_requests: An `ImageRequest` object containing details for
                        all scenes to be processed.

    Returns:
        A list of `image_gen_models.ImageGenerationResponse` objects, each detailing the
        outcome of image generation for a scene.
    """

    segments = request_models.SceneSegments()

    # Add each image request scene to the `SceneSegments` collection.
    for scene in image_requests.scenes:
      segments.add_image_segment(
          scene_id=scene.id,
          scene_type=1,  # Assuming 1 represents an image scene.
          img_prompt=scene.img_prompt,
          creative_dir=scene.creative_dir,
          reference_images=scene.reference_images,
          use_reference_image_for_image=scene.use_reference_image_for_image,
          edit_mode=scene.edit_mode,
      )

    # Execute image generation for all scenes.
    for scene in segments.scenes:
      logging.debug("\n%s\n", scene)  # Log the scene details.
      self.image_service.generate_image(story_id, scene)

    image_responses = []
    # Convert the generated scene data into `image_gen_models.ImageGenerationResponse`
    # format.
    for scene in segments.scenes:
      final_images = []
      if len(scene.image_uris) < 1:
        # Handle cases where no images were generated for a scene.
        image_responses.append(
            image_gen_models.ImageGenerationResponse(
                scene_id=scene.id,
                done=False,
                operation_name="Generate Images",
                execution_message=(
                    "Error. No images generated. Please try again."
                ),
                images=[],
            )
        )
      else:
        # Collect `image_gen_models.ImageGenerationResponse` for each successfully
        # generated image.
        for image_uri in scene.image_uris:
          # Construct GCS Fuse path for the image.
          gcs_fuse = utils.get_images_gcs_fuse_path(story_id)
          scene_folder = utils.get_scene_folder_path_from_uri(uri=image_uri)
          scene_folder_parts = scene_folder.split("/")
          scene_folder_part = "".join(scene_folder_parts[1:])
          image_name = utils.get_file_name_from_uri(image_uri)
          gcs_fuse_path = f"{gcs_fuse}/{scene_folder}/{image_name}"

          # Create an `Image` object with all relevant details.
          current_image = image_gen_models.Image(
              id=uuid.uuid4(),
              name=f"{scene_folder_part}/{image_name}",
              gcs_uri=image_uri,
              signed_uri=utils.get_signed_uri_from_gcs_uri(image_uri),
              gcs_fuse_path=gcs_fuse_path,
              mime_type=scene.image_content_type,
          )
          final_images.append(current_image)

        # Append the full response for the scene.
        image_responses.append(
            image_gen_models.ImageGenerationResponse(
                scene_id=scene.id,
                done=True,
                operation_name="Generate Images",
                execution_message="Image generated successfully.",
                images=final_images,
            )
        )

    logging.debug(
        "\nPrinting resulting image generation responses: %s\n",
        str(image_responses),
    )

    return image_responses

  def generate_images_from_scenes_gemini_editor(
      self,
      story_id: str,
      image_generation_request: image_request_models.ImageGenerationRequest,
  ) -> list[image_gen_models.GenericImageGenerationResponse]:
    """
    Generates images from scenes using the Gemini editor.

    Args:
        story_id: The unique identifier for the story.
        image_generation_request: An `ImageGenerationRequest` object containing
            parameters for image generation.

    Returns:
        A list of `GenericImageGenerationResponse` objects detailing the results.
    """
    logging.info(
        "DreamBoard - IMAGE_GENERATOR: Generating images for story %s",
        story_id,
    )

    # 1. Generate image generation tasks to execute in parallel
    image_gen_tasks = self.get_image_generation_tasks(
        story_id,
        image_generation_request.image_gen_operations,
    )

    # 2. Generate images using Nano Banana
    image_gen_responses = utils.execute_tasks_in_parallel(image_gen_tasks)

    return image_gen_responses

  def get_image_generation_tasks(
      self,
      story_id: str,
      image_generation_operations: image_request_models.ImageGenerationOperation,
  ):
    """
    Creates a list of partial functions for image generation tasks.

    Args:
        story_id: The unique identifier for the story.
        image_generation_operations: A list of `ImageGenerationOperation` objects
            defining the individual image generation tasks.

    Returns:
        A list of partial functions, each representing a ready-to-execute task.
    """
    tasks = []
    for image_gen_operation in image_generation_operations:
      output_gcs_uri = f"{utils.get_images_bucket_folder_path(story_id)}/{image_gen_operation.id}"
      tasks.append(
          functools.partial(
              self.image_service.generate_images_gemini_editor,
              output_gcs_uri,
              image_gen_operation,
          )
      )

    return tasks
