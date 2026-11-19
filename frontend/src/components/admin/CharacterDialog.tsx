// EarnKeep - Character intake (Admin → People → a member's "Character").
// Paste or upload a Sprite file, or start from a preset; it is validated on
// every keystroke and drawn live, animated, in today's season. Save stores
// it on the member (earn_keep/update_family_member); Export downloads it;
// Remove takes the member's character out of the world. The format is in
// docs/sprites/README.md.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import type { FamilyMember } from '../../types';
import { Sprite } from '../../world/sprites/Sprite';
import { SPRITES_CSS } from '../../world/sprites/Sprites';
import { resolveSprite, type SpriteFile } from '../../world/sprites/traits';
import { outfitFor } from '../../world/sprites/wardrobe';
import { exportName, formatCharacter, readCharacter } from '../../world/sprites/intake';
import { PRESETS } from '../../world/sprites/presets';
import type { Expr, Pose } from '../../world/sprites/types';
import { rng } from '../../world/scene';
import { useWorldDay } from '../shared/Ornate';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { cancelButton, dangerOutlineButton, fieldLabel, saveButton } from './formStyles';

/** What the three preview figures cycle through, offset from each other. */
const POSES: Pose[] = ['wave', 'walk', 'cheer', 'idle', 'fly', 'dance', 'jump', 'run'];
const SCALE = 1.25;

const smallButton =
  'rounded-xl border-2 border-ink/25 bg-white/50 px-3 py-2 text-[14px] font-extrabold text-ink active:scale-[0.98]';

interface Props {
  member: FamilyMember | null;
  onClose: () => void;
}

