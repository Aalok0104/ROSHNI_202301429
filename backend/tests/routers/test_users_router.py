from datetime import date
from types import SimpleNamespace
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.dependencies import get_current_user
from app.routers import users


def _make_profile(name="Test User"):
    return SimpleNamespace(
        full_name=name,
        date_of_birth=date(1990, 1, 1),
        address="123 Main St",
        emergency_contact_name="Jane",
        emergency_contact_phone="555-0102",
    )


def _make_medical_profile(consent=None):
    return SimpleNamespace(
        public_user_code="PUB123",
        blood_group="O+",
        known_allergies="Peanuts",
        chronic_conditions="Asthma",
        current_medications="Inhaler",
        other_medical_notes="Carry inhaler",
        consent_flags=consent or {"share_all": True},
    )


def _make_user(role_id=1):
    return SimpleNamespace(
        user_id=uuid4(),
        email="user@example.com",
        phone_number="+15550001111",
        role_id=role_id,
        profile=_make_profile(),
        medical_profile=_make_medical_profile(),
    )


class DummyUserRepository:
    def __init__(self, _db):
        pass

    @classmethod
    def reset(cls):
        cls.complete_onboarding_calls = []
        cls.profile_updates = []
        cls.medical_updates = []
        cls.location_updates = []
        cls.last_medical_code = None
        cls.medical_lookup_user = None
        cls.deleted = False
        cls.created_commander = None
        cls.commanders = []

    async def complete_onboarding(self, user_id, phone, dob):
        self.__class__.complete_onboarding_calls.append((user_id, phone, dob))
        return SimpleNamespace(user_id=user_id)

    async def update_user_profile(self, user_id, data):
        self.__class__.profile_updates.append((user_id, data))

    async def update_medical_profile(self, user_id, data):
        self.__class__.medical_updates.append((user_id, data))

    async def update_location(self, user_id, lat, lon):
        self.__class__.location_updates.append((user_id, lat, lon))

    async def get_user_by_medical_code(self, code):
        self.__class__.last_medical_code = code
        return self.__class__.medical_lookup_user

    async def create_commander(self, email, full_name, phone_number=None):
        commander = SimpleNamespace(
            user_id=uuid4(),
            email=email,
            phone_number=phone_number,
            profile=SimpleNamespace(full_name=full_name),
        )
        self.__class__.created_commander = commander
        return commander

    async def list_commanders(self):
        return self.__class__.commanders

    async def get_by_id(self, user_id):
        for c in self.__class__.commanders:
            if c.user_id == user_id:
                return c
        return None

    async def update_phone_number(self, user_id, phone_number):
        for c in self.__class__.commanders:
            if c.user_id == user_id:
                c.phone_number = phone_number
                return

    async def delete_user(self, user_id):
        for c in list(self.__class__.commanders):
            if c.user_id == user_id:
                self.__class__.commanders.remove(c)
                self.__class__.deleted = user_id
                return True
        if self.__class__.deleted == "missing":
            return None
        self.__class__.deleted = user_id
        return True


@pytest.fixture(autouse=True)
def stub_repository(monkeypatch):
    DummyUserRepository.reset()
    monkeypatch.setattr(users, "UserRepository", DummyUserRepository)
    yield DummyUserRepository


@pytest.fixture
def stub_user():
    return _make_user()


