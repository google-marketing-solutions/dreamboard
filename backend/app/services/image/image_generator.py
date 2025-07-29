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

import utils
from models import request_models
from models.image import image_request_models
from models.image.image_gen_models import Image, ImageGenerationResponse
from services.image.image_api_service import ImageService


class ImageGenerator:
    """
    Manages all image generation and editing tasks using the Imagen API.

    This class provides methods to process image requests, interact with the
    Imagen API via `ImageService`, and structure the generated image data
    into usable responses.
    """

    def __init__(self):
        """Initializes the ImageGenerator instance."""
        self.image_service = ImageService()

    def generate_images_from_scene(
        self, story_id: str, segments: request_models.SceneSegments
    ):
        """
        Processes each scene within a `SceneSegments` object for image
        generation or editing.

        This method iterates through the scenes and calls the `image_service`
        to generate or edit images for each one.

        Args:
            story_id: The unique identifier for the story.
            segments: A `SceneSegments` object containing the scenes to
                      process.
        """

        for scene in segments.get_scenes():
            logging.debug("\n%s\n", scene)  # Log the scene details.
            self.image_service.generate_image(story_id, scene)

    def generate_images_from_scenes(
        self, story_id: str, image_requests: image_request_models.ImageRequest
    ) -> list[ImageGenerationResponse]:
        """
        Generates images based on the provided request parameters for multiple
        scenes.

        This is the main entry point for batch image generation or editing.
        It prepares scenes, calls the image generation service, and then
        formats the results into a list of `ImageGenerationResponse` objects.

        Args:
            story_id: The unique identifier for the story.
            image_requests: An `ImageRequest` object containing details for
                            all scenes to be processed.

        Returns:
            A list of `ImageGenerationResponse` objects, each detailing the
            outcome of image generation for a scene.
        """

        segments = request_models.SceneSegments()

        # Add each image request scene to the `SceneSegments` collection.
        for image in image_requests.scenes:
            segments.add_image_segment(
                scene_num=image.scene_num,
                scene_type=1,  # Assuming 1 represents an image scene.
                img_prompt=image.img_prompt,
                creative_dir=image.creative_dir,
                reference_images=image.reference_images,
                use_reference_image_for_image=image.use_reference_image_for_image,
                edit_mode=image.edit_mode,
            )

        # Execute image generation for all scenes.
        self.generate_images_from_scene(story_id, segments)

        image_responses = []

        # Convert the generated scene data into `ImageGenerationResponse`
        # format.
        for scene in segments.get_scenes():
            final_images = []

            if len(scene.scene_id) < 1:
                # Handle cases where no images were generated for a scene.
                image_responses.append(
                    ImageGenerationResponse(
                        scene_ids="",
                        segment_number=scene.scene_num,
                        done=False,
                        operation_name="Generate Images",
                        execution_message=(
                            "Error. No images generated. Please try again."
                        ),
                        images=[],
                    )
                )
            else:
                # Collect `ImageGenerationResponse` for each successfully
                # generated image.
                for i, scene_name in enumerate(scene.scene_id):
                    # Construct GCS Fuse path for the image.
                    gcs_fuse = utils.get_images_gcs_fuse_path(story_id)
                    scene_folder = utils.get_scene_folder_path_from_uri(
                        uri=scene.image_uri[i]
                    )
                    image_name = utils.get_file_name_from_uri(scene.image_uri[i])
                    gcs_fuse_path = f"{gcs_fuse}/{scene_folder}/{image_name}"

                    # Create an `Image` object with all relevant details.
                    current_image = Image(
                        name=f"{scene_folder}/{image_name}",
                        gcs_uri=scene.image_uri[i],
                        signed_uri=utils.get_signed_uri_from_gcs_uri(
                            scene.image_uri[i]
                        ),
                        gcs_fuse_path=gcs_fuse_path,
                        mime_type=scene.image_content_type,
                    )

                    final_images.append(current_image)

                # Append the full response for the scene.
                image_responses.append(
                    ImageGenerationResponse(
                        scene_ids="|".join(id for id in scene.scene_id),
                        segment_number=scene.scene_num,
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
