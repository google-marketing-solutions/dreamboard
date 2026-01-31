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
Modules to define business logic modules.

This file contains data models (dataclasses) used across the application
to represent entities related to text generation, such as generated scene
items and the structured responses from text generation APIs.
"""

from dataclasses import dataclass
from models.image import image_gen_models

@dataclass
class Character:
  """"""
  id: str
  name: str
  description: str
  image: image_gen_models.Image | None = None

@dataclass
class SceneItem:
  """
  Represents a single generated scene, typically brainstormed by a text
  generation model.

  Attributes:
      id: The ID of the scene.
      description: A textual description of the scene's content.
      brand_guidelines_alignment: An optional field indicating how well
                                  the scene aligns with specified brand
                                  guidelines.
      image_prompt: An optional image prompt derived from the scene
                    description.
  """

  id: str
  description: str
  image_prompt: str
  video_prompt: str
  characters: list[Character]


@dataclass
class StoryItem:
  """Represents a story"""

  id: str
  title: str
  description: str
  brand_guidelines_adherence: str
  abcd_adherence: str
  scenes: list[SceneItem]


@dataclass
class TextGenerationResponse:
  """
  Represents the structured response from a text generation API call.

  Attributes:
      new_prompt: The newly generated or enhanced text prompt.
      done: A boolean flag indicating if the generation operation is
            complete.
      operation_name: The name of the asynchronous operation, useful for
                      tracking its status.
      execution_message: Any message or status detail about the execution
                         of the text generation.
  """

  new_prompt: str
  done: bool
  operation_name: str
  execution_message: str
