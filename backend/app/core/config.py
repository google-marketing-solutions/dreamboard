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
Module to define the application settings.

This file configures core application settings such as project name, API
prefix, and Cross-Origin Resource Sharing (CORS) origins using Pydantic
for robust validation and environment variable management.
"""

from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
  """
  Defines the application's configurable settings.

  These settings can be loaded from environment variables or a .env file,
  providing flexible configuration for different environments.
  """

  PROJECT_NAME: str = "DreamBoard"
  API_PREFIX: str = "/api"
  # JSON-formatted list of origins that are allowed to make cross-origin
  # requests to the backend API.
  BACKEND_CORS_ORIGINS: list[AnyHttpUrl] = [
      "http://localhost",
      "http://localhost:4200",  # Common for Angular development
      "http://localhost:3000",  # Common for React development
      # TODO: Include all necessary production and development origins here.
  ]
  USER_AGENT: str = "cloud-solutions/mas-dreamboard-usage-v1"

  # @classmethod should be below @field_validator for proper type checking
  @field_validator("BACKEND_CORS_ORIGINS", mode="before")
  @classmethod
  def assemble_cors_origins(cls, v: str | list[str]) -> list[str] | str:
    """
    Validator for BACKEND_CORS_ORIGINS.

    This method ensures that CORS origins are correctly parsed, allowing
    them to be provided either as a comma-separated string or a list.

    Args:
        v: The input value for BACKEND_CORS_ORIGINS, which can be a
           string or a list of strings.

    Returns:
        A list of strings representing the validated CORS origins.

    Raises:
        ValueError: If the input format is invalid and cannot be parsed.
    """
    if isinstance(v, str) and not v.startswith("["):
      # If it's a string not starting with '[', assume it's
      # comma-separated.
      return [i.strip() for i in v.split(",")]
    elif isinstance(v, (list, str)):
      # If it's already a list or a JSON string (e.g., from env var)
      return v
    raise ValueError(v)


# Create a singleton instance of the Settings to be imported throughout
# the application.
settings = Settings()
