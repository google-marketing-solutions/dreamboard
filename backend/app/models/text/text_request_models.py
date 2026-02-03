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
payloads related to text generation, including brainstorming scenes and
handling various prompt-related operations.
"""

from typing import List, Optional

from pydantic import BaseModel


class StoriesGenerationRequest(BaseModel):
  """
  Represents a request to generate stories based on a creative brief.

  Attributes:
      num_stories: The number of stories to generate (default is 1).
      creative_brief_idea: The core idea or concept for the stories.
      target_audience: The intended audience for the stories.
      brand_guidelines: Optional text describing brand guidelines to follow.
      video_format: The desired format for the video (e.g., "16:9", "Shorts").
      num_scenes: The number of scenes to generate per story.
      extract_characters: A boolean indicating whether to extract and generate
                          character details and images (default is False).
  """

  num_stories: int = 1  # Default to 1 for now
  creative_brief_idea: str
  target_audience: str
  brand_guidelines: str | None = None
  video_format: str
  num_scenes: int
  extract_characters: bool = False


class BrainstormScenesRequest(BaseModel):
  """
  Represents the parameters for a scene brainstorming request.

  This model is used when a user wants to generate multiple scene ideas
  based on a core concept and optional brand guidelines.

  Attributes:
      idea: A string representing the core idea or topic for brainstorming.
      brand_guidelines: An optional string containing specific brand
                        guidelines to adhere to during brainstorming.
      num_scenes: An integer indicating the desired number of scenes
                  to generate.
  """

  idea: str
  brand_guidelines: Optional[str] | None = None
  num_scenes: int


class TextRequest(BaseModel):
  """
  Represents a general request for the text generation service.

  This flexible model can accommodate various text-related operations,
  such as prompt enhancement or scene-based text generation, by using
  different combinations of its attributes.

  Attributes:
      scenes: An optional list of scene descriptions (strings) to be used
              for operations like generating prompts from multiple scenes.
      prompts: An optional list of existing prompts (strings) for batch
               processing or other operations.
      prompt: An optional single text prompt (string) for operations like
              enhancement.
      scene: An optional single scene description (string) for operations
             like generating a prompt from a specific scene.
      idea: An optional string representing a core idea, potentially used
            for certain text generation tasks.
  """

  scenes: Optional[List[str]] | None = []
  prompts: Optional[List[str]] | None = []
  prompt: str | None = ""
  scene: str | None = ""
  idea: str | None = ""


class ExtractTextRequest(BaseModel):
  """Represents a request to extract text from a file.

  Attributes:
    file_gcs_uri: The Google Cloud Storage URI of the file.
    file_type: The type of the file (e.g., "CreativeBrief", "BrandGuidelines").
  """

  file_gcs_uri: str
  file_type: str
