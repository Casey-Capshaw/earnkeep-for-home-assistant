// EarnKeep - Interest rate editor (spec § Admin — Settings)
// –/+ in 0.5% steps, clamped 0–100, saved immediately on tap.

import React from 'react';
import { useStore } from '../../store';

export const InterestRateEditor: React.FC = () => {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const rate = settings?.interest_rate ?? 0;

  const adjust = async (delta: number) => {
    const next = Math.max(0, Math.min(100, +(rate + delta).toFixed(1)));
    if (next === rate) return;
    await updateSettings({ interest_rate: next });
  };

  const stepperClass =
    'h-11 w-11 flex-shrink-0 rounded-xl border-2 border-ink/15 text-[22px] font-bold leading-none text-cloud active:scale-95';

  return (
    <div className="flex items-center gap-3.5">
      <button onClick={() => adjust(-0.5)} className={stepperClass}>
        –
      </button>
      <span className="min-w-20 text-center font-ledger text-2xl font-bold text-vault [font-variant-numeric:tabular-nums]">
        {rate.toFixed(1)}%
      </span>
      <button onClick={() => adjust(0.5)} className={stepperClass}>
        +
      </button>
    </div>
  );
};
