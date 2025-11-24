## Chat Router Specification

This document describes the expected behavior and implementation details for `app/routers/chat.py`.

Purpose: Real-time communication for disasters using WebSockets and a simple in-memory Connection Manager. The design supports two channels per disaster:

- Team chat: per-team room (only team members may join and send; commanders are explicitly excluded from team rooms).
- Global chat: disaster-wide channel where the disaster commander and logisticians on assigned teams can communicate.

The router persists messages to the database for history and auditability and uses a `ConnectionManager` to route real-time messages.

---

### 1. Schemas (place in `app/schemas/chat.py`)

```python
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ChatMessageResponse(BaseModel):
    message_id: UUID
    disaster_id: UUID
    sender_user_id: UUID
    sender_name: str
    sender_role: str  # e.g. "commander", "logistician", "medic"
    message_text: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    message_text: str
```

Notes:
- `ChatMessageResponse` is used for responses and broadcasts.
- `ChatMessageCreate` represents the incoming JSON payload over WebSocket (keeps it extensible).

---

### 2. Connection Manager (service)

Create `app/services/websocket_manager.py`. This is the switchboard.

Requirements:

- Maintain `active_connections: Dict[str, List[WebSocket]]` keyed by a room string (see room keys below).
- `connect(websocket, room_key)`: accept connection and append to the list for that room.
- `disconnect(websocket, room_key)`: remove the websocket; remove empty lists.
- `broadcast(message: dict, room_key: str)`: send JSON to all connected sockets in that room (catch and cleanup errors).

Important: instantiate a single `ConnectionManager` (singleton) at module-level in the router or an importable place so all handlers share the same instance.

---

### 3. Endpoints (router behavior)

All endpoints live in `app/routers/chat.py` and expect to use an `AsyncSession` for DB access.

#### A. GET /chat/{disaster_id}/history

- Purpose: load recent messages when a client opens chat.
- Auth: any authenticated user (follower, responder, commander) may call this.
- Query parameters:
  - `scope`: `team` or `global` (validate with `pattern="^(team|global)$"`).
  - `team_id` (UUID): REQUIRED when `scope=team`.
- Behavior:
  - Query `disaster_chat_messages` filtered by `disaster_id` and either `team_id` or `is_global` depending on `scope`.
  - Join `users`/profiles to return `sender_name` + `sender_role`.
  - Order by `created_at` DESC and limit (50 or 100 configurable).
  - Return `List[ChatMessageResponse]`.

Examples:

GET /chat/{disaster_id}/history?scope=team&team_id=<TEAM_UUID>
GET /chat/{disaster_id}/history?scope=global

#### B. WS /ws/chat/{disaster_id}

We provide two WS entrypoints (clear semantics): team and global. Each uses a room key string for the manager.

1) Team WebSocket: `ws://.../chat/ws/team/{disaster_id}?team_id=<TEAM_UUID>&token=<TOKEN_OR_user_id>`

- Room key: `team:<TEAM_UUID>`.
- Connect policy: only responders whose `ResponderProfile.team_id == TEAM_UUID` may connect. Commanders are explicitly denied.
- Write policy: connected team members may send messages (all have write access in the team room).
- When a message is received:
  - Verify `can_write` (see below); if not allowed, optionally send an error frame and continue.
  - Persist a `DisasterChatMessage` with `disaster_id`, `team_id=TEAM_UUID`, `sender_user_id`, `message_text`, `is_global=False`.
  - Broadcast the enriched payload (sender name, role, timestamp, ids) to `team:<TEAM_UUID>`.

2) Global WebSocket: `ws://.../chat/ws/global/{disaster_id}?token=<TOKEN_OR_user_id>`

- Room key: `global:<DISASTER_ID>`.
- Connect policy: only the disaster commander and logisticians whose `ResponderProfile.team_id` is one of the teams assigned to the disaster may connect.
- Write policy: commander and logisticians have write access; others should be rejected.
- Message handling similar to team WS but persist `is_global=True` (and `team_id` if available).

Handshake & Authorization details (applies to both endpoints):

- The WebSocket should accept a `?token=` query param for auth (or rely on session cookie when available). Decode it to get `user_id` and `role`.
- Determine responder profile (if applicable) to check `responder_type` and `team_id`.

Write-permission snippet (conceptual):

```python
# pseudo
responder_profile = await get_responder_profile(user_id)
can_write = (
    role == "commander"
    or (role == "responder" and responder_profile and responder_profile.responder_type == "logistician")
)

while True:
    data = await websocket.receive_text()
    if not can_write:
        # optionally send an error frame to the writer socket
        continue

    # persist using AsyncSession
    # broadcast via manager.broadcast(payload, room_key)
```

Make sure to use `AsyncSession` for DB writes (or `run_in_threadpool` for sync DB code) to avoid blocking the event loop.

Disconnect handling: on `WebSocketDisconnect` call `manager.disconnect(websocket, room_key)` and cleanup.

---

### 4. Critical Implementation Details

- Use `AsyncSession` for database writes inside WebSocket handlers.
- Keep a single `ConnectionManager` instance at module level and reuse it across requests.
- Room keys: use `team:<team_id>` and `global:<disaster_id>`.
- Broadcast payloads must include `sender_name`, `sender_role`, `created_at` plus IDs so the frontend can differentiate messages.

Example broadcast payload (JSON):

```json
{
  "message_id": "<UUID>",
  "disaster_id": "<UUID>",
  "team_id": "<UUID or null>",
  "sender_user_id": "<UUID>",
  "sender_name": "Alice Responder",
  "sender_role": "logistician",
  "message_text": "We are on the way",
  "is_global": false,
  "created_at": "2025-11-23T12:34:56.789Z"
}
```

---

### 5. Testing Recommendations

- Unit test `ConnectionManager` (connect/disconnect/broadcast) with mocked WebSocket objects.
- Integration tests for the history endpoint (create teams, assign them to a disaster, insert messages, verify history for `team` and `global`).
- WebSocket tests: verify accept/reject behavior for different roles, persistence, and broadcast semantics.