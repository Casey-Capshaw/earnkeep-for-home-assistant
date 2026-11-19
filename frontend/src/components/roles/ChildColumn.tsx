// EarnKeep - Child column: one "Character Desk" per kid, re-skinned for
// the layered world (2026-11-10): an ornate ink-engraved paper panel lit
// from the top-left by the kid's own color, a glowing avatar (party hat +
// gold flourishes on their birthday), streak flame, tappable bank balance,
// the habit tiles, and the weekly compensation footer.
//
// Now-only board (Casey, 2026-11-11): a kid sees just the habits to do
// right now — morning tiles before noon, evening tiles from noon on.
//
// Noon rule (Casey, 2026-07-12): morning habits not done by 12:00 are
// MISSED — morning tiles leave the board at noon (done or not) and those
// habits can no longer be completed for the day. Display-only: the backend's
// nightly streak evaluation is untouched, so a missed morning still breaks
// the streak exactly as before. Confetti + toast fire when the whole habit
// section completes, inside HabitSection.

import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import type { FamilyMember } from '../../types';
import { deepen } from '../../lib/utils';
import { Ornate, useWorldDay } from '../shared/Ornate';
import { PartyHat } from '../../world/celebrate';
import { motion } from 'framer-motion';
import { HabitSection } from './HabitSection';
import { CompensationCard } from './CompensationCard';
import { nowWithOverrides } from '../../world/useDay';
import { StreakFlame } from './StreakFlame';
import { BadgeShelf } from './BadgeShelf';

const NOON = 12;

interface ChildColumnProps {
  child: FamilyMember;
}

export const ChildColumn: React.FC<ChildColumnProps> = ({ child }) => {
  const accountabilities = useStore((s) => s.accountabilities);
  const setActiveView = useStore((s) => s.setActiveView);

  // Tick so the noon switch happens without anyone reloading the kiosk.
  // (nowWithOverrides honors ?ekhour so the verify scripts can pin a time.)
  const [hour, setHour] = useState(() => nowWithOverrides().getHours());
  useEffect(() => {
    const t = setInterval(() => setHour(nowWithOverrides().getHours()), 60_000);
    return () => clearInterval(t);
  }, []);
  const period = hour < NOON ? 'morning' : 'evening';

  const dailies = accountabilities.filter(
    (a) => a.type === 'daily' && a.assigned_to.includes(child.id)
  );
  // Only what's due right now is on the board. Mirrored by the backend's
  // finale sound (store.habit_board_complete) — keep the two in step.
  const onBoard = dailies.filter((a) => a.time_of_day === period);

  const compensated = accountabilities.filter(
    (a) => a.type === 'compensated' && a.assigned_to.includes(child.id)
  );

  // Birthday: party hat + gold flourishes on this kid's desk.
  const day = useWorldDay();
  const special = day?.special;
  const party = special?.kind === 'birthday' && special.kidIds?.includes(child.id) ? special : null;

  // The kid's color is this desk's light source: it pools from the
  // avatar (top-left) across the paper and haloes the avatar itself.
  return (
    <Ornate glow={child.color} gold={!!party} className="min-h-0">
      <div className="flex h-full min-h-0 flex-col gap-3 px-[26px] py-[22px]">
        <div className="flex flex-shrink-0 items-center gap-[15px]">
          <motion.div
            whileTap={{ scaleX: 1.14, scaleY: 0.86 }}
            transition={{ type: 'spring', stiffness: 500, damping: 9 }}
            className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-[32px] leading-none"
            style={{
              background: `radial-gradient(circle at 35% 30%, #fff 0%, ${child.color} 58%, ${deepen(child.color)} 100%)`,
              boxShadow: `0 0 0 3px #fff, 0 0 0 5px var(--color-ink), 0 0 40px 10px ${child.color}aa`,
            }}
          >
            {child.emoji}
            {party && (
              <PartyHat
                colors={[child.color, '#FFFFFF', party.colors.find((c) => c !== child.color && c !== '#FFFFFF') ?? '#7CC4F0']}
                ink={day?.ink ?? '#1C4A40'}
              />
            )}
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[36px] leading-none text-ink">{child.name}</div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <StreakFlame child={child} dailyAccountabilities={dailies} />
              <BadgeShelf child={child} />
            </div>
          </div>
          <button
            onClick={() => setActiveView('bank')}
            className="min-h-11 flex-shrink-0 text-right active:scale-95"
          >
            <div className="font-body text-[28px] font-black leading-tight text-money [font-variant-numeric:tabular-nums]">
              ${child.bank_balance.toFixed(2)}
            </div>
            <div className="text-[11px] font-extrabold tracking-[0.8px] text-ink-soft">
              IN THE BANK ›
            </div>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-1 pb-1 pt-0.5">
          <HabitSection key={period} habits={onBoard} child={child} period={period} />
        </div>

        <CompensationCard child={child} compensatedHabits={compensated} />
      </div>
    </Ornate>
  );
};
