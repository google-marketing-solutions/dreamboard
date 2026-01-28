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
A class for managing communication with the Veo API.

This class provides methods for sending requests to and receiving responses
from the Veo API.
"""

import logging
import os
import time
import uuid
import utils
from core.config import settings
from google import genai
from google.genai import types
from models.video import video_request_models
from models.video import video_gen_models


class VeoAPIService:
  """Class that handles interactions with the Veo API."""

  def __init__(self):
    """Initializes the VeoAPIService."""
    # Initialize the Generative AI client with project and location.
    print("OS Variable is: ", os.getenv("PROJECT_ID"))
    self.client = genai.Client(
        vertexai=True,
        project=os.getenv("PROJECT_ID"),
        location=os.getenv("LOCATION"),
        http_options=types.HttpOptions(
            headers={"User-Agent": settings.USER_AGENT}
        ),
    )

  def generate_video(
      self,
      story_id: str,
      output_gcs_uri: str,
      video_segment: video_request_models.VideoSegmentGenerationOperation,
      wait: bool | None = True,
  ) -> video_gen_models.VideoGenerationResponse:
    """
    Generates a video using Veo.

    Args:
        story_id (str): The ID of the story.
        output_gcs_uri (str): The GCS URI where the output video will be stored.
        video_segment (video_request_models.VideoSegmentGenerationOperation): The
            VideoSegmentGenerationOperation containing video generation parameters.
        wait (bool | None): If True, the method waits for the video generation to
            complete. Otherwise, it returns immediately with the operation name.

    Returns:
        video_gen_models.VideoGenerationResponse: A VideoGenerationResponse object
        indicating the status of the video generation.
    """
    logging.info(
        "DreamBoard - VIDEO_GENERATOR: Starting video generation for "
        "story id %s and video segment %s...",
        story_id,
        video_segment.id,
    )
    retries = 3
    for this_retry in range(retries):
      try:
        operation = None
        if (
            video_segment.video_model == video_request_models.VEO_3_MODEL_NAME
            or video_segment.video_model
            == video_request_models.VEO_3_FAST_MODEL_NAME
        ):
          # Image to Video in Veo 3.0
          if len(video_segment.seed_images) == 1:
            operation = self.generate_video_single_image_to_video_operation(
                output_gcs_uri, video_segment
            )
          else:
            # Text to Video generation in Veo 3.0
            operation = self.generate_video_text_to_video_operation(
                output_gcs_uri, video_segment
            )
        elif (
            video_segment.video_model == video_request_models.VEO_3_1_MODEL_NAME
            or video_segment.video_model
            == video_request_models.VEO_3_1_FAST_MODEL_NAME
        ):
          # Image to Video in Veo 3.1
          if len(video_segment.seed_images) > 0:
            # Request with 1 image is the same as Veo 3.0
            if len(video_segment.seed_images) == 1:
              operation = self.generate_video_single_image_to_video_operation(
                  output_gcs_uri, video_segment
              )
            elif len(video_segment.seed_images) > 1:
              # Workaround since new features are only supported in preview versions of the model
              if (
                  os.getenv("USE_PREVIEW_VIDEO_MODEL") == "True"
                  and video_segment.video_model
                  == video_request_models.VEO_3_1_MODEL_NAME
              ):
                video_segment.video_model = (
                    video_request_models.VEO_3_1_MODEL_NAME_PREVIEW
                )
              elif (
                  os.getenv("USE_PREVIEW_VIDEO_MODEL") == "True"
                  and video_segment.video_model
                  == video_request_models.VEO_3_1_FAST_MODEL_NAME
              ):
                video_segment.video_model = (
                    video_request_models.VEO_3_1_FAST_MODEL_NAME_PREVIEW
                )

              # Multiple images support
              if (
                  video_segment.video_gen_task
                  == video_request_models.VideoGenTasks.REFERENCE_TO_VIDEO.value
              ):
                operation = (
                    self.generate_video_multiple_images_to_video_operation(
                        output_gcs_uri, video_segment
                    )
                )
                if isinstance(operation, tuple):
                  # For some reason this is a tuple...
                  operation = operation[0]
              elif (
                  video_segment.video_gen_task
                  == video_request_models.VideoGenTasks.IMAGE_TO_VIDEO.value
              ):
                operation = (
                    self.generate_video_first_last_frame_to_video_operation(
                        output_gcs_uri, video_segment
                    )
                )
                if isinstance(operation, tuple):
                  # For some reason this is a tuple...
                  operation = operation[0]

          elif len(video_segment.selected_videos_for_extension) > 0:
            # Video to Video extension
            operation = (
                self.generate_video_single_video_to_video_extension_operation(
                    output_gcs_uri, video_segment
                )
            )
          else:
            # Text to Video generation
            operation = self.generate_video_text_to_video_operation(
                output_gcs_uri, video_segment
            )

        # Return of no operation available
        if not operation:
          return video_gen_models.VideoGenerationResponse(
              done=False,
              operation_name="None",
              execution_message=(
                  "ERROR: Operation not completed. Please try again"
              ),
              videos=[],
              video_segment=video_segment,
          )

        # For asynchronous request, return immediately
        if not wait:
          return video_gen_models.VideoGenerationResponse(
              done=False,
              operation_name=operation.name,
              execution_message=(
                  "The video is generating and process did not "
                  "wait for response. Please check later."
              ),
              videos=[],
              video_segment=video_segment,
          )

        # Poll until the video generation operation is complete
        while not operation.done:
          time.sleep(15)  # Wait for 15 seconds before polling again
          operation = self.client.operations.get(operation)
          logging.info(operation)

        # Process the response if the operation was successful
        if operation.response:
          gen_videos = operation.result.generated_videos
          # Check if any videos were actually generated
          if not operation.result.generated_videos:
            return video_gen_models.VideoGenerationResponse(
                done=False,
                operation_name=operation.name,
                execution_message=(
                    "Videos were not generated. It could be "
                    "due to AI policies and filters. Please try again."
                ),
                videos=[],
                video_segment=video_segment,
            )

          logging.info(
              "Operation %s completed. Generated videos %s",
              operation.name,
              str(gen_videos),
          )
          videos = []
          for gen_video in gen_videos:
            # Construct GCS FUSE path for the generated video
            gcs_fuse = utils.get_videos_gcs_fuse_path(story_id)
            scene_folder = utils.get_scene_folder_path_from_uri(
                uri=gen_video.video.uri
            )
            scene_folder_parts = scene_folder.split("/")
            scene_folder_part = "".join(scene_folder_parts[1:])
            file_name = utils.get_file_name_from_uri(gen_video.video.uri)
            gcs_fuse_path = f"{gcs_fuse}/{scene_folder}/{file_name}"
            videos.append(
                video_gen_models.Video(
                    id=uuid.uuid4(),
                    name=f"{scene_folder_part}/{file_name}",
                    gcs_uri=gen_video.video.uri,
                    # Get a signed URI for direct access
                    signed_uri=utils.get_signed_uri_from_gcs_uri(
                        gen_video.video.uri
                    ),
                    gcs_fuse_path=gcs_fuse_path,
                    mime_type="video/mp4",
                    duration=video_segment.duration_in_secs,
                )
            )

          return video_gen_models.VideoGenerationResponse(
              done=True,
              operation_name=operation.name,
              execution_message=(
                  f"Video generated successfully in path {output_gcs_uri}"
              ),
              videos=videos,
              video_segment=video_segment,
          )
        else:
          # Handle errors during video generation
          logging.info(
              "There was an error generating the video: %s.", operation.error
          )

          return video_gen_models.VideoGenerationResponse(
              done=False,
              operation_name=operation.name,
              execution_message=(
                  f"There was an error generating the video: {operation.error}"
              ),
              videos=[],
              video_segment=video_segment,
          )

      except Exception as ex:
        error_message = str(ex)
        logging.error("ERROR: %s\n", error_message)

        # Check quota issues for now
        if (
            "429" in error_message
            or "503" in error_message
            or "500" in error_message
        ):
          print(
              f"Error {error_message}. Retrying {retries} times using"
              f" exponential backoff. Retry number {this_retry + 1}...\n"
          )
          # Retry request
          wait = 10 * 2**this_retry
          time.sleep(wait)
        else:
          print(
              f"ERROR: the following issue can't be retried: {error_message}\n"
          )
          # Raise exception for non-retriable errors
          raise

  def get_generic_generation_config(
      self,
      output_gcs_uri: str,
      video_segment: video_request_models.VideoSegmentGenerationOperation,
  ) -> types.GenerateVideosConfig:
    """Gets the generation configuration for Veo 3.0.

    Args:
        output_gcs_uri (str): The GCS URI where the output video will be stored.
        video_segment (video_request_models.VideoSegmentGenerationOperation): The
            VideoSegmentGenerationOperation containing video generation parameters.

    Returns:
        types.GenerateVideosConfig: A GenerateVideosConfig object for Veo 3.0.
    """
    config = types.GenerateVideosConfig(
        number_of_videos=video_segment.sample_count,
        output_gcs_uri=output_gcs_uri,
        fps=video_segment.frames_per_sec,
        duration_seconds=video_segment.duration_in_secs,
        aspect_ratio=video_segment.aspect_ratio,
        person_generation=video_segment.person_generation,
        resolution=video_segment.output_resolution,
        enhance_prompt=video_segment.enhance_prompt,
        negative_prompt=video_segment.negative_prompt,
        generate_audio=video_segment.generate_audio,
    )
    return config

  def generate_video_text_to_video_operation(
      self,
      output_gcs_uri: str,
      video_segment: video_request_models.VideoSegmentGenerationOperation,
  ):
    """Generates a video from a text prompt.

    Args:
        output_gcs_uri (str): The GCS URI where the output video will be stored.
        video_segment (video_request_models.VideoSegmentGenerationOperation): The
            VideoSegmentGenerationOperation containing video generation parameters.

    Returns:
        types.GenerateVideosOperation: The video generation operation.
    """
    # Generate videos
    operation = self.client.models.generate_videos(
        model=video_segment.video_model,
        prompt=video_segment.prompt,
        config=self.get_generic_generation_config(
            output_gcs_uri, video_segment
        ),
    )

    return operation

  def generate_video_single_image_to_video_operation(
      self,
      output_gcs_uri: str,
      video_segment: video_request_models.VideoSegmentGenerationOperation,
  ):
    """Generates a video from a single seed image and a prompt.

    Args:
        output_gcs_uri (str): The GCS URI where the output video will be stored.
        video_segment (video_request_models.VideoSegmentGenerationOperation): The
            VideoSegmentGenerationOperation containing video generation parameters,
            including the seed image.

    Returns:
        types.GenerateVideosOperation: The video generation operation.
    """
    seed_image = video_segment.seed_images[0]
    # Generate videos
    operation = self.client.models.generate_videos(
        model=video_segment.video_model,
        prompt=video_segment.prompt,
        image=types.Image(
            gcs_uri=seed_image.gcs_uri,
            mime_type=seed_image.mime_type,
        ),
        config=self.get_generic_generation_config(
            output_gcs_uri, video_segment
        ),
    )
    return operation

  def generate_video_multiple_images_to_video_operation(
      self,
      output_gcs_uri: str,
      video_segment: video_request_models.VideoSegmentGenerationOperation,
  ):
    """Generates a video from multiple reference images and a prompt.

    Args:
        output_gcs_uri (str): The GCS URI where the output video will be stored.
        video_segment (video_request_models.VideoSegmentGenerationOperation): The
            VideoSegmentGenerationOperation containing video generation parameters,
            including reference images.

    Returns:
        types.GenerateVideosOperation: The video generation operation.
    """
    ref_images = []
    for seed_image in video_segment.seed_images:
      image = types.Image(
          gcs_uri=seed_image.gcs_uri,
          mime_type=seed_image.mime_type,
      )
      ref_image = types.VideoGenerationReferenceImage(
          image=image, reference_type="asset"
      )
      ref_images.append(ref_image)
    # Generate videos
    operation = (
        self.client.models.generate_videos(
            model=video_segment.video_model,
            prompt=video_segment.prompt,
            config=types.GenerateVideosConfig(
                number_of_videos=video_segment.sample_count,
                output_gcs_uri=output_gcs_uri,
                fps=video_segment.frames_per_sec,
                duration_seconds=video_segment.duration_in_secs,
                aspect_ratio=video_segment.aspect_ratio,
                person_generation=video_segment.person_generation,
                resolution=video_segment.output_resolution,
                enhance_prompt=video_segment.enhance_prompt,
                negative_prompt=video_segment.negative_prompt,
                generate_audio=video_segment.generate_audio,
                reference_images=ref_images,
            ),
        ),
    )

    return operation

  def generate_video_first_last_frame_to_video_operation(
      self,
      output_gcs_uri: str,
      video_segment: video_request_models.VideoSegmentGenerationOperation,
  ):
    """Generates a video using a first and last frame as guidance.

    Args:
        output_gcs_uri (str): The GCS URI where the output video will be stored.
        video_segment (video_request_models.VideoSegmentGenerationOperation): The
            VideoSegmentGenerationOperation containing video generation parameters,
            including the first and last frame images.

    Returns:
        types.GenerateVideosOperation: The video generation operation.
    """
    first_frame = video_segment.seed_images[0]
    last_frame = video_segment.seed_images[-1]
    last_frame_image = types.Image(
        gcs_uri=last_frame.gcs_uri,
        mime_type=last_frame.mime_type,
    )
    # Generate videos
    operation = (
        self.client.models.generate_videos(
            model=video_segment.video_model,
            prompt=video_segment.prompt,
            image=types.Image(  # First frame is part of operation object image=first_frame
                gcs_uri=first_frame.gcs_uri,
                mime_type=first_frame.mime_type,
            ),
            config=types.GenerateVideosConfig(
                number_of_videos=video_segment.sample_count,
                output_gcs_uri=output_gcs_uri,
                fps=video_segment.frames_per_sec,
                duration_seconds=video_segment.duration_in_secs,
                aspect_ratio=video_segment.aspect_ratio,
                person_generation=video_segment.person_generation,
                resolution=video_segment.output_resolution,
                enhance_prompt=video_segment.enhance_prompt,
                negative_prompt=video_segment.negative_prompt,
                generate_audio=video_segment.generate_audio,
                last_frame=last_frame_image,
            ),
        ),
    )

    return operation

  def generate_video_single_video_to_video_extension_operation(
      self,
      output_gcs_uri: str,
      video_segment: video_request_models.VideoSegmentGenerationOperation,
  ) -> types.GenerateVideosOperation:
    """
    Generates a video extension from a single video.

    Args:
        output_gcs_uri (str): The GCS URI where the output video will be stored.
        video_segment (video_request_models.VideoSegmentGenerationOperation): The
            VideoSegmentGenerationOperation containing video generation parameters.

    Returns:
        types.GenerateVideosOperation: The video generation operation.
    """
    video = video_segment.selected_videos_for_extension[0]
    # Generate videos
    operation = self.client.models.generate_videos(
        model=video_segment.video_model,
        video=types.Video(
            uri=video.gcs_uri,
            mime_type=video.mime_type,
        ),  # This must be a video from a previous generation
        prompt=video_segment.prompt,
        config=self.get_generic_generation_config(
            output_gcs_uri, video_segment
        ),
    )

    return operation
