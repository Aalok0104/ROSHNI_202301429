Here is the detailed specification for **`app/routers/chat.py`**.

This router handles **Real-Time Communication**. Unlike standard HTTP endpoints, this relies heavily on **WebSockets** and an in-memory **Connection Manager**.

### **Router Specification: `app/routers/chat.py`**

**Purpose:** Enable real-time coordination between Commanders and Logisticians, while allowing other responders to stay informed via a read-only feed.
**Dependencies:** `FastAPI WebSocket`, `ConnectionManager` (Custom Class), `SQLAlchemy` (Async Session for logging).

-----

### **1. Pydantic Models (Schemas)**

Place these in `app/schemas/chat.py`.

```python
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

# 1. Outgoing Message (Sent to Client)
class ChatMessageResponse(BaseModel):
    message_id: UUID
    disaster_id: UUID
    sender_user_id: UUID
    sender_name: str
    sender_role: str # "commander", "medic", "civilian", etc.
    message_text: str
    created_at: datetime

    class Config:
        from_attributes = True

# 2. Incoming Message (Received from Client)
# Note: Usually WS just sends raw text, but JSON is safer for extensibility
class ChatMessageCreate(BaseModel):
    message_text: str
```

-----

### **2. The Connection Manager (Service)**

You must instruct the Agent to create a `services/websocket_manager.py` file first. This is the "Switchboard" of the chat system.

**Logic for `ConnectionManager`:**

  * **Store:** `active_connections: Dict[str, List[WebSocket]]` (Key is `disaster_id`).
  * **Connect(websocket, disaster\_id):** Accept socket, add to list.
  * **Disconnect(websocket, disaster\_id):** Remove from list.
  * **Broadcast(message, disaster\_id):** Loop through all sockets in that `disaster_id` list and send JSON.

-----

### **3. Endpoints**

#### **A. `GET /chat/{disaster_id}/history`**

  * **Purpose:** Load past messages when a user first opens the chat window.
  * **Role:** Authenticated User (Follower, Responder, Commander).
  * **Logic:**
      * Query `disaster_chat_messages`.
      * Join with `users` and `user_profiles` to get sender names.
      * Sort by `created_at` DESC.
      * Limit 50 or 100.
  * **Returns:** List of `ChatMessageResponse`.

#### **B. `WS /ws/chat/{disaster_id}`**

  * **Purpose:** The live WebSocket connection.

  * **Logic Flow:**

    **Phase 1: Handshake & Auth**

      * **Validation:** WebSockets don't always carry cookies automatically in some clients. The Agent should expect a `?token=` query param OR use the Session Cookie if the client supports it.
      * **User Lookup:** Decode session/token to get `user_id` and `role`.
      * **Role Check:**
          * Is User a Commander? -\> **Write Access**.
          * Is User a Responder (Logistician)? -\> **Write Access**.
          * Is User a Responder (Medic/Fire)? -\> **Read-Only**.
          * Is User a Civilian? -\> **Read-Only**.

    **Phase 2: Connection**

      * `await manager.connect(websocket, disaster_id)`

    **Phase 3: Listening Loop**

      * `while True:`
          * `data = await websocket.receive_text()`
          * **Permission Check:** If user is **Read-Only**, ignore the message (or send back an error frame).
          * **Persistence:**
              * Create `DisasterChatMessage` in DB.
              * Commit (Critical for LLM history later).
          * **Broadcast:**
              * `await manager.broadcast(json_data, disaster_id)`

    **Phase 4: Disconnect**

      * Handle `WebSocketDisconnect` exception.
      * `manager.disconnect(websocket, disaster_id)`

-----

### **4. Critical Implementation Details**

#### **1. Handling "Write" Permissions in a Loop**

The prompt specifically stated: *"The team logistician can ... chat with commanders... By default, other members ... can only read."*

The Agent must implement this check **inside the WebSocket loop**:

```python
# Inside the router
responder_profile = await get_responder_profile(user_id)
can_write = (
    role == "commander" or 
    (role == "responder" and responder_profile.responder_type == "logistician")
)

while True:
    data = await websocket.receive_text()
    if not can_write:
        # Optional: Send a private "Error" message back to this socket
        continue 
    
    # Save and Broadcast...
```

#### **2. Async Database Writes**

WebSockets are `async`. If the Agent uses standard blocking SQLAlchemy calls inside the loop, it will freeze the chat for everyone.

  * **Instruction:** Use `AsyncSession` (SQLAlchemy 1.4/2.0) or run DB writes in a separate thread using `fastapi.concurrency.run_in_threadpool`.

#### **3. Connection Manager Singleton**

Ensure `manager` is instantiated **once** in `main.py` or the router module level, not recreated on every request.

```python
# routers/chat.py
manager = ConnectionManager() # Global instance
```

#### **4. Frontend Context (Sender Name)**

When broadcasting, don't just send the text. Send the **Sender Name** and **Timestamp**. The frontend needs this to differentiate "My message" vs "Commander's message".

### **Next Step**

We have the Communication layer. The final major piece of the puzzle is the **Intelligence Layer**.
This involves the **Questionnaires (Surveys)** for gathering data, and the **Reports (LLM)** for summarizing it.
Shall we detail **`surveys.py`** and then **`reports.py`**? `surveys.py` is the input for the intelligence, so it should come first.