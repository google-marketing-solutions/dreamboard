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

"""Pydantic models for the bulk API requests and responses."""

import dataclasses
from typing import Any

import pydantic

from bulk_app import security


class BulkUploadSheetRequest(pydantic.BaseModel):
  """Request to load a Google Sheet into a bulk operation.

  Attributes:
      sheet_url: https://docs.google.com/spreadsheets/d/{id}/... URL.
  """

  sheet_url: str = pydantic.Field(max_length=security.MAX_URL_LENGTH)

  @pydantic.field_validator("sheet_url")
  @classmethod
  def _validate_sheet_url(cls, value: str) -> str:
    security.validate_sheet_url(value)
    return value.strip()


class BulkUploadSheetResponse(pydantic.BaseModel):
  """Result of loading a sheet.

  Attributes:
      bulk_id: Id of the bulk operation ({YYYYMMDDHHmmss}_{spreadsheet_id}).
      message: Human readable result.
      status_summary: Rows per status (READY_TO_GENERATE, SKIPPED, ERROR).
  """

  bulk_id: str
  message: str
  status_summary: dict[str, int] = pydantic.Field(default_factory=dict)


class BulkVideoGenerationResponse(pydantic.BaseModel):
  """Result of generating the videos of a bulk operation.

  Attributes:
      videos: One core VideoGenerationResponse per processed row. Typed as
          Any so this module does not import the backend core.
      status_summary: Rows per status (VIDEO_GENERATED, ERROR).
  """

  videos: list[Any]
  status_summary: dict[str, int] = pydantic.Field(default_factory=dict)


@dataclasses.dataclass
class BulkVideoRequest:
  """A row ready to be sent to Veo.

  Attributes:
      bulk_id: Bulk operation id.
      row_id: Row id (row_N).
      prompt: Text prompt for the video.
      seed_image_uri: gs:// URI of the seed image.
  """

  bulk_id: str
  row_id: str
  prompt: str
  seed_image_uri: str
