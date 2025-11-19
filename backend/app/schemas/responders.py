from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID

# --- TEAM SCHEMAS ---

class TeamCreateRequest(BaseModel):
    name: str
    team_type: str = Field(..., description="medic, fire, police, mixed, disaster_response")
    commander_user_id: Optional[UUID] = None 

class TeamResponse(BaseModel):
    team_id: UUID
    name: str
    team_type: str
    status: str
    member_count: int
    current_latitude: Optional[float] 
    current_longitude: Optional[float]

    class Config:
        from_attributes = True

# --- RESPONDER SCHEMAS ---

class ResponderCreateRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    responder_type: str = Field(..., description="medic, firefighter, police, disaster_responder, logistician")
    badge_number: str
    government_id_number: Optional[str] = None
    team_id: Optional[UUID] = None 

class ResponderUpdateRequest(BaseModel):
    team_id: Optional[UUID] = None
    status: Optional[str] = None # active, suspended, retired
    badge_number: Optional[str] = None
    qualifications: Optional[str] = None

class ResponderResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: Optional[str]
    responder_type: str
    badge_number: str
    team_name: Optional[str]
    status: str
    last_known_latitude: Optional[float]
    last_known_longitude: Optional[float]

    class Config:
        from_attributes = True