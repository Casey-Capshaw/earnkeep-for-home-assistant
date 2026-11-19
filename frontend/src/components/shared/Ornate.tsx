// EarnKeep — ornament kit for the layered-world UI (2026-11-10).
// Ornate: an ink-engraved paper panel (double rule + curled corner
// flourishes, original design) that lets the world glow through, with an
// optional colored light source (a kid's color) pooling from the top-left.
// Divider: a small-caps label followed by a curl-and-diamond rule.
// The corner/divider art is SVG drawn in the day's actual ink color (CSS
// variables can't reach inside a data-URI image), via DayContext.

import React, { createContext, useContext, useMemo } from 'react';
import { leaf, spiral } from '../../world/scene';
import type { Day } from '../../world/daily';

export const DayContext = createContext<Day | null>(null);
export const useWorldDay = () => useContext(DayContext);

const FALLBACK_INK = '#1C4A40';

const svgUrl = (w: number, h: number, vb: string, body: string) =>
  `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>`)}")`;

const cornerCache = new Map<string, string>();
function cornerUri(ink: string) {
  let hit = cornerCache.get(ink);
  if (hit) return hit;
  let s = '';
  s += `<path d="M5 70 L5 22 Q5 5 22 5 L70 5" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`;
  s += `<path d="M12 56 L12 26 Q12 12 26 12 L56 12" fill="none" stroke="${ink}" stroke-width="1.4" opacity=".55"/>`;
  s += spiral(30, 30, 12, 1.35, Math.PI * 1.25, 1, ink, 2.4);
  s += leaf(70, 5, 0, 18, 4.5, ink);
  s += leaf(5, 70, Math.PI / 2, 18, 4.5, ink);
  s += `<path d="M5 0 L10 5 L5 10 L0 5Z" fill="${ink}"/>`;
  hit = svgUrl(96, 96, '-2 -2 98 98', s);
  cornerCache.set(ink, hit);
  return hit;
}

const dividerCache = new Map<string, string>();
function dividerUri(ink: string) {
  let hit = dividerCache.get(ink);
  if (hit) return hit;
  let s = `<path d="M30 10 L170 10" stroke="${ink}" stroke-width="1.6" opacity=".5"/>`;
  s += `<path d="M100 3 L107 10 L100 17 L93 10Z" fill="${ink}"/>`;
  s += spiral(84, 10, 6, 1.1, 0, -1, ink, 1.8) + spiral(116, 10, 6, 1.1, Math.PI, 1, ink, 1.8);
  s += leaf(30, 10, Math.PI, 14, 3.5, ink) + leaf(170, 10, 0, 14, 3.5, ink);
  hit = svgUrl(200, 20, '0 0 200 20', s);
  dividerCache.set(ink, hit);
  return hit;
}

const CORNERS: React.CSSProperties[] = [
  { left: -7, top: -7 },
  { right: -7, top: -7, transform: 'scaleX(-1)' },
  { left: -7, bottom: -7, transform: 'scaleY(-1)' },
  { right: -7, bottom: -7, transform: 'scale(-1,-1)' },
];

interface OrnateProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** A light source in this color pools from the panel's top-left. */
  glow?: string;
  /** Corner flourish size in px (default 78; use ~40 for small chrome). */
  corner?: number;
  /** Gold corners — birthdays. */
  gold?: boolean;
  /** Paper opacity 0–1 (default .78 — lets the world show through). */
  opacity?: number;
  /** What the sprites treat this as: a panel to climb/peek around, or the dock. */
  surface?: 'panel' | 'dock';
}

export const Ornate: React.FC<OrnateProps> = ({ children, className = '', style, glow, corner = 78, gold, opacity = 0.78, surface = 'panel' }) => {
  const day = useWorldDay();
  const ink = gold ? '#B8872A' : day?.ink ?? FALLBACK_INK;
  const c = useMemo(() => cornerUri(ink), [ink]);
  return (
    <div className={`relative ${className}`} style={style} data-ek-surface={surface}>
      {glow && (
        <div
          className="pointer-events-none absolute -inset-10"
          style={{
            background: `radial-gradient(45% 40% at 22% 18%, ${glow}66 0%, transparent 70%)`,
            animation: 'ek-breathe 6s ease-in-out infinite',
          }}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]"
        style={{
          background: `color-mix(in srgb, var(--color-paper) ${Math.round(opacity * 100)}%, transparent)`,
          boxShadow:
            'inset 0 0 0 2px color-mix(in srgb, var(--color-ink) 80%, transparent), inset 0 0 0 7px color-mix(in srgb, var(--color-paper) 70%, transparent), inset 0 0 0 8px color-mix(in srgb, var(--color-ink) 25%, transparent), 0 18px 40px -18px color-mix(in srgb, var(--color-ink) 45%, transparent)',
        }}
      >
        {glow && <div className="absolute inset-0" style={{ background: `radial-gradient(80% 55% at 10% 0%, ${glow}40 0%, transparent 70%)` }} />}
      </div>
      {CORNERS.map((pos, i) => (
        <div
          key={i}
          className="pointer-events-none absolute"
          style={{ width: corner, height: corner, backgroundImage: c, backgroundSize: 'contain', ...pos }}
        />
      ))}
      <div className="relative h-full">{children}</div>
    </div>
  );
};

export const Divider: React.FC<{ label: React.ReactNode; className?: string }> = ({ label, className = '' }) => {
  const day = useWorldDay();
  const d = useMemo(() => dividerUri(day?.inkSoft ?? '#6E8F78'), [day?.inkSoft]);
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="whitespace-nowrap font-display text-[19px] leading-none text-ink-soft">{label}</span>
      <span className="h-5 min-w-10 flex-1" style={{ backgroundImage: d, backgroundSize: '100% 100%' }} />
    </div>
  );
};
