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

import os
import base64

from google.adk.sessions import Session
from google.adk.sessions.database_session_service import DatabaseSessionService

from models.agent.agent_interface import Conversation, ConversationTurn
from services.agent.text_to_speech_service import TextToSpeechService


class SessionService:

  def __init__(self):
    db_url = os.getenv("DB_PATH")
    self.session_service = DatabaseSessionService(db_url=f"sqlite:///{db_url}")
    self.app_name = os.getenv("APP_NAME", "Don Draper Bot")
    self.text_to_speech_service = TextToSpeechService()

  def get_session_service(self) -> DatabaseSessionService:
    """Returns the current session service"""
    return self.session_service

  # TODO: might want to make this async, although create_session does return a session not a coroutine
  async def get_or_create_session(
      self, user_id: str, session_id: str
  ) -> Session:
    """Either retrieves or creates a session for the given app, user, and session_id

    Args:
        user_id: The user ID
        session_id: The session ID

    Returns:
      The Session
    """
    session = await self.session_service.get_session(
        app_name=self.app_name, user_id=user_id, session_id=session_id
    )
    if session is None:
      print(f"Creating session for user {user_id} and session {session_id}")
      session = await self.session_service.create_session(
          app_name=self.app_name,
          user_id=user_id,
          session_id=session_id,
      )
    return session

  async def get_session_content(
      self,
      user_id: str,
      session_id: str,
      return_audio_response: bool = False,
  ) -> Conversation:
    """Gets the session for a given user and session id. Session is always initialized

    Args:
        user_id: The user ID
        session_id: The session ID
        return_audio_response: Whether to return audio responses


    Returns:
      The Conversation

    """
    saved_session = self.get_or_create_session(user_id, session_id)
    conversation = Conversation(turns=[])

    for event in saved_session.events:
      if event.content and event.content.parts and event.content.parts[0].text:
        # # Generate audio for system responses
        audio_content = None
        # # TODO: make an enum with "user" and "model" here
        if event.content.role == "model" and return_audio_response:
          print(
              "Generating audio for system message:"
              f" {event.content.parts[0].text[:100]}..."
          )
          audio_content = await self.text_to_speech_service.text_to_speech(
              event.content.parts[0].text
          )
          print(f"Audio content generated: {audio_content is not None}")
          if audio_content:
            # Properly encode the audio content as base64
            audio_content = base64.b64encode(audio_content).decode("utf-8")
            print(f"Audio content encoded: {len(audio_content)} bytes")

        conversation_turn = ConversationTurn(
            content=event.content.parts[0].text,
            role=event.content.role,
            author=event.author,
            message_id=event.id,
            audio=audio_content,
        )
        conversation.turns.append(conversation_turn)

    print(f"Conversation: {conversation}")
    return conversation
