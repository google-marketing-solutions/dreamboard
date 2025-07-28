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
import time
import traceback
from typing import Optional

from google import genai
from google.genai.types import GenerateVideosConfig, HttpOptions, GeneratedVideo


class VideoService:

  def __init__(
      self, project_id: Optional[str] = None, location: Optional[str] = None
  ):
    """
    Initializes the Video Service.

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

      self.client = genai.Client(
          vertexai=True, project=self.project_id, location=self.location
      )

    except Exception as e:
      print(f"Error initializing ImagenService: {str(e)}")
      traceback.print_exc()
      raise

  def generate_videos(
      self,
      prompt: str,
      model: str = "veo-2.0-generate-001",
      aspect_ratio: str = "16:9",
      output_gcs_uri: Optional[str] = None,
      http_options: Optional[HttpOptions] = None,
      number_of_videos: Optional[int] = None,
      duration_seconds: Optional[int] = None,
      fps: Optional[int] = None,
      seed: Optional[int] = None,
      resolution: Optional[str] = None,
      person_generation: Optional[str] = None,
      pubsub_topic: Optional[str] = None,
      negative_prompt: Optional[str] = None,
      enhance_prompt: Optional[bool] = None,
  ) -> list[GeneratedVideo] | None:
    """Generates a video using the specified model
    Args:
        prompt: The prompt to use for video generation.
        model: The model to use for video generation.
        http_options: Optional HTTP options.
        number_of_videos: Optional number of videos to generate.
        output_gcs_uri: Optional GCS URI to store the generated video. If none returns video bytes
        fps: Optional frames per second for the generated video.
        duration_seconds: Optional duration in seconds for the generated video.
        seed: Optional seed for the random number generator.
        aspect_ratio: Optional aspect ratio for the generated video.
        resolution: Optional resolution for the generated video.
        person_generation: Optional person generation for the generated video.
        pubsub_topic: Optional Pub/Sub topic to publish the generated video.
        negative_prompt: Optional negative prompt to guide the video generation away from undesirable content.
        enhance_prompt: Optional flag to enhance the prompt for better video generation results.
    """
    operation = self.client.models.generate_videos(
        model=model,
        prompt=prompt,
        config=GenerateVideosConfig(
            output_gcs_uri=output_gcs_uri,
            aspect_ratio=aspect_ratio,
            http_options=http_options,
            number_of_videos=number_of_videos,
            duration_seconds=duration_seconds,
            fps=fps,
            seed=seed,
            resolution=resolution,
            pubsub_topic=pubsub_topic,
            enhance_prompt=enhance_prompt,
            negative_prompt=negative_prompt,
            person_generation=person_generation,
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
      print("/n")
      # print(operation.result.generated_videos[0].video.uri)
