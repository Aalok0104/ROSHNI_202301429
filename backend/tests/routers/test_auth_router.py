import asyncio
from datetime import date
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.routers import auth


class StubGoogleClient:
    def __init__(self):
        self.redirect_uri = None
        self.raise_access_error = False
        self.token_payload = {
            "userinfo": {
                "email": "user@example.com",
                "sub": "provider-1",
                "name": "Example User",
                "picture": "http://example.com/pic.png",
            }
        }
        self.fallback_userinfo = None

    async def authorize_redirect(self, request, redirect_uri):
        self.redirect_uri = redirect_uri
        from fastapi.responses import RedirectResponse

        return RedirectResponse(redirect_uri)

    async def authorize_access_token(self, request):
        if self.raise_access_error:
            raise Exception("boom")
        return self.token_payload

    async def userinfo(self, token):
        return self.fallback_userinfo or {}


class StubOAuth:
    def __init__(self):
        self.google = StubGoogleClient()


class DummyUserRepository:
    existing_user = None
    create_return = None
    created_args = None
    update_calls = []
    get_by_id_result = None
    raise_db_error = False
    raise_generic_error = False

    def __init__(self, *_args, **_kwargs):
        pass

    @classmethod
    def reset(cls):
        cls.existing_user = None
        cls.create_return = None
        cls.created_args = None
        cls.update_calls = []
        cls.get_by_id_result = None
        cls.raise_db_error = False
        cls.raise_generic_error = False

    async def get_by_email(self, email):
        if self.__class__.raise_db_error:
            raise SQLAlchemyError("db boom")
        if self.__class__.raise_generic_error:
            raise RuntimeError("generic boom")
        return self.__class__.existing_user

    async def update_provider_id(self, user_id, provider_id):
        if self.__class__.raise_db_error:
            raise SQLAlchemyError("db boom")
        if self.__class__.raise_generic_error:
            raise RuntimeError("generic boom")
        self.__class__.update_calls.append((user_id, provider_id))

    async def create_civilian(self, email, provider_id, full_name):
        if self.__class__.raise_db_error:
            raise SQLAlchemyError("db boom")
        if self.__class__.raise_generic_error:
            raise RuntimeError("generic boom")
        self.__class__.created_args = (email, provider_id, full_name)
        return self.__class__.create_return

    async def get_by_id(self, user_id):
        return self.__class__.get_by_id_result


@pytest.fixture(autouse=True)
def stub_oauth(monkeypatch):
    oauth_stub = StubOAuth()
    monkeypatch.setattr(auth, "oauth", oauth_stub)
    yield oauth_stub


@pytest.fixture(autouse=True)
def stub_repository(monkeypatch):
    DummyUserRepository.reset()
    monkeypatch.setattr(auth, "UserRepository", DummyUserRepository)
    yield DummyUserRepository


@pytest.fixture
def auth_app():
    app = FastAPI()
    app.add_middleware(SessionMiddleware, secret_key="test-secret")
    app.include_router(auth.router)
    yield app
    app.dependency_overrides.clear()


async def _fake_db():
    yield object()


def _make_user(role_name="civilian", provider_id=None):
    return SimpleNamespace(
        user_id=uuid4(),
        email="existing@example.com",
        provider_id=provider_id,
        role=SimpleNamespace(name=role_name),
        profile=None,
        phone_number=None,
    )


def _async_client(app: FastAPI):
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://testserver")


@pytest.mark.asyncio
async def test_login_redirects_to_google(auth_app, stub_oauth):
    async with _async_client(auth_app) as client:
        response = await client.get("/auth/login")

    assert response.status_code == 307
    assert stub_oauth.google.redirect_uri == auth.settings.GOOGLE_REDIRECT_URI


@pytest.mark.asyncio
async def test_auth_callback_links_existing_user(monkeypatch, auth_app, stub_repository, stub_oauth):
    user = _make_user(provider_id=None, role_name="responder")
    stub_repository.existing_user = user
    stub_oauth.google.token_payload = {
        "userinfo": {"email": user.email, "sub": "google-123", "name": "Existing", "picture": "pic"}
    }

    auth_app.dependency_overrides[get_db] = _fake_db
    async with _async_client(auth_app) as client:
        response = await client.get("/auth/callback")

    assert response.status_code == 307
    assert stub_repository.update_calls == [(user.user_id, "google-123")]


@pytest.mark.asyncio
async def test_auth_callback_creates_new_user(auth_app, stub_repository, stub_oauth):
    new_user = _make_user()
    stub_repository.existing_user = None
    stub_repository.create_return = new_user
    stub_oauth.google.token_payload = {
        "userinfo": {"email": "new@example.com", "sub": "google-999", "name": "New User", "picture": "pic"}
    }

    auth_app.dependency_overrides[get_db] = _fake_db
    async with _async_client(auth_app) as client:
        response = await client.get("/auth/callback")

    assert response.status_code == 307
    assert stub_repository.created_args == ("new@example.com", "google-999", "New User")
    assert stub_repository.update_calls == []


@pytest.mark.asyncio
async def test_auth_callback_handles_oauth_errors(auth_app, stub_oauth):
    stub_oauth.google.raise_access_error = True
    auth_app.dependency_overrides[get_db] = _fake_db

    async with _async_client(auth_app) as client:
        response = await client.get("/auth/callback")

    assert response.status_code == 400
    assert response.json()["detail"].startswith("OAuth Error")


