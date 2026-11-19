"""Tests for admin sessions and PIN throttling.

Run from the repo root:  python3 -m unittest discover tests

admin_auth.py is loaded by path: importing the package would pull in Home
Assistant, which isn't installed on dev machines.
"""

import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "admin_auth", Path(__file__).parents[1] / "custom_components" / "earn_keep" / "admin_auth.py"
)
auth = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(auth)


class Clock:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


class AdminSessionsTest(unittest.TestCase):
    def setUp(self):
        self.clock = Clock()
        self.s = auth.AdminSessions(clock=self.clock)

    def test_right_pin_issues_working_token(self):
        tok = self.s.attempt("4321", "4321")
        self.assertTrue(tok)
        self.assertTrue(self.s.check(tok))

    def test_wrong_pin_no_token(self):
        self.assertIsNone(self.s.attempt("0000", "4321"))

    def test_unknown_or_empty_token_rejected(self):
        self.assertFalse(self.s.check(None))
        self.assertFalse(self.s.check(""))
        self.assertFalse(self.s.check("nope"))

    def test_token_expires_but_use_renews_it(self):
        tok = self.s.attempt("1", "1")
        self.clock.t += auth.SESSION_TTL - 1
        self.assertTrue(self.s.check(tok))  # renewed here
        self.clock.t += auth.SESSION_TTL - 1
        self.assertTrue(self.s.check(tok))
        self.clock.t += auth.SESSION_TTL + 1
        self.assertFalse(self.s.check(tok))

    def test_revoke_and_revoke_all(self):
        a = self.s.attempt("1", "1")
        b = self.s.attempt("1", "1")
        self.s.revoke(a)
        self.assertFalse(self.s.check(a))
        self.assertTrue(self.s.check(b))
        self.s.revoke_all()
        self.assertFalse(self.s.check(b))

    def test_revoke_others_keeps_caller(self):
        a = self.s.attempt("1", "1")
        b = self.s.attempt("1", "1")
        self.s.revoke_others(a)
        self.assertTrue(self.s.check(a))
        self.assertFalse(self.s.check(b))
        self.s.revoke_others(None)
        self.assertFalse(self.s.check(a))

    def test_throttles_after_free_tries_even_for_right_pin(self):
        for _ in range(auth.FREE_TRIES):
            self.assertIsNone(self.s.attempt("0000", "4321"))
        self.assertGreater(self.s.retry_after(), 0)
        self.assertIsNone(self.s.attempt("4321", "4321"))  # locked out
        self.clock.t += auth.LOCKOUT_BASE + 0.1
        self.assertTrue(self.s.attempt("4321", "4321"))
        self.assertEqual(self.s.retry_after(), 0)

    def test_lockout_doubles_and_caps(self):
        for _ in range(auth.FREE_TRIES):
            self.s.attempt("x", "y")
        self.clock.t += auth.LOCKOUT_BASE + 0.1
        self.s.attempt("x", "y")  # 6th wrong
        self.assertAlmostEqual(self.s.retry_after(), auth.LOCKOUT_BASE * 2, places=3)
        for _ in range(30):
            self.clock.t += self.s.retry_after() + 0.1
            self.s.attempt("x", "y")
        self.assertLessEqual(self.s.retry_after(), auth.LOCKOUT_MAX)

    def test_session_cap_drops_oldest(self):
        first = self.s.attempt("1", "1")
        for _ in range(auth.MAX_SESSIONS):
            self.clock.t += 1
            self.s.attempt("1", "1")
        self.assertFalse(self.s.check(first))


if __name__ == "__main__":
    unittest.main()
