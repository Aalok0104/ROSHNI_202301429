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

    def __init__(self, *_args, **_kwargs):
        pass

    @classmethod
    def reset(cls):
        cls.created_team = None
        cls.teams_response = []
        cls.responders_response = []
        cls.created_responder = None
        cls.update_response = None

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
