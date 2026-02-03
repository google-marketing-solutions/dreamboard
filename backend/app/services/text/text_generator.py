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
import uuid
import os
from models.text import text_gen_models
from models.text import text_request_models
from models.image import image_gen_models
from prompts import text_prompts_library
from models import models
import utils
from services import gemini_service
from services.image import image_generator
from models.image import image_request_models
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
  ) -> list[text_gen_models.StoryItem]:
    """
    Brainstorms stories based on user inputs.

    Args:
        stories_generation_request: A `StoriesGenerationRequest` object containing
            parameters for story generation, including the creative brief idea,
            target audience, and optional brand guidelines.

    Returns:
        A list of `text_gen_models.StoryItem` objects, each representing a generated story.
    """
    if stories_generation_request.creative_brief_idea is None:
      # TODO: use default prompt from prompt library instead.
      return "No Creative Brief idea."

    # Define LLM parameters, including the response schema.
    llm_params = models.LLMParameters()

    # Use preview models while full version is avaiable
    if os.getenv("USE_PREVIEW_GEMINI_MODEL") == "True":
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME_PREVIEW
    else:
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME

    llm_params.location = os.getenv(
        "GEMINI_MODEL_LOCATION"
    )  # 'global' needed for Gemini >= 3

    if stories_generation_request.brand_guidelines:
      prompt_template = text_prompts_library.prompts["STORIES_GENERATION"]
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
      prompt_template = text_prompts_library.prompts["STORIES_GENERATION"]
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
    response = gemini_service.gemini_service.execute_gemini_with_genai(
        prompt, llm_params
    )
    stories: list[text_gen_models.StoryItem] = []
    if response and response.parsed:
      # Parse the LLM's response into SceneItem objects.
      for story_data in response.parsed:
        story_item = text_gen_models.StoryItem(
            id=uuid.uuid4(),
            title=story_data.get("title"),
            description=story_data.get("description"),
            brand_guidelines_adherence=story_data.get(
                "brand_guidelines_adherence"
            ),
            abcd_adherence=story_data.get("abcd_adherence"),
            all_characters=[],
            scenes=[],
        )
        # Process Scenes in story
        for scene_data in story_data.get("scenes", []):
          scene_item = text_gen_models.SceneItem(
              id=uuid.uuid4(),
              description=scene_data.get("description"),
              image_prompt=scene_data.get("image_prompt"),
              video_prompt=scene_data.get("video_prompt"),
              characters=[],
          )
          # Process characters in story
          for character_data in scene_data.get("characters", []):
            character_item = text_gen_models.Character(
                id="",  # empty here, will be filled out later with unique character id
                name=character_data.get("name"),
                description=character_data.get("description"),
            )
            scene_item.characters.append(character_item)

          story_item.scenes.append(scene_item)

        stories.append(story_item)

      # Extract characters, generate images and update scenes
      if stories_generation_request.extract_characters:
        for story in stories:
          # 1. Identify unique characters, generate ids for each
          unique_characters = self.extract_unique_characters_from_story(story)
          # NOTE: This array is not used for now
          story.all_characters = [
              unique_characters.get(c_name).get("character")
              for c_name in unique_characters
          ]
          # 2. Generate images for unique characters
          responses: list[image_gen_models.GenericImageGenerationResponse] = (
              self.generate_character_images(
                  story.id,
                  unique_characters,
              )
          )
          # 3. Update character ids in each scene with unique scene ids + prev gen character ids
          self.update_character_ids_with_unique_scene_character_ids(
              story, unique_characters
          )
          # 4. Find characters in scene and update them with generated unique character images
          self.process_and_assign_generated_images_for_characters(
              responses, unique_characters, story.scenes
          )
      else:
        # Still update character IDs
        for story in stories:
          unique_characters = self.extract_unique_characters_from_story(story)
          self.update_character_ids_with_unique_scene_character_ids(
              story, unique_characters
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

  def update_character_ids_with_unique_scene_character_ids(
      self,
      story: text_gen_models.StoryItem,
      unique_characters: dict[str, text_gen_models.Character],
  ):
    """
    Updates character IDs within scenes to be unique per scene.

    This ensures that if a character appears in multiple scenes, they have a
    distinct ID for that specific scene occurrence, formatted as
    "{scene_id}@{character_id}".

    Args:
        story: The `StoryItem` object containing the scenes and characters.
        unique_characters: A dictionary of unique characters found in the story.
    """
    for scene in story.scenes:
      for character in scene.characters:
        if str(character.id) in unique_characters:
          # Generate unique id for each character in scene
          # using scene id + character id
          scene_character_id = f"{scene.id}@{character.id}"
          character.id = scene_character_id

  def extract_unique_characters_from_story(
      self, story: text_gen_models.StoryItem
  ) -> dict[str, text_gen_models.Character]:
    """
    Identifies and extracts unique characters from a story based on their names.

    Iterates through all scenes in the story to find unique characters. It assigns
    a new UUID to the first occurrence of a character and reuses it for subsequent
    occurrences.

    Args:
        story: The `StoryItem` object to extract characters from.

    Returns:
        A dictionary where keys are character IDs (str) and values are dictionaries
        containing the `Character` object and a list of scene IDs where they appear.
    """
    # 1. Identify unique characters in story by name
    unique_characters = {}
    found_characters = {}
    for scene in story.scenes:
      for character in scene.characters:
        if character.name not in found_characters:
          # Generate a unique id for character using scene id
          character.id = uuid.uuid4()
          found_characters[character.name] = character
          unique_characters[str(character.id)] = {
              "character": character,
              "found_in_scenes": [str(scene.id)],
          }
        else:
          # Assign id of existing character
          character.id = found_characters.get(character.name).id
          unique_characters[str(character.id)]["found_in_scenes"].append(
              str(scene.id)
          )

    return unique_characters

  def generate_character_images(
      self,
      story_id: str,
      unique_characters: dict[str, text_gen_models.Character],
  ) -> list[image_gen_models.GenericImageGenerationResponse]:
    """
    Generates images for unique characters in the story.

    Constructs image generation requests for each unique character based on their
    description and sends them to the image generator.

    Args:
        story_id: The unique identifier for the story.
        unique_characters: A dictionary of unique characters to generate images for.

    Returns:
        A list of `GenericImageGenerationResponse` objects containing the results.
    """
    image_gen_request = image_request_models.ImageGenerationRequest(
        image_gen_operations=[]
    )
    # Build image generation operations
    for name, character_info in unique_characters.items():
      logging.info("Processing charater %s", name)
      # To find each generated image by scene and character id later
      prompt_template = text_prompts_library.prompts[
          "CHARACTER_IMAGE_GENERATION"
      ]
      prompt_args = {
          "character_description": character_info.get("character").description
      }
      prompt = prompt_template.format(**prompt_args)
      image_gen_request.image_gen_operations.append(
          image_request_models.ImageGenerationOperation(
              # Set ID this way to store characters in story_id/images/characters in gcs
              id=f"characters/{character_info.get("character").id}",
              image_model=image_request_models.GEMINI_3_PRO_IMAGE_MODEL_NAME,
              image_gen_task="text-to-image",
              prompt=prompt,
              aspect_ratio="16:9",
              resolution="1K",
              response_modalities=["IMAGE"],
          )
      )

    # Image generator already handles task generation in parallel
    responses: (
        image_gen_models.GenericImageGenerationResponse
    ) = image_generator.ImageGenerator().generate_images_from_scenes_gemini_editor(
        story_id, image_gen_request
    )

    return responses

  def process_and_assign_generated_images_for_characters(
      self,
      responses: list[image_gen_models.GenericImageGenerationResponse],
      unique_characters: dict[str, text_gen_models.Character],
      scenes: list[text_gen_models.SceneItem],
  ):
    """
    Processes generated character images and assigns them to characters in scenes.

    Iterates through the image generation responses, retrieves the generated image,
    and assigns it to the corresponding character in every scene where they appear.

    Args:
        responses: A list of `GenericImageGenerationResponse` objects.
        unique_characters: A dictionary of unique characters.
        scenes: A list of `SceneItem` objects where the characters appear.
    """
    # Process responses from Image model
    for response in responses:
      character_id = response.id.split("/")[-1]  # id is in the last position
      character = unique_characters[character_id]
      # Process all the scenes where this character is found to add respective images
      # for all characters
      for scene_id in character.get("found_in_scenes", []):
        # Update characters with their images for this scene
        found_scene = utils.find_element_by_id(scene_id, scenes)
        if found_scene:
          # Use scene id + character id since this was updated in
          # update_character_ids_from_scenes_with_unique_character_ids
          scene_character_id = f"{scene_id}@{character_id}"
          found_character = utils.find_element_by_id(
              scene_character_id, found_scene.characters
          )
          if found_character:
            image = response.images[0] if response.images else None
            if image:
              # Need to make this unique per scene, per character for the frontend
              image.id = f"{scene_character_id}@{image.id}"
              found_character.image = image

  def brainstorm_scenes(
      self, brainstorm_idea: str, brand_guidelines: str, num_scenes: int
  ) -> list[text_gen_models.SceneItem]:
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
    llm_params = models.LLMParameters()

    # Use preview models while full version is avaiable
    if os.getenv("USE_PREVIEW_GEMINI_MODEL") == "True":
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME_PREVIEW
    else:
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME

    llm_params.location = os.getenv(
        "GEMINI_MODEL_LOCATION"
    )  # 'global' needed for Gemini >= 3

    if brand_guidelines:
      llm_params.generation_config["response_schema"] = RESPONSE_SCHEMAS[
          "CREATE_SCENES_WITH_BRAND_GUIDELINES"
      ]
      brand_guidelines = "CREATE_SCENES_WITH_BRAND_GUIDELINES"
      prompts = text_prompts_library.prompts["SCENE_GENERATION"][
          brand_guidelines
      ]
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
      prompt = text_prompts_library.prompts["SCENE_GENERATION"][
          scene_key
      ].format(brainstorm_idea=brainstorm_idea, num_scenes=num_scenes)

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)
    scenes: list[text_gen_models.SceneItem] = []
    if response and response.parsed:
      # Parse the LLM's response into SceneItem objects.
      for scene_data in response.parsed:
        scenes.append(
            text_gen_models.SceneItem(
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

    # Define LLM parameters, including the response schema.
    llm_params = models.LLMParameters()

    # Use preview models while full version is avaiable
    if os.getenv("USE_PREVIEW_GEMINI_MODEL") == "True":
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME_PREVIEW
    else:
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME

    llm_params.location = os.getenv(
        "GEMINI_MODEL_LOCATION"
    )  # 'global' needed for Gemini >= 3

    # Format the prompt using the scene description.
    scene_prompt_key = "CREATE_IMAGE_PROMPT_FROM_SCENE"
    prompt = text_prompts_library.prompts["SCENE_GENERATION"][
        scene_prompt_key
    ].format(scene_description=scene_description)

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)

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
      return "No video prompt"

    # Define LLM parameters, including the response schema.
    llm_params = models.LLMParameters()

    # Use preview models while full version is avaiable
    if os.getenv("USE_PREVIEW_GEMINI_MODEL") == "True":
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME_PREVIEW
    else:
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME

    llm_params.location = os.getenv(
        "GEMINI_MODEL_LOCATION"
    )  # 'global' needed for Gemini >= 3

    # Format the prompt using the scene description.
    scene_prompt_key = "CREATE_VIDEO_PROMPT_FROM_SCENE"
    prompt = text_prompts_library.prompts["SCENE_GENERATION"][
        scene_prompt_key
    ].format(scene_description=scene_description)
    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)

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

    # Define LLM parameters, including the response schema.
    llm_params = models.LLMParameters()

    # Use preview models while full version is avaiable
    if os.getenv("USE_PREVIEW_GEMINI_MODEL") == "True":
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME_PREVIEW
    else:
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME

    llm_params.location = os.getenv(
        "GEMINI_MODEL_LOCATION"
    )  # 'global' needed for Gemini >= 3

    # Format the prompt for enhancement.
    scene_prompts = text_prompts_library.prompts["IMAGE_PROMPT_ENHANCEMENTS"]
    prompt = scene_prompts["ENHANCE_IMAGE_PROMPT"].format(
        image_prompt=image_prompt
    )

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)

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

    # Define LLM parameters, including the response schema.
    llm_params = models.LLMParameters()

    # Use preview models while full version is avaiable
    if os.getenv("USE_PREVIEW_GEMINI_MODEL") == "True":
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME_PREVIEW
    else:
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME

    llm_params.location = os.getenv(
        "GEMINI_MODEL_LOCATION"
    )  # 'global' needed for Gemini >= 3

    # Format the prompt for enhancement.
    scene_prompts = text_prompts_library.prompts["VIDEO_PROMPT_ENHANCEMENTS"]
    scene_prompt_with_key = scene_prompts["ENHANCE_VIDEO_PROMPT"]
    prompt = scene_prompt_with_key.format(video_prompt=video_prompt)

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)

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

    # Define LLM parameters, including the response schema.
    llm_params = models.LLMParameters()

    # Use preview models while full version is avaiable
    if os.getenv("USE_PREVIEW_GEMINI_MODEL") == "True":
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME_PREVIEW
    else:
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME

    llm_params.location = os.getenv(
        "GEMINI_MODEL_LOCATION"
    )  # 'global' needed for Gemini >= 3

    # Format the prompt for enhancement with scene context.
    image_prompt = text_prompts_library.prompts["IMAGE_PROMPT_ENHANCEMENTS"]
    prompts = image_prompt["ENHANCE_IMAGE_PROMPT_WITH_SCENE"]
    prompt_args = {
        "image_prompt": prompt,
        "scene_description": scene_description,
    }
    prompt = prompts.format(**prompt_args)

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)

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

    # Define LLM parameters, including the response schema.
    llm_params = models.LLMParameters()

    # Use preview models while full version is avaiable
    if os.getenv("USE_PREVIEW_GEMINI_MODEL") == "True":
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME_PREVIEW
    else:
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME

    llm_params.location = os.getenv(
        "GEMINI_MODEL_LOCATION"
    )  # 'global' needed for Gemini >= 3

    # Format the prompt for enhancement with scene context.
    video_prompt = text_prompts_library.prompts["VIDEO_PROMPT_ENHANCEMENTS"]
    prompts = video_prompt["ENHANCE_VIDEO_PROMPT_WITH_SCENE"]
    prompt_args = {
        "video_prompt": prompt,
        "scene_description": scene_description,
    }
    prompt = prompts.format(**prompt_args)

    # Execute the Gemini LLM call.
    gemini = gemini_service.gemini_service
    response = gemini.execute_gemini_with_genai(prompt, llm_params)

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

    # Define LLM parameters, including the response schema.
    llm_params = models.LLMParameters()

    # Use preview models while full version is avaiable
    if os.getenv("USE_PREVIEW_GEMINI_MODEL") == "True":
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME_PREVIEW
    else:
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME

    llm_params.location = os.getenv(
        "GEMINI_MODEL_LOCATION"
    )  # 'global' needed for Gemini >= 3

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

    # Define LLM parameters, including the response schema.
    llm_params = models.LLMParameters()

    # Use preview models while full version is avaiable
    if os.getenv("USE_PREVIEW_GEMINI_MODEL") == "True":
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME_PREVIEW
    else:
      llm_params.model_name = models.GEMINI_3_FLASH_MODEL_NAME

    llm_params.location = os.getenv(
        "GEMINI_MODEL_LOCATION"
    )  # 'global' needed for Gemini >= 3

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
