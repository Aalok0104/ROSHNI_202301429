from typing import Dict
from fastapi.testclient import TestClient

from app import models
from app import main as main_module


def test_google_login_redirects(monkeypatch, test_client):
    client, _ = test_client

    async def fake_authorize_redirect(request, redirect_uri):
        assert str(redirect_uri).endswith("/api/auth/google/callback")
        return main_module.RedirectResponse(url="https://accounts.google.com/o/oauth2/auth", status_code=302)

    monkeypatch.setattr(main_module.oauth.google, "authorize_redirect", fake_authorize_redirect)

    response = client.get("/api/auth/google/login", follow_redirects=False)

    assert response.status_code == 302
    assert "accounts.google.com" in response.headers["location"]


def test_google_callback_creates_user_and_session(monkeypatch, test_client):
    client, session = test_client

    async def fake_authorize_access_token(request):
        return {"userinfo": {"email": "login-test@example.com", "name": "Login Test"}}

    monkeypatch.setattr(main_module.oauth.google, "authorize_access_token", fake_authorize_access_token)

    response = client.get("/api/auth/google/callback", follow_redirects=False)
    assert response.status_code == 307  # RedirectResponse default
    assert response.headers["location"] == main_module.frontend_redirect_url

    user = session.query(models.User).filter_by(email="login-test@example.com").one()
    assert user.profile.full_name == "Login Test"
    assert user.roles[0].role.name == main_module.DEFAULT_ROLE_NAME

    session_response = client.get("/api/auth/session")
    payload: Dict[str, Dict[str, str]] = session_response.json()
    assert payload["user"]["email"] == "login-test@example.com"
