// EarnKeep - Color picker
// Grid of color swatches with selected state highlighting. Follows EmojiPicker pattern.

import React from 'react';

const COLOR_OPTIONS = [
  '#2196F3', // blue
  '#FF9800', // orange
  '#4CAF50', // green
  '#E91E63', // pink
  '#9C27B0', // purple
  '#00BCD4', // cyan
  '#F44336', // red
  '#FFEB3B', // yellow
  '#8BC34A', // light green
  '#FF5722', // deep orange
  '#607D8B', // blue grey
  '#795548', // brown
];

interface ColorPickerProps {
  selected: string;
  onSelect: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selected,
  onSelect,
}) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_OPTIONS.map((color) => {
        const isSelected = color === selected;
        return (
          <button
            key={color}
            type="button"
            onClick={() => onSelect(color)}
            style={{ backgroundColor: color }}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 text-white transition-transform active:scale-90 ${
              isSelected ? 'border-cloud' : 'border-transparent'
            }`}
          >
            {isSelected ? '✓' : ''}
          </button>
        );
      })}
    </div>
  );
};