@pytest.mark.asyncio
async def test_auth_callback_userinfo_fetch_failure(auth_app, stub_oauth, monkeypatch):
    async def _userinfo_fail(*_args, **_kwargs):
        raise RuntimeError("userinfo error")

    stub_oauth.google.token_payload = {"userinfo": None}
    monkeypatch.setattr(auth.oauth.google, "userinfo", _userinfo_fail)
    auth_app.dependency_overrides[get_db] = _fake_db

    async with _async_client(auth_app) as client:
        response = await client.get("/auth/callback")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_logout_clears_session(auth_app, stub_repository, stub_oauth):
    user = _make_user()
    stub_repository.existing_user = None
    stub_repository.create_return = user
    stub_repository.get_by_id_result = user

    auth_app.dependency_overrides[get_db] = _fake_db
    async with _async_client(auth_app) as client:
        await client.get("/auth/callback")
        resp_me = await client.get("/auth/me")
        assert resp_me.status_code == 200

        logout_response = await client.post("/auth/logout")
        assert logout_response.json()["message"] == "Logged out successfully"

        resp_after_logout = await client.get("/auth/me")
        assert resp_after_logout.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_requires_auth(auth_app):
    auth_app.dependency_overrides[get_db] = _fake_db
    async with _async_client(auth_app) as client:
        response = await client.get("/auth/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_handles_missing_user(auth_app, stub_repository, stub_oauth):
    user = _make_user()
    stub_repository.create_return = user
    stub_repository.get_by_id_result = None

    auth_app.dependency_overrides[get_db] = _fake_db
    async with _async_client(auth_app) as client:
        await client.get("/auth/callback")
        response = await client.get("/auth/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_returns_profile_info(auth_app, stub_repository, stub_oauth):
    user = _make_user(role_name="commander")
    user.phone_number = "12345"
    user.profile = SimpleNamespace(date_of_birth=date(1990, 1, 1))

    stub_repository.create_return = user
    stub_repository.get_by_id_result = user
    stub_oauth.google.token_payload = {
        "userinfo": {"email": user.email, "sub": "google-777", "name": "Commander", "picture": "pic-url"}
    }

    auth_app.dependency_overrides[get_db] = _fake_db
    async with _async_client(auth_app) as client:
        await client.get("/auth/callback")
        response = await client.get("/auth/me")

    assert response.status_code == 200
    payload = response.json()
    assert payload["role"] == "commander"
    assert payload["is_profile_complete"] is True
    assert payload["profile_picture"] == "pic-url"


@pytest.mark.asyncio
async def test_auth_callback_rejects_missing_email(auth_app, stub_oauth):
    stub_oauth.google.token_payload = {"userinfo": {"sub": "google-123"}}
    auth_app.dependency_overrides[get_db] = _fake_db

    async with _async_client(auth_app) as client:
        response = await client.get("/auth/callback")

    assert response.status_code == 400
    assert "email" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_callback_rejects_missing_sub(auth_app, stub_oauth):
    stub_oauth.google.token_payload = {"userinfo": {"email": "missing-sub@example.com"}}
    auth_app.dependency_overrides[get_db] = _fake_db

    async with _async_client(auth_app) as client:
        response = await client.get("/auth/callback")

    assert response.status_code == 400
    assert "provider id" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_callback_handles_db_error(auth_app, stub_repository, stub_oauth):
    user = _make_user(provider_id=None, role_name="responder")
    stub_repository.existing_user = user
    stub_repository.raise_db_error = True
    stub_oauth.google.token_payload = {
        "userinfo": {"email": user.email, "sub": "google-123", "name": "Existing", "picture": "pic"}
    }

    auth_app.dependency_overrides[get_db] = _fake_db
    async with _async_client(auth_app) as client:
        response = await client.get("/auth/callback")

    assert response.status_code == 500
    assert "Database error" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_callback_handles_generic_error(auth_app, stub_repository, stub_oauth):
    new_user = _make_user()
    stub_repository.existing_user = None
    stub_repository.create_return = new_user
    stub_repository.raise_generic_error = True
    stub_oauth.google.token_payload = {
        "userinfo": {"email": "new2@example.com", "sub": "google-888", "name": "New User", "picture": "pic"}
    }

    auth_app.dependency_overrides[get_db] = _fake_db
    async with _async_client(auth_app) as client:
        response = await client.get("/auth/callback")

    assert response.status_code == 500
    assert "Unexpected error" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_callback_raises_when_no_user_created(auth_app, stub_repository, stub_oauth):
    stub_repository.existing_user = None
    stub_repository.create_return = None
    stub_oauth.google.token_payload = {
        "userinfo": {"email": "new3@example.com", "sub": "google-889", "name": "New User", "picture": "pic"}
    }

    auth_app.dependency_overrides[get_db] = _fake_db
    async with _async_client(auth_app) as client:
        response = await client.get("/auth/callback")

    assert response.status_code == 500
    assert "Failed to create" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_callback_defaults_role_on_error(auth_app, stub_repository, stub_oauth):
    class BadRole:
        def __getattr__(self, _):
            raise RuntimeError("role missing")

    user = _make_user()
    user.role = BadRole()
    stub_repository.existing_user = None
    stub_repository.create_return = user
    stub_oauth.google.token_payload = {
        "userinfo": {"email": user.email, "sub": "google-555", "name": "New User", "picture": "pic"}
    }

    auth_app.dependency_overrides[get_db] = _fake_db
    async with _async_client(auth_app) as client:
        response = await client.get("/auth/callback")
        assert response.status_code == 307
        # session should fall back to civilian when role lookup fails
        assert client.cookies.get("session")
