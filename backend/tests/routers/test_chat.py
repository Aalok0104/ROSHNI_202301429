import pytest
from fastapi import FastAPI
from uuid import uuid4
from fastapi import status
from sqlalchemy import text
from httpx import ASGITransport, AsyncClient
from types import SimpleNamespace
import json
from fastapi.testclient import TestClient
import httpx
from datetime import datetime

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
    # use a stable room_key derived from the generated disaster id
    room_key = str(disaster_id)
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
async def test_history_team_and_global(async_client, async_db_session, async_create_user, async_create_disaster, monkeypatch):
    # Create users
    responder = await async_create_user(email="responder@example.com", role_name="responder")
    commander = await async_create_user(email="commander@example.com", role_name="commander")

    # Create disaster
    disaster = await async_create_disaster()

    msg = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=commander.user_id,
        message_text="Test History Message",
    )
    async_db_session.add(msg)
    await async_db_session.commit()

    async def fake_teams_for_disaster(_db, _disaster_id):
        return []

    monkeypatch.setattr(chat, "_teams_for_disaster", fake_teams_for_disaster)

    # Test Endpoint
    response = await async_client.get(f"/chat/{disaster.disaster_id}/history")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["message_text"] == "Test History Message"
    assert data[0]["sender_name"] == "Test User" # Default from create_user fixture

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


@pytest.mark.asyncio
async def test_chat_summary_access_control(async_db_session, async_create_user, async_create_disaster):
    commander = await async_create_user(email="cmdsum@example.com", role_name="commander")
    responder = await async_create_user(email="respsum@example.com", role_name="responder")
    outsider = await async_create_user(email="outsider@example.com", role_name="civilian")
    disaster = await async_create_disaster()

    # Insert message directly using SAME DB session
    msg = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=commander.user_id,
        message_text="Commander order!",
        is_global=True,
    )
    async_db_session.add(msg)
    await async_db_session.commit()

    # Create isolated app that uses SAME DB session
    test_app = FastAPI()
    test_app.include_router(chat.router)

    async def override_db():
        yield async_db_session

    test_app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:

        # commander allowed
        r1 = await ac.get(f"/chat/{disaster.disaster_id}/summary?user_id={commander.user_id}")
        assert r1.status_code == 200
        assert "Commander order!" in r1.json()["context"]

        # responder allowed
        r2 = await ac.get(f"/chat/{disaster.disaster_id}/summary?user_id={responder.user_id}")
        assert r2.status_code == 200

        # outsider forbidden
        r3 = await ac.get(f"/chat/{disaster.disaster_id}/summary?user_id={outsider.user_id}")
        assert r3.status_code == 403

        # missing user_id
        r4 = await ac.get(f"/chat/{disaster.disaster_id}/summary")
        assert r4.status_code == 401

@pytest.mark.asyncio
async def test_chat_summary_content(async_db_session, async_create_user, async_create_disaster):
    commander = await async_create_user(email="cmdsum2@example.com", role_name="commander")
    disaster = await async_create_disaster()

    msg1 = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=commander.user_id,
        message_text="Order: Evacuate area!",
        is_global=True,
    )
    msg2 = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=commander.user_id,
        message_text="Team Alpha moving to sector 7.",
        is_global=False
    )
    async_db_session.add_all([msg1, msg2])
    await async_db_session.commit()

    # isolated app using SAME DB session
    test_app = FastAPI()
    test_app.include_router(chat.router)

    async def override_db():
        yield async_db_session

    test_app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get(f"/chat/{disaster.disaster_id}/summary?user_id={commander.user_id}")
        assert resp.status_code == 200

        data = resp.json()
        assert "Order: Evacuate area!" in data["context"]
        assert "Team Alpha moving to sector 7." in data["context"]
        assert "summary" in data
        
# -------------------------------------------------------------------
# 1. TEST _call_llm() WHEN OPENAI_API_KEY EXISTS + SUCCESS RESPONSE
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_llm_call_success(monkeypatch):
    async def mock_post(self, url, json, headers):
        class Resp:
            def raise_for_status(self): pass
            def json(self):
                return {"choices": [{"message": {"content": "LLM summary text"}}]}
        return Resp()

    monkeypatch.setenv("OPENAI_API_KEY", "dummy")
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post, raising=False)

    out = await chat._call_llm("CTX", "PROMPT")
    assert out["text"] == "LLM summary text"


# -------------------------------------------------------------------
# 2. TEST _categorize_messages() — RELAY BRANCH (non-commander global)
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_categorize_relays():
    class Dummy:
        sender = SimpleNamespace(role=SimpleNamespace(name="logistician"))
        message_text = "Relay message"
        created_at = datetime.utcnow()
        is_global = True
        team_id = None

    orders, relays, teams = chat._categorize_messages([Dummy()])
    assert len(orders) == 0
    assert len(relays) == 1
    assert relays[0]["message_text"] == "Relay message"


