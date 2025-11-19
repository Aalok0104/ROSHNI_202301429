from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.shape import to_shape

from app.database import get_db
from app.dependencies import get_current_user, RoleChecker
from app.models.user_family_models import User
from app.repositories.task_repository import TaskRepository
from app.schemas.tasks import (
    TaskCreateRequest, TaskResponse, TaskAssignmentResponse,
    TaskAssignmentRequest, AssignmentStatusUpdate
)

router = APIRouter(prefix="", tags=["Task Management"]) # Prefix empty, logic in endpoints

# Helper for response formatting (Lat/Lon extraction)
def format_task_response(task):
    try:
        shape = to_shape(task.location)
        lat, lon = shape.y, shape.x
    except:
        lat, lon = 0.0, 0.0
    
    assignments = []
    for a in task.assignments:
        assignments.append(TaskAssignmentResponse(
            team_id=a.team_id,
            team_name=a.team.name if a.team else "Unknown Team",
            status=a.status,
            eta=a.eta,
            arrived_at=a.arrived_at
        ))

    return TaskResponse(
        task_id=task.task_id,
        disaster_id=task.disaster_id,
        task_type=task.task_type,
        description=task.description,
        priority=task.priority,
        status=task.status,
        latitude=lat,
        longitude=lon,
        created_at=task.created_at,
        assignments=assignments
    )

# --- A. Create Task ---
@router.post("/disasters/{disaster_id}/tasks", response_model=TaskResponse)
async def create_task(
    disaster_id: UUID,
    payload: TaskCreateRequest,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    repo = TaskRepository(db)
    new_task = await repo.create_task(disaster_id, current_user.user_id, payload)
    # Re-fetch to get empty assignments list structure correct or manual construct
    # Manual construct is faster here
    return TaskResponse(
        task_id=new_task.task_id,
        disaster_id=new_task.disaster_id,
        task_type=new_task.task_type,
        description=new_task.description,
        priority=new_task.priority,
        status=new_task.status,
        latitude=payload.latitude,
        longitude=payload.longitude,
        created_at=new_task.created_at,
        assignments=[]
    )

# --- B. List Tasks ---
@router.get("/disasters/{disaster_id}/tasks", response_model=List[TaskResponse])
async def list_tasks(
    disaster_id: UUID,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = TaskRepository(db)
    tasks = await repo.get_tasks(disaster_id, {"status": status, "priority": priority})
    return [format_task_response(t) for t in tasks]

# --- C. Assign Team ---
@router.post("/tasks/{task_id}/assignments")
async def assign_team(
    task_id: UUID,
    payload: TaskAssignmentRequest,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    repo = TaskRepository(db)
    try:
        await repo.assign_team(task_id, payload.team_id, current_user.user_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"message": "Team dispatched"}

# --- D. Update Assignment Status (Responder) ---
@router.patch("/tasks/{task_id}/assignments/{team_id}/status")
async def update_assignment_status(
    task_id: UUID,
    team_id: UUID,
    payload: AssignmentStatusUpdate,
    current_user: User = Depends(RoleChecker(["responder", "commander"])),
    db: AsyncSession = Depends(get_db)
):
    repo = TaskRepository(db)
    
    # Verify user belongs to team (if not commander)
    if current_user.role.name != 'commander':
        user_team_id = await repo.get_user_team_id(current_user.user_id)
        if str(user_team_id) != str(team_id):
            raise HTTPException(403, "You do not belong to this team")

    await repo.update_assignment_status(task_id, team_id, payload.status, payload.eta)
    return {"message": "Status updated"}

# --- E. Update Task Status (Commander Override) ---
@router.patch("/tasks/{task_id}/status")
async def update_task_status(
    task_id: UUID,
    payload: dict, # {"status": "cancelled"}
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    repo = TaskRepository(db)
    await repo.update_task_status(task_id, payload['status'])
    return {"message": "Task status updated"}