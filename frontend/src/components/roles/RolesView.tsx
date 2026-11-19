// EarnKeep - Roles view ("Character Desks", re-skinned for the layered
// world 2026-11-10). A greeting (or a celebration banner) + clock header
// over one ornate, kid-lit desk per child.
//
// auto-rows-fr is load-bearing: without an explicit row-sizing rule, a CSS
// grid's implicit row sizes to its content ("auto"), so on the Fire10's
// real screen the single row of columns only filled about half the height,
// leaving a large dead gap below — invisible in a shorter desktop browser
// window, which is how this shipped without being caught.

import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { ChildColumn } from './ChildColumn';
import { useWorldDay } from '../shared/Ornate';
import { Banner } from '../../world/celebrate';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function clockFor(now: Date): string {
  const h = now.getHours() % 12 || 12;
  return `${h}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export const RolesView: React.FC = () => {
  const family = useStore((s) => s.family);
  const [now, setNow] = useState(() => new Date());

  // Kiosk clock — a minute of drift is fine, so a 30s tick is plenty.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const day = useWorldDay();
  const special = day?.special ?? null;

  // Header sits above the world's front framing (z-8); the desks sit
  // under it (z-5) so the critters and framing can overlap their edges.
  // On a full celebration day the ribbon banner replaces the greeting.
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative z-[8] flex flex-shrink-0 items-end justify-between gap-6 px-14 pb-3.5 pt-[38px]">
        {special?.intensity !== 'full' && (
          <span className="font-display text-[36px] leading-none text-ink [text-shadow:0_0_14px_rgba(255,255,255,0.9)]">
            {greetingFor(now.getHours())}
          </span>
        )}
        {special && <Banner sp={special} font="var(--font-display)" weight={400} ink={day!.ink} />}
        <span className="ml-auto rounded-xl bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)] px-3 py-1 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-ink)_18%,transparent)] font-body text-[28px] font-black leading-none text-ink [font-variant-numeric:tabular-nums]">
          {clockFor(now)}
        </span>
      </div>
      <div className="relative z-[5] grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-[34px] px-12 pt-1 sm:grid-cols-2">
        {family.map((child) => (
          <ChildColumn key={child.id} child={child} />
        ))}
      </div>
    </div>
  );
};