# -------------------------------------------------------------------
# 3. TEST _build_context_for_llm() — ALL THREE SECTIONS
# -------------------------------------------------------------------
def test_build_context_full_sections():
    orders = [{"created_at": "2025", "message_text": "O"}]
    relays = [{"created_at": "2025", "message_text": "R"}]
    team_actions = {"team1": [{"created_at": "2025", "message_text": "T"}]}

    ctx = chat._build_context_for_llm(orders, relays, team_actions)

    assert "COMMANDER ORDERS" in ctx
    assert "LOGISTICIAN RELAYS" in ctx
    assert "TEAM ACTIONS" in ctx
    assert "O" in ctx
    assert "R" in ctx
    assert "T" in ctx


# -------------------------------------------------------------------
# 4. TEST get_chat_history() — INVALID TEAM ID → 403
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_history_invalid_team(async_db_session, async_create_disaster):
    disaster = await async_create_disaster()

    # Build isolated app using SAME DB session (PREVENT asyncpg crash)
    test_app = FastAPI()
    test_app.include_router(chat.router)

    async def override_db():
        yield async_db_session

    test_app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://x") as ac:

        resp = await ac.get(
            f"/chat/{disaster.disaster_id}/history?team_id={uuid4()}"
        )
        assert resp.status_code == 403

# -------------------------------------------------------------------
# 5. TEST get_disaster_chat_summary() — SANITIZE FAKE TEAM IDs
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_summary_sanitizes_fake_team(async_db_session, async_create_user, async_create_disaster):
    commander = await async_create_user(email="teamtest@example.com", role_name="commander")
    disaster = await async_create_disaster()

    # Fake team ID that does not exist in DB
    msg = DisasterChatMessage(
        disaster_id=disaster.disaster_id,
        sender_user_id=commander.user_id,
        message_text="Team should be sanitized",
        is_global=False,
        team_id=uuid4(),
    )
    async_db_session.add(msg)
    await async_db_session.commit()

    # Build isolated app with same DB session
    test_app = FastAPI()
    test_app.include_router(chat.router)

    async def override_db():
        yield async_db_session

    test_app.dependency_overrides[get_db] = override_db

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://x") as ac:

        resp = await ac.get(
            f"/chat/{disaster.disaster_id}/summary?user_id={commander.user_id}"
        )
        assert resp.status_code == 200

        # Ensure sanitized context does not break summary
        data = resp.json()
        assert "Team should be sanitized" in data["context"]
        assert "summary" in data


# -------------------------------------------------------------------
# Extra coverage for LLM helpers and guards
# -------------------------------------------------------------------
@pytest.mark.asyncio
async def test_llm_call_missing_key_returns_fallback(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    out = await chat._call_llm("CTX", "PROMPT")
    assert "LLM not configured" in out["text"]


@pytest.mark.asyncio
async def test_llm_call_parsing_fallback(monkeypatch):
    async def mock_post(self, url, json, headers):
        class Resp:
            def raise_for_status(self): pass
            def json(self):
                # Missing message key to trigger fallback branch
                return {"choices": [{"other": "value"}]}
        return Resp()

    monkeypatch.setenv("OPENAI_API_KEY", "dummy")
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post, raising=False)
    out = await chat._call_llm("CTX", "PROMPT")
    assert out["text"].strip() == "[{'other': 'value'}]"


@pytest.mark.asyncio
async def test_llm_call_handles_exception(monkeypatch):
    async def mock_post(self, url, json, headers):
        raise RuntimeError("boom")

    monkeypatch.setenv("OPENAI_API_KEY", "dummy")
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post, raising=False)
    out = await chat._call_llm("CTX", "PROMPT")
    assert "LLM request failed" in out["text"]


@pytest.mark.asyncio
async def test_get_user_from_token_or_cookie_bad_uuid():
    ws = SimpleNamespace(query_params={"user_id": "not-a-uuid"})
    assert await chat.get_user_from_token_or_cookie(ws) is None


