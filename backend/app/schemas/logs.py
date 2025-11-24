from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class LogCreateRequest(BaseModel):
    title: Optional[str] = None
    text_body: Optional[str] = None
    num_deaths: Optional[int] = None
    num_injuries: Optional[int] = None
    estimated_resource_cost: Optional[float] = None


class LogUpdateRequest(BaseModel):
    title: Optional[str] = None
    text_body: Optional[str] = None
    num_deaths: Optional[int] = None
    num_injuries: Optional[int] = None
    estimated_resource_cost: Optional[float] = None


class LogResponse(BaseModel):
    log_id: UUID
    disaster_id: UUID
    created_by_user_id: Optional[UUID]
    title: Optional[str]
    text_body: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
