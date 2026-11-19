// EarnKeep - Habit section (the "MORNING HABITS · N of M" block of a
// Character Desk, per the 2026-09-11 spec handoff). It holds only the
// habits for the current part of the day (ChildColumn picks them).
// One label + one wrapping pill row. Done tiles stay on the board with their
// spring-popped ✓ (the spec's persistent-done treatment), tinted vault; the
// undone ones keep their morning/evening tint. When every tile on the board
// is done, the section's completion fires the app's one big moment —
// confetti plus the "🎉 <Name> finished every morning habit!" toast — on a
// live transition only, never on initial load (a page that loads
// already-complete stays quiet).

import React, { useEffect, useRef } from 'react';
import { useStore } from '../../store';
import type { Accountability, FamilyMember } from '../../types';
import { HabitPill } from './HabitPill';
import { Divider } from '../shared/Ornate';

interface HabitSectionProps {
  habits: Accountability[];
  child: FamilyMember;
  period: 'morning' | 'evening';
}

export const HabitSection: React.FC<HabitSectionProps> = ({ habits, child, period }) => {
  const dailyHabits = useStore((s) => s.dailyHabits);
  const triggerConfetti = useStore((s) => s.triggerConfetti);
  const showToast = useStore((s) => s.showToast);

  const isDone = (a: Accountability) =>
    dailyHabits.some(
      (h) =>
        h.accountability_id === a.id && h.child_id === child.id && h.completed
    );

  const doneCount = habits.filter(isDone).length;
  const allDone = habits.length > 0 && doneCount === habits.length;

  const prevAllDone = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (prevAllDone.current === false && allDone) {
      triggerConfetti(child.id, child.color);
      showToast(`🎉 ${child.name} finished every ${period} habit!`, 'success');
    }
    prevAllDone.current = allDone;
  }, [allDone, child.id, child.color, child.name, period, triggerConfetti, showToast]);

  if (habits.length === 0) return null;

  return (
    <div className="flex flex-shrink-0 flex-col gap-3">
      <Divider label={`${period === 'morning' ? 'Morning' : 'Evening'} habits · ${doneCount} of ${habits.length}`} />
      <div className="flex flex-wrap content-start gap-[9px]">
        {habits.map((habit) => (
          <HabitPill key={habit.id} accountability={habit} child={child} />
        ))}
      </div>
    </div>
  );
};
