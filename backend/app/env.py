"""
Centralized environment loader for the backend.

`.env` and `.env.local` files live one directory above ``backend/``.
We load `.env` first and then override with `.env.local` when present,
optionally falling back to per-backend copies if they exist.
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv

_APP_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _APP_DIR.parent
_PROJECT_ROOT = _BACKEND_DIR.parent
_WORKSPACE_ROOT = _PROJECT_ROOT.parent
_ENV_LOADED = False


def _load_if_exists(path: Path, *, override: bool) -> None:
    if path.exists():
        load_dotenv(path, override=override)


def _load_directory(directory: Path | None) -> None:
    if not directory:
        return
    _load_if_exists(directory / ".env", override=False)
    _load_if_exists(directory / ".env.local", override=True)


def load_environment(extra_paths: Iterable[Path] | None = None) -> None:
    """Load environment variables once for the process."""

    global _ENV_LOADED
    if _ENV_LOADED:
        return

    seen: set[Path] = set()
    for directory in (_WORKSPACE_ROOT, _PROJECT_ROOT, _BACKEND_DIR):
        if directory and directory not in seen:
            seen.add(directory)
            _load_directory(directory)

    if extra_paths:
        for path in extra_paths:
            _load_if_exists(path, override=True)

    _ENV_LOADED = True


__all__ = ["load_environment"]
