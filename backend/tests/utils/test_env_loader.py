from pathlib import Path

import pytest

from app import env


def test_load_if_exists_invokes_dotenv(monkeypatch, tmp_path):
    called = []

    def fake_load_dotenv(path, override):
        called.append((path, override))

    monkeypatch.setattr(env, "load_dotenv", fake_load_dotenv)

    existing = tmp_path / ".env"
    existing.write_text("KEY=value")
    missing = tmp_path / ".env.local"

    env._load_if_exists(existing, override=True)
    env._load_if_exists(missing, override=False)

    assert called == [(existing, True)]


def test_load_environment_priority(monkeypatch, tmp_path):
    workspace_root = tmp_path / "workspace"
    project_root = workspace_root / "project"
    backend_dir = project_root / "backend"
    backend_dir.mkdir(parents=True)

    (workspace_root / ".env").write_text("WS=1")
    (workspace_root / ".env.local").write_text("WS=2")
    (project_root / ".env").write_text("A=1")
    (project_root / ".env.local").write_text("A=2")
    (backend_dir / ".env").write_text("B=1")
    (backend_dir / ".env.local").write_text("B=2")
    extra_file = project_root / ".extra"
    extra_file.write_text("C=3")

    calls = []

    def fake_load_dotenv(path: Path, override: bool):
        calls.append((path, override))

    monkeypatch.setattr(env, "load_dotenv", fake_load_dotenv)
    monkeypatch.setattr(env, "_WORKSPACE_ROOT", workspace_root)
    monkeypatch.setattr(env, "_PROJECT_ROOT", project_root)
    monkeypatch.setattr(env, "_BACKEND_DIR", backend_dir)
    monkeypatch.setattr(env, "_WORKSPACE_ROOT", project_root.parent)
    monkeypatch.setattr(env, "_ENV_LOADED", False)

    env.load_environment(extra_paths=[extra_file])

    assert calls == [
        (workspace_root / ".env", False),
        (workspace_root / ".env.local", True),
        (project_root / ".env", False),
        (project_root / ".env.local", True),
        (backend_dir / ".env", False),
        (backend_dir / ".env.local", True),
        (extra_file, True),
    ]


def test_load_environment_only_runs_once(monkeypatch, tmp_path):
    project_root = tmp_path / "proj"
    backend_dir = project_root / "backend"
    backend_dir.mkdir(parents=True)

    (project_root / ".env").write_text("A=1")

    calls = []

    def fake_load_dotenv(path, override):
        calls.append((path, override))

    monkeypatch.setattr(env, "load_dotenv", fake_load_dotenv)
    monkeypatch.setattr(env, "_PROJECT_ROOT", project_root)
    monkeypatch.setattr(env, "_BACKEND_DIR", backend_dir)
    monkeypatch.setattr(env, "_WORKSPACE_ROOT", project_root.parent)
    monkeypatch.setattr(env, "_ENV_LOADED", False)

    env.load_environment()
    env.load_environment()

    assert calls == [(project_root / ".env", False)]


def test_load_environment_deduplicates_directories(monkeypatch, tmp_path):
    workspace_root = tmp_path / "workspace"
    project_root = workspace_root / "project"
    backend_dir = project_root / "backend"
    backend_dir.mkdir(parents=True)

    calls = []

    def fake_load_directory(directory):
        calls.append(directory)

    monkeypatch.setattr(env, "_load_directory", fake_load_directory)
    monkeypatch.setattr(env, "_WORKSPACE_ROOT", project_root)
    monkeypatch.setattr(env, "_PROJECT_ROOT", project_root)
    monkeypatch.setattr(env, "_BACKEND_DIR", backend_dir)
    monkeypatch.setattr(env, "_ENV_LOADED", False)

    env.load_environment()

    assert calls == [project_root, backend_dir]


def test_load_directory_none_noop(monkeypatch):
    from app import env

    calls = []

    def recorder(*_args, **_kwargs):
        calls.append(True)

    monkeypatch.setattr(env, "load_dotenv", recorder)
    env._load_directory(None)

    assert calls == []
