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
