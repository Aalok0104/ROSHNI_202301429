"""Compatibility shim exposing Team/ResponderProfile under the responder_models module."""
from .responder_management import Team, ResponderProfile

__all__ = ["Team", "ResponderProfile"]
