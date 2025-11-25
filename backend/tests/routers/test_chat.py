import pytest
from fastapi import FastAPI
from uuid import uuid4
from fastapi import status
from sqlalchemy import text
from httpx import ASGITransport, AsyncClient
from types import SimpleNamespace

from app.main import app
from app.routers import chat
from app.database import get_db
from app.services.websocket_manager import ConnectionManager
from app.models.questionnaires_and_logs import DisasterChatMessage
from app.models.user_family_models import User, Role
from app.routers.chat import websocket_endpoint, get_user_from_token_or_cookie, get_chat_history
from app.dependencies import get_current_user


class DummyWebSocket:
    def __init__(self, params=None, should_raise=False):
        self.query_params = params or {}
        self.closed = False
        self.close_code = None
        self.accepted = False
        self.should_raise = should_raise
        self.sent_messages = []

    async def accept(self):
        self.accepted = True

    async def close(self, code):
        self.closed = True
        self.close_code = code

    async def send_text(self, text):
        if self.should_raise:
            raise RuntimeError("boom")
        self.sent_messages.append(text)

@pytest.mark.asyncio
async def test_connection_manager_room_keys():
    manager = ConnectionManager()
    disaster_id = uuid4()

    class MockWS:
        def __init__(self, should_raise=False):
            self.accepted = False
            self.sent_messages = []
            self.should_raise = should_raise
            
        async def accept(self):
            self.accepted = True

        async def send_text(self, text):
            if self.should_raise:
                raise RuntimeError("boom")
            self.sent_messages.append(text)

    ws1 = MockWS()
    ws2 = MockWS()
    ws3 = MockWS(should_raise=True)
    
    # Connect
    await manager.connect(ws1, room_key)
    assert ws1.accepted
    assert room_key in manager.active_connections
    assert len(manager.active_connections[room_key]) == 1

    # Connect second
    await manager.connect(ws2, disaster_id)
    await manager.connect(ws3, disaster_id)
    assert len(manager.active_connections[str(disaster_id)]) == 3
    
    # Broadcast
    msg = {"text": "hello"}
    await manager.broadcast(msg, room_key)
    assert len(ws1.sent_messages) == 1
    assert len(ws2.sent_messages) == 1
    assert "hello" in ws1.sent_messages[0]
    # broadcast should not explode if a socket send fails
    await manager.broadcast(msg, disaster_id)
    
    # Disconnect
    manager.disconnect(ws1, disaster_id)
    assert len(manager.active_connections[str(disaster_id)]) == 2
    
    manager.disconnect(ws2, disaster_id)
    assert len(manager.active_connections[str(disaster_id)]) == 1

    manager.disconnect(ws3, disaster_id)
    assert str(disaster_id) not in manager.active_connections

@pytest.mark.asyncio
async def test_history_team_and_global(async_client, async_db_session, async_create_user, async_create_disaster):
    # Create users
    responder = await async_create_user(email="responder@example.com", role_name="responder")
    commander = await async_create_user(email="commander@example.com", role_name="commander")

    # Create disaster
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

    ws = DummyWebSocket()
    await websocket_endpoint(ws, disaster_id)
    assert ws.closed
    assert ws.close_code == status.WS_1008_POLICY_VIOLATION


@pytest.mark.asyncio
async def test_get_user_from_token_or_cookie_handles_branches(async_db_session, async_create_user):
    ws_missing = DummyWebSocket()
    assert await get_user_from_token_or_cookie(ws_missing, db=async_db_session) is None

    ws_invalid = DummyWebSocket(params={"user_id": "not-a-uuid"})
    assert await get_user_from_token_or_cookie(ws_invalid, db=async_db_session) is None

    user = await async_create_user(email="chat-user@example.com")
    ws_valid = DummyWebSocket(params={"user_id": str(user.user_id)})
    found = await get_user_from_token_or_cookie(ws_valid, db=async_db_session)
    assert found is not None
    assert found.user_id == user.user_id


@pytest.mark.asyncio
async def test_update_message_404_and_forbidden(async_db_session, async_create_user, async_create_disaster):
    commander_db = await async_create_user(email="cmd@example.com", role_name="commander")
    responder_db = await async_create_user(email="resp@example.com", role_name="responder")
    commander = SimpleNamespace(user_id=commander_db.user_id, role=SimpleNamespace(name="commander"), profile=None, email="cmd@example.com")
    responder = SimpleNamespace(user_id=responder_db.user_id, role=SimpleNamespace(name="responder"), profile=None, email="resp@example.com")
    disaster = await async_create_disaster()
    message = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=commander_db.user_id,
        message_text="Owned",
    )
    async_db_session.add(message)
    await async_db_session.commit()

    app = FastAPI()
    app.include_router(chat.router)

    async def _db():
        yield async_db_session

    async def commander_dep():
        return commander

    async def responder_dep():
        return responder

    # 404 branch
    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_user] = commander_dep
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.patch(f"/chat/messages/{uuid4()}", json={"message_text": "missing"})
        assert resp.status_code == 404

    # Forbidden branch
    app.dependency_overrides[get_current_user] = responder_dep
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.patch(f"/chat/messages/{message.message_id}", json={"message_text": "forbidden"})
        assert resp.status_code == 403

    # Delete 404
    app.dependency_overrides[get_current_user] = commander_dep
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.delete(f"/chat/messages/{uuid4()}")
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_chat_history_formats_sender_details(async_db_session, async_create_user, async_create_disaster):
    user = await async_create_user(email="chat_details@example.com")
    disaster = await async_create_disaster()
    # create sender without profile/email to hit default name branch
    role = await async_db_session.get(Role, 1)
    if not role:
        async_db_session.add(Role(role_id=1, name="civilian"))
        await async_db_session.commit()
    anon_user = User(user_id=uuid4(), role_id=1, email=None, is_active=True)
    async_db_session.add(anon_user)
    await async_db_session.commit()

    # message with sender
    msg1 = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=user.user_id,
        message_text="Hello",
    )
    # message with sender lacking profile/email -> should default
    msg2 = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=anon_user.user_id,
        message_text="Anon",
    )
    async_db_session.add_all([msg1, msg2])
    await async_db_session.commit()

    payload = await get_chat_history(disaster.disaster_id, db=async_db_session)
    assert len(payload) == 2
    assert any(item.sender_name == "Test User" for item in payload)
    assert any(item.sender_name == "Unknown" for item in payload)


@pytest.mark.asyncio
async def test_update_and_delete_message_permissions(async_db_session, async_create_user, async_create_disaster):
    commander = await async_create_user(email="commander@example.com", role_name="commander")
    disaster = await async_create_disaster()
    message = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=commander.user_id,
        message_text="old",
    )
    async_db_session.add(message)
    await async_db_session.commit()
    await async_db_session.refresh(message)

    test_app = FastAPI()
    test_app.include_router(chat.router)
    async def _db():
        yield async_db_session
    commander_stub = SimpleNamespace(user_id=commander.user_id, role=SimpleNamespace(name="commander"), profile=None, email="c@example.com")
    async def _user():
        return commander_stub
    test_app.dependency_overrides[get_db] = _db
    test_app.dependency_overrides[get_current_user] = _user
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.patch(f"/chat/messages/{message.message_id}", json={"message_text": "new"})
        assert resp.status_code == 200
        assert resp.json()["message_text"] == "new"

        resp_del = await ac.delete(f"/chat/messages/{message.message_id}")
        assert resp_del.status_code == 200
        resp_missing = await ac.delete(f"/chat/messages/{uuid4()}")
        assert resp_missing.status_code == 404
