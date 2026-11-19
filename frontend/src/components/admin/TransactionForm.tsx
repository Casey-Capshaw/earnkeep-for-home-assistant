// EarnKeep - Transaction form (spec § Admin — Pay & Bank)
// Kid chips, tap-to-add quick amounts with a big ledger readout, an optional
// note, and chunky Deposit/Withdraw buttons. No numeric typing — this runs
// on a wall tablet. The success/failure toast is the store's (one toast per
// transaction, spec copy).

import React, { useState } from 'react';
import { useStore } from '../../store';
import { segIdentity } from './formStyles';

const QUICK_AMOUNTS = [0.25, 1, 5, 10, 20];

export const TransactionForm: React.FC = () => {
  const family = useStore((s) => s.family);
  const addTransaction = useStore((s) => s.addTransaction);
  const showToast = useStore((s) => s.showToast);

  const [selectedChild, setSelectedChild] = useState(family[0]?.id ?? '');
  const [amount, setAmount] = useState(0);
  const [label, setLabel] = useState('');

  const processTransaction = async (isDeposit: boolean) => {
    if (!amount || amount <= 0) {
      showToast('Tap an amount first', 'error');
      return;
    }
    const finalLabel = label.trim() || (isDeposit ? 'Deposit' : 'Withdrawal');
    const signed = isDeposit ? amount : -amount;

    const ok = await addTransaction(selectedChild, finalLabel, signed);
    if (ok) {
      setAmount(0);
      setLabel('');
    }
  };

  return (
    <div className="flex flex-col gap-[18px] rounded-[22px] bg-white/60 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-ink)_16%,transparent)] p-[22px]">
      <div className="flex gap-3">
        {family.map((c) => {
          const active = selectedChild === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedChild(c.id)}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl border-2 border-ink/12 bg-ink/[0.03] p-3.5 font-display text-[17px] font-extrabold text-cloud transition-colors duration-150"
              style={active ? segIdentity(c.color) : undefined}
            >
              <span className="text-2xl leading-none">{c.emoji}</span>
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-[18px] py-2.5">
        <button
          onClick={() => setAmount(0)}
          className="h-[52px] w-[52px] flex-shrink-0 rounded-[14px] border-2 border-ink/15 text-sm font-bold text-cloud-dim active:scale-95"
        >
          Clr
        </button>
        <div className="min-w-[220px] text-center font-ledger text-[56px] font-bold leading-none text-cloud [font-variant-numeric:tabular-nums]">
          ${amount.toFixed(2)}
        </div>
        <div className="w-[52px] flex-shrink-0" />
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        {QUICK_AMOUNTS.map((n) => (
          <button
            key={n}
            onClick={() => setAmount((a) => +(a + n).toFixed(2))}
            className="rounded-[14px] border-2 border-ink/[0.14] bg-ink/[0.04] px-5 py-[11px] font-ledger text-base font-extrabold text-cloud active:scale-95"
          >
            +${n}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Note (optional) — e.g. Birthday money"
        className="w-full rounded-[14px] border-2 border-ink/[0.14] bg-white/70 px-4 py-[13px] text-[15px] font-semibold text-cloud placeholder:text-cloud-dim/60 focus:border-vault focus:outline-none"
      />

      <div className="flex gap-3">
        <button
          onClick={() => processTransaction(true)}
          className="flex-1 rounded-2xl bg-vault p-4 font-display text-[17px] font-extrabold text-white shadow-[0_4px_0_#0B6E63] active:translate-y-0.5 active:shadow-[0_2px_0_#0B6E63]"
        >
          ↓ Deposit
        </button>
        <button
          onClick={() => processTransaction(false)}
          className="flex-1 rounded-2xl bg-destructive p-4 font-display text-[17px] font-extrabold text-white shadow-[0_4px_0_#a5302f] active:translate-y-0.5 active:shadow-[0_2px_0_#a5302f]"
        >
          ↑ Withdraw
        </button>
      </div>
    </div>
  );
};
