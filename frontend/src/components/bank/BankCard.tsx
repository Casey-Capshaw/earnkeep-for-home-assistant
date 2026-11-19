// EarnKeep - Bank card (layered world, 2026-11-10)
// An ornate vault panel lit by the kid's color: avatar + name, the balance
// set big in tabular numerals, then the scrollable transaction history,
// newest first (the interest note lives in the BankView header).

import React from 'react';
import { useStore } from '../../store';
import type { FamilyMember } from '../../types';
import { deepen } from '../../lib/utils';
import { TransactionList } from './TransactionList';
import { Divider, Ornate } from '../shared/Ornate';

interface BankCardProps {
  child: FamilyMember;
}

export const BankCard: React.FC<BankCardProps> = ({ child }) => {
  const transactions = useStore((s) => s.transactions);

  const childTxns = transactions
    .filter((t) => t.child_id === child.id)
    .slice()
    .reverse();

  return (
    <Ornate glow={child.color} className="min-h-0">
      <div className="flex h-full min-h-0 flex-col gap-4 px-7 py-6">
        <div className="flex flex-shrink-0 items-center gap-3.5">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-[28px] leading-none"
            style={{
              background: `radial-gradient(circle at 35% 30%, #fff 0%, ${child.color} 58%, ${deepen(child.color)} 100%)`,
              boxShadow: `0 0 0 3px #fff, 0 0 0 5px var(--color-ink), 0 0 34px 8px ${child.color}99`,
            }}
          >
            {child.emoji}
          </div>
          <span className="font-display text-[34px] leading-none text-ink">{child.name}</span>
        </div>

        <div className="flex flex-shrink-0 items-baseline gap-1.5 font-body font-black text-money [font-variant-numeric:tabular-nums]">
          <span className="text-[34px] opacity-60">$</span>
          <span className="text-[62px] leading-none">{child.bank_balance.toFixed(2)}</span>
        </div>

        <Divider label="Recent transactions" />
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <TransactionList transactions={childTxns} />
        </div>
      </div>
    </Ornate>
  );
};
