# EarnKeep - admin sessions
#
# The admin PIN never leaves the server. A correct PIN earns a short-lived
# random token that the panel sends with every admin command; wrong guesses
# are throttled so a 4-digit PIN can't be brute-forced through the API.
#
# Deliberately free of Home Assistant imports so it can be unit-tested
# without HA installed (see tests/test_admin_auth.py).

from __future__ import annotations

import hmac
import secrets
import time
from typing import Callable

SESSION_TTL = 30 * 60  # seconds; sliding — every admin command renews it
MAX_SESSIONS = 16
FREE_TRIES = 5  # wrong PINs allowed before throttling starts
LOCKOUT_BASE = 30  # seconds; doubles with each further wrong PIN
LOCKOUT_MAX = 15 * 60


def pin_matches(entered: str, stored: str) -> bool:
    """Constant-time PIN comparison."""
    return hmac.compare_digest(entered.encode(), stored.encode())


class AdminSessions:
    """Issues, checks and expires admin tokens; throttles wrong PINs."""

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._tokens: dict[str, float] = {}  # token -> expiry
        self._failures = 0
        self._locked_until = 0.0

    # --- PIN attempts -------------------------------------------------

    def retry_after(self) -> float:
        """Seconds until another PIN attempt is allowed (0 = now)."""
        return max(0.0, self._locked_until - self._clock())

    def attempt(self, entered: str, stored: str) -> str | None:
        """Check a PIN. Returns a new token, or None if wrong or throttled."""
        if self.retry_after() > 0:
            return None
        if pin_matches(entered, stored):
            self._failures = 0
            self._locked_until = 0.0
            return self._issue()
        self._failures += 1
        if self._failures >= FREE_TRIES:
            extra = self._failures - FREE_TRIES
            self._locked_until = self._clock() + min(LOCKOUT_MAX, LOCKOUT_BASE * 2**extra)
        return None

    # --- tokens -------------------------------------------------------

    def _issue(self) -> str:
        self._prune()
        if len(self._tokens) >= MAX_SESSIONS:
            oldest = min(self._tokens, key=self._tokens.get)
            del self._tokens[oldest]
        token = secrets.token_urlsafe(24)
        self._tokens[token] = self._clock() + SESSION_TTL
        return token

    def check(self, token: str | None) -> bool:
        """True if the token is live; renews it."""
        if not token:
            return False
        self._prune()
        for known in self._tokens:
            if hmac.compare_digest(known, token):
                self._tokens[known] = self._clock() + SESSION_TTL
                return True
        return False

    def revoke(self, token: str | None) -> None:
        if token:
            self._tokens.pop(token, None)

    def revoke_others(self, keep: str | None) -> None:
        """Log out every session except `keep` (after the PIN changes)."""
        expiry = self._tokens.get(keep) if keep else None
        self._tokens.clear()
        if keep and expiry is not None:
            self._tokens[keep] = expiry

    def revoke_all(self) -> None:
        """Log every session out (e.g. after the PIN changes)."""
        self._tokens.clear()

    def _prune(self) -> None:
        now = self._clock()
        for t in [t for t, exp in self._tokens.items() if exp <= now]:
            del self._tokens[t]
