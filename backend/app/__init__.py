"""Ensure shared environment variables are loaded before other modules."""
from .env import load_environment as _load_environment

_load_environment()

__all__ = []
