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

This file defines Pydantic models for structuring incoming request
payloads related to video generation, including video segments, creative
direction, and transitions.
"""

from enum import Enum
from typing import Optional, Tuple, Union
from models.image.image_gen_models import Image
from pydantic import BaseModel, Field


class VideoTransition(Enum):
  """
  Enum to represent available video transition types.

  These transitions define how one video segment flows into the next.
  """

  X_FADE = "X_FADE"
  WIPE = "WIPE"
  ZOOM = "ZOOM"
  ZOOM_WARP = "ZOOM_WARP"
  DIP_TO_BLACK = "DIP_TO_BLACK"
  CONCATENATE = "CONCATENATE"
  BLUR = "BLUR"
  SLIDE = "SLIDE"
  SLIDE_WARP = "SLIDE_WARP"
  FLICKER = "FLICKER"


class TextOverlayOptions(BaseModel):
  """
  Defines the styling and timing options for a text overlay on a video.

  Attributes:
      fontsize: The font size of the text.
      color: The color of the text (e.g., 'white', '#FF0000').
      font: The font to use (e.g., 'Arial').
      position: The position of the text. Can be a string ('center', 'left',
                'top', etc.) or a tuple (x, y) in pixels or relative floats.
      start_time: The time (in seconds) when the text should appear.
      duration: The duration (in seconds) the text should be visible.
      fade_duration: The duration (in seconds) for fade-in and fade-out effects.
      bg_color: The background color of the text box.
      stroke_color: The color of the text's stroke (outline).
      stroke_width: The width of the text's stroke.
  """

  fontsize: Optional[int] = 50
  color: Optional[str] = "white"
  font: Optional[str] = "Arial"
  position: Optional[
      Union[str, Tuple[Union[int, float, str], Union[int, float, str]]]
  ] = "center"
  start_time: Optional[float] = 0
  duration: Optional[float] = None
  fade_duration: Optional[float] = 0
  bg_color: Optional[str] = "transparent"
  stroke_color: Optional[str] = None
  stroke_width: Optional[float] = 1


class TextOverlay(BaseModel):
  """
  Represents a single text overlay to be applied to a video.
  """

  text: str
  options: TextOverlayOptions = Field(default_factory=TextOverlayOptions)


class TextOverlayRequest(BaseModel):
  """
  Represents a request to apply text overlays to a video.

  Attributes:
      gcs_video_path: The GCS URI of the input video.
      text_overlays: A list of `TextOverlay` objects to apply to the video.
  """

  gcs_video_path: str
  text_overlays: list[TextOverlay]


class VideoTransitionRequest(BaseModel):
  """
  Represents a request for a specific transition between two video segments.

  Attributes:
      type: The type of video transition to apply. Defaults to "X_FADE".
  """

  type: VideoTransition | None = "X_FADE"


class VideoItem(BaseModel):
  """
  Represents a video asset, typically used as an input or selection.

  Attributes:
      id: The unique identifier for the video.
      name: The name of the video file.
      gcs_uri: The Google Cloud Storage (GCS) URI of the video.
      signed_uri: A pre-signed URL for temporary public access to the video.
      gcs_fuse_path: The FUSE path if the GCS bucket is mounted locally.
      mime_type: The MIME type of the video (e.g., 'video/mp4').
      frame_uris: List of URIs for extracted frames, if any.
      duration: The duration of the generated video.
  """

  id: str
  name: str
  gcs_uri: str
  signed_uri: str
  gcs_fuse_path: str
  mime_type: str
  frame_uris: list[str] | None = None
  duration: float

class VideoModelName(Enum):
  """
  Defines the different types of video generation models supported.
  """
  VEO_3_1_MODEL_NAME = "veo-3.1-generate-001"
  VEO_3_1_FAST_MODEL_NAME = "veo-3.1-fast-generate-001"
  VEO_3_MODEL_NAME = "veo-3.0-generate-001"
  VEO_3_FAST_MODEL_NAME = "veo-3.0-fast-generate-001"

class VideoGenTasks(Enum):
  """
  Defines the different types of video generation tasks.
  """
  TEXT_TO_VIDEO = "text_to_video"
  IMAGE_TO_VIDEO = "image_to_video"
  REFERENCE_TO_VIDEO = "reference_to_video"
  VIDEO_EXTENSION = "video_extension"


class VideoSegmentGenerationOperation(BaseModel):
  """
  Represents a single segment within a larger video generation request.

  Each segment can specify its own prompt, seed image, and generation
  parameters.

  Attributes:
      scene_id: The ID of the scene this segment belongs to.
      segment_number: The sequence number of the segment.
      video_model: The video model to use for generation.
      video_gen_task: The specific generation task (e.g., text-to-video).
      prompt: The text prompt for generation.
      seed_images: List of seed images for image-to-video generation.
      duration_in_secs: Duration of the generated video in seconds.
      aspect_ratio: Aspect ratio of the generated video.
      frames_per_sec: Frames per second for the generated video.
      person_generation: Policy for person generation (e.g., "allow_adult").
      output_resolution: Resolution of the output video.
      sample_count: Number of videos to generate.
      seed: Random seed for generation.
      negative_prompt: Negative prompt to guide generation.
      generate_audio: Whether to generate audio.
      enhance_prompt: Whether to enhance the prompt before generation.
      regenerate_video_segment: Flag to force regeneration of the segment.
      cut_video: Flag to indicate if the video should be cut.
      start_seconds: Start time in seconds for cutting.
      start_frame: Start frame for cutting.
      end_seconds: End time in seconds for cutting.
      end_frame: End frame for cutting.
      selected_videos_for_extension: List of videos selected for extension.
  """

  scene_id: str
  segment_number: int
  video_model: VideoModelName
  video_gen_task: VideoGenTasks
  prompt: str | None = None
  seed_images: list[Image] = []
  duration_in_secs: int | None = 8
  aspect_ratio: str | None = "16:9"
  frames_per_sec: int | None = 24
  person_generation: str | None = "allow_adult"
  output_resolution: str | None = "1080p"
  sample_count: int | None = 1
  seed: int | None = None
  negative_prompt: str | None = None
  generate_audio: bool | None = False
  enhance_prompt: bool | None = True
  regenerate_video_segment: bool = False
  cut_video: bool = False
  start_seconds: int | None = 0
  start_frame: int | None = 0
  end_seconds: int | None = 7
  end_frame: int | None = 23
  selected_videos_for_extension: list[VideoItem] | None = None


class VideoSegmentMergeOperation(BaseModel):
  """
  Represents a video segment to be included in a merge operation.

  Attributes:
      scene_id: The ID of the scene.
      segment_number: The sequence number of the segment.
      transition: The transition to apply after this segment.
      include_video_segment: Whether to include this segment in the merge.
      selected_video_for_merge: The specific video item selected for merging.
  """
  scene_id: str
  segment_number: int
  transition: VideoTransition | None = None
  include_video_segment: bool
  selected_video_for_merge: VideoItem


class VideoGenerationRequest(BaseModel):
  """
  Represents the complete request for a video generation task.

  This model encapsulates all the individual video segments and overall
  creative direction for the video.

  Attributes:
      video_segments: A list of `VideoSegmentGenerationOperation` objects, defining
                      each part of the video.
  """

  video_segments: list[VideoSegmentGenerationOperation]

class VideoMergeRequest(BaseModel):
  """
  Represents a request to merge multiple video segments into a single video.

  Attributes:
      video_segments: A list of `VideoSegmentMergeOperation` objects defining
                      the sequence and transitions for the merge.
  """

  video_segments: list[VideoSegmentMergeOperation]


class LogoOverlayOptions(BaseModel):
  """
  Represents options for overlaying a logo on a generated video.

  Attributes:
      start_time: The time (in seconds) when the logo should appear.
      duration: The duration (in seconds) the logo should be visible.
      width: The width of the logo in pixels.
      height: The height of the logo in pixels.
      x_position: The x position (top left corner) of the logo on the clip in pixels.
      y_position: The y position (top right corner) of the logo on the clip in pixels.
  """

  start_time: int
  duration: int
  width: int
  height: int
  x_position: int
  y_position: int


class LogoOverlay(BaseModel):
  """
  Represents a single logo overlay to be applied to a video.
  Attributes:
      gcs_logo_path: The GCS URI of the logo image.
      options: Details about how the overlay should be applied.
  """

  gcs_logo_path: str
  options: LogoOverlayOptions = Field(default_factory=LogoOverlayOptions)


class LogoOverlayRequest(BaseModel):
  """
  Represents a request to apply a logo overlay to a video.
  Attributes:
      gcs_video_path: The GCS URI of the input video.
      logo_overlay: The logo overlay to be applied to the video.
  """

  gcs_video_path: str
  logo_overlay: LogoOverlay = Field(default_factory=LogoOverlay)


class FrameExtractionRequest(BaseModel):
  """
  Represents a request to extract frames from a video.
  Attributes:
      gcs_uri: The GCS URI of the input video.
      story_id: The ID of the story.
      scene_num: The number of the scene.
      time_sec: The time in seconds to extract frames from.
      frame_count: The number of frames to extract.
  """

  gcs_uri: str
  story_id: str
  scene_num: str
  time_sec: float
  frame_count: int
