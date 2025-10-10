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
from google.genai.types import GenerateVideosConfig, Image, HttpOptions, GeneratedVideo
from models.video import video_request_models
from models.video.video_gen_models import Video, VideoGenerationResponse

DEFAULT_MODEL_NAME = "veo-3.0-generate-001"


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
        http_options=HttpOptions(headers={"User-Agent": settings.USER_AGENT}),
    )

  def generate_video(
      self,
      story_id: str,
      output_gcs_uri: str,
      video_segment: video_request_models.VideoSegmentRequest,
      wait: bool | None = True,
  ) -> VideoGenerationResponse:
    """
    Generates a video using Veo.

    Args:
        story_id: The ID of the story.
        output_gcs_uri: The GCS URI where the output video will be stored.
        video_segment: The VideoSegmentRequest containing video generation
                       parameters.
        wait: If True, the method waits for the video generation to
              complete. Otherwise, it returns immediately with the
              operation name.

    Returns:
        A VideoGenerationResponse object indicating the status of the
        video generation.
    """
    logging.info(
        "DreamBoard - VIDEO_GENERATOR: Starting video generation for "
        "story id %s and video segment %s...",
        story_id,
        video_segment.segment_number,
    )
    if video_segment.seed_image:
      image_uri = video_segment.seed_image.gcs_uri
      # Image to Video generation
      operation = self.client.models.generate_videos(
          model=DEFAULT_MODEL_NAME,
          prompt=video_segment.prompt,
          image=Image(
              gcs_uri=image_uri,
              mime_type=video_segment.seed_image.mime_type,
          ),
          config=GenerateVideosConfig(
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
          ),
      )

    else:
      # Text to Video generation
      operation = self.client.models.generate_videos(
          model=DEFAULT_MODEL_NAME,
          prompt=video_segment.prompt,
          config=GenerateVideosConfig(
              number_of_videos=video_segment.sample_count,
              output_gcs_uri=output_gcs_uri,
              fps=video_segment.frames_per_sec,
              duration_seconds=video_segment.duration_in_secs,
              aspect_ratio=video_segment.aspect_ratio,
              person_generation=video_segment.person_generation,
              enhance_prompt=video_segment.enhance_prompt,
              negative_prompt=video_segment.negative_prompt,
              generate_audio=video_segment.generate_audio,
          ),
      )

    # For asynchronous request, return immediately
    if not wait:
      return VideoGenerationResponse(
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
        return VideoGenerationResponse(
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
        file_name = utils.get_file_name_from_uri(gen_video.video.uri)
        gcs_fuse_path = f"{gcs_fuse}/{scene_folder}/{file_name}"
        videos.append(
            Video(
                id=uuid.uuid4(),
                name=f"{scene_folder}/{file_name}",
                gcs_uri=gen_video.video.uri,
                # Get a signed URI for direct access
                signed_uri=utils.get_signed_uri_from_gcs_uri(
                    gen_video.video.uri
                ),
                gcs_fuse_path=gcs_fuse_path,
                mime_type="video/mp4",
                duration=video_segment.duration_in_secs,
                frames_uris=[],
            )
        )

      return VideoGenerationResponse(
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

      return VideoGenerationResponse(
          done=False,
          operation_name=operation.name,
          execution_message=(
              f"There was an error generating the video: {operation.error}"
          ),
          videos=[],
          video_segment=video_segment,
      )

  def generate_video_for_agent(
      self,
      video_segment: video_request_models.VideoSegmentRequest,
      output_gcs_uri: str | None = None,
  ) -> list[GeneratedVideo] | None:
    """Generates a Veo video for an agent tool call
    Args:
        output_gcs_uri: The GCS URI where the output video will be stored.
        video_segment: The VideoSegmentRequest containing video generation
                        parameters.

    Returns:
        A list of VideoGenerationResponse objects indicating the status of the
        video generation.

    """
    operation = self.client.models.generate_videos(
        model=DEFAULT_MODEL_NAME,
        prompt=video_segment.prompt,
        config=GenerateVideosConfig(
            number_of_videos=video_segment.sample_count,
            output_gcs_uri=output_gcs_uri,
            fps=video_segment.frames_per_sec,
            duration_seconds=video_segment.duration_in_secs,
            aspect_ratio=video_segment.aspect_ratio,
            person_generation=video_segment.person_generation,
            enhance_prompt=video_segment.enhance_prompt,
            negative_prompt=video_segment.negative_prompt,
            generate_audio=video_segment.generate_audio,
        ),
    )

    while not operation.done:
      time.sleep(15)
      operation = self.client.operations.get(operation)
      print(operation)

    if operation.response:
      return operation.result.generated_videos
    else:
      return None
