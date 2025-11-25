from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class LogCreateRequest(BaseModel):
    title: Optional[str] = None
    text_body: Optional[str] = None
    num_deaths: Optional[int] = None
    num_injuries: Optional[int] = None
    estimated_damage_cost: Optional[float] = None
    estimated_resource_cost: Optional[float] = None
    firefighter_required: Optional[int] = None
    medic_required: Optional[int] = None
    police_required: Optional[int] = None
    help_required: Optional[int] = None
    food_required_for_people: Optional[int] = None


class LogUpdateRequest(BaseModel):
    title: Optional[str] = None
    text_body: Optional[str] = None
    num_deaths: Optional[int] = None
    num_injuries: Optional[int] = None
    estimated_damage_cost: Optional[float] = None
    estimated_resource_cost: Optional[float] = None
    firefighter_required: Optional[int] = None
    medic_required: Optional[int] = None
    police_required: Optional[int] = None
    help_required: Optional[int] = None
    food_required_for_people: Optional[int] = None


class LogResponse(BaseModel):
    log_id: UUID
    disaster_id: UUID
    created_by_user_id: Optional[UUID]
    title: Optional[str]
    text_body: Optional[str]
    num_deaths: Optional[int]
    num_injuries: Optional[int]
    estimated_damage_cost: Optional[float]
    estimated_resource_cost: Optional[float]
    firefighter_required: Optional[int]
    medic_required: Optional[int]
    police_required: Optional[int]
    help_required: Optional[int]
    food_required_for_people: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
