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
from app.models.responder_management import ResponderProfile
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
    # In a real app, we'd decode the JWT token or read the session cookie
    # For this implementation, we'll assume the session middleware handles cookies
    # but WebSockets are tricky with standard middleware.
    # We'll try to read 'user_id' from the session if available, or a token.
    
    # SIMPLIFICATION: For now, we will trust a 'user_id' query param for the WebSocket 
    # if the session isn't easily accessible in this context without complex auth logic.
    # IN PRODUCTION: Use a proper JWT or signed cookie verification here.
    
    user_id_str = websocket.query_params.get("user_id") or token
    if not user_id_str:
        return None
    
    try:
        user_uuid = UUID(user_id_str)
        repo = UserRepository(db)
        return await repo.get_by_id(user_uuid)
    except Exception:
        return None

@router.get("/{disaster_id}/history", response_model=List[ChatMessageResponse])
async def get_chat_history(
    disaster_id: UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    # Fetch messages with sender info
    stmt = (
        select(DisasterChatMessage)
        .options(
            selectinload(DisasterChatMessage.sender).selectinload(User.profile),
            selectinload(DisasterChatMessage.sender).selectinload(User.role),
        )
    ).where(
        DisasterChatMessage.disaster_id == disaster_id
    ).order_by(desc(DisasterChatMessage.created_at)).limit(limit)
    
    result = await db.execute(stmt)
    messages = result.scalars().all()
    
    # Format response
    response = []
    for msg in messages:
        sender_name = "Unknown"
        sender_role = "civilian"
        if msg.sender:
            profile = getattr(msg.sender, "profile", None)
            sender_name = (
                getattr(profile, "full_name", None) or msg.sender.email or sender_name
            )
            if msg.sender.role:
                sender_role = msg.sender.role.name
                
        response.append(ChatMessageResponse(
            message_id=msg.message_id,
            disaster_id=msg.disaster_id,
            sender_user_id=msg.sender_user_id,
            sender_name=sender_name,
            sender_role=sender_role,
            message_text=msg.message_text,
            created_at=msg.created_at
        ))
    
    return response

@router.websocket("/ws/{disaster_id}")  # pragma: no cover
async def websocket_endpoint(
    websocket: WebSocket, 
    disaster_id: UUID
):
    # 1. Connect & Auth
    # We need a DB session for auth check
    async with AsyncSessionLocal() as db:
        user = await get_user_from_token_or_cookie(websocket, db=db)
        
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(websocket, disaster_id)
        
        # Determine Write Permissions
        # Commander: Write
        # Responder (Logistician): Write
        # Others: Read-Only
        can_write = False
        user_role = user.role.name if user.role else "civilian"
        
        if user_role == "commander":
            can_write = True
        elif user_role == "responder":
            # Check responder type
            stmt = select(ResponderProfile).where(ResponderProfile.user_id == user.user_id)
            res = await db.execute(stmt)
            profile = res.scalar_one_or_none()
            if profile and profile.responder_type == "logistician":
                can_write = True

    try:
        while True:
            data = await websocket.receive_text()
            
            if not can_write:
                # Ignore write attempts from read-only users
                # Optionally send an error frame back
                continue

            # Persist Message
            async with AsyncSessionLocal() as db:
                new_msg = DisasterChatMessage(
                    disaster_id=disaster_id,
                    sender_user_id=user.user_id,
                    message_text=data
                )
                db.add(new_msg)
                await db.commit()
                await db.refresh(new_msg)
                
                # Prepare Broadcast Payload
                payload = {
                    "message_id": new_msg.message_id,
                    "disaster_id": new_msg.disaster_id,
                    "sender_user_id": new_msg.sender_user_id,
                    "sender_name": user.full_name or user.email,
                    "sender_role": user_role,
                    "message_text": new_msg.message_text,
                    "created_at": new_msg.created_at
                }
            
            # Broadcast
            await manager.broadcast(payload, disaster_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, disaster_id)
