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

from google.adk.agents import BaseAgent
from google.adk.runners import Runner
from google.genai import types
from pydantic import BaseModel
from google.genai.types import Part
from models.agent.agent_model import AgentType

from .agent_service import AgentService
import base64

from google.adk.artifacts import InMemoryArtifactService  # Or GcsArtifactService
from .session_service import SessionService


class AgentResponse(BaseModel):
  text: str | None
  text_string: str | None = None
  image_byte_string: str | None = None
  video_byte_string: str | None = None


DEFAULT_TEXT = "Agent did not produce a final response."


class AgentRequestService:

  def __init__(
      self,
      agent_service: AgentService,
      load_tools: bool = True,
  ):
    """Retrieves an agent response from the specified agent

    Args:
        agent_service
    """
    self.agent_service = agent_service
    self.load_tools = load_tools
    self.session_service = SessionService()

  # TODO: I don't think we actually need to pass in the runner here
  async def request_agent_response(
      self,
      root_agent_name: str,
      runner: Runner,
      user_id: str,
      session_id: str,
      message: str,
  ) -> AgentResponse:
    """Sends a query to the LLM agent and returns the final response.

    Args:
        root_agent_name: The name of the root agent.
        runner: The ADK runner
        user_id: The user ID
        session_id: The session ID
        message: The message to send to the agent

    Returns:
      AgentResponse: The final response from the agent.
    """
    root_agent = self.agent_service.lookup_agent(root_agent_name)
    await self.initialize_agent_runner(user_id, session_id, root_agent.agent)
    return await self.call_agent_async(message, runner, user_id, session_id)

  async def handle_media_types(
      self, runner: Runner, user_id: str, session_id: str, filename: str
  ) -> Part | None:
    """Handles artifact parsing of different media types

    Args:
        runner: The ADK runner
        user_id: The user ID
        session_id: The session ID
        filename: The name of the saved file in the Artifact Service

    Returns:
      An ADK part from the Artifact Service
    """
    # TODO: clean up the magic string names here
    return await runner.artifact_service.load_artifact(
        app_name=self.agent_service.app_name,
        user_id=user_id,
        session_id=session_id,
        filename=filename,
    )

  async def initialize_agent_runner(
      self, user_id: str, session_id: str, root_agent: BaseAgent
  ) -> None:
    """Starts an agent session and then creates a Runner and assigns it to the object

    Args:
        user_id: The user ID
        session_id: The session ID

    """

    # TODO: can pass in initial state here
    # TODO: do we actually need to initialize the session here or should we do it in the call_agent_async method?
    _ = await self.session_service.get_or_create_session(user_id, session_id)

    # Create a Runner
    self.runner = Runner(
        app_name=self.agent_service.app_name,
        agent=root_agent,
        session_service=self.session_service.get_session_service(),
        artifact_service=InMemoryArtifactService(),
    )

  def get_runner(self) -> Runner:
    """Gets the current runner assigned to the object"""
    if self.runner is None:
      raise ValueError("Agent runner not initialized")

    return self.runner

  async def get_media_byte_string(self, file_info: Part | None) -> str | None:
    """Returns a UTF-8 byte string of media content if the file_info is a video, image, etc.

    Or simply returns the text if the media type is text

    Args:
      file_info: an ADK Part

    Returns:
      A string of media content
    """
    # TODO Figure out better handling for if the response is blank
    if file_info:
      # TODO: I don't love overloading these fields, should change it
      if self.agent_service.media_type == "text":
        print(f"Text file found, returning {file_info}")
        return file_info.text
      else:
        return base64.b64encode(file_info.inline_data.data).decode("utf-8")
    else:
      return None

  async def call_agent_async(
      self, query: str, runner: Runner, user_id: str, session_id: str
  ) -> AgentResponse:
    """Sends a query to the LLM agent and prints the final response.

    Args:
        query: The message to send to the agent
        runner: The ADK runner
        user_id: The user ID
        session_id: The session ID

    Returns:
      AgentResponse: The final response from the agent.

    """
    print(f"\n>>> User Query: {query}")

    # Prepare the user's message in ADK format
    content = types.Content(role="user", parts=[types.Part(text=query)])
    final_response_text = None
    text_str = None
    image_byte_string = None
    video_byte_string = None

    # Key Concept: run_async executes the agent logic and yields Events.
    # We iterate through events to find the final answer.
    async for event in runner.run_async(
        user_id=user_id, session_id=session_id, new_message=content
    ):
      # You can uncomment the line below to see *all* events during execution
      print(
          f"  [Event] Author: {event.author}, Type: {type(event).__name__},"
          f" Final: {event.is_final_response()}, Content: {event.content}"
      )

      # Key Concept: is_final_response() marks the concluding message for the turn.
      if event.is_final_response():
        # TODO: I don't love this, because we're now having to do a DB call to get the agent
        # which might be a sub agent
        agent_pydantic = self.agent_service.lookup_agent(
            event.author
        ).agent_pydantic
        if agent_pydantic.media_type == "text":
          text_part = await self.handle_media_types(
              runner, user_id, session_id, filename="text.md"
          )
          text_str = text_part.text

        elif agent_pydantic.media_type == "image":
          image_part = await self.handle_media_types(
              runner, user_id, session_id, filename="image.png"
          )
          image_byte_string = base64.b64encode(
              image_part.inline_data.data
          ).decode("utf-8")

        elif agent_pydantic.media_type == "video":
          video_part = await self.handle_media_types(
              runner, user_id, session_id, filename="video.mp4"
          )
          video_byte_string = base64.b64encode(
              video_part.inline_data.data
          ).decode("utf-8")

        if event.content and event.content.parts:
          # Assuming text response in the first part
          final_response_text = event.content.parts[0].text
        elif (
            event.actions and event.actions.escalate
        ):  # Handle potential errors/escalations
          final_response_text = (
              "Agent escalated:"
              f" {event.error_message or 'No specific message.'}"
          )
        # Add more checks here if needed (e.g., specific error codes)
        # We break after the first final response for an LLM agent, but for a Sequential agent it keeps going
        # Note: this is the root agent not the agent we lookup
        if self.agent_service.agent_pydantic.agent_type == AgentType.LLM.value:
          break  # Stop processing events once the final response is found

    return AgentResponse(
        text=final_response_text if final_response_text else DEFAULT_TEXT,
        text_string=text_str,
        image_byte_string=image_byte_string,
        video_byte_string=video_byte_string,
    )
