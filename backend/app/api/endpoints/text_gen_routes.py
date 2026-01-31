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
Text Generation endpoints handled by the FastAPI Router.

This module defines FastAPI endpoints for interacting with various text
generation services, including health checks, brainstorming scenes, and
generating/enhancing image and video prompts.
"""

import logging
import os
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from models.text import text_request_models
from models.text.text_gen_models import SceneItem, StoryItem, Character
from models.text.text_request_models import ExtractTextRequest
from services.text.text_generator import TextGenerator


def instantiate_text_generator() -> TextGenerator:
  """For use in generating a TextGenerator across all text routes"""
  return TextGenerator()


TextServiceDep = Annotated[TextGenerator, Depends(instantiate_text_generator)]

# Initialize the FastAPI router for text generation endpoints.
text_gen_router = APIRouter(prefix="/text_generation")


@text_gen_router.get("/text_health_check")
def text_health_check():
  """
  Endpoint to perform a health check for the Dreamboard text service.

  Returns:
      A JSON response indicating the status of the health check.
  """

  return {"status": "Success!"}


@text_gen_router.post("/brainstorm_stories")
def brainstorm_stories(
    brainstorm_stories_request: text_request_models.StoriesGenerationRequest,
    text_generator: TextServiceDep,
):
  """Brainstorms and generates a list of story ideas based on user input."""
  try:
    gen_status = text_generator.brainstorm_stories(brainstorm_stories_request)
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-brainstorm_stories: - ERROR: %s", str(ex)
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

  return gen_status


@text_gen_router.post("/brainstorm_scenes")
def brainstorm_scenes(
    brainstorm_scenes_request: text_request_models.BrainstormScenesRequest,
    text_generator: TextServiceDep,
) -> list[SceneItem]:
  """
  Brainstorms and generates a list of scene ideas based on user input.

  This endpoint takes an idea, brand guidelines, and desired number of
  scenes, then uses the `text_generator` to produce scene items.

  Args:
      brainstorm_scenes_request: A `BrainstormScenesRequest` object
                                 containing the idea, brand guidelines,
                                 and number of scenes.

  Returns:
      A list of `SceneItem` objects, each representing a brainstormed scene.

  Raises:
      HTTPException (500): If an error occurs during text generation.
  """
  try:
    gen_status = text_generator.brainstorm_scenes(
        brainstorm_scenes_request.idea,
        brainstorm_scenes_request.brand_guidelines,
        brainstorm_scenes_request.num_scenes,
    )
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-brainstorm_scenes: - ERROR: %s", str(ex)
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

  return gen_status


@text_gen_router.post("/create_image_prompt_from_scene")
def create_image_prompt_from_scene(
    text_requests: text_request_models.TextRequest,
    text_generator: TextServiceDep,
) -> str:
  """
  Generates an image prompt based on a given scene description.

  Args:
      text_requests: A `TextRequest` object containing the scene description.

  Returns:
      A string representing the generated image prompt.

  Raises:
      HTTPException (500): If an error occurs during text generation.
  """
  try:
    gen_status = text_generator.create_image_prompt_from_scene(
        text_requests.scene
    )
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-create_image_prompt_from_scene: -"
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

  return gen_status


@text_gen_router.post("/create_video_prompt_from_scene")
def create_video_prompt_from_scene(
    text_requests: text_request_models.TextRequest,
    text_generator: TextServiceDep,
) -> str:
  """
  Generates a video prompt based on a given scene description.

  Args:
      text_requests: A `TextRequest` object containing the scene description.

  Returns:
      A string representing the generated video prompt.

  Raises:
      HTTPException (500): If an error occurs during text generation.
  """
  try:
    gen_status = text_generator.create_video_prompt_from_scene(
        text_requests.scene
    )
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-create_video_prompt_from_scene: -"
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

  return gen_status


@text_gen_router.post("/enhance_image_prompt")
def enhance_image_prompt(
    text_requests: text_request_models.TextRequest,
    text_generator: TextServiceDep,
) -> str:
  """
  Enhances an existing image prompt for improved generation quality.

  Args:
      text_requests: A `TextRequest` object containing the original prompt.

  Returns:
      A string representing the enhanced image prompt.

  Raises:
      HTTPException (500): If an error occurs during text generation.
  """
  try:
    gen_status = text_generator.enhance_image_prompt(text_requests.prompt)
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-enhance_image_prompt: - ERROR: %s",
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

  return gen_status


@text_gen_router.post("/enhance_image_prompt_with_scene")
def enhance_image_prompt_with_scene(
    text_requests: text_request_models.TextRequest,
    text_generator: TextServiceDep,
) -> str:
  """
  Enhances an image prompt using additional context from a scene.

  Args:
      text_requests: A `TextRequest` object containing the prompt and scene.

  Returns:
      A string representing the enhanced image prompt.

  Raises:
      HTTPException (500): If an error occurs during text generation.
  """
  try:
    gen_status = text_generator.enhance_image_prompt_with_scene(
        text_requests.prompt, text_requests.scene
    )
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-enhance_image_prompt_with_scene: -"
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

  return gen_status


@text_gen_router.post("/enhance_video_prompt")
def enhance_video_prompt(
    text_requests: text_request_models.TextRequest,
    text_generator: TextServiceDep,
) -> str:
  """
  Enhances an existing video prompt for improved generation quality.

  Args:
      text_requests: A `TextRequest` object containing the original prompt.

  Returns:
      A string representing the enhanced video prompt.

  Raises:
      HTTPException (500): If an error occurs during text generation.
  """
  try:
    text_generator = TextGenerator()
    gen_status = text_generator.enhance_image_prompt(text_requests.prompt)
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-enhance_video_prompt: - ERROR: %s",
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

  return gen_status


@text_gen_router.post("/enhance_video_prompt_with_scene")
def enhance_video_prompt_with_scene(
    text_requests: text_request_models.TextRequest,
    text_generator: TextServiceDep,
) -> str:
  """
  Enhances a video prompt using additional context from a scene.

  Args:
      text_requests: A `TextRequest` object containing the prompt and scene.

  Returns:
      A string representing the enhanced video prompt.

  Raises:
      HTTPException (500): If an error occurs during text generation.
  """
  try:
    gen_status = text_generator.enhance_video_prompt_with_scene(
        text_requests.prompt, text_requests.scene
    )
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-enhance_video_prompt_with_scene: -"
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

  return gen_status


@text_gen_router.post("/generate_image_prompts_from_scenes")
def generate_image_prompts_from_scenes(
    text_requests: text_request_models.TextRequest,
    text_generator: TextServiceDep,
) -> list[str]:
  """
  Generates multiple image prompts from a list of scene descriptions.

  Args:
      text_requests: A `TextRequest` object containing a list of scenes.

  Returns:
      A list of strings, where each string is an image prompt.

  Raises:
      HTTPException (500): If an error occurs during text generation.
  """
  try:
    gen_status = text_generator.generate_image_prompts_from_scenes(
        text_requests.scenes
    )
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-generate_image_prompts_from_scenes: -"
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

  return gen_status


@text_gen_router.post("/generate_video_prompts_from_scenes")
def generate_video_prompts_from_scenes(
    text_requests: text_request_models.TextRequest,
    text_generator: TextServiceDep,
) -> list[str]:
  """
  Generates multiple video prompts from a list of scene descriptions.

  Args:
      text_requests: A `TextRequest` object containing a list of scenes.

  Returns:
      A list of strings, where each string is a video prompt.

  Raises:
      HTTPException (500): If an error occurs during text generation.
  """
  try:
    gen_status = text_generator.generate_video_prompts_from_scenes(
        text_requests.scenes
    )
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-generate_video_prompts_from_scenes: -"
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

  return gen_status


@text_gen_router.post("/extract_text_from_file")
async def extract_text_from_file(
    extract_text_request: ExtractTextRequest,
) -> str:
  """Extracts text content from a file located in Google Cloud Storage based on its type.

  This endpoint processes requests to extract text from files such as "CreativeBrief"
  or "BrandGuidelines". It utilizes a `TextGenerator` to handle the specific
  extraction logic for each file type.

  Args:
    extract_text_request: An instance of `ExtractTextRequest` containing
      information about the file to be processed, including its type
      (`file_type`) and its GCS URI (`file_gcs_uri`).

  Returns:
    A string containing the extracted text content from the file.
    Returns an empty string if the `file_type` is not "CreativeBrief" or "BrandGuidelines".

  Raises:
    HTTPException: If an error occurs during the text extraction process,
      an HTTPException with a 500 status code and the error detail is raised.
  """
  try:
    text_generator = TextGenerator()

    if extract_text_request.file_type == "CreativeBrief":
      creative_brief = text_generator.extract_creative_brief_from_file(
          extract_text_request.file_gcs_uri
      )

      return creative_brief

    if extract_text_request.file_type == "BrandGuidelines":
      brand_guidelines = text_generator.extract_brand_guidelines_from_file(
          extract_text_request.file_gcs_uri
      )

      return brand_guidelines

    return ""
  except Exception as ex:
    logging.error(
        "DreamBoard - TEXT_GEN_ROUTES-extract_text_from_file: - ERROR: %s",
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
