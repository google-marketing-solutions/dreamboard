from sqlmodel import Session
from yaml import safe_load

from dependencies.database import engine
from models.agent.agent_model import AgentPydantic, Scenario, SubAgentLink
from models.agent.user_model import UserInDB
from models.agent.enums import AgentType


FLASH_MODEL = "gemini-2.5-flash-preview-05-20"
PRO_MODEL = "gemini-2.5-pro-preview-03-25"

# TODO: note that the sample data should probably be database migrations
# using Alembic (part of SQLAlchemy) to easily stand up a new database
BASE_FILE_PATH = "app/orm"


# TODO: refactor to only have one agent call
def initialize_scenario_data() -> list[Scenario]:
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

  return scenarios


def initialize_sample_user_data() -> None:
  """
  Initialize sample user data.
  """
  with Session(engine) as session:
    user = UserInDB(
        id=1,
        username="johndoe",
        email="john@test.com",
        hashed_password=(
            "$2b$12$pCYsSI/mmqaZOoxkUSslbeFzyxlr38CTulWtGkElzld7p1xVemRYG"
        ),
        disabled=False,
        admin=False,
    )
    user2 = UserInDB(
        id=2,
        username="janedoe",
        email="jane@test.com",
        hashed_password=(
            "$2b$12$CfXveIDjm7Pvs//KSXc7m.A7mw2XViro3gmfxIbH6p8/skAx4xxea"
        ),
        disabled=False,
        admin=True,
    )
    session.add(user)
    session.add(user2)
    session.commit()


def load_creative_agents(
    file_path: str = f"{BASE_FILE_PATH}/creative_agents.yaml",
) -> list[AgentPydantic]:
  print(f"Loading creative agent data from {file_path}")
  with open(file_path, "r") as f:
    creative_agents_yaml = safe_load(f)

  creative_agents = []
  # Root agent is at index 1
  for i, creative_agent in enumerate(creative_agents_yaml, start=1):
    creative_agents.append(
        AgentPydantic(
            id=i + 1,
            scenario_id=1,
            agent_type=creative_agent.get("agent_type", AgentType.LLM.value),
            name=creative_agent["name"],
            instruction=creative_agent["instruction"],
            description=creative_agent["description"],
            tools=creative_agent.get("tools", ""),
            modules=creative_agent.get("modules", ""),
            model=FLASH_MODEL,
            media_type=creative_agent.get("media_type", "text"),
            use_as_root_agent=creative_agent.get("use_as_root_agent", 0),
        )
    )

  return creative_agents


# TODO: I think I can just parameterize this with the root agent name and
# load it from the database
def load_root_agent(
    file_path: str = f"{BASE_FILE_PATH}/root_agent.yaml",
) -> AgentPydantic:
  print(f"Loading root agent data from {file_path}")
  with open(file_path, "r") as f:
    root_agent_yaml = safe_load(f)

  return AgentPydantic(
      id=1,
      scenario_id=1,
      agent_type=root_agent_yaml.get("agent_type", AgentType.LLM.value),
      name=root_agent_yaml["name"],
      instruction=root_agent_yaml["instruction"],
      description=root_agent_yaml["description"],
      model=PRO_MODEL,
      use_as_root_agent=root_agent_yaml.get("use_as_root_agent", 0),
  )


# TODO: refactor to manually specify links
def initialize_sub_agent_links() -> list[SubAgentLink]:
  """Creates linkage between a root agent and the feedback agents"""
  # TODO: figure out a better way to get IDs of agents here
  # By building them into database
  sub_agent_links = [
      SubAgentLink(root_agent_id=1, sub_agent_id=2),
      SubAgentLink(root_agent_id=1, sub_agent_id=3),
      SubAgentLink(root_agent_id=1, sub_agent_id=4),
  ]
  return sub_agent_links


def initialize_sample_agent_data():
  with Session(engine) as session:
    session.add_all(initialize_scenario_data())
    session.commit()
    session.add_all(load_creative_agents())
    session.add(load_root_agent())
    session.commit()
    session.add_all(initialize_sub_agent_links())
    session.commit()


def initialize_all_sample_data():
  initialize_sample_user_data()
  initialize_sample_agent_data()