@pytest.mark.asyncio
async def test_get_disaster_chat_summary_guard_paths(monkeypatch):
    class DummyResult:
        def __init__(self, rows):
            self._rows = rows
        def scalars(self):
            return self
        def all(self):
            return self._rows
        def scalar_one_or_none(self):
            return self._rows[0] if self._rows else None
        def __iter__(self):
            return iter(self._rows)

    class DummySession:
        def __init__(self, responses):
            self._responses = responses
            self._idx = 0
        async def execute(self, _stmt):
            res = self._responses[self._idx]
            self._idx += 1
            return res

    # Missing user_id -> 401
    with pytest.raises(Exception):
        await chat.get_disaster_chat_summary(disaster_id=uuid4(), db=DummySession([]), user_id=None)

    # Unauthorized role -> 403
    bad_user = SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="civilian"))
    bad_session = DummySession([DummyResult([bad_user])])
    with pytest.raises(Exception):
        await chat.get_disaster_chat_summary(disaster_id=uuid4(), db=bad_session, user_id=bad_user.user_id)

    # Authorized path with team cleanup and LLM call
    authorized_user = SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="commander"))
    msg = SimpleNamespace(
        team_id=uuid4(),
        is_global=True,
        sender=SimpleNamespace(role=SimpleNamespace(name="responder")),
        message_text="Team relay",
        created_at=datetime.utcnow(),
    )
    ok_session = DummySession([
        DummyResult([authorized_user]),
        DummyResult([msg]),
        DummyResult([]),
    ])
    result = await chat.get_disaster_chat_summary(disaster_id=uuid4(), db=ok_session, user_id=authorized_user.user_id)
    assert "summary" in result


@pytest.mark.asyncio
async def test_get_user_from_token_or_cookie_missing_token():
    ws = SimpleNamespace(query_params={})
    assert await chat.get_user_from_token_or_cookie(ws) is None


@pytest.mark.asyncio
async def test_update_and_delete_message_paths(monkeypatch):
    from datetime import datetime

    class StubMessage:
        def __init__(self):
            self.message_id = uuid4()
            self.disaster_id = uuid4()
            self.sender_user_id = uuid4()
            self.message_text = "old"
            self.created_at = datetime.utcnow()

    class StubDB:
        def __init__(self, message=None):
            self.message = message
            self.deleted = False
        async def get(self, *_args, **_kwargs):
            return self.message
        async def commit(self):
            return None
        async def refresh(self, *_args, **_kwargs):
            return None
        async def delete(self, msg):
            self.deleted = True

    commander = SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="commander"), profile=None, email="cmd@example.com")

    # Not found update/delete
    missing_db = StubDB(message=None)
    with pytest.raises(Exception):
        await chat.update_message(uuid4(), message_text="new", current_user=commander, db=missing_db)
    with pytest.raises(Exception):
        await chat.delete_message(uuid4(), current_user=commander, db=missing_db)

    # Happy path
    msg = StubMessage()
    ok_db = StubDB(message=msg)
    updated = await chat.update_message(msg.message_id, message_text="new text", current_user=commander, db=ok_db)
    assert updated.message_text == "new text"
    deleted = await chat.delete_message(msg.message_id, current_user=commander, db=ok_db)
    assert deleted["message"] == "Message deleted"


@pytest.mark.asyncio
async def test_get_user_from_token_or_cookie_handles_repo_error(monkeypatch):
    class BadRepo:
        def __init__(self, *_args, **_kwargs): pass
        async def get_by_id(self, *_args, **_kwargs):
            raise RuntimeError("boom")
    monkeypatch.setattr(chat, "UserRepository", BadRepo)
    ws = SimpleNamespace(query_params={"user_id": str(uuid4())})
    assert await chat.get_user_from_token_or_cookie(ws, db=None) is None


@pytest.mark.asyncio
async def test_get_chat_history_global_and_forbidden(monkeypatch):
    class DummyResult:
        def __init__(self, rows):
            self._rows = rows
        def scalars(self):
            return self
        def all(self):
            return self._rows
    class DummySession:
        async def execute(self, _stmt):
            return DummyResult([])
    # Forbidden team_id not in teams
    with pytest.raises(Exception):
        await chat.get_chat_history(disaster_id=uuid4(), scope="team", team_id=uuid4(), db=DummySession())
    # Global branch executes without error
    messages = await chat.get_chat_history(disaster_id=uuid4(), scope="global", db=DummySession())
    assert messages == []


@pytest.mark.asyncio
async def test_delete_message_forbidden(monkeypatch):
    class StubMessage:
        def __init__(self):
            self.message_id = uuid4()
            self.disaster_id = uuid4()
            self.sender_user_id = uuid4()
            self.message_text = "text"
            self.created_at = datetime.utcnow()

    class StubDB:
        def __init__(self, message):
            self.message = message
        async def get(self, *_args, **_kwargs):
            return self.message

    user = SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="responder"), profile=None, email=None)
    message = StubMessage()
    db = StubDB(message)
    with pytest.raises(Exception):
        await chat.delete_message(message.message_id, current_user=user, db=db)
