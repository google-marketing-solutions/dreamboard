from typing import Optional

from pydantic import BaseModel


class ConversationTurn(BaseModel):
  content: str
  role: str
  author: str
  message_id: str
  audio: Optional[str] = None


class Conversation(BaseModel):
  turns: list[ConversationTurn]
