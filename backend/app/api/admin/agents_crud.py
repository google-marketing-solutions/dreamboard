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
from models.agent.agent_model import AgentPydantic
from models.agent.user_model import User
from .util import verify_admin

router = APIRouter(prefix="/agents_crud")


@router.post("/", response_model=AgentPydantic)
async def create_agent(
    agent: AgentPydantic,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Create a new agent"""
  session.add(agent)
  session.commit()
  session.refresh(agent)
  return agent


@router.get("/", response_model=List[AgentPydantic])
async def get_agents(
    session: Session = Depends(get_session), _: User = Depends(verify_admin)
) -> List[AgentPydantic]:
  """Get all agents"""
  agents = session.exec(select(AgentPydantic)).all()
  return agents


@router.get("/{agent_id}", response_model=AgentPydantic)
async def get_agent(
    agent_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Get a specific agent by ID"""
  agent = session.get(AgentPydantic, agent_id)
  if not agent:
    raise HTTPException(status_code=404, detail="Agent not found")
  return agent


@router.put("/{agent_id}", response_model=AgentPydantic)
async def update_agent(
    agent_id: int,
    agent_update: AgentPydantic,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Update a specific agent"""
  db_agent = session.get(AgentPydantic, agent_id)
  if not db_agent:
    raise HTTPException(status_code=404, detail="Agent not found")

  agent_data = agent_update.dict(exclude_unset=True)
  for key, value in agent_data.items():
    setattr(db_agent, key, value)

  session.add(db_agent)
  session.commit()
  session.refresh(db_agent)
  return db_agent


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Delete a specific agent"""
  agent = session.get(AgentPydantic, agent_id)
  if not agent:
    raise HTTPException(status_code=404, detail="Agent not found")

  session.delete(agent)
  session.commit()
  return {"message": "Agent deleted successfully"}
