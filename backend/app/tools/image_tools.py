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

from google.adk.tools import ToolContext
from google.genai import types

from services.agent.imagen_service import ImagenService


async def generate_image(prompt: str, tool_context: "ToolContext") -> dict:
  """Generates images based on a prompt

  Args:
      prompt: The prompt to generate images from

  Returns:
      A dictionary containing the generated image and status.
  """
  image_service = ImagenService()
  image_response = image_service.generate_images(prompt=prompt)
  if image_response and image_response.images:
    image_bytes = image_response.images[0]._image_bytes
    await tool_context.save_artifact(
        "image.png",
        types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
    )
    return {
        "status": "success",
        "detail": "Image generated successfully and stored in artifacts.",
        "filename": "image.png",
    }
  else:
    return {"image": None, "status": "failure"}
