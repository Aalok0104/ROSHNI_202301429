from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import RoleChecker, get_current_user
from app.repositories.responder_repository import ResponderRepository
from app.schemas.responders import (
    TeamCreateRequest, TeamResponse,
    ResponderCreateRequest, ResponderResponse, ResponderUpdateRequest
)
from app.repositories.user_repository import UserRepository # To check email existence
from app.models.user_family_models import User

router = APIRouter(
    prefix="/commander", # Or /admin, but keeping it logical
    tags=["Commander Operations"],
    dependencies=[Depends(RoleChecker(["commander"]))] 
)
responder_router = APIRouter(
    prefix="/responders",
    tags=["Responder Operations"],
    dependencies=[Depends(RoleChecker(["responder"]))],
)

# --- TEAMS ---

@router.post("/teams", response_model=TeamResponse)
async def create_team(
    payload: TeamCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    repo = ResponderRepository(db)
    new_team = await repo.create_team(payload.dict())
    # Return manual dict to match schema fields that are calculated
    return {
        "team_id": new_team.team_id,
        "name": new_team.name,
        "team_type": new_team.team_type,
        "status": new_team.status,
        "member_count": 0,
        "current_latitude": None,
        "current_longitude": None
    }

@router.get("/teams", response_model=List[TeamResponse])
async def list_teams(
    status: Optional[str] = None,
    type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    repo = ResponderRepository(db)
    return await repo.get_teams_with_location(status, type)

# --- RESPONDERS ---

@router.post("/responders", response_model=ResponderResponse)
async def create_responder(
    payload: ResponderCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Check for duplicate email
    user_repo = UserRepository(db)
    existing = await user_repo.get_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="User with this email already exists."
        )

    # 2. Atomic Creation
    repo = ResponderRepository(db)
    try:
        new_responder = await repo.create_responder(payload.dict())
        return new_responder
    except Exception as e:
        # Log error here
        raise HTTPException(status_code=400, detail=f"Creation failed: {str(e)}")

@router.get("/responders", response_model=List[ResponderResponse])
async def list_responders(
    team_id: Optional[UUID] = None,
    responder_type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    repo = ResponderRepository(db)
    filters = {
        "team_id": team_id,
        "responder_type": responder_type,
        "status": status
    }
    return await repo.get_all_responders(filters)

@router.patch("/responders/{user_id}", response_model=ResponderResponse)
async def update_responder(
    user_id: UUID,
    payload: ResponderUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    repo = ResponderRepository(db)
    updated = await repo.update_responder(user_id, payload.dict())
    if not updated:
        raise HTTPException(status_code=404, detail="Responder not found")
    return updated


@router.delete("/responders/{user_id}")
async def delete_responder(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    repo = ResponderRepository(db)
    deleted = await repo.delete_responder(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Responder not found")
    return {"message": "Responder deleted"}


@router.delete("/teams/{team_id}")
async def delete_team(
    team_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    repo = ResponderRepository(db)
    team = await repo.delete_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted"}


@router.post("/teams/{team_id}/responders/{user_id}", response_model=ResponderResponse)
async def assign_responder_to_team(
    team_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    repo = ResponderRepository(db)
    updated = await repo.assign_responder_to_team(user_id, team_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Responder not found")
    return updated


@router.delete("/teams/{team_id}/responders/{user_id}")
async def unassign_responder_from_team(
    team_id: UUID,
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    repo = ResponderRepository(db)
    updated = await repo.assign_responder_to_team(user_id, None)
    if not updated:
        raise HTTPException(status_code=404, detail="Responder not found")
    return {"message": "Responder unassigned"}


@responder_router.get("/me/team", response_model=TeamResponse)
async def get_my_team(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = ResponderRepository(db)
    team = await repo.get_responder_team(current_user.user_id)
    if not team:
        raise HTTPException(status_code=404, detail="No team assigned")
    return {
        "team_id": team.team_id,
        "name": team.name,
        "team_type": team.team_type,
        "status": team.status,
        "member_count": len(team.responder_profiles) if team.responder_profiles else 0,
        "current_latitude": None,
        "current_longitude": None,
    }
