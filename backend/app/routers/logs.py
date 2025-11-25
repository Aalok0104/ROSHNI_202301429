from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import RoleChecker, get_current_user
from app.models.questionnaires_and_logs import DisasterLog
from app.models.user_family_models import User
from app.schemas.logs import LogCreateRequest, LogUpdateRequest, LogResponse

router = APIRouter(prefix="/logs", tags=["Logs"], dependencies=[Depends(RoleChecker(["commander"]))])


@router.post("/disasters/{disaster_id}", response_model=LogResponse)
async def create_log(
    disaster_id: UUID,
    payload: LogCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log = DisasterLog(
        disaster_id=disaster_id,
        created_by_user_id=current_user.user_id,
        source_type="user_input",
        **payload.model_dump(exclude_none=True),
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/disasters/{disaster_id}", response_model=List[LogResponse])
async def list_logs(disaster_id: UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(DisasterLog).where(DisasterLog.disaster_id == disaster_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{log_id}", response_model=LogResponse)
async def get_log(log_id: UUID, db: AsyncSession = Depends(get_db)):
    log = await db.get(DisasterLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return log


@router.patch("/{log_id}", response_model=LogResponse)
async def update_log(
    log_id: UUID,
    payload: LogUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    log = await db.get(DisasterLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    data = payload.model_dump(exclude_none=True)
    for key, value in data.items():
        setattr(log, key, value)
    await db.commit()
    await db.refresh(log)
    return log


@router.delete("/{log_id}")
async def delete_log(log_id: UUID, db: AsyncSession = Depends(get_db)):
    log = await db.get(DisasterLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    await db.delete(log)
    await db.commit()
    return {"message": "Log deleted"}
