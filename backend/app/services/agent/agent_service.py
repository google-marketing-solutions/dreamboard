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

import os

from google.adk.tools import FunctionTool

import importlib
from google.adk.agents import Agent, SequentialAgent, BaseAgent
from google.adk.code_executors import BuiltInCodeExecutor

from sqlmodel import select


from dependencies.database import get_session
from models.agent.agent_model import AgentPydantic, SubAgentLink, InMemoryAgent, AgentType


PATH_TO_TOOLS = "tools"


class AgentService:
  """This class loads agents into memory from the DB and provides access to the in memory agents from other services"""

  def __init__(self):
    self.app_name = os.getenv("APP_NAME", "Don Draper Bot")
    self.runner = None
    self.media_type = None

    # Useful for getting attributes off the agent database definition
    self.agent_pydantic = None
    self.in_memory_agent_lookup: dict[str, InMemoryAgent] = {}

    self.get_agents_from_database()

  def get_agents_from_database(
      self, load_tools: bool = True
  ) -> dict[str, InMemoryAgent]:
    """Loads all agents in the database into memory with all of their sub agents

    Note: This method is public because we want to reload the agents upon an Admin making any changes to the DB

    Args:
        load_tools: Whether to load the tools for the agent

    Returns:
        A dict of InMemoryAgents indexed by their name
    """
    session = next(get_session())
    statement = select(AgentPydantic).where()
    agents_pydantic = session.exec(statement).all()

    in_memory_agent_lookup: dict[str, InMemoryAgent] = {}
    for agent_pydantic in agents_pydantic:
      print("Loading agent: ", agent_pydantic.name)
      agent, _ = self._load_root_agent(
          agent_pydantic.name, load_tools=load_tools
      )
    return in_memory_agent_lookup

  def _insert_in_memory_agent_into_lookup(
      self,
      agent_pydantic: AgentPydantic,
      agent: BaseAgent,
  ) -> None:
    """Inserts the given agent into the in memory agent lookup

    Args:
        agent_pydantic: The agent metadata to insert
        agent: The agent to insert
    """
    if agent_pydantic.name not in self.in_memory_agent_lookup:
      self.in_memory_agent_lookup[agent_pydantic.name] = InMemoryAgent(
          agent_pydantic=agent_pydantic, agent=agent
      )

  def list_available_agents(self) -> list[str]:
    """Returns a list of available agents loaded into memory"""
    return [agent_name for agent_name in self.in_memory_agent_lookup.keys()]

  def lookup_agent(self, agent_name: str) -> InMemoryAgent:
    """Returns the specified agent from the in memory agent store
    Args:
        agent_name: The name of the agent to lookup
    Returns:
        The InMemory Agent
    """
    if agent_name not in self.in_memory_agent_lookup:
      raise ValueError(f"Agent {agent_name} not found")

    return self.in_memory_agent_lookup[agent_name]

  def _load_tools(
      self, agent_pydantic: AgentPydantic
  ) -> list[FunctionTool] | list:
    """Dynamically loads tools for the specifed agent

    Args:
        agent_pydantic: The agent metadata to load tools for

    Returns:
        A list of FunctionTools or an empty list if there are no tools
    """
    tools = []
    active_tool_names = [
        t.strip() for t in agent_pydantic.tools.split(",") if t.strip()
    ]
    active_module_names = [
        m.strip() for m in agent_pydantic.modules.split(",") if m.strip()
    ]

    if active_tool_names and active_module_names:
      for tool, module in zip(
          agent_pydantic.tools.split(","), agent_pydantic.modules.split(",")
      ):
        module_path = importlib.import_module(f"{PATH_TO_TOOLS}.{module}")
        function = getattr(module_path, tool)
        print("Loading tool: ", tool)
        tools.append(FunctionTool(func=function))

    return tools

  def _build_adk_agent(
      self,
      agent_pydantic: AgentPydantic,
      root_agent: Agent,
      sub_agents: list[BaseAgent],
      tools: list[FunctionTool],
  ) -> BaseAgent:
    """Builds the ADK agent object to store in memory

    Args:
      agent_pydantic: The agent metadata to load
      root_agent: The root agent to load
      sub_agents: The sub agents to load
      tools: The tools to load

    Returns:
      The ADK agent in memory
    """
    # TODO: change agent type to Enum
    if agent_pydantic.agent_type == AgentType.Sequential.value:
      agent = SequentialAgent(
          name=root_agent.name,
          description=root_agent.description,
          # instruction=root_agent.instruction,
          # model=root_agent.model,
          sub_agents=sub_agents,
          # tools=tools,
      )
    elif agent_pydantic.agent_type == AgentType.LLM.value:
      agent = Agent(
          name=root_agent.name,
          description=root_agent.description,
          instruction=root_agent.instruction,
          model=root_agent.model,
          sub_agents=sub_agents,
          tools=tools,
      )
    elif agent_pydantic.agent_type == AgentType.CodeExecutor.value:
      agent = Agent(
          name=root_agent.name,
          description=root_agent.description,
          instruction=root_agent.instruction,
          model=root_agent.model,
          sub_agents=sub_agents,
          tools=tools,
          code_executor=BuiltInCodeExecutor(
              stateful=True, optimize_data_file=True
          ),
      )
    else:
      raise ValueError(f"Invalid agent type: {agent_pydantic.agent_type}")

    return agent

  def _load_root_agent(
      self,
      agent_name: str,
      load_tools: bool = True,
  ) -> tuple[BaseAgent, AgentPydantic]:
    """Loads the given agent from the database

    Args:
        agent_name: The name of the agent to load
        in_memory_agent_lookup: dict[str, InMemoryAgent],
        load_tools: Whether to load the tools for the agent

    Returns:
        The loaded Agent
    """
    agent_pydantic, root_agent = self._get_agent(
        agent_name,
    )
    self._insert_in_memory_agent_into_lookup(agent_pydantic, root_agent)
    self.media_type = agent_pydantic.media_type
    print(f"Root agent: {root_agent.name}")
    sub_agent_ids = self._get_sub_agent_ids(agent_pydantic.id)
    sub_agents = self._get_agents(sub_agent_ids)
    print(f"Sub agents: {[agent.name for agent in sub_agents]}")
    print("\n")
    tools = []
    if load_tools:
      tools = self._load_tools(agent_pydantic)

    agent = self._build_adk_agent(agent_pydantic, root_agent, sub_agents, tools)

    self.root_agent = agent
    self.agent_pydantic = agent_pydantic

    return agent, agent_pydantic

  def _get_agent(self, agent_name: str) -> tuple[AgentPydantic, Agent]:
    """Get an agent by the name

    Args:
        agent_name: The name of the agent to get

    Returns:
        A tuple containing the AgentPydantic and Agent

    """
    session = next(get_session())
    statement = select(AgentPydantic).where(
        AgentPydantic.name == agent_name,
    )
    agent_pydantic = session.exec(statement).one()
    return agent_pydantic, Agent(
        name=agent_pydantic.name,
        description=agent_pydantic.description,
        instruction=agent_pydantic.instruction,
        model=agent_pydantic.model,
    )

  def _get_agents(self, agent_ids: list[int]) -> list[BaseAgent]:
    """Used to get multiple agents by agent Ids

    Args:
        agent_ids: A list of agent IDs

    Returns:
        A list of Agents
    """
    session = next(get_session())
    statement = select(AgentPydantic).where(AgentPydantic.id.in_(agent_ids))
    agents_pydantic = session.exec(statement).all()
    agents = []
    for agent_pydantic in agents_pydantic:
      tools = []
      if agent_pydantic.tools:
        tools = self._load_tools(agent_pydantic)
      agent = Agent(
          name=agent_pydantic.name,
          description=agent_pydantic.description,
          instruction=agent_pydantic.instruction,
          model=agent_pydantic.model,
          tools=tools,
      )
      self._insert_in_memory_agent_into_lookup(agent_pydantic, agent)
      agents.append(agent)
    return agents

  def _get_sub_agent_ids(self, root_agent_id: int) -> list[int]:
    """Returns a list of subagent IDs linked to the root agent

    Args:
        root_agent_id: The ID of the root agent

    Returns:
        A list of subagent IDs
    """
    session = next(get_session())
    statement = select(SubAgentLink).where(
        SubAgentLink.root_agent_id == root_agent_id
    )
    sub_agent_links = session.exec(statement).all()
    return [link.sub_agent_id for link in sub_agent_links]
