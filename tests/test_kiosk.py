"""Tests for the Fully Kiosk settings helper.

Run from the repo root:  python3 -m unittest discover tests

kiosk.py is loaded by path: importing the package would pull in Home
Assistant, which isn't installed on dev machines.
"""

import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "kiosk", Path(__file__).parents[1] / "custom_components" / "earn_keep" / "kiosk.py"
)
kiosk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(kiosk)


class FullyKioskBaseUrlTest(unittest.TestCase):
    def test_no_host_means_disabled(self):
        # Existing installs have no options at all: the announcer must skip.
        for host in (None, "", "   ", "http://"):
            self.assertIsNone(kiosk.fully_kiosk_base_url(host, 2323), host)

    def test_host_and_port(self):
        self.assertEqual(
            kiosk.fully_kiosk_base_url("tablet.local", 2323),
            "http://tablet.local:2323",
        )
        self.assertEqual(
            kiosk.fully_kiosk_base_url(" 192.0.2.5 ", "8080"),
            "http://192.0.2.5:8080",
        )

    def test_missing_or_bad_port_uses_default(self):
        for port in (None, "", "abc", 0, 70000):
            self.assertEqual(
                kiosk.fully_kiosk_base_url("tablet.local", port),
                "http://tablet.local:2323",
                port,
            )

    def test_scheme_and_port_in_host_field_are_tolerated(self):
        self.assertEqual(
            kiosk.fully_kiosk_base_url("http://tablet.local:9999/", 2323),
            "http://tablet.local:9999",
        )
        self.assertEqual(
            kiosk.fully_kiosk_base_url("[2001:db8::1]:9999", 2323),
            "http://[2001:db8::1]:9999",
        )
        self.assertEqual(
            kiosk.fully_kiosk_base_url("[2001:db8::1]", 2323),
            "http://[2001:db8::1]:2323",
        )


if __name__ == "__main__":
    unittest.main()
