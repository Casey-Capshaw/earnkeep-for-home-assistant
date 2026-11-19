// EarnKeep - Shared admin form styling (spec § Admin — Task modal).
// One place for the modal's field label, text input, segment, and footer
// button treatments so the task, family-member, and PIN dialogs can't drift.

import type { CSSProperties } from 'react';

export const fieldLabel = 'mb-[7px] block text-[14px] font-extrabold text-ink-soft';

export const textInput =
  'w-full rounded-xl border-2 border-ink/25 bg-white/70 px-3.5 py-3 text-[16px] font-bold text-ink placeholder:text-ink-soft/70 focus:border-vault focus:outline-none';

/** Segmented control cell — mutually exclusive class sets per state, so a
 * base border/text color can never win the stylesheet-order fight over the
 * selected state (the 2026-07-12 "Type / Time of Day looked unsettable" bug). */
const segShape =
  'flex-1 rounded-xl border-2 py-[13px] text-[15px] font-extrabold transition-colors duration-150 active:scale-[0.98]';
export const segOff = `${segShape} border-ink/25 bg-transparent text-ink-soft`;
export const segOn = {
  morning: `${segShape} border-morning bg-morning/25 text-ink`,
  evening: `${segShape} border-evening bg-evening/25 text-ink`,
  vault: `${segShape} border-vault bg-vault/20 text-ink`,
};
/** Identity-colored segment (assignee / child pick) — the color is data. */
export const segIdentity = (color: string): CSSProperties => ({
  borderColor: color,
  backgroundColor: `${color}40`,
  color: 'var(--color-ink)', // kid colors (yellow!) aren't legible as text on paper
});
export const segIdentityShape = `${segShape} border-ink/25 bg-transparent text-ink-soft`;

export const cancelButton =
  'flex-1 rounded-[14px] border-2 border-ink/25 bg-transparent py-3.5 font-display text-[19px] text-ink active:scale-[0.98]';
export const saveButton =
  'flex-1 rounded-[14px] bg-vault py-3.5 font-display text-[19px] text-white shadow-[0_4px_0_#0B6E63] active:translate-y-0.5 active:shadow-[0_2px_0_#0B6E63]';
export const dangerButton =
  'flex-1 rounded-[14px] bg-destructive py-3.5 font-display text-[19px] text-white shadow-[0_4px_0_#a5302f] active:translate-y-0.5 active:shadow-[0_2px_0_#a5302f]';
export const dangerOutlineButton =
  'rounded-[14px] border-2 border-destructive/40 bg-transparent px-4 py-3.5 font-display text-[19px] text-destructive active:scale-[0.98]';

/** Outline utility button (e.g. "Change" on the Settings PIN row). */
export const outlineButton =
  'rounded-xl border-2 border-ink/25 bg-transparent px-[18px] py-2.5 text-[15px] font-bold text-ink active:scale-95';
