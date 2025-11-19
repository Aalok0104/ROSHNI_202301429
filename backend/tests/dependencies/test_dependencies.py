from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException, status

from app import dependencies


class DummyUserRepository:
    """Capture calls made by get_current_user without touching the DB."""

    def __init__(self, db):
        self.__class__.last_called_with = None
        self.__class__.last_db = db

    @classmethod
    def set_next_user(cls, user):
        cls.next_user = user

    async def get_by_id(self, user_id):
        self.__class__.last_called_with = user_id
        return getattr(self.__class__, "next_user", None)


@pytest.fixture(autouse=True)
def patch_user_repository(monkeypatch):
    DummyUserRepository.last_called_with = None
    DummyUserRepository.next_user = None
    DummyUserRepository.last_db = None
    monkeypatch.setattr(dependencies, "UserRepository", DummyUserRepository)
    yield DummyUserRepository


@pytest.mark.asyncio
async def test_get_current_user_returns_user_when_session_valid():
    user_id = uuid4()
    fake_user = SimpleNamespace(user_id=user_id)
    DummyUserRepository.set_next_user(fake_user)

    request = SimpleNamespace(session={"user_id": str(user_id)})
    result = await dependencies.get_current_user(request, db="db")

    assert result is fake_user
    assert DummyUserRepository.last_called_with == user_id
    assert DummyUserRepository.last_db == "db"


@pytest.mark.asyncio
async def test_get_current_user_requires_session_token():
    request = SimpleNamespace(session={})

    with pytest.raises(HTTPException) as exc:
        await dependencies.get_current_user(request, db="db")

    assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc.value.detail == "Not authenticated"


@pytest.mark.asyncio
async def test_get_current_user_clears_stale_session():
    user_id = uuid4()
    DummyUserRepository.set_next_user(None)
    session = {"user_id": str(user_id), "role": "civilian"}

    request = SimpleNamespace(session=session)

    with pytest.raises(HTTPException) as exc:
        await dependencies.get_current_user(request, db="db")

    assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc.value.detail == "User not found"
    assert session == {}  # cleared in-place


def test_role_checker_rejects_missing_role():
    checker = dependencies.RoleChecker(["commander"])
    user = SimpleNamespace(role=None)

    with pytest.raises(HTTPException) as exc:
        checker(user)

    assert exc.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc.value.detail == "User has no role assigned."


def test_role_checker_rejects_unlisted_role():
    checker = dependencies.RoleChecker(["commander"])
    user = SimpleNamespace(role=SimpleNamespace(name="civilian"))

    with pytest.raises(HTTPException) as exc:
        checker(user)

    assert exc.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc.value.detail == "Operation not permitted"
