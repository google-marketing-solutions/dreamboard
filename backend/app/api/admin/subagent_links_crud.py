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
from models.agent.agent_model import SubAgentLink
from models.agent.user_model import User
from .util import verify_admin

router = APIRouter(prefix="/subagent_links")


@router.post("/", response_model=SubAgentLink)
async def create_subagent_link(
    link: SubAgentLink,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Create a new subagent link"""
  session.add(link)
  session.commit()
  session.refresh(link)
  return link


@router.get("/", response_model=List[SubAgentLink])
async def get_subagent_links(
    session: Session = Depends(get_session), _: User = Depends(verify_admin)
):
  """Get all subagent links"""
  links = session.exec(select(SubAgentLink)).all()
  return links


@router.get("/root/{root_agent_id}", response_model=List[SubAgentLink])
async def get_subagent_links_by_root(
    root_agent_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Get all subagent links for a specific root agent"""
  links = session.exec(
      select(SubAgentLink).where(SubAgentLink.root_agent_id == root_agent_id)
  ).all()
  return links


@router.get("/sub/{sub_agent_id}", response_model=List[SubAgentLink])
async def get_subagent_links_by_sub(
    sub_agent_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Get all subagent links for a specific sub agent"""
  links = session.exec(
      select(SubAgentLink).where(SubAgentLink.sub_agent_id == sub_agent_id)
  ).all()
  return links


@router.delete("/{root_agent_id}/{sub_agent_id}")
async def delete_subagent_link(
    root_agent_id: int,
    sub_agent_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(verify_admin),
):
  """Delete a specific subagent link"""
  link = session.get(SubAgentLink, (root_agent_id, sub_agent_id))
  if not link:
    raise HTTPException(status_code=404, detail="SubAgentLink not found")

  session.delete(link)
  session.commit()
  return {"message": "SubAgentLink deleted successfully"}
