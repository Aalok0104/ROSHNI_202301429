from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
import pytest_asyncio

from app.routers import responders
from app import dependencies

pytestmark = pytest.mark.no_db


@pytest.fixture(autouse=True)
def setup_database():
    yield


class DummyResponderRepository:
    created_team = None
    teams_response = []
    responders_response = []
    created_responder = None
    update_response = None
    deleted_team = None
    deleted_responder = None
    assigned = None
    team_lookup = None
    profile_lookup = SimpleNamespace(
        user_id=uuid4(),
        full_name="Responder",
        email="r@example.com",
        responder_type="medic",
        badge_number="A1",
        status="active",
        team_id=None,
        team_name=None,
        last_known_latitude=None,
        last_known_longitude=None,
    )

    def __init__(self, *_args, **_kwargs):
        pass

    @classmethod
    def reset(cls):
        cls.created_team = None
        cls.teams_response = []
        cls.responders_response = []
        cls.created_responder = None
        cls.update_response = None
        cls.deleted_team = None
        cls.deleted_responder = None
        cls.assigned = None
        cls.team_lookup = None
        cls.profile_lookup = SimpleNamespace(
            user_id=uuid4(),
            full_name="Responder",
            email="r@example.com",
            responder_type="medic",
            badge_number="A1",
            status="active",
            team_id=None,
            team_name=None,
            last_known_latitude=None,
            last_known_longitude=None,
        )

    async def create_team(self, data):
        self.__class__.created_team = data
        return SimpleNamespace(team_id=uuid4(), name=data["name"], team_type=data["team_type"], status="available")

    async def get_teams_with_location(self, status, team_type):
        return self.__class__.teams_response

    async def create_responder(self, data):
        self.__class__.created_responder = data
        return {"user_id": uuid4(), "full_name": data["full_name"], "email": data["email"], "responder_type": data["responder_type"], "badge_number": data["badge_number"], "team_name": None, "status": "active", "last_known_latitude": None, "last_known_longitude": None}

    async def get_all_responders(self, filters):
        return self.__class__.responders_response

    async def update_responder(self, user_id, data):
        return self.__class__.update_response

    async def delete_responder(self, user_id):
        if self.__class__.deleted_responder == "missing":
            return None
        self.__class__.deleted_responder = user_id
        return True

    async def delete_team(self, team_id):
        if self.__class__.deleted_team == "missing":
            return None
        self.__class__.deleted_team = team_id
        return SimpleNamespace(team_id=team_id)

    async def assign_responder_to_team(self, user_id, team_id):
        if self.__class__.assigned == "missing":
            return None
        self.__class__.assigned = (user_id, team_id)
        return {"user_id": str(user_id), "full_name": "Assigned", "email": "a@example.com", "responder_type": "medic", "badge_number": "A1", "team_name": None, "status": "active", "last_known_latitude": None, "last_known_longitude": None}

    async def get_responder_team(self, user_id):
        return self.__class__.team_lookup

    async def get_responder_detail(self, user_id):
        return self.__class__.profile_lookup


class DummyUserRepository:
    existing_user = None

    def __init__(self, *_args, **_kwargs):
        pass

    async def get_by_email(self, email):
        return self.__class__.existing_user


@pytest.fixture(autouse=True)
def stub_repositories(monkeypatch):
    DummyResponderRepository.reset()
    DummyUserRepository.existing_user = None
    monkeypatch.setattr(responders, "ResponderRepository", DummyResponderRepository)
    monkeypatch.setattr(responders, "UserRepository", DummyUserRepository)
    yield DummyResponderRepository


@pytest.fixture
def responders_app():
    app = FastAPI()
    app.include_router(responders.router)
    app.include_router(responders.responder_router)

    async def _db():
        yield object()

    commander = SimpleNamespace(
        user_id=uuid4(),
        role=SimpleNamespace(name="commander"),
    )

    async def _current_user():
        return commander

    app.dependency_overrides[responders.get_db] = _db
    app.dependency_overrides[dependencies.get_current_user] = _current_user
    app.dependency_overrides[responders.RoleChecker] = lambda *_args, **_kwargs: commander
    return app


