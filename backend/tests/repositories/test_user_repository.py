from datetime import date
from uuid import uuid4

import pytest
from geoalchemy2.shape import to_shape

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

    async def refresh(self, instance):
        self._session.refresh(instance)


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
