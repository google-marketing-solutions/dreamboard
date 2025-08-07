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
from services.story_service import StoryService
from typing import Annotated, Dict

from fastapi import APIRouter, Body, Depends, HTTPException

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
    story = story_service.get_story(user_id, story_id)
    if not story:
        logging.error(
            "DreamBoard - STORY_ROUTES-read_story: -"
            " ERROR: %s not found for user %s",
            story_id, user_id
        )
        raise HTTPException(status_code=404, detail="Story not found")
    return story

@story_router.get("/list_all_stories/{user_id}")
def list_all_stories(user_id: str):
    """
    List all stories for the given user.
    """
    return story_service.list_stories(user_id)

@story_router.post("/save_story/{user_id}")
def save_story(user_id: str, story: Dict = Body(...)):
    """
    Save the given story for a particular user.
    """
    return story_service.save_story(user_id, story)

@story_router.delete("/remove_story/{user_id}/{story_id}")
def remove_story(user_id: str, story_id: str):
    """
    Delete a specific story for the given user.
    """
    if not story_service.get_story(user_id, story_id):
        logging.error(
            "DreamBoard - STORY_ROUTES-remove_story: -"
            " ERROR: %s not found for user %s",
            story_id, user_id
        )
        raise HTTPException(status_code=404, detail=f"Story {story_id} not found for user {user_id}")
    story_service.delete_story(user_id, story_id)
    return {"deleted": True}
