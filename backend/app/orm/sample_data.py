# Copyright 2025 Google LLC
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

from sqlmodel import Session
from yaml import safe_load

import os
from dependencies.database import engine
from models.agent.agent_model import AgentPydantic, Scenario, SubAgentLink
from models.agent.user_model import UserInDB
from models.agent.enums import AgentType


FLASH_MODEL = "gemini-2.5"
PRO_MODEL = "gemini-2.5-pro"

# TODO: note that the sample data should probably be database migrations
# using Alembic (part of SQLAlchemy) to easily stand up a new database
BASE_FILE_PATH = "app/orm"


# TODO: refactor to only have one agent call
def initialize_scenario_data(session: Session) -> None:
  with open(f"{BASE_FILE_PATH}/scenario_data.yaml", "r") as f:
    scenario_data_yaml = safe_load(f)

  scenarios = []
  for scenario_id, scenario_data in enumerate(scenario_data_yaml, start=1):
    scenario = Scenario(
        id=scenario_id,
        name=scenario_data["name"],
        description=scenario_data["description"],
        overview=scenario_data["overview"],
        system_instructions=scenario_data["system_instructions"],
        initial_prompt=scenario_data["initial_prompt"],
    )
    scenarios.append(scenario)

  session.add_all(scenarios)
  session.commit()


def initialize_sample_user_data() -> None:
  """
  Initialize sample user data.
  """
  from passlib.context import CryptContext

  pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

  default_user_pw = os.getenv("DEFAULTUSERPW")
  default_admin_pw = os.getenv("DEFAULTADMINPW")

  if not default_user_pw:
    raise ValueError("Default User Password not set in .env file")

  if not default_admin_pw:
    raise ValueError("Default Admin Password not set in .env file")

  with Session(engine) as session:
    # Regular user: johndoe / password123
    user = UserInDB(
        id=1,
        username="user",
        email="john@test.com",
        hashed_password=pwd_context.hash(default_user_pw),
        disabled=False,
        admin=False,
    )
    # Admin user: janedoe / admin123
    user2 = UserInDB(
        id=2,
        username="admin",
        email="jane@test.com",
        hashed_password=pwd_context.hash(default_admin_pw),
        disabled=False,
        admin=True,
    )
    session.add(user)
    session.add(user2)
    session.commit()


# TODO: I think I can just parameterize this with the root agent name and
# load it from the database
def load_agents(
    session: Session,
    file_path: str = f"{BASE_FILE_PATH}/root_agent.yaml",
    scenario_id: int = 1,
    model: str = FLASH_MODEL,
) -> None:
  print(f"Loading agent data from {file_path}")
  with open(file_path, "r") as f:
    agent_data_yaml = safe_load(f)

  # Handles loading eihter an array or single yaml entry
  if isinstance(agent_data_yaml, dict):
    agent_data_yaml = [agent_data_yaml]

  agents = []
  for agent_data in agent_data_yaml:
    print(agent_data)
    agent_id = int(agent_data["id"])
    sub_agent_ids = agent_data.get("sub_agent_ids", "")
    agents.append(
        AgentPydantic(
            id=agent_id,
            scenario_id=scenario_id,
            agent_type=agent_data.get("agent_type", AgentType.LLM.value),
            name=agent_data["name"],
            instruction=agent_data["instruction"],
            description=agent_data["description"],
            model=model,
            tools=agent_data.get("tools", ""),
            modules=agent_data.get("modules", ""),
            media_type=agent_data.get("media_type", "text"),
            use_as_root_agent=agent_data.get("use_as_root_agent", 0),
            sub_agent_ids=sub_agent_ids,
        )
    )
    if sub_agent_ids:
      initialize_sub_agent_links(session, agent_id, sub_agent_ids)

  session.add_all(agents)
  session.commit()


def initialize_sub_agent_links(
    session: Session, root_agent_id: int, sub_agent_ids: str
) -> None:
  """Creates linkage between a root agent and the feedback agents"""
  # TODO: refactor this to use agent names and then retrieve IDs dynamically
  sub_agent_links = []
  for sub_agent_id in sub_agent_ids.split(","):
    sub_agent_links.append(
        SubAgentLink(
            root_agent_id=root_agent_id, sub_agent_id=int(sub_agent_id)
        )
    )
  session.add_all(sub_agent_links)
  session.commit()


def initialize_sample_agent_data():
  with Session(engine) as session:
    initialize_scenario_data(session)
    load_agents(
        session,
        file_path=f"{BASE_FILE_PATH}/root_agent.yaml",
        model=FLASH_MODEL,
    )
    load_agents(
        session,
        file_path=f"{BASE_FILE_PATH}/creative_agents.yaml",
        model=FLASH_MODEL,
    )


def initialize_all_sample_data():
  initialize_sample_user_data()
  initialize_sample_agent_data()
