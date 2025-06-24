from fastapi import APIRouter, Request

from models.agent.agent_model import (
    Scenario,
    SetScenarioData,
)

router = APIRouter(
    prefix="/scenario",
    responses={404: {"description": "Not found"}},
)


@router.get("/get-all")
async def get_all_scenarios(request: Request) -> list[Scenario]:
  return request.state.scenario_service.get_all_scenarios()


@router.get("/get-current-scenario")
async def get_current_scenario(request: Request) -> Scenario:
  return request.state.scenario_service.get_current_scenario()


@router.post("/set-scenario-data")
async def set_scenario_data(request: Request, scenario_data: SetScenarioData):
  return request.state.scenario_service.set_scenario(
      scenario_id=scenario_data.scenario_id
  )
