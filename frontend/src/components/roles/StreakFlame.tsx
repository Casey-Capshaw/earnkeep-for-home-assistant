// EarnKeep - Streak flame
// Ambient status light, not a mascot — sits under the child's name in the
// Character Desk header as "N-day streak" (Claude Design 2026-07-12).
//
// The backend only confirms a streak at the nightly reset (see the
// finalized rules in Initiatives/earnkeep.md — no live backend write,
// to avoid a dropped event wrongly zeroing a real streak). This
// component fakes the "live" feel purely client-side: if every daily
// habit is already checked off today, it shows confirmed+1 as a preview.
// Nothing is persisted by this optimism — the backend confirms for real
// that night regardless of what's displayed here.

import React from 'react';
import { useStore } from '../../store';
import type { Accountability, FamilyMember } from '../../types';

interface StreakFlameProps {
  child: FamilyMember;
  dailyAccountabilities: Accountability[];
}

export const StreakFlame: React.FC<StreakFlameProps> = ({
  child,
  dailyAccountabilities,
}) => {
  const dailyHabits = useStore((s) => s.dailyHabits);

  const allDoneToday =
    dailyAccountabilities.length > 0 &&
    dailyAccountabilities.every((a) =>
      dailyHabits.some(
        (h) =>
          h.accountability_id === a.id &&
          h.child_id === child.id &&
          h.completed
      )
    );

  // Defensive: live data can predate current_streak entirely (HA restart
  // mid-deploy, or this frontend reaching the tablet before the Phase 5
  // backend does) — undefined, not just 0.
  const displayStreak = (child.current_streak ?? 0) + (allDoneToday ? 1 : 0);

  if (displayStreak === 0) return null;

  return (
    <div className="flex flex-shrink-0 items-center gap-1.5">
      <div
        className="h-4 w-3 flex-shrink-0 animate-[flame-flicker_2.6s_ease-in-out_infinite] rounded-[50%_50%_50%_50%/65%_65%_35%_35%]"
        style={{
          background: `radial-gradient(circle at 50% 70%, #FFF6C0, ${child.color} 60%, #E0473F)`,
          boxShadow: `0 0 10px ${child.color}`,
        }}
      />
      <span className="font-body text-[15px] font-extrabold text-ink-soft">
        {displayStreak}-day streak
      </span>
    </div>
  );
};
