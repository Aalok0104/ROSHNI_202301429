from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MediaResponse(BaseModel):
    media_id: UUID
    file_type: str
    url: str


class IncidentCreateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    incident_type: Optional[str] = None
    latitude: float
    longitude: float


class IncidentStatusUpdate(BaseModel):
    status: str = Field(..., description="discarded | converted | other")
    severity_level: Optional[str] = None
    disaster_type: Optional[str] = None


class IncidentResponse(BaseModel):
    incident_id: UUID
    reported_by_user_id: UUID | None
    title: str | None
    description: str | None
    incident_type: str | None
    status: str
    reported_at: Optional[str]
    latitude: float
    longitude: float
    media: list[MediaResponse] = []

    class Config:
        from_attributes = True


# Alias used by routers for updates (all fields optional)
class IncidentUpdateRequest(IncidentCreateRequest):
    latitude: Optional[float] = None
    longitude: Optional[float] = None

