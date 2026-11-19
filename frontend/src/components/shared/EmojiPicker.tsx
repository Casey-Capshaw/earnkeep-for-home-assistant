// EarnKeep - Emoji picker (spec § Task modal — emoji grid picker)
// Grid of 44px emoji cells; the selected one wears a vault ring. Defaults to
// the spec's curated task set; family avatars pass the broader AVATAR set.
// Whatever is currently selected is always in the grid, so editing an item
// that carries an off-list emoji still shows its selection.

import React from 'react';

/** The spec's curated task-icon set, in its order. */
export const TASK_EMOJI = [
  '🪥', '🛏️', '👕', '🥣', '📖', '🧸', '🚿', '🧹', '🐕',
  '🍽️', '🗑️', '🌱', '📚', '✏️', '🎨', '⚽', '🧺', '🦷',
];

/** Avatar choices for family members (identity, not tasks). */
export const AVATAR_EMOJI = [
  '🦊', '🐲', '🐉', '🦄', '🚀', '🔥', '⭐', '🌈', '🦁', '🐯',
  '🐼', '🐨', '🐸', '🦋', '🐬', '🦖', '🎸', '🎮', '⚽', '🏀',
  '🧑‍🚀', '🧙', '🦸', '🧜', '🤖', '👾', '🐶', '🐱',
];

interface EmojiPickerProps {
  selected: string;
  onSelect: (emoji: string) => void;
  options?: string[];
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  selected,
  onSelect,
  options = TASK_EMOJI,
}) => {
  const choices =
    selected && !options.includes(selected) ? [...options, selected] : options;

  return (
    <div className="flex flex-wrap gap-2">
      {choices.map((emoji) => {
        const isSelected = emoji === selected;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`flex h-11 w-11 items-center justify-center rounded-[11px] border-2 text-[22px] leading-none transition-transform active:scale-90 ${
              isSelected ? 'border-vault bg-vault/15' : 'border-ink/10 bg-transparent'
            }`}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
};
