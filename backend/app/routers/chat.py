from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_db, AsyncSessionLocal
from app.models.user_family_models import User
from app.models.questionnaires_and_logs import DisasterChatMessage
from app.models.responder_management import ResponderProfile, Team
from app.models.disaster_management import DisasterTask, DisasterTaskAssignment
from app.repositories.user_repository import UserRepository
from app.services.websocket_manager import ConnectionManager
from app.schemas.chat import ChatMessageResponse, ChatMessageCreate

router = APIRouter(prefix="/chat", tags=["Real-Time Chat"])
manager = ConnectionManager()


# Helper to get user from session cookie or token
async def get_user_from_token_or_cookie(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: AsyncSession = None
) -> Optional[User]:
    user_id_str = websocket.query_params.get("user_id") or token
    if not user_id_str:
        return None

    try:
        user_uuid = UUID(user_id_str)
        repo = UserRepository(db)
        return await repo.get_by_id(user_uuid)
    except Exception:
        return None


async def _teams_for_disaster(db: AsyncSession, disaster_id: UUID) -> List[UUID]:
    stmt = (
        select(DisasterTaskAssignment.team_id)
        .join(DisasterTask, DisasterTaskAssignment.task_id == DisasterTask.task_id)
        .where(DisasterTask.disaster_id == disaster_id)
    )
    res = await db.execute(stmt)
    team_ids = [row[0] for row in res.all() if row[0] is not None]
    return team_ids


@router.get("/{disaster_id}/history", response_model=List[ChatMessageResponse])
async def get_chat_history(
    disaster_id: UUID,
    scope: str = Query("team", regex="^(team|global)$"),
    team_id: Optional[UUID] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    # Determine filter
    if scope == "team":
        if not team_id:
            teams = await _teams_for_disaster(db, disaster_id)
            if not teams:
                raise HTTPException(status_code=404, detail="No team assigned to disaster")
            team_id = teams[0]

        stmt = (
            select(DisasterChatMessage)
            .options(
                selectinload(DisasterChatMessage.sender)
                    .selectinload(User.profile),
                selectinload(DisasterChatMessage.sender)
                    .selectinload(User.role)
            )
            .where(
                DisasterChatMessage.disaster_id == disaster_id,
                DisasterChatMessage.team_id == team_id,
            )
            .order_by(desc(DisasterChatMessage.created_at))
            .limit(limit)
        )
    else:
        # global
        stmt = (
            select(DisasterChatMessage)
            .options(
                selectinload(DisasterChatMessage.sender)
                    .selectinload(User.profile),
                selectinload(DisasterChatMessage.sender)
                    .selectinload(User.role)
            )
            .where(
                DisasterChatMessage.disaster_id == disaster_id,
                DisasterChatMessage.is_global == True,
            )
            .order_by(desc(DisasterChatMessage.created_at))
            .limit(limit)
        )

    result = await db.execute(stmt)
    messages = result.scalars().all()

    response = []
    for msg in messages:
        sender_name = "Unknown"
        sender_role = "civilian"
        if msg.sender:
            profile = getattr(msg.sender, "profile", None)
            sender_name = getattr(profile, "full_name", None) or msg.sender.email or sender_name
            if msg.sender.role:
                sender_role = msg.sender.role.name

        response.append(ChatMessageResponse(
            message_id=msg.message_id,
            disaster_id=msg.disaster_id,
            team_id=getattr(msg, "team_id", None),
            sender_user_id=msg.sender_user_id,
            sender_name=sender_name,
            sender_role=sender_role,
            message_text=msg.message_text,
            is_global=getattr(msg, "is_global", False),
            created_at=msg.created_at,
        ))

    return response


@router.websocket("/ws/team/{disaster_id}")  # pragma: no cover
async def websocket_team(
    websocket: WebSocket,
    disaster_id: UUID,
    team_id: Optional[UUID] = Query(None),
):
    async with AsyncSessionLocal() as db:
        user = await get_user_from_token_or_cookie(websocket, db=db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        teams = await _teams_for_disaster(db, disaster_id)
        if not teams:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Require the client to specify which team chat to join.
        # Validate that the provided `team_id` is assigned to this disaster.
        if not team_id:
            # No team specified — close with policy violation
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        if team_id not in teams:
            # The requested team is not assigned to this disaster
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Check membership: only allow actual team members (commanders removed)
        stmt = select(ResponderProfile).where(ResponderProfile.user_id == user.user_id)
        rres = await db.execute(stmt)
        profile = rres.scalar_one_or_none()

        # Only a responder with a profile assigned to this team can join
        if not profile or profile.team_id != team_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        room_key = f"team:{team_id}"
        await manager.connect(websocket, room_key)

        can_write = bool(profile)

    try:
        while True:
            data = await websocket.receive_text()
            if not can_write:
                continue

            async with AsyncSessionLocal() as db:
                new_msg = DisasterChatMessage(
                    disaster_id=disaster_id,
                    team_id=team_id,
                    sender_user_id=user.user_id,
                    message_text=data,
                    is_global=False,
                )
                db.add(new_msg)
                await db.commit()
                await db.refresh(new_msg)

                payload = {
                    "message_id": new_msg.message_id,
                    "disaster_id": new_msg.disaster_id,
                    "team_id": new_msg.team_id,
                    "sender_user_id": new_msg.sender_user_id,
                    "sender_name": user.full_name or user.email,
                    "sender_role": user.role.name if user.role else "civilian",
                    "message_text": new_msg.message_text,
                    "is_global": False,
                    "created_at": new_msg.created_at,
                }

            await manager.broadcast(payload, room_key)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_key)


@router.websocket("/ws/global/{disaster_id}")  # pragma: no cover
async def websocket_global(
    websocket: WebSocket,
    disaster_id: UUID,
):
    async with AsyncSessionLocal() as db:
        user = await get_user_from_token_or_cookie(websocket, db=db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        teams = await _teams_for_disaster(db, disaster_id)
        # Build set of team ids
        team_set = set(teams)

        stmt = select(ResponderProfile).where(ResponderProfile.user_id == user.user_id)
        rres = await db.execute(stmt)
        profile = rres.scalar_one_or_none()

        is_commander = (user.role and user.role.name == "commander")
        is_logistician = bool(profile and profile.responder_type == "logistician" and profile.team_id in team_set)

        if not (is_commander or is_logistician):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        room_key = f"global:{disaster_id}"
        await manager.connect(websocket, room_key)

        can_write = is_commander or is_logistician

    try:
        while True:
            data = await websocket.receive_text()
            if not can_write:
                continue

            async with AsyncSessionLocal() as db:
                new_msg = DisasterChatMessage(
                    disaster_id=disaster_id,
                    sender_user_id=user.user_id,
                    message_text=data,
                    is_global=True,
                )
                # Optionally link team_id of sender when available
                if profile:
                    new_msg.team_id = profile.team_id

                db.add(new_msg)
                await db.commit()
                await db.refresh(new_msg)

                payload = {
                    "message_id": new_msg.message_id,
                    "disaster_id": new_msg.disaster_id,
                    "team_id": getattr(new_msg, "team_id", None),
                    "sender_user_id": new_msg.sender_user_id,
                    "sender_name": user.full_name or user.email,
                    "sender_role": user.role.name if user.role else "civilian",
                    "message_text": new_msg.message_text,
                    "is_global": True,
                    "created_at": new_msg.created_at,
                }

            await manager.broadcast(payload, room_key)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_key)
