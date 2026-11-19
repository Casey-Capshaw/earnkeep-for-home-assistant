"""Tests for the sound-effect combo rules.

Run from the repo root:  python3 -m unittest discover tests

combo.py is loaded by path: importing the package would pull in Home
Assistant, which isn't installed on dev machines.
"""

import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "combo", Path(__file__).parents[1] / "custom_components" / "earn_keep" / "combo.py"
)
combo = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(combo)

SOUNDS_DIR = Path(__file__).parents[1] / "custom_components" / "earn_keep" / "sounds"


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


class ComboTrackerTest(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()
        self.combo = combo.ComboTracker(window=10, max_level=5, clock=self.clock)

    def test_quick_checks_climb_one_level_each(self):
        levels = []
        for i in range(4):
            levels.append(self.combo.complete("kid", f"habit{i}"))
            self.clock.now += 3
        self.assertEqual(levels, [1, 2, 3, 4])

    def test_tops_out_at_max_level(self):
        levels = [self.combo.complete("kid", f"habit{i}") for i in range(8)]
        self.assertEqual(levels, [1, 2, 3, 4, 5, 5, 5, 5])

    def test_a_pause_longer_than_the_window_starts_over(self):
        self.combo.complete("kid", "a")
        self.combo.complete("kid", "b")
        self.clock.now += 10.5
        self.assertEqual(self.combo.complete("kid", "c"), 1)

    def test_a_check_exactly_at_the_window_edge_still_counts(self):
        self.combo.complete("kid", "a")
        self.clock.now += 10
        self.assertEqual(self.combo.complete("kid", "b"), 2)

    def test_every_check_restarts_the_clock(self):
        self.combo.complete("kid", "a")
        self.clock.now += 8
        self.combo.complete("kid", "b")
        self.clock.now += 8  # 16 s after the first, 8 s after the second
        self.assertEqual(self.combo.complete("kid", "c"), 3)

    def test_each_kid_has_their_own_combo(self):
        self.combo.complete("owen", "a")
        self.combo.complete("owen", "b")
        self.assertEqual(self.combo.complete("hazel", "a"), 1)
        self.assertEqual(self.combo.complete("owen", "c"), 3)

    def test_undo_steps_back_and_recheck_does_not_climb(self):
        self.combo.complete("kid", "a")
        self.combo.complete("kid", "b")
        self.combo.undo("kid", "b")
        self.assertEqual(self.combo.complete("kid", "b"), 2)

    def test_rechecking_a_counted_item_does_not_climb(self):
        self.combo.complete("kid", "a")
        self.assertEqual(self.combo.complete("kid", "a"), 1)

    def test_undo_does_not_restart_the_clock(self):
        self.combo.complete("kid", "a")
        self.combo.complete("kid", "b")
        self.clock.now += 9
        self.combo.undo("kid", "b")
        self.clock.now += 2  # 11 s since the last check
        self.assertEqual(self.combo.complete("kid", "c"), 1)

    def test_undo_with_no_combo_is_harmless(self):
        self.combo.undo("kid", "a")
        self.assertEqual(self.combo.complete("kid", "a"), 1)

    def test_same_task_on_different_days_counts_separately(self):
        self.combo.complete("kid", ("dishes", "2026-11-10"))
        self.assertEqual(self.combo.complete("kid", ("dishes", "2026-11-11")), 2)


class PickSfxTest(unittest.TestCase):
    def test_habit_and_task_ladders(self):
        self.assertEqual(combo.pick_sfx(paid=False, level=1, finale=False), "sfx_habit_1.mp3")
        self.assertEqual(combo.pick_sfx(paid=True, level=4, finale=False), "sfx_task_4.mp3")

    def test_level_is_clamped(self):
        self.assertEqual(combo.pick_sfx(paid=False, level=9, finale=False), "sfx_habit_5.mp3")
        self.assertEqual(combo.pick_sfx(paid=False, level=0, finale=False), "sfx_habit_1.mp3")

    def test_finale_wins_over_level(self):
        self.assertEqual(combo.pick_sfx(paid=False, level=2, finale=True), combo.SFX_HABITS_FINALE)
        self.assertEqual(combo.pick_sfx(paid=True, level=1, finale=True), combo.SFX_PAYCHECK_FINALE)

    def test_every_sound_the_code_can_ask_for_is_shipped(self):
        wanted = {combo.SFX_UNDO, combo.SFX_DEPOSIT}
        for paid in (False, True):
            wanted.add(combo.pick_sfx(paid=paid, level=1, finale=True))
            for level in range(1, combo.COMBO_MAX_LEVEL + 1):
                wanted.add(combo.pick_sfx(paid=paid, level=level, finale=False))
        shipped = {p.name for p in SOUNDS_DIR.glob("*.mp3")}
        self.assertEqual(wanted, shipped)


if __name__ == "__main__":
    unittest.main()
