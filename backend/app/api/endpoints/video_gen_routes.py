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
Video Generation endpoints handled by the FastAPI Router.

This module defines FastAPI endpoints for interacting with video generation
services, including health checks, video creation, and merging operations
using the Veo platform.
"""

import logging
from typing import Annotated
import os
import utils

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.responses import Response
from models import request_models
from models.image.image_gen_models import Image
from models.video import video_request_models
from models.video.video_gen_models import VideoGenerationResponse
from services.video.frame_extractor_service import FrameExtractorService
from services.video.video_generator import VideoGenerator

# Initialize the FastAPI router for video generation endpoints.
video_gen_router = APIRouter(prefix="/video_generation")


def instantiate_video_generator() -> VideoGenerator:
  """For use in generating a VideoGenerator across all video routes"""
  return VideoGenerator()


VideoServiceDep = Annotated[
    VideoGenerator, Depends(instantiate_video_generator)
]


@video_gen_router.get("/video_health_check")
def video_health_check():
  """
  Endpoint to perform a health check for the Dreamboard video service.

  Returns:
      A JSON response indicating the status of the health check.
  """
  return {"status": "Success!"}


@video_gen_router.post("/get_default_video_prompt")
def get_default_video_prompt(
    scene_segments: list[request_models.SceneSegmentRequest],
):
  """
  Retrieves a default template for video generation prompts.

  Args:
      scene_segments: A list of `SceneSegmentRequest` objects (currently
                      unused in this implementation).

  Returns:
      An empty string as a placeholder for a default video prompt.

  Raises:
      HTTPException (500): If an unexpected error occurs.
  """
  try:
    # TODO: Implement actual default video prompt generation logic here.
    return ""
  except Exception as ex:
    logging.error(
        "Dreamboard - VIDEO_GEN_ROUTES-get_default_video_prompt: - ERROR: %s",
        str(ex),
    )
    if os.getenv("USE_AUTH_MIDDLEWARE"):
      error_response = {
          "status_code": 500,
          "error_message": str(ex),
      }
      # Workaround to send the actual error message to NodeJS middleware request handler
      return JSONResponse(content=error_response)
    else:
      raise HTTPException(status_code=500, detail=str(ex)) from ex


@video_gen_router.post("/generate_videos_from_scenes/{story_id}")
def generate_videos_from_scenes(
    story_id: str,
    video_generation: video_request_models.VideoGenerationRequest,
    video_generator: VideoServiceDep,
) -> list[VideoGenerationResponse]:
  """
  Generates one or more videos using the Veo platform based on scenes.

  Args:
      story_id: The unique identifier for the story.
      video_generation: A `VideoGenerationRequest` object containing all
                        parameters required for video creation.

  Returns:
      A list of `VideoGenerationResponse` objects detailing the results
      of the video generation process.

  Raises:
      HTTPException (500): If an error occurs during video generation.
  """
  try:
    logging.info(
        (
            "DreamBoard - VIDEO_GEN_ROUTES: Starting video generation "
            "for story %s..."
        ),
        story_id,
    )
    video_gen_resps = video_generator.generate_videos_from_scenes(
        story_id, video_generation
    )

    return video_gen_resps
  except Exception as ex:
    logging.error(
        "DreamBoard - VIDEO_GEN_ROUTES-generate_videos_from_scenes: -"
        " ERROR: %s",
        str(ex),
    )
    if os.getenv("USE_AUTH_MIDDLEWARE"):
      error_response = {
          "status_code": 500,
          "error_message": str(ex),
      }
      # Workaround to send the actual error message to NodeJS middleware request handler
      return JSONResponse(content=error_response)
    else:
      raise HTTPException(status_code=500, detail=str(ex)) from ex


@video_gen_router.post("/merge_videos/{story_id}")
def merge_videos(
    story_id: str,
    video_generation: video_request_models.VideoGenerationRequest,
    video_generator: VideoServiceDep,
) -> VideoGenerationResponse:
  """
  Merges a list of previously generated videos into a single video.

  Args:
      story_id: The unique identifier for the story.
      video_generation: A `VideoGenerationRequest` object specifying the
                        videos to merge and merge parameters.

  Returns:
      A `VideoGenerationResponse` object for the merged video.

  Raises:
      HTTPException (500): If there are no videos to merge or another
                           error occurs.
  """
  try:
    logging.info(
        (
            "DreamBoard - VIDEO_GEN_ROUTES: Starting merging videos "
            "for story %s..."
        ),
        story_id,
    )
    video_gen_response = video_generator.merge_videos(
        story_id, video_generation
    )
    if video_gen_response:
      return video_gen_response
    else:
      # Handle the case where the merge operation returns no video.
      return Response(
          content="ERROR: There are not videos to merge.",
          status_code=500,
      )
  except Exception as ex:
    logging.error(
        "DreamBoard - VIDEO_GEN_ROUTES-merge_videos: - ERROR: %s", str(ex)
    )
    if os.getenv("USE_AUTH_MIDDLEWARE"):
      error_response = {
          "status_code": 500,
          "error_message": str(ex),
      }
      # Workaround to send the actual error message to NodeJS middleware request handler
      return JSONResponse(content=error_response)
    else:
      raise HTTPException(status_code=500, detail=str(ex)) from ex


@video_gen_router.post("/apply_text_overlay/{story_id}")
def apply_text_overlay(
    story_id: str,
    text_overlay_request: video_request_models.TextOverlayRequest,
    video_generator: VideoServiceDep,
) -> VideoGenerationResponse:
  """
  Applies one or more text overlays to a specified video.

  Args:
      story_id: The unique identifier for the story.
      text_overlay_request: A request object containing the video path and
                            a list of text overlays to apply.

  Returns:
      A `VideoGenerationResponse` object for the new video with the text
      overlays applied.

  Raises:
      HTTPException (500): If an error occurs during the process.
  """
  try:
    logging.info(
        (
            "DreamBoard - VIDEO_GEN_ROUTES: Starting to apply text "
            "overlay for story %s..."
        ),
        story_id,
    )
    video_gen_response = video_generator.apply_text_overlay_to_video(
        story_id=story_id,
        gcs_video_path=text_overlay_request.gcs_video_path,
        text_overlays=text_overlay_request.text_overlays,
    )
    return video_gen_response
  except Exception as ex:
    logging.error(
        "DreamBoard - VIDEO_GEN_ROUTES-apply_text_overlay: ERROR: %s", str(ex)
    )
    if os.getenv("USE_AUTH_MIDDLEWARE"):
      error_response = {
          "status_code": 500,
          "error_message": str(ex),
      }
      # Workaround to send the actual error message to NodeJS middleware request handler
      return JSONResponse(content=error_response)
    else:
      raise HTTPException(status_code=500, detail=str(ex)) from ex


@video_gen_router.post("/extract_frames")
def extract_frames(request: video_request_models.FrameExtractionRequest):
  try:

    frame_extractor = FrameExtractorService()
    extracted_frame_gcs_uris = frame_extractor.extract_frames(
        gcs_uri=request.gcs_uri,
        story_id=request.story_id,
        scene_num=request.scene_num,
        time_sec=request.time_sec,
        frame_count=request.frame_count,
    )

    images = []
    for i, gcs_uri in enumerate(extracted_frame_gcs_uris):
      signed_uri = utils.get_signed_uri_from_gcs_uri(gcs_uri)
      # Create a more descriptive name for the frontend dropdown
      gcs_fuse = utils.get_images_gcs_fuse_path(request.story_id)
      scene_folder = utils.get_scene_folder_path_from_uri(uri=gcs_uri)
      image_name = utils.get_file_name_from_uri(gcs_uri)
      gcs_fuse_path = f"{gcs_fuse}/{scene_folder}/{image_name}"
      image = Image(
          name=image_name,
          gcs_uri=gcs_uri,
          signed_uri=signed_uri,
          gcs_fuse_path=gcs_fuse_path,
          mime_type="image/png",
      )
      images.append(image)

    return {
        "message": (
            f"Frames extracted successfully for scene {request.scene_num} at"
            f" {request.time_sec}s"
        ),
        "data": images,
    }

  except Exception as ex:
    logging.error(
        "DreamBoard - VIDEO_GEN_ROUTES-extract_frames: ERROR: %s", str(ex)
    )
    if os.getenv("USE_AUTH_MIDDLEWARE"):
      error_response = {
          "status_code": 500,
          "error_message": str(ex),
      }
      # Workaround to send the actual error message to NodeJS middleware request handler
      return JSONResponse(content=error_response)
    else:
      raise HTTPException(status_code=500, detail=str(ex)) from ex


@video_gen_router.post("/apply_logo_overlay/{story_id}")
def overlay_logo(
    story_id: str,
    logo_overlay_request: video_request_models.LogoOverlayRequest,
    video_generator: VideoServiceDep,
) -> VideoGenerationResponse:
  """
  Applies a logo overlay to a specified video.
  Args:
      story_id: The unique identifier for the story.
      logo_overlay_request: A request object containing the video path and
                            a logo overlay to apply.
  Returns:
      A `VideoGenerationResponse` object for the new video with the logo
      overlay applied.
  Raises:
      HTTPException (500): If an error occurs during the process.
  """
  try:
    logging.info(
        (
            "DreamBoard - VIDEO_GEN_ROUTES: Starting to apply logo "
            "overlay for story %s..."
        ),
        story_id,
    )
    video_gen_response = video_generator.apply_logo_overlay_to_video(
        story_id=story_id,
        gcs_video_path=logo_overlay_request.gcs_video_path,
        logo_overlay=logo_overlay_request.logo_overlay,
    )
    return video_gen_response
  except Exception as ex:
    logging.error(
        "DreamBoard - VIDEO_GEN_ROUTES-overlay_logo: ERROR: %s", str(ex)
    )
    if os.getenv("USE_AUTH_MIDDLEWARE"):
      error_response = {
          "status_code": 500,
          "error_message": str(ex),
      }
      # Workaround to send the actual error message to NodeJS middleware request handler
      return JSONResponse(content=error_response)
    else:
      raise HTTPException(status_code=500, detail=str(ex)) from ex
