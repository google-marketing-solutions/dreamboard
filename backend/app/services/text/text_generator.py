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
Class that manages all text creation of all text prompts.

This module provides a robust interface for interacting with the Gemini
large language model (LLM) to perform various text generation tasks,
including brainstorming scenes and enhancing prompts.
"""

import logging

from models.text.text_gen_models import SceneItem, StoryItem
from models.text import text_request_models
from prompts import text_prompts_library

from services import gemini_service
from services.response_schemas import RESPONSE_SCHEMAS


class TextGenerator:
  """
  Manages all text creation tasks, including prompt generation and
  enhancement, using the Gemini LLM.
  """

  def __init__(self):
    """Initializes the TextGenerator instance."""
    pass

  def brainstorm_stories(
      self,
      stories_generation_request: text_request_models.StoriesGenerationRequest,
  ) -> list[StoryItem]:
    """Branstorms stories based on user inputs"""
    if stories_generation_request.creative_brief_idea is None:
      # TODO: use default prompt from prompt library instead.
      return "No Creative Brief idea."

    # Define LLM parameters, including the response schema.
    llm_params = gemini_service.LLMParameters()
    if stories_generation_request.brand_guidelines:
      prompt_template = text_prompts_library.prompts["STORIES"]
      prompt_args = {
          "num_stories": stories_generation_request.num_stories,
          "creative_brief_idea": stories_generation_request.creative_brief_idea,
          "target_audience": stories_generation_request.target_audience,
          "video_format": stories_generation_request.video_format,
          "brand_guidelines": stories_generation_request.brand_guidelines,
          "num_scenes": stories_generation_request.num_scenes,
      }
      prompt = prompt_template["CREATE_STORIES_WITH_BRAND_GUIDELINES"].format(
          **prompt_args
      )
      llm_params.system_instructions = prompt_template["SYSTEM_INSTRUCTIONS"]
      llm_params.generation_config["response_schema"] = RESPONSE_SCHEMAS[
          "CREATE_STORIES_WITH_BRAND_GUIDELINES"
      ]
    else:
      prompt_template = text_prompts_library.prompts["STORIES"]
      prompt_args = {
          "num_stories": stories_generation_request.num_stories,
          "creative_brief_idea": stories_generation_request.creative_brief_idea,
          "target_audience": stories_generation_request.target_audience,
          "video_format": stories_generation_request.video_format,
          "num_scenes": stories_generation_request.num_scenes,
      }
      prompt = prompt_template["CREATE_STORIES"].format(**prompt_args)
      llm_params.system_instructions = prompt_template["SYSTEM_INSTRUCTIONS"]
      llm_params.generation_config["response_schema"] = RESPONSE_SCHEMAS[
          "CREATE_STORIES"
      ]

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)
    stories: list[StoryItem] = []
    if response and response.parsed:
      # Parse the LLM's response into SceneItem objects.
      for story_data in response.parsed:
        stories.append(
            StoryItem(
                id=story_data.get("id"),
                title=story_data.get("title"),
                description=story_data.get("description"),
                brand_guidelines_adherence=story_data.get(
                    "brand_guidelines_adherence"
                ),
                abcd_adherence=story_data.get("abcd_adherence"),
                scenes=story_data.get("scenes"),
            )
        )
      logging.info(
          "DreamBoard - TEXT_GENERATOR: Generated stories: %s", stories
      )
    else:
      logging.info((
          "DreamBoard - TEXT_GENERATOR: Gemini response was empty in "
          "brainstorm_stories. Please check."
      ))

    return stories

  def brainstorm_scenes(
      self, brainstorm_idea: str, brand_guidelines: str, num_scenes: int
  ) -> list[SceneItem]:
    """
    Brainstorms and generates a list of scenes using the Gemini LLM.

    This method leverages specific prompt templates and response schemas
    to guide the LLM in generating structured scene ideas.

    Args:
        brainstorm_idea: The core idea for brainstorming scenes.
        brand_guidelines: Optional guidelines to align scene generation.
        num_scenes: The desired number of scenes to generate.

    Returns:
        A list of `SceneItem` objects, each representing a brainstormed
        scene with its details.
    """
    if brainstorm_idea is None:
      # TODO: use default prompt from prompt library instead.
      return "No scene description."

    # Define LLM parameters, including the response schema.
    llm_params = gemini_service.LLMParameters()
    if brand_guidelines:
      llm_params.generation_config["response_schema"] = RESPONSE_SCHEMAS[
          "CREATE_SCENES_WITH_BRAND_GUIDELINES"
      ]
      brand_guidelines = "CREATE_SCENES_WITH_BRAND_GUIDELINES"
      prompts = text_prompts_library.prompts["SCENE"][brand_guidelines]
      prompt_args = {
          "brainstorm_idea": brainstorm_idea,
          "brand_guidelines": brand_guidelines,
          "num_scenes": num_scenes,
      }
      prompt = prompts.format(**prompt_args)
    else:
      llm_params.generation_config["response_schema"] = RESPONSE_SCHEMAS[
          "CREATE_SCENES"
      ]
      scene_key = "CREATE_SCENES"
      prompt = text_prompts_library.prompts["SCENE"][scene_key].format(
          brainstorm_idea=brainstorm_idea, num_scenes=num_scenes
      )

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)
    scenes: list[SceneItem] = []
    if response and response.parsed:
      # Parse the LLM's response into SceneItem objects.
      for scene_data in response.parsed:
        scenes.append(
            SceneItem(
                number=scene_data.get("number"),
                description=scene_data.get("description"),
                brand_guidelines_alignment=scene_data.get(
                    "brand_guidelines_alignment", None
                ),
                image_prompt=scene_data.get("image_prompt", None),
            )
        )
      logging.info("DreamBoard - TEXT_GENERATOR: Generated scenes: %s", scenes)
    else:
      logging.info((
          "DreamBoard - TEXT_GENERATOR: Gemini response was empty in "
          "brainstorm_scenes. Please check."
      ))

    return scenes

  def create_image_prompt_from_scene(self, scene_description: str) -> str:
    """
    Creates an image generation prompt based on a scene description.

    Args:
        scene_description: The textual description of the scene.

    Returns:
        A string representing the generated image prompt.
    """
    if scene_description is None:
      return "No image prompt"

    # Format the prompt using the scene description.
    scene_prompt_key = "CREATE_IMAGE_PROMPT_FROM_SCENE"
    prompt = text_prompts_library.prompts["SCENE"][scene_prompt_key].format(
        scene_description=scene_description
    )

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt)

    if response and response.parsed:
      return response.parsed
    else:
      logging.info((
          "DreamBoard - TEXT_GENERATOR: Gemini response was empty in "
          "create_image_prompt_from_scene. Please check."
      ))

    return ""

  def create_video_prompt_from_scene(self, scene_description: str) -> str:
    """
    Creates a video generation prompt based on a scene description.

    Args:
        scene_description: The textual description of the scene.

    Returns:
        A string representing the generated video prompt.
    """
    if scene_description is None:
      return "No image prompt"

    # Format the prompt using the scene description.
    scene_prompt_key = "CREATE_VIDEO_PROMPT_FROM_SCENE"
    prompt = text_prompts_library.prompts["SCENE"][scene_prompt_key].format(
        scene_description=scene_description
    )
    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt)

    if response and response.parsed:
      return response.parsed
    else:
      logging.info((
          "DreamBoard - TEXT_GENERATOR: Gemini response was empty in "
          "create_video_prompt_from_scene. Please check."
      ))

    return ""

  def enhance_image_prompt(self, image_prompt: str) -> str:
    """
    Enhances an existing image prompt for better generation results.

    Args:
        image_prompt: The original image prompt to be enhanced.

    Returns:
        A string representing the enhanced image prompt.
    """
    if image_prompt is None:
      return "No image prompt"

    # Format the prompt for enhancement.
    image_prompt_key = "IMAGE_PROMPT_ENHANCEMENTS"
    scene_prompts = text_prompts_library.prompts[image_prompt_key]
    scene_prompt_key = "ENHANCE_IMAGE_PROMPT"
    prompt = scene_prompts[scene_prompt_key].format(image_prompt=image_prompt)

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt)

    if response and response.parsed:
      return response.parsed
    else:
      logging.info((
          "DreamBoard - TEXT_GENERATOR: Gemini response was empty in "
          "enhance_image_prompt. Please check."
      ))

    return ""

  def enhance_video_prompt(self, video_prompt: str) -> str:
    """
    Enhances an existing video prompt for better generation results.

    Args:
        video_prompt: The original video prompt to be enhanced.

    Returns:
        A string representing the enhanced video prompt.
    """
    if video_prompt is None:
      return "No video prompt"

    # Format the prompt for enhancement.
    image_prompt_key = "IMAGE_PROMPT_ENHANCEMENTS"
    scene_prompts = text_prompts_library.prompts[image_prompt_key]
    scene_prompt_with_key = scene_prompts["ENHANCE_VIDEO_PROMPT"]
    prompt = scene_prompt_with_key.format(video_prompt=video_prompt)

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt)

    if response and response.parsed:
      return response.parsed
    else:
      logging.info((
          "DreamBoard - TEXT_GENERATOR: Gemini response was empty in "
          "enhance_video_prompt. Please check."
      ))

    return ""

  def enhance_image_prompt_with_scene(
      self, prompt: str, scene_description: str
  ) -> str:
    """
    Enhances an image prompt by incorporating details from a scene.

    Args:
        prompt: The original image prompt.
        scene_description: The textual description of the scene.

    Returns:
        A string representing the enhanced image prompt.
    """
    if prompt is None or scene_description is None:
      return "No prompt or scene description"

    # Format the prompt for enhancement with scene context.
    scene_prompt_key = "ENHANCE_IMAGE_PROMPT_WITH_SCENE"
    image_prompt = text_prompts_library.prompts["IMAGE_PROMPT_ENHANCEMENTS"]
    prompts = image_prompt[scene_prompt_key]
    prompt_args = {
        "image_prompt": prompt,
        "scene_description": scene_description,
    }
    prompt = prompts.format(**prompt_args)

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt)

    if response and response.parsed:
      return response.parsed
    else:
      logging.info((
          "DreamBoard - TEXT_GENERATOR: Gemini response was empty in "
          "enhance_image_prompt_with_scene. Please check."
      ))

    return ""

  def enhance_video_prompt_with_scene(
      self, prompt: str, scene_description: str
  ) -> str:
    """
    Enhances a video prompt by incorporating details from a scene.

    Args:
        prompt: The original video prompt.
        scene_description: The textual description of the scene.

    Returns:
        A string representing the enhanced video prompt.
    """
    if prompt is None or scene_description is None:
      return "No prompt or scene description"

    # Format the prompt for enhancement with scene context.
    scene_prompt_key = "ENHANCE_VIDEO_PROMPT_WITH_SCENE"
    video_prompt = text_prompts_library.prompts["VIDEO_PROMPT_ENHANCEMENTS"]
    prompts = video_prompt[scene_prompt_key]
    prompt_args = {
        "video_prompt": prompt,
        "scene_description": scene_description,
    }
    prompt = prompts.format(**prompt_args)

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt)

    if response and response.parsed:
      return response.parsed
    else:
      logging.info((
          "DreamBoard - TEXT_GENERATOR: Gemini response was empty in "
          "enhance_video_prompt_with_scene. Please check."
      ))

    return ""

  def generate_image_prompts_from_scenes(self, scenes: list[str]) -> list[str]:
    """
    Generates individual image prompts for a list of scene descriptions.

    This method iterates through each scene and calls
    `create_image_prompt_from_scene` to generate a prompt for it.

    Args:
        scenes: A list of textual scene descriptions.

    Returns:
        A list of strings, where each string is a generated image prompt.
    """
    image_prompts = []
    for scene_desc in scenes:
      image_prompts.append(self.create_image_prompt_from_scene(scene_desc))

    return image_prompts

  def generate_video_prompts_from_scenes(self, scenes: list[str]) -> list[str]:
    """
    Generates individual video prompts for a list of scene descriptions.

    This method iterates through each scene and calls
    `create_video_prompt_from_scene` to generate a prompt for it.

    Args:
        scenes: A list of textual scene descriptions.

    Returns:
        A list of strings, where each string is a generated video prompt.
    """
    video_prompts = []
    for scene_desc in scenes:
      video_prompts.append(self.create_video_prompt_from_scene(scene_desc))

    return video_prompts

  def extract_brand_guidelines_from_file(self, file_gcs_uri: str) -> str:
    """Extracts brand guidelines from a GCS file using Gemini LLM.

    Args:
      file_gcs_uri: The Google Cloud Storage URI of the brand guidelines file.

    Returns:
      The extracted brand guidelines text, or an empty string if extraction fails.
    """
    prompt_template = text_prompts_library.prompts["BRAND_GUIDELINES"]
    prompt = prompt_template["EXTRACT_BRAND_GUIDELINES"]

    # Define params for the LLM
    llm_params = gemini_service.LLMParameters()
    llm_params.system_instructions = prompt_template["SYSTEM_INSTRUCTIONS"]
    # Set llm modality to document
    llm_params.set_modality({"type": "DOCUMENT", "gcs_uri": file_gcs_uri})

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)

    if response and response.parsed:
      return response.parsed
    else:
      logging.info((
          "DreamBoard - TEXT_GENERATOR: Gemini response was empty in "
          "extract_brand_guidelines_from_file. Please check."
      ))

    return ""

  def extract_creative_brief_from_file(self, file_gcs_uri: str) -> str:
    """Extracts a creative brief from a GCS file using Gemini LLM.

    Args:
      file_gcs_uri: The Google Cloud Storage URI of the creative brief file.

    Returns:
      The extracted creative brief text, or an empty string if extraction fails.
    """
    prompt_template = text_prompts_library.prompts["CREATIVE_BRIEF"]
    prompt = prompt_template["EXTRACT_CREATIVE_BRIEF"]

    # Define params for the LLM
    llm_params = gemini_service.LLMParameters()
    llm_params.system_instructions = prompt_template["SYSTEM_INSTRUCTIONS"]
    # Set llm modality to document
    llm_params.set_modality({"type": "DOCUMENT", "gcs_uri": file_gcs_uri})

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)

    if response and response.parsed:
      return response.parsed
    else:
      logging.info((
          "DreamBoard - TEXT_GENERATOR: Gemini response was empty in "
          "extract_creative_brief_from_file. Please check."
      ))

    return ""


# Create a singleton instance of the TextGenerator for application-wide use.
text_generator = TextGenerator()
