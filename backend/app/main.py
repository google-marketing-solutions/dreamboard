# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""API Entry point where the app and routers are set up."""
import logging
import os
import uvicorn
from api.router import api_router
from core.config import settings
from fastapi import FastAPI
from starlette.middleware import cors

logger = logging.getLogger(__name__)
logging.basicConfig(filename="myapp.log", level=logging.INFO)

from dotenv import load_dotenv

if os.getenv("USE_AGENTS"):
  from dependencies.database import initialize_clean_db
  from orm.sample_data import initialize_all_sample_data
  from services.agent.scenario_service import ScenarioService
  from services.agent.agent_service import AgentService
  from contextlib import asynccontextmanager

  @asynccontextmanager
  async def lifespan(app: FastAPI):
    # TODO: need to change this to more persistent storage, right now just starting with clean db every time

    initialize_clean_db()
    initialize_all_sample_data()

    scenario_service = ScenarioService()
    # We only load the agents from the DB on startup or when manually requested by user
    # e.g. if an Admin user modifies an agent in the database
    agent_service = AgentService()

    yield {
        "scenario_service": scenario_service,
        "agent_service": agent_service,
    }

  load_dotenv()

  # Initialize FastAPI app
  app = FastAPI(
      title=settings.PROJECT_NAME,
      openapi_url=f"{settings.API_PREFIX}/openapi.json",
      lifespan=lifespan,
  )
else:
  load_dotenv()

  # Initialize FastAPI app
  app = FastAPI(
      title=settings.PROJECT_NAME,
      openapi_url=f"{settings.API_PREFIX}/openapi.json",
  )

# Set all CORS enabled origins if specified in settings
if settings.BACKEND_CORS_ORIGINS:
  app.add_middleware(
      cors.CORSMiddleware,
      allow_origins=["*"],  # Allows all origins
      allow_credentials=True,
      allow_methods=["*"],  # Allows all methods
      allow_headers=["*"],  # Allows all headers
  )

# Include the API router with a defined prefix
app.include_router(api_router, prefix=settings.API_PREFIX)

# Run the Uvicorn server when the script is executed directly
if __name__ == "__main__":
  uvicorn.run(app, host="127.0.0.1", port=8000)
