// EarnKeep - Family member manager (spec § Admin — People tab)
// A 2-col grid of member cards (identity ring, avatar, name, streak ·
// balance, ✎) plus a dashed "+ Add family member" button. The spec card
// carries only the edit button, so removal lives inside the edit dialog
// (with the repo's confirm step) instead of on the card face.

import React, { useState } from 'react';
import { useStore } from '../../store';
import type { FamilyMember } from '../../types';
import { AVATAR_EMOJI, EmojiPicker } from '../shared/EmojiPicker';
import { ColorPicker } from '../shared/ColorPicker';
import { CharacterDialog } from './CharacterDialog';
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
  dangerOutlineButton,
  fieldLabel,
  saveButton,
  textInput,
} from './formStyles';

const DEFAULT_COLOR = '#FFB627';

export const FamilyMemberManager: React.FC = () => {
  const family = useStore((s) => s.family);
  const addFamilyMember = useStore((s) => s.addFamilyMember);
  const updateFamilyMember = useStore((s) => s.updateFamilyMember);
  const deleteFamilyMember = useStore((s) => s.deleteFamilyMember);
  const showToast = useStore((s) => s.showToast);

  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FamilyMember | null>(null);
  const [characterFor, setCharacterFor] = useState<FamilyMember | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmoji, setFormEmoji] = useState('');
  const [formColor, setFormColor] = useState(DEFAULT_COLOR);
  const [formBirthday, setFormBirthday] = useState('');

  const openAddForm = () => {
    setFormName('');
    setFormEmoji('');
    setFormColor(DEFAULT_COLOR);
    setFormBirthday('');
    setEditingMember(null);
    setIsAdding(true);
  };

  const openEditForm = (member: FamilyMember) => {
    setFormName(member.name);
    setFormEmoji(member.emoji);
    setFormColor(member.color);
    setFormBirthday(member.birthday ?? '');
    setEditingMember(member);
    setIsAdding(true);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingMember(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (!formEmoji) {
      showToast('Pick an avatar', 'error');
      return;
    }

    if (editingMember) {
      await updateFamilyMember(editingMember.id, {
        name: formName.trim(),
        emoji: formEmoji,
        color: formColor,
        birthday: formBirthday,
      });
    } else {
      await addFamilyMember({
        name: formName.trim(),
        emoji: formEmoji,
        color: formColor,
        birthday: formBirthday,
      });
    }

    closeForm();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteFamilyMember(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div>
      <div className="mb-[18px]">
        <div className="font-display text-[26px] leading-tight text-ink">
          Family members
        </div>
        <div className="mt-0.5 text-[15px] font-semibold text-ink-soft">
          Each child has an identity color, avatar, and streak. A child with a
          character plays in the world.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {family.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-4 rounded-[20px] bg-white/60 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-ink)_16%,transparent)] p-5"
            style={{ boxShadow: `inset 0 0 0 2px ${member.color}55` }}
          >
            <div
              className="flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center rounded-full text-[30px] leading-none"
              style={{ backgroundColor: member.color }}
            >
              {member.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate font-display text-[26px] leading-tight text-ink"
                style={{ textShadow: `0 0 12px ${member.color}` }}
              >
                {member.name}
              </div>
              <div className="mt-0.5 font-ledger text-[13px] font-bold text-cloud-dim">
                {member.current_streak ?? 0}-day streak · $
                {member.bank_balance.toFixed(2)}
              </div>
            </div>
            <button
              title={member.sprite ? 'Character' : 'Add a character'}
              onClick={() => setCharacterFor(member)}
              className="flex h-[42px] flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-ink/10 px-3 text-[14px] font-extrabold text-cloud active:scale-90"
            >
              🧚 {member.sprite ? 'Character' : 'Add character'}
            </button>
            <button
              title="Edit"
              onClick={() => openEditForm(member)}
              className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-ink/10 text-lg text-cloud active:scale-90"
            >
              ✎
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={openAddForm}
        className="mt-4 w-full rounded-[14px] border-2 border-dashed border-ink/20 px-6 py-3.5 font-display text-[15px] font-extrabold text-cloud-dim active:scale-[0.99]"
      >
        + Add family member
      </button>

      <Dialog open={isAdding} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Edit family member' : 'Add family member'}
            </DialogTitle>
          </DialogHeader>

          <div>
            <label className={fieldLabel}>Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Alex"
              className={textInput}
            />
          </div>

          <div>
            <label className={fieldLabel}>Avatar</label>
            <EmojiPicker
              selected={formEmoji}
              onSelect={setFormEmoji}
              options={AVATAR_EMOJI}
            />
          </div>

          <div>
            <label className={fieldLabel}>Identity color</label>
            <ColorPicker selected={formColor} onSelect={setFormColor} />
          </div>

          <div>
            <label className={fieldLabel}>Birthday 🎂 (optional — the whole world celebrates)</label>
            <input
              type="date"
              value={formBirthday}
              onChange={(e) => setFormBirthday(e.target.value)}
              className={textInput}
            />
          </div>

          <DialogFooter>
            {editingMember && (
              <button
                onClick={() => {
                  setDeleteTarget(editingMember);
                  closeForm();
                }}
                className={dangerOutlineButton}
              >
                Remove
              </button>
            )}
            <button onClick={closeForm} className={cancelButton}>
              Cancel
            </button>
            <button onClick={handleSave} className={saveButton}>
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CharacterDialog member={characterFor} onClose={() => setCharacterFor(null)} />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="w-[440px]">
          <DialogHeader>
            <DialogTitle>Remove family member?</DialogTitle>
          </DialogHeader>
          <p className="text-[15px] font-semibold text-cloud-dim">
            {deleteTarget?.emoji}{' '}
            <strong className="font-extrabold text-cloud">{deleteTarget?.name}</strong>
            <br />
            <span className="text-[13px]">
              This will remove them from all accountabilities, delete their
              transactions, and reset their bank balance.
            </span>
          </p>
          <DialogFooter>
            <button onClick={() => setDeleteTarget(null)} className={cancelButton}>
              Cancel
            </button>
            <button onClick={handleDeleteConfirm} className={dangerButton}>
              Remove
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
