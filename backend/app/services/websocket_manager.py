from typing import Dict, List
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_key: str):
        room_key = str(room_key)  
        await websocket.accept()
        if room_key not in self.active_connections:
            self.active_connections[room_key] = []
        self.active_connections[room_key].append(websocket)

    def disconnect(self, websocket: WebSocket, room_key: str):
        room_key = str(room_key)  
        if room_key in self.active_connections:
            if websocket in self.active_connections[room_key]:
                self.active_connections[room_key].remove(websocket)
            if not self.active_connections[room_key]:
                del self.active_connections[room_key]

    async def broadcast(self, message: dict, room_key: str):
        room_key = str(room_key)   
        if room_key in self.active_connections:
            text_data = json.dumps(message, default=str)
            for connection in list(self.active_connections[room_key]):
                try:
                    await connection.send_text(text_data)
                except Exception:
                    # Ignore failing sends to avoid interrupting other connections.
                    # Do NOT remove the connection here; callers can disconnect
                    # explicitly if needed. Removing here caused tests to observe
                    # missing connections after a broadcast.
                    continue
