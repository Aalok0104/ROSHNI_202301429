from datetime import date
from uuid import uuid4
import secrets

import pytest
from geoalchemy2.shape import to_shape
from sqlalchemy.exc import IntegrityError

from app.models.user_family_models import Role, User, UserMedicalProfile, UserProfile
from app.repositories.user_repository import UserRepository


class AsyncSessionAdapter:
    """Minimal async facade over the synchronous test session."""

    def __init__(self, session):
        self._session = session

    def add(self, instance):
        self._session.add(instance)

    async def execute(self, statement):
        return self._session.execute(statement)

    async def flush(self):
        self._session.flush()

    async def commit(self):
        self._session.commit()

    async def rollback(self):
        self._session.rollback()

    async def refresh(self, instance):
        self._session.refresh(instance)

    async def get(self, model, pk):
        return self._session.get(model, pk)


@pytest.mark.asyncio
async def test_get_by_email_returns_user(db_session):
    async_session = AsyncSessionAdapter(db_session)
    repo = UserRepository(async_session)

    db_session.add(Role(role_id=1, name="Civilian"))
    db_session.add(User(user_id=uuid4(), email="commander@example.com", role_id=1))
    db_session.commit()

    fetched = await repo.get_by_email("commander@example.com")

    assert fetched is not None
    assert fetched.email == "commander@example.com"


@pytest.mark.asyncio
async def test_get_by_id_loads_profile(db_session):
    async_session = AsyncSessionAdapter(db_session)
    repo = UserRepository(async_session)

    db_session.add(Role(role_id=1, name="Commander"))
    user_id = uuid4()
    db_session.add(User(user_id=user_id, email="profile@example.com", role_id=1))
    db_session.add(UserProfile(user_id=user_id, full_name="Profile Person"))
    db_session.add(
        UserMedicalProfile(
            user_id=user_id,
            public_user_code="HELLO1",
            blood_group="A+",
        )
    )
    db_session.commit()

    fetched = await repo.get_by_id(user_id)

    assert fetched is not None
    assert fetched.profile.full_name == "Profile Person"
    assert fetched.medical_profile.public_user_code == "HELLO1"


@pytest.mark.asyncio
async def test_create_civilian_persists_user_and_profile(db_session):
    async_session = AsyncSessionAdapter(db_session)
    repo = UserRepository(async_session)

    db_session.add(Role(role_id=1, name="Civilian"))
    db_session.commit()

    created = await repo.create_civilian(
        email="civilian@example.com",
        provider_id="google-oauth",
        full_name="Civ Vie",
    )

    stored_profile = db_session.get(UserProfile, created.user_id)
    assert stored_profile is not None
    assert stored_profile.full_name == "Civ Vie"
    assert created.email == "civilian@example.com"
    assert created.provider_id == "google-oauth"
    assert created.is_active is True


@pytest.mark.asyncio
async def test_update_provider_id_updates_existing_user(db_session):
    async_session = AsyncSessionAdapter(db_session)
    repo = UserRepository(async_session)

    db_session.add(Role(role_id=1, name="Civilian"))
    user = User(user_id=uuid4(), email="update@example.com", role_id=1)
    db_session.add(user)
    db_session.commit()

    await repo.update_provider_id(user.user_id, "new-provider")
    db_session.refresh(user)

    assert user.provider_id == "new-provider"


@pytest.mark.asyncio
async def test_complete_onboarding_creates_medical_profile(db_session):
    async_session = AsyncSessionAdapter(db_session)
    repo = UserRepository(async_session)

    db_session.add(Role(role_id=1, name="Civilian"))
    user_id = uuid4()
    db_session.add(User(user_id=user_id, email="onboard@example.com", role_id=1))
    db_session.add(UserProfile(user_id=user_id, full_name="On Board"))
    db_session.commit()

    updated = await repo.complete_onboarding(
        user_id=user_id,
        phone="+15551234567",
        dob=date(1990, 1, 1),
    )

    medical = db_session.get(UserMedicalProfile, user_id)
    assert medical is not None
    assert len(medical.public_user_code) == 6
    assert medical.consent_flags == {"share_all": False}
    assert medical.public_user_code == medical.public_user_code.upper()
    assert updated.phone_number == "+15551234567"
    assert updated.profile.date_of_birth == date(1990, 1, 1)


@pytest.mark.asyncio
async def test_complete_onboarding_retries_on_code_collision(db_session, monkeypatch):
    async_session = AsyncSessionAdapter(db_session)
    repo = UserRepository(async_session)

    db_session.add(Role(role_id=1, name="Civilian"))
    # Existing user with a specific code to collide with
    existing_user = User(user_id=uuid4(), email="existing@example.com", role_id=1)
    db_session.add(existing_user)
    db_session.add(UserProfile(user_id=existing_user.user_id, full_name="Existing"))
    db_session.add(UserMedicalProfile(user_id=existing_user.user_id, public_user_code="DUP123"))
    db_session.commit()

    # New user to onboard
    user_id = uuid4()
    db_session.add(User(user_id=user_id, email="new@example.com", role_id=1))
    db_session.add(UserProfile(user_id=user_id, full_name="New User"))
    db_session.commit()

    # Force first attempt to collide, second to succeed
    codes = iter(["DUP123", "NEW456"])
    monkeypatch.setattr(secrets, "token_hex", lambda _n=3: next(codes))

    updated = await repo.complete_onboarding(
        user_id=user_id,
        phone="+15550000000",
        dob=date(1995, 5, 5),
    )

    assert updated.phone_number == "+15550000000"
    med = db_session.get(UserMedicalProfile, user_id)
    assert med.public_user_code == "NEW456"


