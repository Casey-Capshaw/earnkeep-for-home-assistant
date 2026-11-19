# EarnKeep - Combo tracker
# Decides which sound effect a check-off earns. When a kid checks several
# things in a row the sounds climb a five-step ladder (higher notes, more
# layers), and finishing the whole set plays a finale.
#
# Pure Python on purpose (no Home Assistant imports) so tests/test_combo.py
# can exercise it directly. The audition page (scripts/sfx/audition.html)
# mirrors these rules in JS.

from __future__ import annotations

import time
from collections.abc import Callable, Hashable

# A kid's next check counts as "in a row" if it lands within this many
# seconds of their previous one. Every check restarts the clock.
COMBO_WINDOW_SECONDS = 10.0
# The ladder has five rungs; a longer run stays on the top one.
COMBO_MAX_LEVEL = 5

# Files in sounds/, rendered by scripts/sfx/synth.py (see sounds/SOURCES.md).
SFX_HABITS_FINALE = "sfx_habits_finale.mp3"
SFX_PAYCHECK_FINALE = "sfx_paycheck_finale.mp3"
SFX_UNDO = "sfx_undo.mp3"
SFX_DEPOSIT = "sfx_deposit.mp3"


def pick_sfx(*, paid: bool, level: int, finale: bool) -> str:
    """Sound for one completion.

    paid:   a compensated task (richer strum-and-coins) vs. a daily habit.
    level:  1..COMBO_MAX_LEVEL from ComboTracker.complete().
    finale: this check finished the set (habit board / week's paycheck).
    """
    if finale:
        return SFX_PAYCHECK_FINALE if paid else SFX_HABITS_FINALE
    level = max(1, min(level, COMBO_MAX_LEVEL))
    return f"sfx_{'task' if paid else 'habit'}_{level}.mp3"


class ComboTracker:
    """Per-kid count of distinct items checked in quick succession.

    In-memory only: a combo is a seconds-long thing, so it never needs to
    survive a restart.
    """

    def __init__(
        self,
        window: float = COMBO_WINDOW_SECONDS,
        max_level: int = COMBO_MAX_LEVEL,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._window = window
        self._max_level = max_level
        self._clock = clock
        # child_id -> (time of last completion, items counted in this combo)
        self._runs: dict[str, tuple[float, set[Hashable]]] = {}

    def _live_items(self, child_id: str, now: float) -> set[Hashable] | None:
        run = self._runs.get(child_id)
        if run is None or now - run[0] > self._window:
            return None
        return run[1]

    def complete(self, child_id: str, item: Hashable) -> int:
        """Record a check-off and return its combo level (1..max_level).

        Re-checking an item already counted in this combo keeps the combo
        alive but doesn't climb, so toggling one tile can't farm the ladder.
        """
        now = self._clock()
        items = self._live_items(child_id, now)
        if items is None:
            items = set()
        items.add(item)
        self._runs[child_id] = (now, items)
        return min(len(items), self._max_level)

    def undo(self, child_id: str, item: Hashable) -> None:
        """Take an un-checked item back out of the kid's combo.

        Steps the combo down one and does not restart the clock.
        """
        items = self._live_items(child_id, self._clock())
        if items is not None:
            items.discard(item)
