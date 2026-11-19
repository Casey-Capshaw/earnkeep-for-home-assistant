// EarnKeep - Home URL editor
// Configures where the dock's ⌂ link goes (Settings tab row). Not in the
// design spec, but the ⌂ link is a kept repo feature and needs a home.

import React, { useRef, useState } from 'react';
import { useStore } from '../../store';
import { outlineButton } from './formStyles';

export const HomeUrlEditor: React.FC = () => {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!inputRef.current) return;

    const val = inputRef.current.value.trim();
    if (!val) return;

    await updateSettings({ home_url: val });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex items-center gap-2.5">
      <input
        type="text"
        placeholder="/"
        defaultValue={settings?.home_url || '/'}
        ref={inputRef}
        className="w-40 rounded-xl border-2 border-ink/15 bg-white/70 px-3 py-2.5 text-left text-sm font-semibold text-cloud focus:border-vault focus:outline-none"
      />
      <button onClick={handleSave} className={outlineButton}>
        {saved ? '✓' : 'Save'}
      </button>
    </div>
  );
};
