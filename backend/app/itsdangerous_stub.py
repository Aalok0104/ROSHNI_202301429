"""
Minimal subset of ``itsdangerous`` used for local development and testing.

This stub avoids the external dependency when network access is restricted.
It provides ``TimestampSigner`` plus the ``BadSignature`` exception so that
Starlette's SessionMiddleware keeps working.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import sys
import time
import types
from typing import Optional


class BadSignature(Exception):
    """Raised when a signed value cannot be verified."""


class TimestampSigner:
    def __init__(self, secret_key: str | bytes, salt: str | bytes = "itsdangerous", sep: str | bytes = ".") -> None:
        self.secret_key = self._to_bytes(secret_key)
        self.salt = self._to_bytes(salt)
        self.sep = self._to_bytes(sep)

    @staticmethod
    def _to_bytes(value: str | bytes) -> bytes:
        return value if isinstance(value, bytes) else value.encode("utf-8")

    def _signature(self, value: bytes, timestamp: bytes) -> bytes:
        payload = self.salt + self.sep + value + self.sep + timestamp
        digest = hmac.new(self.secret_key, payload, hashlib.sha256).digest()
        return base64.urlsafe_b64encode(digest).rstrip(b"=")

    def sign(self, value: str | bytes, timestamp: Optional[int] = None) -> bytes:
        raw = self._to_bytes(value)
        ts = str(int(time.time()) if timestamp is None else int(timestamp)).encode("ascii")
        sig = self._signature(raw, ts)
        return self.sep.join([raw, ts, sig])

    def unsign(self, signed_value: str | bytes, max_age: Optional[int] = None) -> bytes:
        raw_signed = self._to_bytes(signed_value)
        try:
            value, ts, provided_sig = raw_signed.rsplit(self.sep, 2)
        except ValueError as exc:
            raise BadSignature("Malformed signed value") from exc

        expected_sig = self._signature(value, ts)
        if not hmac.compare_digest(provided_sig, expected_sig):
            raise BadSignature("Bad signature")

        if max_age is not None:
            timestamp = int(ts.decode("ascii"))
            if int(time.time()) - timestamp > max_age:
                raise BadSignature("Signature expired")

        return value


def install_stub():
    """Register the stub under the ``itsdangerous`` module namespace."""
    module = types.ModuleType("itsdangerous")
    module.TimestampSigner = TimestampSigner
    module.BadSignature = BadSignature

    exc_module = types.ModuleType("itsdangerous.exc")
    exc_module.BadSignature = BadSignature

    module.exc = exc_module

    sys.modules.setdefault("itsdangerous", module)
    sys.modules.setdefault("itsdangerous.exc", exc_module)
    return module
