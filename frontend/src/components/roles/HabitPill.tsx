// EarnKeep - Habit tile (daily, non-compensated items on a Character Desk).
// Layered-world redesign (2026-11-10): a hand-inked chip with weight.
//   press   → squash (wider + shorter) and sink, stiff spring
//   release → spring back with overshoot
//   complete→ knockback hop + wobble that settles, a white-hot hit flash
//             in the kid's color, and a ring of sparks; the ✓ springs in
//   undo    → long-press 600ms on a done tile (progress bar fills), then a
//             stretch-and-settle as it flips back
// Tap to complete, long-press to undo — same touch/mouse handling and the
// same store calls as before; the motion is layered on top. Respects
// prefers-reduced-motion (no squash, no sparks; state still flips).

import React, { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useCalmMotion } from '../../lib/motion';
import { useStore } from '../../store';
import type { Accountability, FamilyMember } from '../../types';

const LONG_PRESS_MS = 600;

/** Mutually exclusive class sets per state (CSS order, not class order,
 * decides conflicts — never let two states' colors coexist). */
const SKIN = {
  morning:
    'bg-[linear-gradient(180deg,#ffffff_0%,color-mix(in_srgb,var(--color-morning)_14%,#ffffff)_100%)] shadow-[inset_0_0_0_2px_var(--color-morning),inset_0_-4px_0_color-mix(in_srgb,var(--color-morning)_45%,#ffffff),0_3px_0_color-mix(in_srgb,var(--color-ink)_14%,transparent)] text-ink',
  evening:
    'bg-[linear-gradient(180deg,#ffffff_0%,color-mix(in_srgb,var(--color-evening)_14%,#ffffff)_100%)] shadow-[inset_0_0_0_2px_var(--color-evening),inset_0_-4px_0_color-mix(in_srgb,var(--color-evening)_45%,#ffffff),0_3px_0_color-mix(in_srgb,var(--color-ink)_14%,transparent)] text-ink',
  done:
    'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-done)_82%,#ffffff)_0%,var(--color-done)_100%)] shadow-[inset_0_0_0_2px_var(--color-done-deep),inset_0_-4px_0_color-mix(in_srgb,var(--color-done-deep)_80%,transparent),0_0_20px_color-mix(in_srgb,var(--color-done)_45%,transparent)] text-white',
};

interface HabitPillProps {
  accountability: Accountability;
  child: FamilyMember;
}

