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

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from dependencies.database import get_session
from models.agent.agent_model import Scenario
from models.agent.user_model import User
from .util import verify_admin

router = APIRouter(prefix="/scenarios")


@router.post("/", response_model=Scenario)
async def create_scenario(
    scenario: Scenario,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Create a new scenario"""
  session.add(scenario)
  session.commit()
  session.refresh(scenario)
  return scenario


@router.get("/", response_model=List[Scenario])
async def get_scenarios(
    session: Session = Depends(get_session), _: User = Depends(verify_admin)
):
  """Get all scenarios"""
  scenarios = session.exec(select(Scenario)).all()
  return scenarios


@router.get("/{scenario_id}", response_model=Scenario)
async def get_scenario(
    scenario_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Get a specific scenario by ID"""
  scenario = session.get(Scenario, scenario_id)
  if not scenario:
    raise HTTPException(status_code=404, detail="Scenario not found")
  return scenario


@router.put("/{scenario_id}", response_model=Scenario)
async def update_scenario(
    scenario_id: int,
    scenario_update: Scenario,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Update a specific scenario"""
  db_scenario = session.get(Scenario, scenario_id)
  if not db_scenario:
    raise HTTPException(status_code=404, detail="Scenario not found")

  scenario_data = scenario_update.dict(exclude_unset=True)
  for key, value in scenario_data.items():
    setattr(db_scenario, key, value)

  session.add(db_scenario)
  session.commit()
  session.refresh(db_scenario)
  return db_scenario


@router.delete("/{scenario_id}")
async def delete_scenario(
    scenario_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Delete a specific scenario"""
  scenario = session.get(Scenario, scenario_id)
  if not scenario:
    raise HTTPException(status_code=404, detail="Scenario not found")

  session.delete(scenario)
  session.commit()
  return {"message": "Scenario deleted successfully"}
