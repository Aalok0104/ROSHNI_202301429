from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

# 1. Outgoing Message (Sent to Client)
class ChatMessageResponse(BaseModel):
    message_id: UUID
    disaster_id: UUID
    team_id: Optional[UUID] = None
    sender_user_id: UUID
    sender_name: str
    sender_role: str # "commander", "medic", "civilian", etc.
    message_text: str
    is_global: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# 2. Incoming Message (Received from Client)
# Note: Usually WS just sends raw text, but JSON is safer for extensibility
class ChatMessageCreate(BaseModel):
    message_text: str

