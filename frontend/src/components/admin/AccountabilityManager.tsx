// EarnKeep - Accountability manager (spec § Admin — Tasks tab)
// Lists every task as a row (PAID / HABIT badge, time of day, day pattern,
// assignees, edit, delete) and hosts the task modal. Compensated tasks get a
// day-of-week multi-select; habits are implicitly all seven days.
// Delete keeps the repo's confirm step — a wall tablet invites stray taps.

import React, { useState } from 'react';
import { useStore } from '../../store';
import type { Accountability } from '../../types';
import { EmojiPicker } from '../shared/EmojiPicker';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  cancelButton,
  dangerButton,
  fieldLabel,
  saveButton,
  segIdentity,
  segIdentityShape,
  segOff,
  segOn,
  textInput,
} from './formStyles';

const DOW_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const AccountabilityManager: React.FC = () => {
  const family = useStore((s) => s.family);
  const accountabilities = useStore((s) => s.accountabilities);
  const addAccountability = useStore((s) => s.addAccountability);
  const updateAccountability = useStore((s) => s.updateAccountability);
  const deleteAccountability = useStore((s) => s.deleteAccountability);
  const showToast = useStore((s) => s.showToast);

  const [editingAcct, setEditingAcct] = useState<Accountability | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Accountability | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmoji, setFormEmoji] = useState('');
  const [formType, setFormType] = useState<'daily' | 'compensated'>('daily');
  const [formTod, setFormTod] = useState<'morning' | 'evening'>('morning');
  const [formAssigned, setFormAssigned] = useState<string[]>([]);
  const [formRecurrenceDays, setFormRecurrenceDays] = useState<number[]>(ALL_DAYS);

  const openAddForm = () => {
    setFormName('');
    setFormEmoji('');
    setFormType('daily');
    setFormTod('morning');
    setFormAssigned(family.map((c) => c.id));
    setFormRecurrenceDays(ALL_DAYS);
    setEditingAcct(null);
    setIsAdding(true);
  };

  const openEditForm = (acct: Accountability) => {
    setFormName(acct.name);
    setFormEmoji(acct.emoji);
    setFormType(acct.type);
    setFormTod(acct.time_of_day);
    setFormAssigned([...acct.assigned_to]);
    setFormRecurrenceDays([...acct.recurrence_days]);
    setEditingAcct(acct);
    setIsAdding(true);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingAcct(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (!formEmoji) {
      showToast('Pick an icon', 'error');
      return;
    }
    if (formAssigned.length === 0) {
      showToast('Assign to at least one child', 'error');
      return;
    }
    if (formType === 'compensated' && formRecurrenceDays.length === 0) {
      showToast('Pick at least one day', 'error');
      return;
    }

    const recurrence = formType === 'compensated' ? formRecurrenceDays : ALL_DAYS;

    if (editingAcct) {
      await updateAccountability(editingAcct.id, {
        name: formName.trim(),
        emoji: formEmoji,
        type: formType,
        time_of_day: formTod,
        assigned_to: formAssigned,
        recurrence_days: recurrence,
      });
    } else {
      const slug = formName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      await addAccountability({
        name: formName.trim(),
        entity_slug: slug,
        emoji: formEmoji,
        type: formType,
        time_of_day: formTod,
        assigned_to: formAssigned,
        recurrence_days: recurrence,
      });
    }

    closeForm();
  };

  const toggleAssigned = (childId: string) => {
    setFormAssigned((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    );
  };

  const toggleRecurrenceDay = (day: number) => {
    setFormRecurrenceDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteAccountability(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-display text-[21px] font-extrabold leading-tight text-cloud">
            Habits &amp; accountabilities
          </div>
          <div className="mt-0.5 text-[13px] font-semibold text-cloud-dim">
            Habits build routine (unpaid). Accountabilities earn the weekly
            compensation.
          </div>
        </div>
        <button
          onClick={openAddForm}
          className="flex-shrink-0 whitespace-nowrap rounded-[14px] bg-vault px-[22px] py-[13px] font-display text-[15px] font-extrabold text-white shadow-[0_3px_0_#0B6E63] active:translate-y-0.5 active:shadow-[0_1px_0_#0B6E63]"
        >
          + New task
        </button>
      </div>

      <div className="flex flex-col gap-[9px]">
        {accountabilities.map((acct) => {
          const todIcon = acct.time_of_day === 'morning' ? '☀️' : '🌙';
          const isComp = acct.type === 'compensated';
          return (
            <div
              key={acct.id}
              className="flex items-center gap-3.5 rounded-2xl bg-white/60 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-ink)_16%,transparent)] px-[18px] py-3.5"
            >
              <span className="text-[26px] leading-none">{acct.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-[17px] font-bold text-cloud">
                {acct.name}
              </span>
              <span
                className={`rounded-[20px] px-2.5 py-1 text-[10px] font-extrabold tracking-[0.5px] ${
                  isComp ? 'bg-vault/20 text-vault' : 'bg-morning/20 text-morning'
                }`}
              >
                {isComp ? 'PAID' : 'HABIT'}
              </span>
              <span className="text-lg leading-none">{todIcon}</span>
              <span className="min-w-16 text-center font-ledger text-[13px] font-bold tracking-[1px] text-cloud-dim">
                {isComp
                  ? DOW_SHORT.map((label, idx) =>
                      acct.recurrence_days.includes(idx) ? label : '·'
                    ).join('')
                  : 'daily'}
              </span>
              <span className="min-w-14 text-center text-lg leading-none">
                {acct.assigned_to
                  .map((id) => family.find((c) => c.id === id)?.emoji ?? '')
                  .join('')}
              </span>
              <button
                title="Edit"
                onClick={() => openEditForm(acct)}
                className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-ink/10 text-lg text-cloud active:scale-90"
              >
                ✎
              </button>
              <button
                title="Delete"
                onClick={() => setDeleteTarget(acct)}
                className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-destructive/[0.16] text-[22px] text-destructive active:scale-90"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={isAdding} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAcct ? 'Edit task' : 'New task'}</DialogTitle>
          </DialogHeader>

          <div>
            <label className={fieldLabel}>Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Feed the dog"
              className={textInput}
            />
          </div>

          <div>
            <label className={fieldLabel}>Icon</label>
            <EmojiPicker selected={formEmoji} onSelect={setFormEmoji} />
          </div>

          <div>
            <label className={fieldLabel}>Type</label>
            <div className="flex gap-2.5">
              <button
                onClick={() => setFormType('daily')}
                className={formType === 'daily' ? segOn.morning : segOff}
              >
                Habit · unpaid
              </button>
              <button
                onClick={() => setFormType('compensated')}
                className={formType === 'compensated' ? segOn.vault : segOff}
              >
                Accountability · paid
              </button>
            </div>
          </div>

          {formType === 'compensated' && (
            <div>
              <label className={fieldLabel}>Days</label>
              <div className="flex gap-[7px]">
                {DOW_SHORT.map((label, idx) => {
                  const active = formRecurrenceDays.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleRecurrenceDay(idx)}
                      className={`h-11 flex-1 rounded-[11px] border-2 text-[13px] font-extrabold transition-colors duration-150 active:scale-95 ${
                        active
                          ? 'border-vault bg-vault/15 text-vault'
                          : 'border-ink/15 bg-transparent text-cloud-dim'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className={fieldLabel}>Time of day</label>
            <div className="flex gap-2.5">
              <button
                onClick={() => setFormTod('morning')}
                className={formTod === 'morning' ? segOn.morning : segOff}
              >
                ☀️ Morning
              </button>
              <button
                onClick={() => setFormTod('evening')}
                className={formTod === 'evening' ? segOn.evening : segOff}
              >
                🌙 Evening
              </button>
            </div>
          </div>

          <div>
            <label className={fieldLabel}>Assigned to</label>
            <div className="flex gap-2.5">
              {family.map((c) => {
                const checked = formAssigned.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleAssigned(c.id)}
                    className={segIdentityShape}
                    style={checked ? segIdentity(c.color) : undefined}
                  >
                    {c.emoji} {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <button onClick={closeForm} className={cancelButton}>
              Cancel
            </button>
            <button onClick={handleSave} className={saveButton}>
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="w-[440px]">
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
          </DialogHeader>
          <p className="text-[15px] font-semibold text-cloud-dim">
            {deleteTarget?.emoji}{' '}
            <strong className="font-extrabold text-cloud">{deleteTarget?.name}</strong>
            <br />
            <span className="text-[13px]">This will remove it from all children.</span>
          </p>
          <DialogFooter>
            <button onClick={() => setDeleteTarget(null)} className={cancelButton}>
              Cancel
            </button>
            <button onClick={handleDeleteConfirm} className={dangerButton}>
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
