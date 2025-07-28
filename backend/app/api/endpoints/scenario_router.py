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
