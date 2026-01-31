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

"""Module to load helper functions and classes to interact with Vertex AI."""

import os
import time
from models import models
import vertexai
from google import genai
from google.api_core.exceptions import ResourceExhausted
from google.genai import types
from vertexai import generative_models
from vertexai.preview.generative_models import HarmBlockThreshold, HarmCategory


DEFAULT_CONFIG = models.LLMParameters()


class GeminiService:
  """Service to interact with the Gemini API."""

  def __init__(
      self,
      project_id: str,
  ):
    """
    Initializes the GeminiService.

    Args:
        project_id: The Google Cloud project ID.
    """
    self.project_id = project_id

  def execute_gemini_with_genai(
      self, prompt: str, llm_params: models.LLMParameters | None = None
  ):
    """
    Executes Gemini using the GenAI library.

    Args:
        prompt: The text prompt for Gemini.
        llm_params: Optional. Parameters for the LLM request.

    Returns:
        The response from the Gemini model.
    """
    if not llm_params:
      llm_params = DEFAULT_CONFIG
    # Retry call for retriable errors
    retries = 3
    for this_retry in range(retries):
      try:
        client = genai.Client(
            vertexai=True,
            project=self.project_id,
            location=llm_params.location,
        )
        # Build prompt part
        parts = self._get_modality_parts(prompt, llm_params.modality)
        contents = [
            types.Content(role="user", parts=parts),
        ]
        generate_content_config = types.GenerateContentConfig(
            temperature=llm_params.generation_config.get("temperature"),
            top_p=llm_params.generation_config.get("top_p"),
            seed=0,
            max_output_tokens=llm_params.generation_config.get(
                "max_output_tokens"
            ),
            response_modalities=[llm_params.response_modalities.get("type")],
            safety_settings=[
                types.SafetySetting(
                    category="HARM_CATEGORY_HATE_SPEECH", threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="OFF"
                ),
                types.SafetySetting(
                    category="HARM_CATEGORY_HARASSMENT", threshold="OFF"
                ),
            ],
            system_instruction=[
                types.Part.from_text(text=llm_params.system_instructions)
            ],
            response_mime_type="application/json",
            response_schema=llm_params.generation_config.get("response_schema"),
        )
        # Get response from Gemini
        response = client.models.generate_content(
            model=llm_params.model_name,
            contents=contents,
            config=generate_content_config,
        )

        return response
      except ResourceExhausted as ex:
        print(f"QUOTA RETRY: {this_retry + 1}. ERROR {str(ex)} ...")
        wait = 10 * 2**this_retry
        time.sleep(wait)
      except AttributeError as ex:
        error_message = str(ex)
        if "Content has no parts" in error_message:
          # Retry request
          print(
              f"Error: {ex} Gemini might be blocking the response "
              f"due to safety issues. Retrying {retries} times using "
              "exponential backoff. "
              f"Retry number {this_retry + 1}...\n"
          )
          wait = 10 * 2**this_retry
          time.sleep(wait)
      except Exception as ex:
        print("GENERAL EXCEPTION...\n")
        error_message = str(ex)
        # Check quota issues for now
        if (
            "429 Quota exceeded" in error_message
            or "503 The service is currently unavailable" in error_message
            or "500 Internal error encountered" in error_message
        ):
          print(
              f"Error {error_message}. Retrying {retries} times using"
              " exponential backoff. "
              f"Retry number {this_retry + 1}...\n"
          )
          # Retry request
          wait = 10 * 2**this_retry
          time.sleep(wait)
        else:
          print(
              f"ERROR: the following issue can't be retried: {error_message}\n"
          )
          # Raise exception for non-retriable errors
          raise

  def execute_gemini(
      self, prompt: str, llm_params: models.LLMParameters | None = None
  ) -> str:
    """
    Makes a request to Gemini to get a response based on the provided prompt
    and multi-modal params.

    Args:
        prompt: The text prompt for Gemini.
        llm_params: Optional. Parameters for the LLM request.

    Returns:
        A string with the generated response.
    """
    if not llm_params:
      llm_params = DEFAULT_CONFIG
    retries = 3
    for this_retry in range(retries):
      try:
        vertexai.init(project=self.project_id, location=llm_params.location)
        model = generative_models.GenerativeModel(
            llm_params.model_name,
            system_instruction=[types.Part.from_text(text="""dsfdsfsdfds""")],
        )
        modality_params = self._get_modality_params(
            prompt, llm_params.modality.get("type")
        )

        # Use provided schema if any
        if llm_params.generation_config.get("response_schema"):
          gen_config = generative_models.GenerationConfig(
              temperature=llm_params.generation_config.get("temperature"),
              max_output_tokens=llm_params.generation_config.get(
                  "max_output_tokens"
              ),
              top_p=llm_params.generation_config.get("top_p"),
              response_mime_type="application/json",
              response_schema=llm_params.generation_config.get(
                  "response_schema"
              ),
          )
        else:
          gen_config = generative_models.GenerationConfig(
              temperature=llm_params.generation_config.get("temperature"),
              max_output_tokens=llm_params.generation_config.get(
                  "max_output_tokens"
              ),
              top_p=llm_params.generation_config.get("top_p"),
              response_mime_type="application/json",
          )

        response = model.generate_content(
            modality_params,
            generation_config=gen_config,
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: (
                    HarmBlockThreshold.BLOCK_ONLY_HIGH
                ),
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: (
                    HarmBlockThreshold.BLOCK_ONLY_HIGH
                ),
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: (
                    HarmBlockThreshold.BLOCK_ONLY_HIGH
                ),
                HarmCategory.HARM_CATEGORY_HARASSMENT: (
                    HarmBlockThreshold.BLOCK_ONLY_HIGH
                ),
            },
            stream=False,
        )
        return response.text if response else ""
      except ResourceExhausted as ex:
        print(f"QUOTA RETRY: {this_retry + 1}. ERROR {str(ex)} ...")
        wait = 10 * 2**this_retry
        time.sleep(wait)
      except AttributeError as ex:
        error_message = str(ex)
        if "Content has no parts" in error_message:
          # Retry request
          print(
              f"Error: {ex} Gemini might be blocking the response "
              f"due to safety issues. Retrying {retries} times using "
              "exponential backoff. "
              f"Retry number {this_retry + 1}...\n"
          )
          wait = 10 * 2**this_retry
          time.sleep(wait)
      except Exception as ex:
        print("GENERAL EXCEPTION...\n")
        error_message = str(ex)
        # Check quota issues for now
        if (
            "429 Quota exceeded" in error_message
            or "503 The service is currently unavailable" in error_message
            or "500 Internal error encountered" in error_message
        ):
          print(
              f"Error {error_message}. Retrying {retries} times using"
              " exponential backoff. "
              f"Retry number {this_retry + 1}...\n"
          )
          # Retry request
          wait = 10 * 2**this_retry
          time.sleep(wait)
        else:
          print(
              f"ERROR: the following issue can't be retried: {error_message}\n"
          )
          # Raise exception for non-retriable errors
          raise
    return ""

  def _get_modality_parts(self, prompt: str, modality: dict) -> list[any]:
    """
    Builds the modality parameters based on the type of LLM capability to
    use.

    Args:
        prompt: The text prompt.
        modality: The type of modality (e.g., "text").

    Returns:
        A list of parameters for the specified modality.
    """
    prompt_part = types.Part.from_text(text=prompt)
    if modality.get("type") == "TEXT":
      return [prompt_part]
    if modality.get("type") == "DOCUMENT":
      # Support PDF for now
      extension = modality.get("gcs_uri").rsplit(".", 1)[-1]
      if extension == "pdf":
        mime_type = f"application/{extension}"
      elif extension == "txt":
        mime_type = "text/plain"
      else:
        mime_type = ""
      document = types.Part.from_uri(
          file_uri=modality.get("gcs_uri"),
          mime_type=mime_type,
      )
      return [document, prompt_part]
    return []


# Create a global instance of the GeminiService
gemini_service = GeminiService(os.getenv("PROJECT_ID"))
