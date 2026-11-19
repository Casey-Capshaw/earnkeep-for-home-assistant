"""Tests for the backend Sprite file check.

Run from the repo root:  python3 -m unittest discover tests
sprite_check.py is loaded by path (importing the package needs Home Assistant).
"""

import importlib
import importlib.util
import sys
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "sprite_check", Path(__file__).parents[1] / "custom_components" / "earn_keep" / "sprite_check.py"
)
sc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sc)

OK = {"format": "earnkeep-sprite", "version": 1, "hair": {"color": "black"}}


class SpriteCheckTest(unittest.TestCase):
    def test_none_clears(self):
        self.assertIsNone(sc.check_sprite(None))

    def test_valid(self):
        self.assertIsNone(sc.check_sprite(OK))

    def test_unknown_keys_kept(self):
        self.assertIsNone(sc.check_sprite(dict(OK, somethingNew={"a": 1})))

    def test_not_object(self):
        self.assertEqual(sc.check_sprite([1]), "a character must be a JSON object")

    def test_wrong_format(self):
        self.assertEqual(sc.check_sprite({"format": "x", "version": 1}), 'format must be "earnkeep-sprite"')

    def test_version(self):
        self.assertEqual(sc.check_sprite({"format": "earnkeep-sprite", "version": 2}), "version 2 is newer than this EarnKeep reads (1)")
        self.assertEqual(sc.check_sprite({"format": "earnkeep-sprite", "version": "1"}), "version must be a whole number")
        self.assertEqual(sc.check_sprite({"format": "earnkeep-sprite", "version": 0}), "version must be 1")
        self.assertEqual(sc.check_sprite({"format": "earnkeep-sprite", "version": -1}), "version must be 1")

    def test_size(self):
        big = dict(OK, label="x" * 20000)
        self.assertEqual(sc.check_sprite(big), "a character file must be under 16 KB")


class FamilyMemberSpriteTest(unittest.TestCase):
    def test_round_trip(self):
        spec = importlib.util.spec_from_file_location(
            "models", Path(__file__).parents[1] / "custom_components" / "earn_keep" / "models.py"
        )
        models = importlib.util.module_from_spec(spec)
        # Python 3.12's dataclass looks the module up in sys.modules
        sys.modules[spec.name] = models
        self.addCleanup(sys.modules.pop, spec.name, None)
        spec.loader.exec_module(models)
        base = {"id": "a", "name": "A", "color": "#fff", "emoji": "x"}
        m = models.FamilyMember.from_dict(dict(base, sprite=OK))
        self.assertEqual(models.FamilyMember.from_dict(m.to_dict()).sprite, OK)
        self.assertIsNone(models.FamilyMember.from_dict(dict(base, id="b", name="B")).sprite)
