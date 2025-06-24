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
      self, prompt: str, model: str = "gemini-2.5-flash-preview-05-20"
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
