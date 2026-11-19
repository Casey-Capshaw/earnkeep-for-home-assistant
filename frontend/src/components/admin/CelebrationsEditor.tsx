// EarnKeep - Settings: other birthdays + the weather entity (2026-11-10).
// Kids' birthdays live on their People cards; this list is for everyone
// else the world should celebrate (Mom, Dad, the dog…). Each gets bunting,
// balloons, a cake landmark and a banner on the day, and a "1 more sleep"
// teaser the day before.

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useStore } from '../../store';
import { outlineButton, segOff, segOn, textInput } from './formStyles';

type Row = { name: string; date: string };

export const CelebrationsEditor: React.FC = () => {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [rows, setRows] = useState<Row[]>(settings?.celebrations ?? []);
  const [saved, setSaved] = useState(false);

  useEffect(() => setRows(settings?.celebrations ?? []), [settings?.celebrations]);

  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, k) => (k === i ? { ...row, ...patch } : row)));
  const save = async () => {
    await updateSettings({ celebrations: rows.filter((r) => r.name.trim() && r.date) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-[18px] bg-white/60 px-5 py-[18px] shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-ink)_16%,transparent)]">
      <div className="text-base font-extrabold text-ink">Birthdays 🎂</div>
      <div className="mb-3 mt-0.5 text-[13px] font-semibold text-ink-soft">
        Grown-ups, pets, anyone. Kids' birthdays are set on their People card.
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <input
              type="text"
              value={row.name}
              placeholder="Name (e.g. Mom)"
              onChange={(e) => set(i, { name: e.target.value })}
              className={`${textInput} !w-[180px]`}
            />
            <input type="date" value={row.date} onChange={(e) => set(i, { date: e.target.value })} className={`${textInput} !w-[190px]`} />
            <button
              onClick={() => setRows((r) => r.filter((_, k) => k !== i))}
              className="min-h-11 min-w-11 rounded-xl text-xl font-black text-destructive active:scale-90"
              aria-label={`Remove ${row.name || 'birthday'}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2.5">
        <button onClick={() => setRows((r) => [...r, { name: '', date: '' }])} className={outlineButton}>
          + Add birthday
        </button>
        <button onClick={save} className={outlineButton}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export const WeatherEntityEditor: React.FC = () => {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const weather = useStore((s) => s.weather);
  const ref = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    const v = ref.current?.value.trim();
    if (!v) return;
    await updateSettings({ weather_entity: v });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[13px] font-bold text-ink-soft">now: {weather}</span>
      <input
        ref={ref}
        type="text"
        defaultValue={settings?.weather_entity || 'weather.home'}
        className="w-40 rounded-xl border-2 border-ink/25 bg-white/70 px-3 py-2.5 text-sm font-bold text-ink focus:border-vault focus:outline-none"
      />
      <button onClick={save} className={outlineButton}>
        {saved ? '✓' : 'Save'}
      </button>
    </div>
  );
};

/** Motion: follow the tablet's reduce-motion setting, or always animate.
 * Mutually exclusive class sets per state (segOn / segOff). */
export const MotionEditor: React.FC = () => {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const tabletReduces = useReducedMotion();
  const mode = settings?.motion ?? 'auto';
  const opts: { id: 'always' | 'auto'; label: string }[] = [
    { id: 'always', label: '✨ Always animate' },
    { id: 'auto', label: 'Follow tablet' },
  ];
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex w-[330px] gap-2">
        {opts.map((o) => (
          <button
            key={o.id}
            onClick={() => mode !== o.id && updateSettings({ motion: o.id })}
            className={mode === o.id ? segOn.vault : segOff}
          >
            {o.label}
          </button>
        ))}
      </div>
      <span className="text-[12px] font-bold text-ink-soft">
        {tabletReduces ? 'This tablet asks for reduced motion' : 'This tablet allows motion'}
      </span>
    </div>
  );
};