@pytest.mark.asyncio
async def test_update_user_profile_ignores_none_values(db_session):
    async_session = AsyncSessionAdapter(db_session)
    repo = UserRepository(async_session)

    db_session.add(Role(role_id=1, name="Civilian"))
    user_id = uuid4()
    db_session.add(User(user_id=user_id, email="profile2@example.com", role_id=1))
    db_session.add(
        UserProfile(
            user_id=user_id,
            full_name="Original",
            address="Old Address",
        )
    )
    db_session.commit()

    await repo.update_user_profile(
        user_id=user_id,
        data={"full_name": None, "address": "New Address"},
    )

    profile = db_session.get(UserProfile, user_id)
    assert profile.full_name == "Original"
    assert profile.address == "New Address"


@pytest.mark.asyncio
async def test_delete_user_returns_none_when_missing(db_session):
    repo = UserRepository(AsyncSessionAdapter(db_session))
    assert await repo.delete_user(uuid4()) is None


@pytest.mark.asyncio
async def test_delete_user_removes_record(db_session):
    db_session.add(Role(role_id=1, name="Civilian"))
    db_session.commit()
    user_id = uuid4()
    user = User(user_id=user_id, email="delete@example.com", role_id=1)
    db_session.add(user)
    db_session.commit()

    repo = UserRepository(AsyncSessionAdapter(db_session))
    assert await repo.delete_user(user_id) is True
    assert db_session.query(User).filter_by(user_id=user_id).count() == 0


@pytest.mark.asyncio
async def test_update_phone_number_updates_user(db_session):
    db_session.add(Role(role_id=1, name="Civilian"))
    db_session.commit()
    user = User(user_id=uuid4(), email="phone@example.com", role_id=1)
    db_session.add(user)
    db_session.commit()

    repo = UserRepository(AsyncSessionAdapter(db_session))
    await repo.update_phone_number(user.user_id, "+1999")
    db_session.refresh(user)
    assert user.phone_number == "+1999"


@pytest.mark.asyncio
async def test_create_and_list_commanders(db_session):
    repo = UserRepository(AsyncSessionAdapter(db_session))
    db_session.add(Role(role_id=3, name="commander"))
    db_session.commit()
    created = await repo.create_commander("cmd@example.com", "Commander Name", "+1222")
    assert created.role_id == 3
    commanders = await repo.list_commanders()
    assert any(c.email == "cmd@example.com" for c in commanders)


@pytest.mark.asyncio
async def test_update_medical_profile_ignores_none_values(db_session):
    async_session = AsyncSessionAdapter(db_session)
    repo = UserRepository(async_session)

    db_session.add(Role(role_id=1, name="Civilian"))
    user_id = uuid4()
    db_session.add(User(user_id=user_id, email="med@example.com", role_id=1))
    db_session.add(
        UserMedicalProfile(
            user_id=user_id,
            public_user_code="ABCDEF",
            blood_group="O+",
            known_allergies="Dust",
        )
    )
    db_session.commit()

    await repo.update_medical_profile(
        user_id=user_id,
        data={"blood_group": None, "known_allergies": "Pollen"},
    )

    medical = db_session.get(UserMedicalProfile, user_id)
    assert medical.blood_group == "O+"
    assert medical.known_allergies == "Pollen"


@pytest.mark.asyncio
async def test_update_location_sets_geometry(db_session):
    async_session = AsyncSessionAdapter(db_session)
    repo = UserRepository(async_session)

    db_session.add(Role(role_id=1, name="Civilian"))
    user = User(user_id=uuid4(), email="loc@example.com", role_id=1)
    db_session.add(user)
    db_session.commit()

    await repo.update_location(user.user_id, lat=12.34, lon=56.78)
    db_session.refresh(user)

    assert user.last_location_at is not None
    point = to_shape(user.last_known_location)
    assert point.y == pytest.approx(12.34)
    assert point.x == pytest.approx(56.78)


@pytest.mark.asyncio
async def test_get_user_by_medical_code_returns_user(db_session):
    async_session = AsyncSessionAdapter(db_session)
    repo = UserRepository(async_session)

    db_session.add(Role(role_id=1, name="Civilian"))
    user_id = uuid4()
    db_session.add(User(user_id=user_id, email="code@example.com", role_id=1))
    db_session.add(UserProfile(user_id=user_id, full_name="Code Person"))
    db_session.add(
        UserMedicalProfile(
            user_id=user_id,
            public_user_code="XYZ123",
            blood_group="A+",
        )
    )
    db_session.commit()

    fetched = await repo.get_user_by_medical_code("XYZ123")

    assert fetched is not None
    assert fetched.medical_profile.public_user_code == "XYZ123"
    assert fetched.profile.full_name == "Code Person"
