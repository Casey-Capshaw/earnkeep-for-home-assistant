// EarnKeep - Transaction list (spec § Bank rows)
// Renders a list of transactions with color-coded amounts (ledger face).
// Withdrawals use the semantic destructive red, not a kid's identity
// color — same principle as Admin's Withdraw button.

import React from 'react';
import type { Transaction } from '../../types';

interface TransactionListProps {
  transactions: Transaction[];
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
}) => {
  if (transactions.length === 0) {
    return (
      <div className="rounded-[14px] bg-ink/[0.05] px-[15px] py-3 text-[16px] font-bold text-ink-soft">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((txn) => {
        const isPositive = txn.amount >= 0;
        return (
          <div
            key={txn.id}
            className="flex items-center justify-between rounded-[14px] bg-white/55 px-[15px] py-3 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-ink)_14%,transparent)]"
          >
            <span className="min-w-0 truncate text-[16px] font-bold text-ink">
              {txn.label}
            </span>
            <span
              className={`flex-shrink-0 font-body text-[18px] font-black [font-variant-numeric:tabular-nums] ${
                isPositive ? 'text-money' : 'text-destructive'
              }`}
            >
              {isPositive ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
