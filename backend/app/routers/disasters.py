from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.shape import to_shape

from app.database import get_db
from app.dependencies import get_current_user, RoleChecker
from app.models.user_family_models import User
from app.repositories.disaster_repository import DisasterRepository
from app.schemas.disasters import (
    DisasterConversionRequest,
    DisasterPublicResponse,
    DisasterStatsResponse,
    DisasterMapResponse
)

router = APIRouter(prefix="/disasters", tags=["Disaster Management"])

def format_disaster_response(d):
    # Helper to extract lat/lon from WKB
    try:
        shape = to_shape(d.location)
        lat, lon = shape.y, shape.x
    except:
        lat, lon = 0.0, 0.0
        
    return DisasterPublicResponse(
        disaster_id=d.disaster_id,
        title=d.title,
        description=d.description,
        disaster_type=d.disaster_type,
        status=d.status,
        severity_level=d.severity_level,
        latitude=lat,
        longitude=lon
    )

# --- A. Conversion (Big Red Button) ---
@router.post("/incidents/{incident_id}/convert", response_model=DisasterPublicResponse)
async def convert_incident_to_disaster(
    incident_id: UUID,
    payload: DisasterConversionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    repo = DisasterRepository(db)
    disaster = await repo.convert_incident(incident_id, payload.dict())
    
    if not disaster:
        raise HTTPException(400, "Incident not found or already converted")

    # Background Task: Push Notifications (Mock)
    # background_tasks.add_task(notify_followers, disaster.disaster_id)

    return format_disaster_response(disaster)

# --- B. Dashboard List ---
@router.get("", response_model=List[DisasterPublicResponse])
async def list_disasters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = DisasterRepository(db)
    role_name = current_user.role.name if current_user.role else "civilian"
    disasters = await repo.get_disasters(current_user.user_id, role_name)
    
    return [format_disaster_response(d) for d in disasters]

# --- C. Stats (Commander) ---
@router.get("/{disaster_id}/stats", response_model=DisasterStatsResponse)
async def get_disaster_stats(
    disaster_id: UUID,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    repo = DisasterRepository(db)
    stats = await repo.get_stats(disaster_id)
    return stats

# --- D. Map Data ---
@router.get("/{disaster_id}/map", response_model=DisasterMapResponse)
async def get_disaster_map(
    disaster_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    repo = DisasterRepository(db)
    
    # Privacy: Only Commanders see Teams
    role_name = current_user.role.name if current_user.role else "civilian"
    show_teams = (role_name == 'commander')
    
    map_data = await repo.get_map_data(disaster_id, include_teams=show_teams)
    if not map_data:
        raise HTTPException(404, "Disaster not found")
        
    return map_data

# --- E. Close Disaster ---
@router.patch("/{disaster_id}/close")
async def close_disaster(
    disaster_id: UUID,
    current_user: User = Depends(RoleChecker(["commander"])),
    db: AsyncSession = Depends(get_db)
):
    repo = DisasterRepository(db)
    await repo.close_disaster(disaster_id)
    return {"message": "Disaster resolved"}