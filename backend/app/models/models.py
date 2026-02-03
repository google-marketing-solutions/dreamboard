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

import os
from dataclasses import dataclass, field


GEMINI_3_FLASH_MODEL_NAME = "gemini-3-flash"
GEMINI_3_FLASH_MODEL_NAME_PREVIEW = "gemini-3-flash-preview"
GEMINI_2_5_FLASH_MODEL_NAME = "gemini-2.5-flash"


@dataclass
class LLMParameters:
  """
  Represents the configuration parameters required to make a prediction request to the LLM.

  Attributes:
      model_name: The name of the Gemini model to use.
      location: The Google Cloud location (region) for the model.
      modality: A dictionary defining the input modality (e.g., text, document).
      response_modalities: A dictionary defining the expected output modality.
      system_instructions: System instructions to guide the model's behavior.
      generation_config: Configuration parameters for generation (temperature, tokens, etc.).
  """

  model_name: str = GEMINI_3_FLASH_MODEL_NAME_PREVIEW
  location: str = os.getenv(
      "LOCATION"
  )  # for versions <= gemini-2.5-flash, override for >= gemini 3
  modality: dict = field(default_factory=lambda: {"type": "TEXT"})
  response_modalities: dict = field(default_factory=lambda: {"type": "TEXT"})
  system_instructions: str = ""
  generation_config: dict = field(
      default_factory=lambda: {
          "max_output_tokens": 65535,
          "temperature": 1,
          "top_p": 0.95,
          "response_schema": {"type": "string"},
      }
  )

  def set_modality(self, modality: dict) -> None:
    """
    Sets the modality to use in the LLM.

    The modality object changes depending on the type.
    For DOCUMENT:
    {
        "type": "DOCUMENT", # prompt is handled separately
        "gcs_uri": ""
    }
    For TEXT:
    {
        "type": "TEXT" # prompt is handled separately
    }

    Args:
        modality: A dictionary specifying the modality type and associated data.
    """
    self.modality = modality