@pytest_asyncio.fixture
async def client(responders_app):
    transport = ASGITransport(app=responders_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_create_team_returns_defaults(client, stub_repositories):
    payload = {"name": "Bravo", "team_type": "medic", "status": "available"}
    response = await client.post("/commander/teams", json=payload)
    body = response.json()
    assert response.status_code == 200
    assert body["member_count"] == 0


@pytest.mark.asyncio
async def test_list_teams_proxies_repository(client, stub_repositories):
    stub_repositories.teams_response = [{"team_id": str(uuid4()), "name": "Alpha", "team_type": "fire", "status": "available", "member_count": 1, "current_latitude": None, "current_longitude": None}]
    response = await client.get("/commander/teams")
    assert response.status_code == 200
    assert response.json()[0]["name"] == "Alpha"


@pytest.mark.asyncio
async def test_create_responder_rejects_duplicate_email(client, monkeypatch):
    DummyUserRepository.existing_user = SimpleNamespace(user_id=uuid4())
    payload = {
        "email": "duplicate@example.com",
        "full_name": "Dup",
        "responder_type": "medic",
        "badge_number": "B1",
    }
    response = await client.post("/commander/responders", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_create_responder_handles_exception(client, monkeypatch):
    async def boom(*_args, **_kwargs):
        raise RuntimeError("fail")
    monkeypatch.setattr(responders, "ResponderRepository", lambda *_args, **_kwargs: SimpleNamespace(create_responder=boom))
    payload = {
        "email": "err@example.com",
        "full_name": "Err",
        "responder_type": "medic",
        "badge_number": "B4",
    }
    resp = await client.post("/commander/responders", json=payload)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_responder_returns_payload(client, stub_repositories):
    payload = {
        "email": "new@example.com",
        "full_name": "New Responder",
        "responder_type": "medic",
        "badge_number": "B2",
    }
    response = await client.post("/commander/responders", json=payload)
    assert response.status_code == 200
    assert response.json()["email"] == "new@example.com"


@pytest.mark.asyncio
async def test_list_responders_passes_filters(client, stub_repositories):
    stub_repositories.responders_response = [{"user_id": str(uuid4()), "full_name": "R1", "email": "r1@example.com", "responder_type": "medic", "badge_number": "B1", "team_name": None, "status": "active", "last_known_latitude": None, "last_known_longitude": None}]
    response = await client.get("/commander/responders")
    assert response.status_code == 200
    assert response.json()[0]["full_name"] == "R1"


@pytest.mark.asyncio
async def test_update_responder_returns_404_when_missing(client, stub_repositories):
    stub_repositories.update_response = None
    response = await client.patch(f"/commander/responders/{uuid4()}", json={"status": "suspended"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_responder_returns_payload(client, stub_repositories):
    stub_repositories.update_response = {"user_id": str(uuid4()), "full_name": "Updated", "email": "u@example.com", "responder_type": "medic", "badge_number": "B3", "team_name": None, "status": "active", "last_known_latitude": None, "last_known_longitude": None}
    response = await client.patch(f"/commander/responders/{uuid4()}", json={"status": "active"})
    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated"


@pytest.mark.asyncio
async def test_delete_responder_returns_404_when_missing(client, stub_repositories):
    stub_repositories.deleted_responder = "missing"
    response = await client.delete(f"/commander/responders/{uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_responder_accepts_commanders(client, stub_repositories):
    target = uuid4()
    response = await client.delete(f"/commander/responders/{target}")
    assert response.status_code == 200
    assert stub_repositories.deleted_responder == target


@pytest.mark.asyncio
async def test_delete_team_unassigns_members(client, stub_repositories):
    team_id = uuid4()
    response = await client.delete(f"/commander/teams/{team_id}")
    assert response.status_code == 200
    assert stub_repositories.deleted_team == team_id


@pytest.mark.asyncio
async def test_delete_team_returns_404_when_missing(client, stub_repositories):
    stub_repositories.deleted_team = "missing"
    response = await client.delete(f"/commander/teams/{uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_assign_responder_to_team_returns_payload(client, stub_repositories):
    user_id = uuid4()
    team_id = uuid4()
    response = await client.post(f"/commander/teams/{team_id}/responders/{user_id}")
    assert response.status_code == 200
    assert stub_repositories.assigned == (user_id, team_id)


@pytest.mark.asyncio
async def test_assign_responder_to_team_handles_missing(client, stub_repositories):
    stub_repositories.assigned = "missing"
    response = await client.post(f"/commander/teams/{uuid4()}/responders/{uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_unassign_responder_from_team(client, stub_repositories):
    resp = await client.delete(f"/commander/teams/{uuid4()}/responders/{uuid4()}")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_unassign_responder_not_found(client, stub_repositories):
    stub_repositories.assigned = "missing"
    resp = await client.delete(f"/commander/teams/{uuid4()}/responders/{uuid4()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_my_team_returns_team(monkeypatch, stub_repositories):
    team = SimpleNamespace(team_id=uuid4(), name="MyTeam", team_type="medic", status="available", responder_profiles=[])
    stub_repositories.team_lookup = team

    app = FastAPI()
    app.include_router(responders.responder_router)

    async def _db():
        yield object()

    user = SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="responder"))

    async def _current_user():
        return user

    app.dependency_overrides[responders.get_db] = _db
    app.dependency_overrides[dependencies.get_current_user] = _current_user
    app.dependency_overrides[responders.RoleChecker] = lambda *_args, **_kwargs: user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.get("/responders/me/team")
    assert resp.status_code == 200
    assert resp.json()["name"] == "MyTeam"


@pytest.mark.asyncio
async def test_get_my_team_returns_404(monkeypatch, stub_repositories):
    stub_repositories.team_lookup = None
    app = FastAPI()
    app.include_router(responders.responder_router)

    async def _db():
        yield object()

    user = SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="responder"))

    async def _current_user():
        return user

    app.dependency_overrides[responders.get_db] = _db
    app.dependency_overrides[dependencies.get_current_user] = _current_user
    app.dependency_overrides[responders.RoleChecker] = lambda *_args, **_kwargs: user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.get("/responders/me/team")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_my_responder_profile_404(monkeypatch, stub_repositories):
    stub_repositories.profile_lookup = None
    app = FastAPI()
    app.include_router(responders.responder_router)

    async def _db():
        yield object()

    user = SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="responder"))

    async def _current_user():
        return user

    app.dependency_overrides[responders.get_db] = _db
    app.dependency_overrides[dependencies.get_current_user] = _current_user
    app.dependency_overrides[responders.RoleChecker] = lambda *_args, **_kwargs: user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.get("/responders/me")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_my_team_members_404(monkeypatch, stub_repositories):
    stub_repositories.team_lookup = None
    app = FastAPI()
    app.include_router(responders.responder_router)

    async def _db():
        yield object()

    user = SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="responder"))

    async def _current_user():
        return user

    app.dependency_overrides[responders.get_db] = _db
    app.dependency_overrides[dependencies.get_current_user] = _current_user
    app.dependency_overrides[responders.RoleChecker] = lambda *_args, **_kwargs: user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.get("/responders/me/team/members")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_my_responder_profile_success(monkeypatch, stub_repositories):
    user = SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="responder"))
    profile = SimpleNamespace(
        user_id=user.user_id,
        full_name="Res",
        email="r@example.com",
        responder_type="medic",
        badge_number="B",
        status="active",
        team_name=None,
        last_known_latitude=None,
        last_known_longitude=None,
    )

    class StubRepo:
        def __init__(self, *_args, **_kwargs): pass
        async def get_responder_detail(self, _user_id):
            return profile

    monkeypatch.setattr(responders, "ResponderRepository", StubRepo)
    result = await responders.get_my_responder_profile(current_user=user, db=object())
    assert result.full_name == "Res"


@pytest.mark.asyncio
async def test_get_my_team_members_success(monkeypatch, stub_repositories):
    user = SimpleNamespace(user_id=uuid4(), role=SimpleNamespace(name="responder"))
    team = SimpleNamespace(team_id=uuid4(), name="TeamX", responder_profiles=[])
    members = [
        SimpleNamespace(
            user_id=uuid4(),
            full_name="Member",
            email="m@example.com",
            responder_type="medic",
            badge_number="B1",
            team_name="TeamX",
            status="active",
            last_known_latitude=None,
            last_known_longitude=None,
        )
    ]

    class StubRepo:
        def __init__(self, *_args, **_kwargs): pass
        async def get_responder_team(self, *_args, **_kwargs):
            return team
        async def get_all_responders(self, *_args, **_kwargs):
            return members

    monkeypatch.setattr(responders, "ResponderRepository", StubRepo)
    result = await responders.get_my_team_members(current_user=user, db=object())
    assert len(result) == 1
