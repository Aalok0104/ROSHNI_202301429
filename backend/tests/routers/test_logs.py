import pytest
from uuid import uuid4
from types import SimpleNamespace
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
import pytest_asyncio

from app.routers import logs
from app.dependencies import get_current_user
from app.schemas.logs import LogCreateRequest, LogUpdateRequest
from app.models.questionnaires_and_logs import DisasterLog


def _commander():
    from types import SimpleNamespace
    return SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="commander"))


@pytest_asyncio.fixture
async def client(async_db_session, async_create_user):
    app = FastAPI()
    app.include_router(logs.router)

    async def _db():
        yield async_db_session

    commander = await async_create_user(role_name="commander")
    current_user = SimpleNamespace(user_id=commander.user_id, role=SimpleNamespace(name="commander"))

    async def _current_user():
        return current_user

    app.dependency_overrides[logs.get_db] = _db
    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[logs.RoleChecker] = lambda *_args, **_kwargs: current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


@pytest.mark.asyncio
async def test_create_and_get_log(client, async_db_session, async_create_disaster):
    disaster = await async_create_disaster()
    disaster_id = disaster.disaster_id
    resp = await client.post(f"/logs/disasters/{disaster_id}", json={"title": "Created", "text_body": "Details"})
    assert resp.status_code == 200
    log_id = resp.json()["log_id"]

    get_resp = await client.get(f"/logs/{log_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["title"] == "Created"

    list_resp = await client.get(f"/logs/disasters/{disaster_id}")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1


@pytest.mark.asyncio
async def test_update_and_delete_log(client, async_create_disaster):
    disaster = await async_create_disaster()
    disaster_id = disaster.disaster_id
    create_resp = await client.post(f"/logs/disasters/{disaster_id}", json={"title": "Initial"})
    log_id = create_resp.json()["log_id"]

    upd = await client.patch(f"/logs/{log_id}", json={"text_body": "Updated"})
    assert upd.status_code == 200
    assert upd.json()["text_body"] == "Updated"

    delete_resp = await client.delete(f"/logs/{log_id}")
    assert delete_resp.status_code == 200
    missing = await client.get(f"/logs/{log_id}")
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_log_routes_return_404s(async_db_session, async_create_disaster, async_create_user):
    user = await async_create_user(role_name="commander")
    stub_user = SimpleNamespace(user_id=user.user_id, role=SimpleNamespace(name="commander"))
    disaster = await async_create_disaster()
    # Directly call functions to cover branches
    with pytest.raises(Exception):
        await logs.get_log(uuid4(), db=async_db_session)
    with pytest.raises(Exception):
        await logs.update_log(uuid4(), payload=LogUpdateRequest(title="x"), db=async_db_session)
    with pytest.raises(Exception):
        await logs.delete_log(uuid4(), db=async_db_session)

    # create a log directly
    created = await logs.create_log(
        disaster.disaster_id,
        payload=LogCreateRequest(title="ViaDirect"),
        current_user=stub_user,
        db=async_db_session,
    )
    listed = await logs.list_logs(disaster.disaster_id, db=async_db_session)
    assert any(l.log_id == created.log_id for l in listed)


@pytest.mark.asyncio
async def test_log_endpoints_404_with_stub_db():
    class StubDB:
        async def get(self, *_args, **_kwargs):
            return None
    with pytest.raises(Exception):
        await logs.get_log(uuid4(), db=StubDB())
    with pytest.raises(Exception):
        await logs.update_log(uuid4(), payload=LogUpdateRequest(title="t"), db=StubDB())
    with pytest.raises(Exception):
        await logs.delete_log(uuid4(), db=StubDB())


@pytest.mark.asyncio
async def test_log_endpoints_success_with_stub_db():
    class StubLog:
        def __init__(self):
            self.log_id = uuid4()
            self.title = "t"
    class StubDB:
        def __init__(self):
            self.log = StubLog()
            self.deleted = False
        async def get(self, *_args, **_kwargs):
            return self.log
        async def commit(self): return None
        async def refresh(self, _log): return None
        async def delete(self, _log):
            self.deleted = True
    stub_db = StubDB()
    log = await logs.get_log(uuid4(), db=stub_db)
    assert log.title == "t"
    updated = await logs.update_log(uuid4(), payload=LogUpdateRequest(text_body="new"), db=stub_db)
    assert updated.text_body == "new"
    resp = await logs.delete_log(uuid4(), db=stub_db)
    assert resp["message"] == "Log deleted"
    assert stub_db.deleted is True
