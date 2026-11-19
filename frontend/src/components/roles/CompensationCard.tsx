// EarnKeep - Weekly compensation panel (Character Desk footer; the spec
// calls it the "weekly paycheck panel" — we say compensation, per the
// README's design philosophy). A filling coin jar shows week progress at a glance;
// below it, one row per compensated accountability with tappable day dots
// under a shared M–S header. Dot states: vault ✓ done · kid-color ring +
// halo today · brass pulse overdue · dim future/non-recurring. Brass text
// appears only when the whole week is earned — brass stays scarce
// everywhere else. Fires the confetti moment on a live transition into a
// fully-earned week.
//
// Dot size: the spec draws 22px dots, but today's dot is the kids' primary
// tap for accountabilities and 22px was too small on device (2026-07-12
// sizing fix bumped them to 36px). The 36px touch target is kept on purpose.

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { Divider } from '../shared/Ornate';
import type { Accountability, FamilyMember } from '../../types';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DOW_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Convert JS Date.getDay() (0=Sun) to Python weekday (0=Mon). */
function jsDayToPython(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

interface CompensationCardProps {
  child: FamilyMember;
  compensatedHabits: Accountability[];
}

export const CompensationCard: React.FC<CompensationCardProps> = ({
  child,
  compensatedHabits,
}) => {
  const dailyHabits = useStore((s) => s.dailyHabits);
  const weekInfo = useStore((s) => s.weekInfo);
  const settings = useStore((s) => s.settings);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const triggerConfetti = useStore((s) => s.triggerConfetti);

  const isDoneOn = (habit: Accountability, dateStr: string) =>
    dailyHabits.some(
      (h) =>
        h.accountability_id === habit.id &&
        h.child_id === child.id &&
        h.date === dateStr &&
        h.completed
    );

  let total = 0;
  let doneCount = 0;
  if (weekInfo) {
    for (const habit of compensatedHabits) {
      for (const dateStr of weekInfo.week_dates) {
        const pyDay = jsDayToPython(new Date(dateStr + 'T12:00:00').getDay());
        if (habit.recurrence_days.includes(pyDay)) {
          total++;
          if (isDoneOn(habit, dateStr)) doneCount++;
        }
      }
    }
  }

  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;
  const pay = `$${child.compensation.toFixed(2)}`;
  const payday = DOW_LONG[settings?.compensation_day ?? 6] ?? 'Sunday';

  // The week's own big moment — live transition only, never on load.
  const prevDoneRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (prevDoneRef.current === false && allDone) {
      triggerConfetti(child.id, child.color);
    }
    prevDoneRef.current = allDone;
  }, [allDone, child.id, child.color, triggerConfetti]);

  return (
    <div className="mt-auto flex flex-shrink-0 flex-col gap-2.5">
      <Divider label={allDone ? '🏅 Compensation earned!' : 'Weekly compensation'} />
      <div className="flex items-center gap-3.5">
        {/* Coin jar — an inked glass jar filling with the week's progress */}
        <div className="relative h-[52px] w-11 flex-shrink-0 overflow-hidden rounded-[8px_8px_14px_14px] bg-white/60 shadow-[inset_0_0_0_2px_var(--color-ink)]">
          <div
            className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-done)_70%,#ffffff),var(--color-done))] transition-[height] duration-500 ease-out"
            style={{ height: `${pct}%` }}
          />
          <div className="absolute inset-x-[5px] top-[5px] h-[3px] rounded-full bg-white/80" />
          <div className="absolute bottom-[13px] left-1/2 -translate-x-1/2 text-[16px] leading-none">🪙</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className={allDone ? 'text-[15px] font-extrabold leading-tight text-gold-deep' : 'text-[15px] font-extrabold leading-tight text-ink'}>
            {total === 0
              ? 'No accountabilities this week'
              : allDone
                ? `All done — earning ${pay} ${payday}`
                : `${doneCount} of ${total} done · ${pay} when complete`}
          </div>
        </div>
      </div>

      {compensatedHabits.length > 0 && weekInfo && (
        <>
          {/* Day letters live inside the dots now (one less row to fit). */}
          {compensatedHabits.map((habit) => (
            <div key={habit.id} className="flex items-center gap-2.5">
              <span className="w-6 flex-shrink-0 text-center text-[19px] leading-none">
                {habit.emoji}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-ink">
                {habit.name}
              </span>
              <div className="flex flex-shrink-0 gap-[5px]">
                {weekInfo.week_dates.map((dateStr) => {
                  const pyDay = jsDayToPython(
                    new Date(dateStr + 'T12:00:00').getDay()
                  );
                  const recurs = habit.recurrence_days.includes(pyDay);

                  if (!recurs) {
                    return (
                      <div
                        key={dateStr}
                        className="flex h-9 w-9 items-center justify-center text-ink-soft opacity-30"
                      >
                        ·
                      </div>
                    );
                  }

                  const isDone = isDoneOn(habit, dateStr);
                  const isPast = dateStr < weekInfo.today;
                  const isFuture = dateStr > weekInfo.today;
                  const isToday = dateStr === weekInfo.today;

                  return (
                    <motion.button
                      key={dateStr}
                      onClick={() => {
                        if (isFuture) return;
                        toggleHabit(habit.id, child.id, !isDone, dateStr);
                      }}
                      disabled={isFuture}
                      whileTap={isFuture ? undefined : { scaleX: 1.22, scaleY: 0.78 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 8 }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full p-0 text-[12px] font-black transition-colors duration-150 ${
                        isDone
                          ? 'bg-done text-white shadow-[inset_0_-3px_0_var(--color-done-deep)]'
                          : isPast
                            ? 'animate-[overdue-pulse_1.8s_ease-in-out_infinite] border-2 border-gold bg-gold/20 text-ink'
                            : isToday
                              ? 'border-[3px] bg-white text-ink'
                              : 'cursor-not-allowed border-2 border-ink/20 text-ink-soft opacity-60'
                      }`}
                      style={
                        isToday && !isDone
                          ? {
                              borderColor: child.color,
                              boxShadow: `0 0 16px ${child.color}`,
                            }
                          : undefined
                      }
                    >
                      {isDone ? '✓' : DAY_LABELS[weekInfo.week_dates.indexOf(dateStr)]}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