export const CharacterDialog: React.FC<Props> = ({ member, onClose }) => {
  const updateFamilyMember = useStore((s) => s.updateFamilyMember);
  const showToast = useStore((s) => s.showToast);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Load the member's current file each time the dialog opens.
  useEffect(() => {
    if (member) setText(member.sprite ? formatCharacter(member.sprite) : '');
  }, [member]);

  const intake = useMemo(() => readCharacter(text), [text]);
  const saved = member?.sprite ? formatCharacter(member.sprite) : '';
  const changed = text !== saved;

  const loadFile = async (f: File | undefined) => {
    if (!f) return;
    setText(await f.text());
  };

  const save = async () => {
    if (!member || !intake.sprite) return;
    setSaving(true);
    await updateFamilyMember(member.id, { sprite: intake.sprite });
    setSaving(false);
    // The store keeps the old member if the server refused the file.
    const now = useStore.getState().family.find((m) => m.id === member.id);
    if (now?.sprite) {
      showToast(`${member.name}'s character saved`, 'success');
      onClose();
    }
  };

  const remove = async () => {
    if (!member) return;
    await updateFamilyMember(member.id, { sprite: null });
    showToast(`${member.name} no longer has a character`, 'success');
    onClose();
  };

  const download = () => {
    if (!member || !intake.sprite) return;
    const url = URL.createObjectURL(new Blob([formatCharacter(intake.sprite)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = exportName(intake.sprite, member.name);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[1040px]">
        <DialogHeader>
          <DialogTitle>{member ? `${member.name}'s character` : 'Character'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-5">
          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${fieldLabel} mb-0 mr-auto`}>Character file (JSON)</label>
              <button className={smallButton} onClick={() => fileInput.current?.click()}>
                Upload file…
              </button>
              {Object.entries(PRESETS).map(([id, file]) => (
                <button key={id} className={smallButton} onClick={() => setText(formatCharacter(file as SpriteFile))}>
                  Start from {String((file as SpriteFile).label ?? id)}
                </button>
              ))}
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  void loadFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void loadFile(e.dataTransfer.files?.[0]);
              }}
              spellCheck={false}
              placeholder={'Paste a character file here, drop one on this box, or start from a preset.\n\nTo have an AI assistant write one from photos or a description, point it at docs/sprites/character-guide.md in the EarnKeep repository.'}
              className="h-[330px] w-full resize-none rounded-xl border-2 border-ink/25 bg-white/70 p-3 font-mono text-[12.5px] leading-[1.45] text-ink placeholder:font-sans placeholder:text-[14px] placeholder:text-ink-soft/70 focus:border-vault focus:outline-none"
            />
            <Messages errors={intake.errors} warnings={intake.warnings} ok={!!intake.sprite} />
          </div>

          <Preview file={intake.sprite} memberId={member?.id ?? 'x'} color={member?.color} />
        </div>

        <DialogFooter>
          {member?.sprite && (
            <button onClick={remove} className={dangerOutlineButton}>
              Remove
            </button>
          )}
          <button onClick={download} disabled={!intake.sprite} className={`${dangerOutlineButton} border-ink/25 text-ink disabled:opacity-40`}>
            Export
          </button>
          <button onClick={onClose} className={cancelButton}>
            Cancel
          </button>
          <button onClick={save} disabled={!intake.sprite || !changed || saving} className={`${saveButton} disabled:opacity-40`}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Messages: React.FC<{ errors: string[]; warnings: string[]; ok: boolean }> = ({ errors, warnings, ok }) => {
  if (!errors.length && !warnings.length) {
    return ok ? <div className="text-[14px] font-bold text-vault">✓ Looks good. This file can be saved.</div> : null;
  }
  return (
    <ul className="max-h-[110px] overflow-y-auto rounded-xl bg-white/50 px-3.5 py-2.5 text-[13.5px] font-semibold leading-snug">
      {errors.map((m) => (
        <li key={`e${m}`} className="text-destructive">✕ {m}</li>
      ))}
      {warnings.map((m) => (
        <li key={`w${m}`} className="text-ink-soft">⚠ {m}</li>
      ))}
    </ul>
  );
};

/** Three figures of the character, posed in turn, dressed for today. */
const Preview: React.FC<{ file: SpriteFile | null; memberId: string; color?: string }> = ({ file, memberId, color }) => {
  const day = useWorldDay();
  const [tick, setTick] = useState(0);
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / 86_400_000));
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2600);
    return () => clearInterval(t);
  }, []);

  // A separate id keeps the preview's gradients apart from the world's copy.
  const character = useMemo(() => (file ? resolveSprite(file, `preview-${memberId}`) : null), [file, memberId]);
  const outfit = useMemo(
    () =>
      character &&
      outfitFor(character, seed, { season: day?.season ?? 'summer', weather: 'sunny', special: null, hour: 10, kit: day?.kit ?? 'forest' }, rng),
    [character, seed, day?.season, day?.kit]
  );

  return (
    <div className="flex flex-col gap-2.5">
      <label className={`${fieldLabel} mb-0`}>Preview</label>
      <div
        className="ek-sprites relative h-[330px] overflow-hidden rounded-xl"
        style={{ background: `linear-gradient(180deg, #F4EFE2 0%, #F4EFE2 72%, ${color ?? '#C9D8B6'}55 72%, ${color ?? '#C9D8B6'}33 100%)` }}
      >
        <style>{SPRITES_CSS}</style>
        {character && outfit ? (
          [0, 1, 2].map((i) => {
            const pose = POSES[(tick + i * 3) % POSES.length];
            const expr: Expr | undefined =
              pose === 'cheer' || pose === 'dance' || pose === 'jump'
                ? character.personality.joy[(tick + i) % character.personality.joy.length]
                : pose === 'run' || pose === 'fly'
                  ? character.personality.go[(tick + i) % character.personality.go.length]
                  : character.personality.rest[(tick + i) % character.personality.rest.length];
            return (
              <div
                key={i}
                className="absolute"
                style={{ left: `${20 + i * 30}%`, top: pose === 'fly' ? 170 : 250, transform: `scale(${SCALE})`, transition: 'top .6s ease' }}
              >
                <Sprite
                  character={character}
                  outfit={outfit}
                  pose={pose}
                  expr={expr}
                  wings={pose === 'fly' ? character.wardrobe.wings[i % character.wardrobe.wings.length] : null}
                />
              </div>
            );
          })
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center text-[14px] font-semibold text-ink-soft">
            The character appears here once the file is valid.
          </div>
        )}
      </div>
      <button className={smallButton} disabled={!character} onClick={() => setSeed((s) => s + 1)}>
        Another outfit
      </button>
      <p className="text-[12.5px] font-semibold leading-snug text-ink-soft">
        In the world the character is much smaller, and dresses for the weather, the hour and holidays.
      </p>
    </div>
  );
};
