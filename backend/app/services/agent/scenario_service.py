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

from sqlmodel import Session, select

from dependencies.database import engine
from models.agent.agent_model import Scenario


class ScenarioService:

  def __init__(self, default_scenario_id: int = 1):
    self.scenario = self._load_initial_scenario(default_scenario_id)

  def _load_initial_scenario(self, default_scenario_id: int) -> Scenario:
    """
    Loads the initial scenario data

    Args:
        default_scenario_id: The ID of the default scenario

    Returns:
        The scenario data for the default scenario
    """
    with Session(engine) as session:
      statement = select(Scenario).where(Scenario.id == default_scenario_id)
      scenario = session.exec(statement).one()
      return scenario

  def get_current_scenario(self) -> Scenario:
    """
    Returns the scenario data for the currently set scenario

    Returns:
        The scenario data for the current scenario
    """
    return self.scenario

  def set_scenario(self, scenario_id: int) -> None:
    """
    Sets the scenario data for the currently set scenario

    Args:
        scenario: The scenario to set
    """
    with Session(engine) as session:
      statement = select(Scenario).where(Scenario.id == scenario_id)
      scenario = session.exec(statement).one()
      self.scenario = scenario

  def get_all_scenarios(self) -> list[Scenario]:
    with Session(engine) as session:
      statement = select(Scenario)
      scenarios = session.exec(statement).all()
      return scenarios
