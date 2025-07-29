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

from pydantic import BaseModel
from sqlmodel import Field, SQLModel, String
from typing import Literal
from .enums import AgentType
from google.adk.agents import BaseAgent


class Scenario(SQLModel, table=True):
  id: int = Field(default=None, primary_key=True, unique=True)
  name: str = Field(default=None)
  description: str = Field(default=None)
  overview: str = Field(default=None)
  system_instructions: str = Field(default=None)
  initial_prompt: str = Field(default=None)


class SetScenarioData(BaseModel):
  scenario_id: int


class AgentPydantic(SQLModel, table=True):
  id: int = Field(default=None, primary_key=True, unique=True)
  scenario_id: int = Field(default=None, foreign_key="scenario.id")
  agent_type: Literal[
      AgentType.LLM.value,
      AgentType.Sequential.value,
      AgentType.Parallel.value,
      AgentType.Loop.value,
      AgentType.CodeExecutor.value,
  ] = Field(sa_type=String, default=AgentType.LLM.value)
  name: str = Field(default=None)
  instruction: str = Field(default=None)
  description: str = Field(default=None)
  model: str = Field(default=None)
  media_type: Literal["text", "image", "video", "music"] = Field(
      sa_type=String, default="text"
  )
  # These are stored as csv
  tools: str = Field(default="")
  modules: str = Field(default="")
  # For cross DB compatibility, using 1 for True and 0 for false
  use_as_root_agent: int = Field(default=0)
  sub_agent_ids: str = Field(default="")


class SubAgentLink(SQLModel, table=True):
  root_agent_id: int = Field(
      default=None, foreign_key="agentpydantic.id", primary_key=True
  )
  sub_agent_id: int = Field(
      default=None, foreign_key="agentpydantic.id", primary_key=True
  )


class InMemoryAgent(BaseModel):
  agent_pydantic: AgentPydantic
  agent: BaseAgent


class AgentResponse(BaseModel):
  text: str | None
  code_explanation: str | None = None
  text_string: str | None = None
  image_byte_string: str | None = None
  video_byte_string: str | None = None


class UploadDataResponse(BaseModel):
  location: str
