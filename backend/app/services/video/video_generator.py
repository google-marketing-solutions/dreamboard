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
Class that leverages the Veo API service for video generation tasks.

This class encapsulates the logic for interacting with the Veo model
using the API, handling tasks such as input processing, model inference,
and video output generation.
"""

import datetime
import functools
import logging
import os

import utils
from models.video import video_request_models
from models.video.video_gen_models import Video, VideoGenerationResponse
from moviepy import editor
from services import storage_service
from services.video.veo_api_service import VeoAPIService
from services.video.editing_service import EditingService


class VideoGenerator:
  """
  Class that implements the logic for video generation and interacts
  with the Veo API.
  """

  def __init__(self):
    """Initializes the VideoGenerator class."""
    self.veo_api_service = VeoAPIService()
    self.editing_service = EditingService()

  def generate_videos_from_scenes(
      self,
      story_id: str,
      video_generation: video_request_models.VideoGenerationRequest,
  ) -> list[VideoGenerationResponse]:
    """
    Generates a video from video segments using Veo.

    Always regenerates all video segments regardless of the
    `regenerate_video_segment` flag.

    Args:
        story_id: The unique identifier for the story.
        video_generation: A request object containing details for video
                          generation, including video segments.

    Returns:
        A list of `VideoGenerationResponse` objects, each corresponding
        to a generated video segment.
    """
    logging.info(
        "DreamBoard - VIDEO_GENERATOR: Generating video segments for story %s",
        story_id,
    )

    # 1. Generate video generation tasks to execute in parallel
    video_gen_tasks = self.get_video_segments_generation_tasks(
        story_id,
        video_generation.video_segments,
    )

    # 2. Generate video segments using Veo
    video_gen_responses = utils.execute_tasks_in_parallel(video_gen_tasks)

    self.process_video_generation_responses(video_gen_responses)

    return video_gen_responses

  def get_video_segments_generation_tasks(
      self,
      story_id: str,
      video_segments: list[video_request_models.VideoSegmentRequest],
  ):
    """
    Creates a list of video generation tasks for parallel execution.

    Args:
        story_id: The unique identifier for the story.
        video_segments: A list of `VideoSegmentRequest` objects, each
                        defining a video segment to be generated.

    Returns:
        A list of `functools.partial` objects, where each object represents
        a callable task for video generation.
    """
    tasks = []
    for video_segment in video_segments:
      output_gcs_uri = (
          f"{utils.get_videos_bucket_base_path(story_id)}/"
          f"{video_segment.segment_number}"
      )
      # Add video generation task only if regenerate_video_segment is True
      if video_segment.regenerate_video_segment:
        tasks.append(
            functools.partial(
                self.veo_api_service.generate_video,
                story_id,
                output_gcs_uri,
                video_segment,
            )
        )
      else:
        logging.info(
            "DreamBoard - VIDEO_GENERATOR: Video generation task "
            "skipped for story id %s and video segment %s since "
            "regenerate_video_segment=False.",
            story_id,
            video_segment.segment_number,
        )

    return tasks

  def process_video_generation_responses(
      self, video_gen_responses: list[VideoGenerationResponse]
  ) -> None:
    """
    Processes a list of video generation responses.

    Currently, this method is a placeholder for generating last-second
    frames for generated videos.

    Args:
        video_gen_responses: A list of `VideoGenerationResponse` objects
                             to be processed.
    """
    # 1. Generate last sec frames for generated video
    for video_gen_response in video_gen_responses:
      # TODO (ae) implement generate video frames
      if video_gen_response.video_segment.generate_video_frames:
        pass

  def generate_video_segments(
      self,
      video_segments: list[video_request_models.VideoSegmentRequest],
      story_id: str,
  ) -> list[VideoGenerationResponse]:
    """
    Generates individual video segments using the Veo API.

    Each segment is generated sequentially based on the
    `regenerate_video_segment` flag.

    Args:
        video_segments: A list of `VideoSegmentRequest` objects, each
                        defining a video segment to be generated.
        story_id: The unique identifier for the story.

    Returns:
        A list of `VideoGenerationResponse` objects, each corresponding
        to a generated video segment.
    """
    video_generation_resps = []
    # Generate video per each segment
    for video_segment in video_segments:
      logging.info(
          "DreamBoard - VIDEO_GENERATOR: Starting video generation for "
          "story id %s and video segment %s...",
          story_id,
          video_segment.segment_number,
      )
      output_gcs_uri = (
          f"{utils.get_videos_bucket_base_path(story_id)}/"
          f"{video_segment.segment_number}"
      )
      # Generate only if regenerate_video_segment is True
      if video_segment.regenerate_video_segment:
        response = self.veo_api_service.generate_video(
            story_id, output_gcs_uri, video_segment
        )
        logging.info(
            "DreamBoard - VIDEO_GENERATOR: Video generation ready for "
            "story id %s and video segment %s with operation name %s.",
            story_id,
            video_segment.segment_number,
            response.operation_name,
        )
        response.video_segment = video_segment
        # TODO (ae) implement generate video frames
        if video_segment.generate_video_frames:
          pass
        video_generation_resps.append(response)
      else:
        logging.info(
            "DreamBoard - VIDEO_GENERATOR: Video not generated for "
            "story id %s and video segment %s since "
            "regenerate_video_segment=False.",
            story_id,
            video_segment.segment_number,
        )
        video_generation_resps.append(
            VideoGenerationResponse(
                done=False,
                operation_name="regenerate_video_segment=False",
                execution_message="Regenerate video was not checked.",
                videos=[],
                video_segment=video_segment,
            )
        )

    return video_generation_resps

  def merge_videos(
      self,
      story_id: str,
      video_generation: video_request_models.VideoGenerationRequest,
  ) -> VideoGenerationResponse | None:
    """
    Merges generated video segments to create a single final video.

    Args:
        story_id: The unique identifier for the story.
        video_generation: A request object containing the video segments
                          to be merged.

    Returns:
        A `VideoGenerationResponse` object for the merged final video,
        or `None` if no videos were available for merging.
    """
    output_folder = utils.get_videos_gcs_fuse_path(story_id)
    logging.info(
        "DreamBoard - VIDEO_GENERATOR: Merging videos for story id %s in "
        "output folder %s...",
        story_id,
        output_folder,
    )

    # 1. Get video URIs and transitions from video segments
    videos = [
        vsg.selected_video
        for vsg in video_generation.video_segments
        if vsg.selected_video  # Merge only scenes with generated videos
    ]

    # When testing in dev, download to local folder
    if os.getenv("ENV") == "dev":
      self.__download_videos(story_id, videos)

    # 2. Generate final video
    logging.info(
        "DreamBoard - VIDEO_GENERATOR: Getting video uris to merge for "
        "story id %s...",
        story_id,
    )
    gcs_fuse_paths_to_merge = self.__get_videos_to_merge(videos)
    video_transitions = [
        # Default to concatenate if transition not provided
        (
            vsg.transition.value
            if vsg.transition
            else video_request_models.VideoTransition.CONCATENATE.value
        )
        for vsg in video_generation.video_segments
        if vsg.transition
    ]

    if len(gcs_fuse_paths_to_merge) > 1:
      final_video_gcs_fuse_path = self.__merge(
          output_folder, gcs_fuse_paths_to_merge, video_transitions
      )
    elif len(gcs_fuse_paths_to_merge) == 1:
      logging.info(
          "DreamBoard - VIDEO_GENERATOR: Skipping merge action since "
          "there is only 1 video segment."
      )
      final_video_gcs_fuse_path = gcs_fuse_paths_to_merge[0]
    else:
      return None

    final_video_name = utils.get_file_name_from_uri(final_video_gcs_fuse_path)

    # 3. Upload video to storage only on dev
    # In PROD this is automatic since the folder is mounted with Fuse
    if os.getenv("ENV") == "dev":
      # Override scene folder in dev since local paths are different
      output_gcs_path = (
          f"{utils.get_videos_bucket_folder_path(story_id)}/{final_video_name}"
      )
      # Upload action
      storage_service.storage_service.upload_from_filename(
          final_video_gcs_fuse_path, output_gcs_path
      )

    # Get bucket URI from GCS FUSE path URI
    final_video_uri = (
        f"{utils.get_videos_bucket_base_path(story_id)}/{final_video_name}"
    )

    logging.info(
        "DreamBoard - VIDEO_GENERATOR: %s videos were merged successfully!",
        len(gcs_fuse_paths_to_merge),
    )
    video_gen_response = VideoGenerationResponse(
        video_segment=None,  # No specific segment for final video
        done=True,
        operation_name="final_video",
        execution_message=(
            f"Video generated successfully in path {final_video_uri}"
        ),
        videos=[
            Video(
                name=final_video_name,
                gcs_uri=final_video_uri,
                signed_uri=utils.get_signed_uri_from_gcs_uri(final_video_uri),
                gcs_fuse_path=final_video_gcs_fuse_path,
                mime_type="video/mp4",
                frames_uris=[],
            )
        ],
    )

    return video_gen_response

  def __merge(
      self,
      output_folder: str,
      gcs_fuse_paths: list[str],
      video_transitions: list[video_request_models.VideoTransition],
  ) -> str:
    """
    Generates the final video from all video segments by applying
    transitions and merging them.

    Args:
        output_folder: The local or GCS FUSE path for output.
        gcs_fuse_paths: A list of GCS FUSE paths to the video segments.
        video_transitions: A list of `VideoTransition` types to apply
                           between segments.

    Returns:
        The file path of the merged final video.
    """
    logging.info(
        "DreamBoard - VIDEO_GENERATOR: Merging %s videos...",
        len(gcs_fuse_paths),
    )

    count = 0
    trans_count = 0
    while len(gcs_fuse_paths) > 1:
      video_path1 = gcs_fuse_paths.pop()
      video_path2 = gcs_fuse_paths.pop()
      merged_video_name = f"video_{count}_{count + 1}.mp4"
      final_video_path = f"{output_folder}/{merged_video_name}"
      gcs_fuse_paths.append(final_video_path)

      # Change name for the final video if it's the last merge
      if len(gcs_fuse_paths) == 1:
        formatted_date = datetime.datetime.now().strftime("%d-%m-%Y:%H:%M:%S")
        merged_video_name = f"final_video_{formatted_date}.mp4"
        final_video_path = f"{output_folder}/{merged_video_name}"

      # Get transition for videos, default to concatenation if not provided
      transition_type = video_request_models.VideoTransition.CONCATENATE.value
      if len(video_transitions) > trans_count:
        transition_type = video_transitions[trans_count]

      # Apply transition
      logging.info(
          "DreamBoard - VIDEO_GENERATOR: Applying transitions and writing "
          "video %s...",
          final_video_path,
      )
      self.__apply_transition_and_write_video(
          transition_type, video_path1, video_path2, final_video_path
      )
      count = count + 2
      trans_count = trans_count + 1

    return final_video_path

  def __get_videos_to_merge(self, videos: list[Video]):
    """
    Builds a stack of reversed video GCS FUSE paths to merge.

    Args:
        videos: A list of `Video` objects, each representing a video
                to be merged.

    Returns:
        A list of GCS FUSE paths in reversed order, ready for popping.
    """
    reversed_uris = []
    for video in reversed(videos):
      reversed_uris.append(video.gcs_fuse_path)
    return reversed_uris

  def __download_videos(self, story_id: str, videos: list[Video]):
    """
    Downloads videos from GCS to a local folder (for dev environment).

    Args:
        story_id: The unique identifier for the story.
        videos: A list of `Video` objects, each representing a video
                to be downloaded.
    """
    for video in videos:
      _, output_folder, output_full_path = self.__get_dev_paths(
          story_id, video.gcs_fuse_path
      )
      # Download only for local testing if folder doesn't exist
      if not os.path.exists(output_folder):
        os.makedirs(output_folder)
      storage_service.storage_service.download_file_to_server(
          output_full_path, video.gcs_uri
      )
      video.gcs_fuse_path = output_full_path

  def __get_dev_paths(self, story_id: str, gcs_fuse_path: str):
    """
    Gets local file paths in the development environment.

    Args:
        story_id: The unique identifier for the story.
        gcs_fuse_path: The GCS FUSE path of the file.

    Returns:
        A tuple containing the scene folder, file folder, and full
        file path.
    """
    # Get URI; public URI is used for testing in dev
    base_path = utils.get_videos_gcs_fuse_path(story_id)
    scene_folder = utils.get_scene_folder_path_from_uri(uri=gcs_fuse_path)
    file_folder = f"{base_path}/{scene_folder}"
    file_name = utils.get_file_name_from_uri(gcs_fuse_path)
    file_full_path = f"{file_folder}/{file_name}"

    return scene_folder, file_folder, file_full_path

  def __apply_transition_and_write_video(
      self,
      transition_type: str,
      video_path1: str,
      video_path2: str,
      final_video_path: str,
  ):
    """
    Applies a specified transition between two video clips and
    writes the result to a new video file.

        Args:
            transition_type: The type of transition to apply (e.g., "X_FADE").
            video_path1: The file path of the first video clip.
            video_path2: The file path of the second video clip.
            final_video_path: The desired output file path for the merged video.
        """
    clip1 = editor.VideoFileClip(video_path1)
    clip2 = editor.VideoFileClip(video_path2)
    # Use the editing_service facade
    service = self.editing_service
    final_clip = None

    # Create transition by type:
    if transition_type == video_request_models.VideoTransition.X_FADE.value:
        final_clip = service.apply_transition(
            clip1,
            clip2,
            video_request_models.VideoTransition.X_FADE,
            transition_duration=2.0,
            speed_curve="sigmoid"
        )
    elif transition_type == video_request_models.VideoTransition.WIPE.value:
        final_clip = service.apply_transition(
            clip1,
            clip2,
            video_request_models.VideoTransition.WIPE,
            transition_duration=2.0,
            direction="left-to-right"
        )
    elif transition_type == video_request_models.VideoTransition.ZOOM.value:
        final_clip = service.apply_transition(
            clip1,
            clip2,
            video_request_models.VideoTransition.ZOOM,
            transition_duration=0.25,
            motion_blur=10,
            speed_curve="linear",
        )
    elif transition_type == video_request_models.VideoTransition.ZOOM_WARP.value:
        final_clip = service.apply_transition(
            clip1,
            clip2,
            video_request_models.VideoTransition.ZOOM_WARP,
            transition_duration=0.5,
            motion_blur=10,
            speed_curve="sigmoid",
            distortion_factor=0.75,
            distortion_type=["pinch", "bulge"],
        )
    elif transition_type == video_request_models.VideoTransition.DIP_TO_BLACK.value:
        final_clip = service.apply_transition(
            clip1,
            clip2,
            video_request_models.VideoTransition.DIP_TO_BLACK,
            transition_duration=1.0, # Ensure float for duration
            speed_curve="linear"
        )
    elif transition_type == video_request_models.VideoTransition.CONCATENATE.value:
        # Concatenate might have specific kwargs like trim_end_clip1, trim_start_clip2
        # Assuming no trims for this direct replacement for now.
        final_clip = service.apply_transition(
            clip1,
            clip2,
            video_request_models.VideoTransition.CONCATENATE
        )
    elif transition_type == video_request_models.VideoTransition.BLUR.value:
        final_clip = service.apply_transition(
            clip1,
            clip2,
            video_request_models.VideoTransition.BLUR,
            transition_duration=1.0,
            max_blur=1.0
        )
    elif transition_type == video_request_models.VideoTransition.FLICKER.value:
        # Flicker takes no additional kwargs
        final_clip = service.apply_transition(
            clip1,
            clip2,
            video_request_models.VideoTransition.FLICKER
        )
    elif transition_type == video_request_models.VideoTransition.SLIDE.value:
        final_clip = service.apply_transition(
            clip1,
            clip2,
            video_request_models.VideoTransition.SLIDE,
            duration=1.0, # 'duration' is the kwarg for slide
            speed_curve="sigmoid"
        )
    elif transition_type == video_request_models.VideoTransition.SLIDE_WARP.value:
        final_clip = service.apply_transition(
            clip1,
            clip2,
            video_request_models.VideoTransition.SLIDE_WARP,
            duration=1.0, # 'duration' is the kwarg for slide_warp
            speed_curve="sigmoid",
            stretch_intensity=0.3
        )

    if final_clip:
        final_clip.write_videofile(f"{final_video_path}", fps=24)
    else:
        # Fallback or error handling if a transition type wasn't matched
        # For now, let's assume concatenation as a default if no other transition matched
        # or log an error.
        logging.warning(
            "DreamBoard - VIDEO_GENERATOR: Unhandled transition type %s. "
            "Defaulting to concatenation or skipping.",
            transition_type
        )
        # As a simple fallback, concatenate if no specific transition was applied
        # This part depends on desired behavior for unmapped/new transitions
        if not os.path.exists(final_video_path): # Avoid re-writing if already handled
            fallback_clip = editor.concatenate_videoclips([clip1, clip2])
            fallback_clip.write_videofile(f"{final_video_path}", fps=24)


  def process_multiple_videos(
      self, video_gen_responses: list[VideoGenerationResponse]
  ) -> bool:
    """
    Checks if the generator should proceed with processing multiple videos
    (e.g., for merging).

    Args:
        video_gen_responses: A list of `VideoGenerationResponse` objects.

    Returns:
        `True` if there is more than one video generation response,
        `False` otherwise.
    """
    return len(video_gen_responses) > 1