@pytest.fixture
def users_app(stub_user):
    app = FastAPI()
    app.include_router(users.router)

    async def _db():
        yield object()

    async def _current_user():
        return stub_user

    app.dependency_overrides[users.get_db] = _db
    app.dependency_overrides[get_current_user] = _current_user
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(users_app):
    transport = ASGITransport(app=users_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_complete_onboarding_calls_repository(client, stub_user, stub_repository):
    payload = {"phone_number": "+15559998888", "date_of_birth": "1995-02-01"}
    response = await client.patch("/users/me/onboarding", json=payload)

    assert response.status_code == 200
    assert response.json()["user_id"] == str(stub_user.user_id)
    expected_dob = date.fromisoformat("1995-02-01")
    assert stub_repository.complete_onboarding_calls == [
        (stub_user.user_id, "+15559998888", expected_dob)
    ]


@pytest.mark.asyncio
async def test_get_my_profile_returns_combined_view(client):
    response = await client.get("/users/me/profile")

    assert response.status_code == 200
    payload = response.json()
    assert payload["full_name"] == "Test User"
    assert payload["consent_flags"]["share_all"] is True
    assert payload["public_user_code"] == "PUB123"


@pytest.mark.asyncio
async def test_update_profile_sends_payload_to_repository(client, stub_user, stub_repository):
    response = await client.put(
        "/users/me/profile",
        json={"address": "456 Elm St", "emergency_contact_name": "Sam"},
    )

    assert response.status_code == 200
    assert stub_repository.profile_updates == [
        (
            stub_user.user_id,
            {"address": "456 Elm St", "emergency_contact_name": "Sam"},
        )
    ]


@pytest.mark.asyncio
async def test_update_medical_profile_sends_payload(client, stub_user, stub_repository):
    response = await client.put(
        "/users/me/medical",
        json={"blood_group": "A-", "consent_flags": {"share_all": False}},
    )

    assert response.status_code == 200
    assert stub_repository.medical_updates == [
        (
            stub_user.user_id,
            {"blood_group": "A-", "consent_flags": {"share_all": False}},
        )
    ]


@pytest.mark.asyncio
async def test_update_location_records_coordinates(client, stub_user, stub_repository):
    response = await client.post(
        "/users/me/location",
        json={"latitude": 10.0, "longitude": 20.0},
    )

    assert response.status_code == 200
    assert stub_repository.location_updates == [
        (stub_user.user_id, 10.0, 20.0)
    ]


@pytest.mark.asyncio
async def test_access_medical_data_requires_responder_role(client, stub_user):
    stub_user.role_id = 1
    response = await client.post(
        "/users/access-medical",
        json={"public_user_code": "PUB123"},
    )

    assert response.status_code == 403


def _make_target_user(consent):
    return SimpleNamespace(
        phone_number="+19998887777",
        profile=_make_profile(name="Target User"),
        medical_profile=_make_medical_profile(consent=consent),
    )


@pytest.mark.asyncio
async def test_access_medical_data_returns_sensitive_fields_when_allowed(
    client, stub_user, stub_repository
):
    stub_user.role_id = 2
    stub_repository.medical_lookup_user = _make_target_user(consent={"share_all": True})

    response = await client.post(
        "/users/access-medical",
        json={"public_user_code": "PUB999"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Target User"
    assert body["sensitive_address"] == "123 Main St"
    assert body["sensitive_phone"] == "+19998887777"
    assert stub_repository.last_medical_code == "PUB999"


@pytest.mark.asyncio
async def test_access_medical_data_respects_granular_consent(client, stub_user, stub_repository):
    stub_user.role_id = 3
    consent = {"share_all": False, "allow_address": True}
    stub_repository.medical_lookup_user = _make_target_user(consent=consent)

    response = await client.post(
        "/users/access-medical",
        json={"public_user_code": "PUB123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["full_name"] == "Target User"
    assert payload["sensitive_address"] == "123 Main St"
    assert payload["sensitive_phone"] is None


@pytest.mark.asyncio
async def test_access_medical_data_allows_phone_with_flag(client, stub_user, stub_repository):
    stub_user.role_id = 3
    consent = {"share_all": False, "allow_phone": True}
    stub_repository.medical_lookup_user = _make_target_user(consent=consent)

    response = await client.post(
        "/users/access-medical",
        json={"public_user_code": "PUB123"},
    )

    assert response.status_code == 200
    assert response.json()["sensitive_phone"] == "+19998887777"


@pytest.mark.asyncio
async def test_update_commander_returns_404_when_missing(stub_repository):
    app = FastAPI()
    app.include_router(users.router)

    async def _db():
        yield object()

    async def _current_user():
        return _commander()

    app.dependency_overrides[users.get_db] = _db
    app.dependency_overrides[get_current_user] = _current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.patch(f"/users/commander/commanders/{uuid4()}", json={"phone_number": "+1"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_commander_returns_404_when_missing(stub_repository):
    app = FastAPI()
    app.include_router(users.router)

    async def _db():
        yield object()

    async def _current_user():
        return _commander()

    app.dependency_overrides[users.get_db] = _db
    app.dependency_overrides[get_current_user] = _current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.delete(f"/users/commander/commanders/{uuid4()}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_access_medical_data_returns_404_for_missing_user(client, stub_user, stub_repository):
    stub_user.role_id = 2
    stub_repository.medical_lookup_user = None

    response = await client.post(
        "/users/access-medical",
        json={"public_user_code": "UNKNOWN"},
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_my_account_invokes_repository(client, stub_repository):
    response = await client.delete("/users/me")
    assert response.status_code == 200
    assert stub_repository.deleted is not None


@pytest.mark.asyncio
async def test_delete_my_account_handles_missing(client, stub_repository):
    stub_repository.deleted = "missing"
    response = await client.delete("/users/me")
    assert response.status_code == 404


def _commander(user_id=None):
    return SimpleNamespace(user_id=user_id or uuid4(), role=SimpleNamespace(name="commander"))


def _commander_app(stub_repo, commander=None):
    app = FastAPI()
    app.include_router(users.router)

    async def _db():
        yield object()

    async def _current_user():
        return commander or _commander()

    app.dependency_overrides[users.get_db] = _db
    app.dependency_overrides[get_current_user] = _current_user
    return app


@pytest.mark.asyncio
async def test_create_commander_endpoint_returns_payload(stub_repository):
    app = _commander_app(stub_repository)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.post(
            "/users/commander/commanders",
            json={"email": "cmd@example.com", "full_name": "Cmdr"},
        )
    assert resp.status_code == 200
    assert resp.json()["email"] == "cmd@example.com"


@pytest.mark.asyncio
async def test_list_commanders_endpoint_returns_items(stub_repository):
    commander = _commander()
    stub_repository.commanders = [
        SimpleNamespace(
            user_id=commander.user_id,
            email="c@example.com",
            phone_number=None,
            profile=SimpleNamespace(full_name="Cmd"),
            role_id=3,
        )
    ]
    app = _commander_app(stub_repository, commander)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.get("/users/commander/commanders")
    assert resp.status_code == 200
    assert resp.json()[0]["full_name"] == "Cmd"


@pytest.mark.asyncio
async def test_update_commander_endpoint_updates_profile(stub_repository):
    commander = _commander()
    target = _commander()
    target.email = "target@example.com"
    target.profile = SimpleNamespace(full_name="Target")
    target.phone_number = None
    target.role_id = 3
    stub_repository.commanders = [target]
    app = _commander_app(stub_repository, commander)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.patch(
            f"/users/commander/commanders/{target.user_id}",
            json={"phone_number": "+111", "profile": {"address": "HQ"}},
        )
    assert resp.status_code == 200
    assert resp.json()["phone_number"] == "+111"


@pytest.mark.asyncio
async def test_delete_commander_endpoint_removes_user(stub_repository):
    commander = _commander()
    target = _commander()
    target.role_id = 3
    target.profile = SimpleNamespace(full_name="Del")
    stub_repository.commanders = [target]
    app = _commander_app(stub_repository, commander)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        resp = await ac.delete(f"/users/commander/commanders/{target.user_id}")
    assert resp.status_code == 200
    assert stub_repository.commanders == []
