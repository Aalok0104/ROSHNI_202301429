from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# 1. Create Request
class TaskCreateRequest(BaseModel):
    task_type: str = Field(..., description="medic, fire, police, logistics, search_rescue, evacuation")
    description: str
    priority: str = "medium"
    latitude: float
    longitude: float

# 2. Assign Request
class TaskAssignmentRequest(BaseModel):
    team_id: UUID

# 3. Status Update (Responder)
class AssignmentStatusUpdate(BaseModel):
    status: str = Field(..., description="assigned, en_route, on_scene, completed, cancelled")
    eta: Optional[datetime] = None

# 4. Responses
class TaskAssignmentResponse(BaseModel):
    team_id: UUID
    team_name: str
    status: str
    eta: Optional[datetime]
    arrived_at: Optional[datetime]

    class Config:
        from_attributes = True

class TaskResponse(BaseModel):
    task_id: UUID
    disaster_id: UUID
    task_type: str
    description: str
    priority: str
    status: str
    latitude: float
    longitude: float
    created_at: datetime
    assignments: List[TaskAssignmentResponse] = []

    class Config:
        from_attributes = True