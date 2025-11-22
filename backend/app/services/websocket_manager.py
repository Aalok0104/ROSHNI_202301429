from typing import Dict, List
from fastapi import WebSocket
from uuid import UUID
import json

class ConnectionManager:
    def __init__(self):
        # Key: disaster_id (str), Value: List of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, disaster_id: UUID):
        await websocket.accept()
        d_id = str(disaster_id)
        if d_id not in self.active_connections:
            self.active_connections[d_id] = []
        self.active_connections[d_id].append(websocket)

    def disconnect(self, websocket: WebSocket, disaster_id: UUID):
        d_id = str(disaster_id)
        if d_id in self.active_connections:
            if websocket in self.active_connections[d_id]:
                self.active_connections[d_id].remove(websocket)
            if not self.active_connections[d_id]:
                del self.active_connections[d_id]

    async def broadcast(self, message: dict, disaster_id: UUID):
        d_id = str(disaster_id)
        if d_id in self.active_connections:
            # Serialize once
            text_data = json.dumps(message, default=str)
            for connection in self.active_connections[d_id]:
                try:
                    await connection.send_text(text_data)
                except Exception:
                    # Handle broken pipes or closed connections gracefully
                    pass
