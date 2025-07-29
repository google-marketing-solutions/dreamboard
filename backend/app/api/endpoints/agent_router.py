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

from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


from models.agent.agent_interface import Conversation
from services.agent.agent_request_service import AgentRequestService
from services.agent.speech_to_text_service import SpeechToTextService
from services.agent.text_to_speech_service import TextToSpeechService
from services.agent.session_service import SessionService

router = APIRouter(
    prefix="/agent",
    responses={404: {"description": "Not found"}},
)

# Initialize the services
speech_to_text_service = SpeechToTextService()
text_to_speech_service = TextToSpeechService()


class AgentRequest(BaseModel):
  agent_name: str
  message: str
  session_id: str
  user_id: str


# TODO: move this to session_router
@router.post("/start-session")
async def start_session(
    request: Request,
    agent_request: AgentRequest,
) -> dict[str, str]:
  session_service = SessionService()
  session_service.get_or_create_session(
      agent_request.user_id, agent_request.session_id
  )
  return {"message": "Session started"}


@router.get("/list_available_agents")
async def list_available_agents(request: Request) -> list[str]:
  agent_service = request.state.agent_service
  return agent_service.list_available_agents()


@router.post("/request")
async def request_agent_response(
    request: Request,
    agent_name: str = Form(...),
    message: str = Form(...),
    user_id: str = Form(...),
    session_id: str = Form(...),
    return_audio_response: bool = Form(False),
    audio: Optional[UploadFile] = File(None),
):
  agent_service = request.state.agent_service
  in_memory_agent = agent_service.lookup_agent(agent_name)

  agent_request_service = AgentRequestService(agent_service)
  await agent_request_service.initialize_agent_runner(
      user_id, session_id, in_memory_agent.agent
  )

  # If there's an audio file, process it
  if audio:
    audio_content = await audio.read()
    # Transcribe the audio
    transcript = await speech_to_text_service.transcribe_audio(audio_content)

    if transcript:
      # Combine the transcribed text with the original message
      message = transcript

  # Get the agent's response
  response = await agent_request_service.request_agent_response(
      agent_name,
      agent_request_service.get_runner(),
      user_id,
      session_id,
      message,
  )

  # Convert the response to speech
  # if return_audio_response and response.text:
  #     audio_content = await text_to_speech_service.text_to_speech(response.text)
  # else:
  #     audio_content = None
  audio_content = None

  # Return both the text response and audio content
  return JSONResponse(
      content={
          "text": response.text,
          "audio": audio_content.decode("latin1") if audio_content else None,
          "text_str": response.text_string,
          "image_byte_string": response.image_byte_string,
          "video_byte_string": response.video_byte_string,
      }
  )


# TODO: should probably move this to a separate router, but can leave it for now
@router.get("/conversation/{user_id}/{session_id}")
async def get_conversation_content(
    user_id: str,
    session_id: str,
) -> Conversation:
  session_service = SessionService()

  return await session_service.get_session_content(user_id, session_id)
