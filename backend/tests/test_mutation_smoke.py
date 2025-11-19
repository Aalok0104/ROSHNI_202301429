from contextlib import contextmanager
from types import SimpleNamespace
from uuid import uuid4

from sqlalchemy.exc import SQLAlchemyError

from app import database
from app.models.user_family_models import Role, User


def test_model_repr_invocation():
    """Smoke test to make sure at least one mutated function executes per run."""
    role = Role(role_id=1, name="Commander")
    user = User(user_id=uuid4(), role_id=1, email="responder@example.com")

    assert "<Role" in repr(role)
    assert "responder@example.com" in repr(user)


def test_database_extension_guard(monkeypatch):
    """Ensure the helper issues the correct SQL calls for extension setup."""
    captured = []

    class RecordingConnection:
        def execute(self, statement, *_args, **_kwargs):
            captured.append(statement)
            return None

    @contextmanager
    def begin_context():
        yield RecordingConnection()

    dummy_engine = SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))
    dummy_engine.begin = begin_context  # type: ignore[attr-defined]

    monkeypatch.setattr(database, "engine", dummy_engine)
    database._ensure_postgres_extensions()

    commands = [stmt.text for stmt in captured]
    assert commands == [
        'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
        'CREATE EXTENSION IF NOT EXISTS "postgis"',
    ]


def test_database_extension_logs_on_failure(monkeypatch, caplog):
    """Verify failures are logged consistently."""

    class ExplodingConnection:
        def execute(self, *_args, **_kwargs):
            raise SQLAlchemyError("boom")

    @contextmanager
    def begin_context():
        yield ExplodingConnection()

    dummy_engine = SimpleNamespace(dialect=SimpleNamespace(name="postgresql"))
    dummy_engine.begin = begin_context  # type: ignore[attr-defined]

    monkeypatch.setattr(database, "engine", dummy_engine)

    with caplog.at_level("WARNING"):
        database._ensure_postgres_extensions()

    assert "Unable to ensure PostgreSQL extensions: boom" in caplog.text
