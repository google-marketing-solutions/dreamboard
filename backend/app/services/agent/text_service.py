# Copyright 2025 Google Inc
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from typing import Optional

import os
from google import genai
import traceback
from google.genai import types


class TextService:

  def __init__(
      self, project_id: Optional[str] = None, location: Optional[str] = None
  ):
    try:
      self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
      self.location = location or os.getenv(
          "GOOGLE_CLOUD_LOCATION", "us-central1"
      )

      if not self.project_id:
        raise ValueError(
            "Google Cloud project ID must be provided either as an argument "
            "or through the GOOGLE_CLOUD_PROJECT environment variable."
        )

      self.client = genai.Client(
          vertexai=True, project=self.project_id, location=self.location
      )

    except Exception as e:
      print(f"Error initializing ImagenService: {str(e)}")
      traceback.print_exc()
      raise

  def generate_markdown_text(
      self, prompt: str, model: str = "gemini-2.5-flash"
  ) -> str:
    """Generates a text response based on the given prompt using a specified model.
    Returns all text in markdown format

    Args:
        prompt (str): The input prompt for text generation.
        model (str, optional): The model to use for text generation.
            Defaults to "gemini-2.5-pro-preview-06-05\t".
    """

    response = self.client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction="Return all responses in Markdown format"
        ),
    )
    return response.text
