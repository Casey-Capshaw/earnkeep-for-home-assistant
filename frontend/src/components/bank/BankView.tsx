// EarnKeep - Bank view ("The Bank" — re-skinned for the layered world,
// 2026-11-10). A header carrying the title and the interest note, over one
// ornate, kid-lit vault card per child. The world pans one step right when
// you arrive here (see App).

import React from 'react';
import { useStore } from '../../store';
import { BankCard } from './BankCard';

export const BankView: React.FC = () => {
  const family = useStore((s) => s.family);
  const settings = useStore((s) => s.settings);
  const interestRate = settings?.interest_rate ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative z-[8] flex flex-shrink-0 items-end justify-between px-14 pb-3.5 pt-[44px]">
        <span className="font-display text-[36px] leading-none text-ink [text-shadow:0_0_14px_rgba(255,255,255,0.9)]">
          🏦 The Bank
        </span>
        <span className="rounded-xl bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)] px-3 py-1 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-ink)_18%,transparent)] py-1.5 text-[16px] font-extrabold text-ink">
          Interest {interestRate.toFixed(1)}% monthly · grows on the 1st
        </span>
      </div>
      <div className="relative z-[5] grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-[34px] px-12 pt-1 sm:grid-cols-2">
        {family.map((child) => (
          <BankCard key={child.id} child={child} />
        ))}
      </div>
    </div>
  );
};