export const HabitPill: React.FC<HabitPillProps> = ({ accountability, child }) => {
  const dailyHabits = useStore((s) => s.dailyHabits);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const reduced = useCalmMotion();
  const controls = useAnimationControls();

  const isDone = dailyHabits.some(
    (h) => h.accountability_id === accountability.id && h.child_id === child.id && h.completed
  );

  const [longPressing, setLongPressing] = useState(false);
  const [hits, setHits] = useState(0); // bumps on each completion → flash + sparks
  const pressStartTime = useRef(0);
  const pressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback(() => {
    if (!reduced) controls.start({ scaleX: 1, scaleY: 1, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 520, damping: 10 } });
  }, [controls, reduced]);

  const clearPress = useCallback(() => {
    setLongPressing(false);
    if (pressTimeout.current) {
      clearTimeout(pressTimeout.current);
      pressTimeout.current = null;
    }
  }, []);

  const onPressStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      pressStartTime.current = Date.now();
      if (!reduced) controls.start({ scaleX: 1.08, scaleY: 0.84, y: 3, transition: { type: 'spring', stiffness: 900, damping: 30 } });

      if (isDone) {
        setLongPressing(true);
        pressTimeout.current = setTimeout(() => {
          setLongPressing(false);
          toggleHabit(accountability.id, child.id, false);
          if (!reduced)
            controls.start({ scaleX: [0.9, 1.05, 1], scaleY: [1.1, 0.96, 1], y: 0, transition: { duration: 0.45 } });
        }, LONG_PRESS_MS);
      }
    },
    [isDone, accountability.id, child.id, toggleHabit, controls, reduced]
  );

  const onPressEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      clearPress();

      const elapsed = Date.now() - pressStartTime.current;
      if (!isDone && elapsed < LONG_PRESS_MS) {
        toggleHabit(accountability.id, child.id, true);
        setHits((n) => n + 1);
        if (!reduced) {
          // knockback hop → overshoot → settle
          controls.start({
            scaleX: [1.08, 0.88, 1.06, 0.99, 1],
            scaleY: [0.84, 1.16, 0.95, 1.01, 1],
            y: [3, -9, 1, 0, 0],
            rotate: [0, -3, 1.5, -0.4, 0],
            transition: { duration: 0.6, times: [0, 0.22, 0.5, 0.75, 1], ease: 'easeOut' },
          });
        }
      } else {
        settle();
      }
    },
    [isDone, accountability.id, child.id, toggleHabit, clearPress, controls, reduced, settle]
  );

  const onCancel = useCallback(() => {
    clearPress();
    settle();
  }, [clearPress, settle]);

  const skin = isDone ? SKIN.done : SKIN[accountability.time_of_day];

  return (
    <motion.div
      animate={controls}
      onTouchStart={onPressStart}
      onTouchEnd={onPressEnd}
      onTouchCancel={onCancel}
      onMouseDown={onPressStart}
      onMouseUp={onPressEnd}
      onMouseLeave={onCancel}
      role="button"
      aria-pressed={isDone}
      style={{ transformOrigin: '50% 100%' }}
      className="relative flex min-h-[46px] cursor-pointer select-none items-center gap-2 py-2 pl-3 pr-4 [touch-action:manipulation]"
    >
      {/* hand-inked body: the uneven border-radius is what reads as drawn */}
      <span
        className={`absolute inset-0 rounded-[255px_22px_225px_22px/22px_225px_22px_255px] transition-[background,box-shadow] duration-150 ${skin}`}
      />

      {/* hit flash — white-hot core bleeding into the kid's color */}
      <AnimatePresence>
        {hits > 0 && !reduced && (
          <motion.span
            key={hits}
            initial={{ opacity: 1, scale: 0.5 }}
            animate={{ opacity: 0, scale: 2.1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="pointer-events-none absolute -inset-2 rounded-full"
            style={{ background: `radial-gradient(closest-side, #ffffff 0%, #ffffffcc 30%, ${child.color}88 55%, transparent 80%)` }}
          />
        )}
      </AnimatePresence>
      {hits > 0 &&
        !reduced &&
        Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2 + 0.2;
          const d = 40 + (i % 3) * 12;
          return (
            <motion.span
              key={`${hits}-${i}`}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1.2 }}
              animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7 - 6, opacity: 0, scale: 0.2 }}
              transition={{ duration: 0.65, ease: [0.15, 0.85, 0.3, 1] }}
              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full bg-white"
              style={{ width: i % 3 ? 5 : 8, height: i % 3 ? 5 : 8, boxShadow: `0 0 10px 3px ${child.color}` }}
            />
          );
        })}

      <span className="relative flex items-center gap-2">
        <AnimatePresence initial={false}>
          {isDone && (
            <motion.span
              initial={{ scale: 0, rotate: -60 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 13 }}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-done"
            >
              ✓
            </motion.span>
          )}
        </AnimatePresence>
        <span className="text-[20px] leading-none">{accountability.emoji}</span>
        <span className="text-[16px] font-extrabold leading-tight">{accountability.name}</span>
      </span>

      {/* Long-press-to-undo progress */}
      <span
        className="absolute bottom-[5px] left-3.5 right-3.5 h-[3px] origin-left rounded-full bg-white"
        style={{
          transform: `scaleX(${longPressing ? 1 : 0})`,
          transition: longPressing ? `transform ${LONG_PRESS_MS}ms linear` : 'none',
        }}
      />
    </motion.div>
  );
};
