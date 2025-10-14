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
Story storage endpoints handled by the FastAPI Router.

This module defines FastAPI endpoints for listing, updating, and deleting
stories.
"""

import logging
import os
import utils
from services.story_service import StoryService
from typing import Dict

from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import JSONResponse

# Initialize the FastAPI router for story storage endpoints.
story_router = APIRouter(prefix="/story_storage")

# Instantiate the service.
story_service = StoryService()


@story_router.get("/story_health_check")
def story_health_check():
  """
  Endpoint to perform a health check for the Dreamboard story service.

  Returns:
      A JSON response indicating the status of the health check.
  """

  return {"status": "Success!"}


@story_router.get("/read_story/{user_id}/{story_id}")
def read_story(user_id: str, story_id: str):
  """
  Retrieve a single story for the given user.
  """
  try:
    story = story_service.get_story(user_id, story_id)
    if not story:
      logging.error(
          "DreamBoard - STORY_ROUTES-read_story: -"
          " ERROR: Story %s not found for user %s",
          story_id,
          user_id,
      )
      if os.getenv("USE_AUTH_MIDDLEWARE"):
        error_response = {
            "status_code": 500,
            "error_message": "Story {story_id} not found for user {user_id}.",
        }
        # Workaround to send the actual error message to NodeJS middleware request handler
        return JSONResponse(content=error_response)
      else:
        raise HTTPException(
            status_code=404,
            detail=f"Story {story_id} not found for user {user_id}.",
        )

    return utils.update_signed_uris_in_story(story)
  except Exception as ex:
    logging.error(
        "DreamBoard - STORY_ROUTES-list_all_stories: - ERROR: %s", str(ex)
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


@story_router.get("/list_all_stories/{user_id}")
def list_all_stories(user_id: str):
  """
  List all stories for the given user.
  """
  try:
    modified_stories = [
        utils.update_signed_uris_in_story(story)
        for story in story_service.list_stories(user_id)
    ]
    # Backfill fields for old stories before the cut settings functionality
    utils.backfill_missing_fields(modified_stories)

    return modified_stories
  except Exception as ex:
    logging.error(
        "DreamBoard - STORY_ROUTES-list_all_stories: - ERROR: %s", str(ex)
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


@story_router.post("/save_story/{user_id}")
def save_story(user_id: str, story: Dict = Body(...)):
  """
  Save the given story for a particular user.
  """
  try:
    story_service.save_story(user_id, story)

    return JSONResponse(content="Story created successfully!", status_code=200)
  except Exception as ex:
    logging.error("DreamBoard - STORY_ROUTES-save_story: - ERROR: %s", str(ex))
    if os.getenv("USE_AUTH_MIDDLEWARE"):
      error_response = {
          "status_code": 500,
          "error_message": str(ex),
      }
      # Workaround to send the actual error message to NodeJS middleware request handler
      return JSONResponse(content=error_response)
    else:
      raise HTTPException(status_code=500, detail=str(ex)) from ex


@story_router.delete("/remove_story/{user_id}/{story_id}")
def remove_story(user_id: str, story_id: str):
  """
  Delete a specific story for the given user.
  """
  try:
    if not story_service.get_story(user_id, story_id):
      logging.error(
          "DreamBoard - STORY_ROUTES-remove_story: -"
          " ERROR: Story %s not found for user %s",
          story_id,
          user_id,
      )
      if os.getenv("USE_AUTH_MIDDLEWARE"):
        error_response = {
            "status_code": 500,
            "error_message": f"Story {story_id} not found for user {user_id}",
        }
        # Workaround to send the actual error message to NodeJS middleware request handler
        return JSONResponse(content=error_response)
      else:
        raise HTTPException(
            status_code=404,
            detail=f"Story {story_id} not found for user {user_id}",
        )

    # Delete story
    story_service.delete_story(user_id, story_id)

    return JSONResponse(content="Story deleted successfully!", status_code=200)
  except Exception as ex:
    logging.error(
        "DreamBoard - STORY_ROUTES-remove_story: - ERROR: %s", str(ex)
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
