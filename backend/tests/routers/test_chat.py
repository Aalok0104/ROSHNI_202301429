import pytest
from uuid import uuid4
from fastapi import status

from app.main import app
from app.services.websocket_manager import ConnectionManager
from app.models.questionnaires_and_logs import DisasterChatMessage
from app.routers.chat import websocket_endpoint

@pytest.mark.asyncio
async def test_websocket_manager():
    manager = ConnectionManager()
    disaster_id = uuid4()
    
    # Mock WebSocket
    class MockWS:
        def __init__(self):
            self.accepted = False
            self.closed = False
            self.sent_messages = []
            
        async def accept(self):
            self.accepted = True
            
        async def send_text(self, text):
            self.sent_messages.append(text)
            
    ws1 = MockWS()
    ws2 = MockWS()
    
    # Connect
    await manager.connect(ws1, disaster_id)
    assert ws1.accepted
    assert str(disaster_id) in manager.active_connections
    assert len(manager.active_connections[str(disaster_id)]) == 1
    
    # Connect second
    await manager.connect(ws2, disaster_id)
    assert len(manager.active_connections[str(disaster_id)]) == 2
    
    # Broadcast
    msg = {"text": "hello"}
    await manager.broadcast(msg, disaster_id)
    assert len(ws1.sent_messages) == 1
    assert len(ws2.sent_messages) == 1
    assert "hello" in ws1.sent_messages[0]
    
    # Disconnect
    manager.disconnect(ws1, disaster_id)
    assert len(manager.active_connections[str(disaster_id)]) == 1
    
    manager.disconnect(ws2, disaster_id)
    assert str(disaster_id) not in manager.active_connections

@pytest.mark.asyncio
async def test_chat_history_endpoint(async_client, async_db_session, async_create_user, async_create_disaster):
    # Setup
    user = await async_create_user(email="chat_user@example.com")
    disaster = await async_create_disaster()
    
    msg = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=user.user_id,
        message_text="Test History Message",
    )
    async_db_session.add(msg)
    await async_db_session.commit()
    
    # Test Endpoint
    response = await async_client.get(f"/chat/{disaster.disaster_id}/history")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["message_text"] == "Test History Message"
    assert data[0]["sender_name"] == "Test User" # Default from create_user fixture

# WebSocket testing with TestClient is limited for async/complex auth flows
# We will rely on the unit test for the manager and basic connection test
from fastapi.testclient import TestClient


@pytest.mark.asyncio
async def test_websocket_connection_rejected_without_user():
    disaster_id = uuid4()

    class DummyWebSocket:
        def __init__(self):
            self.query_params = {}
            self.closed = False
            self.close_code = None

        async def close(self, code):
            self.closed = True
            self.close_code = code

    ws = DummyWebSocket()
    await websocket_endpoint(ws, disaster_id)
    assert ws.closed
    assert ws.close_code == status.WS_1008_POLICY_VIOLATION
