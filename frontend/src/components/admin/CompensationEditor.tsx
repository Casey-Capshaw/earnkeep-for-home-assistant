// EarnKeep - Compensation editor (spec § Admin — Weekly compensation)
// Per-child –/+ steppers in $0.50 increments, floor $0; each tap saves
// immediately. Tap-only, like the rest of the back office.

import React from 'react';
import { useStore } from '../../store';

export const CompensationEditor: React.FC = () => {
  const family = useStore((s) => s.family);
  const updateFamilyMember = useStore((s) => s.updateFamilyMember);

  const adjust = async (childId: string, delta: number) => {
    const child = family.find((c) => c.id === childId);
    if (!child) return;
    const next = Math.max(0, +(child.compensation + delta).toFixed(2));
    if (next === child.compensation) return;
    await updateFamilyMember(childId, { compensation: next });
  };

  const stepperClass =
    'h-11 w-11 flex-shrink-0 rounded-xl border-2 border-ink/15 text-[22px] font-bold leading-none text-cloud active:scale-95';

  return (
    <div className="flex flex-col gap-3">
      {family.map((child) => (
        <div
          key={child.id}
          className="flex items-center gap-4 rounded-[18px] bg-white/60 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-ink)_16%,transparent)] px-5 py-4"
        >
          <span className="text-[26px] leading-none">{child.emoji}</span>
          <span
            className="min-w-0 flex-1 truncate font-display text-[22px] text-ink"
            style={{ textShadow: `0 0 12px ${child.color}` }}
          >
            {child.name}
          </span>
          <button onClick={() => adjust(child.id, -0.5)} className={stepperClass}>
            –
          </button>
          <span className="min-w-24 text-center font-ledger text-[26px] font-bold text-vault [font-variant-numeric:tabular-nums]">
            ${child.compensation.toFixed(2)}
          </span>
          <button onClick={() => adjust(child.id, 0.5)} className={stepperClass}>
            +
          </button>
        </div>
      ))}
    </div>
  );
};
