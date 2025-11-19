from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# 1. Unified Create Request
class IncidentCreateRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    title: Optional[str] = None 
    description: Optional[str] = None
    incident_type: Optional[str] = Field(None, description="flood, accident, fire, sos, other")

# 2. Media Response
class MediaResponse(BaseModel):
    media_id: UUID
    file_type: str
    url: str

# 3. Incident Response
class IncidentResponse(BaseModel):
    incident_id: UUID
    reported_by_user_id: Optional[UUID]
    title: str
    description: Optional[str]
    incident_type: Optional[str]
    status: str
    reported_at: datetime
    latitude: float
    longitude: float
    media: List[MediaResponse] = []

    class Config:
        from_attributes = True

# 4. Status Update
class IncidentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(discarded|open|converted)$")
    # Optional fields for when converting to disaster
    severity_level: Optional[str] = "medium" 
    disaster_type: Optional[str] = None