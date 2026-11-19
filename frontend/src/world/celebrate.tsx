// EarnKeep — animated celebration pieces for special days (original art).
// All on the 1280x800 stage: balloons ride the side gutters and bob beside
// the dock, fireworks pop in the top band, the ribbon banner lives in the
// header. CSS transform/opacity animations only.

import React, { useMemo } from 'react';
import { rng } from './scene';
import type { Special } from './festive';

const abs = (x: number, y: number): React.CSSProperties => ({ position: 'absolute', left: x, top: y, pointerEvents: 'none' });

const Balloon: React.FC<{ color: string; ink: string; size?: number; string?: number }> = ({ color, ink, size = 34, string = 60 }) => (
  <svg width={size} height={size * 1.25 + string} viewBox={`0 0 34 ${42 + (string * 34) / size}`} style={{ overflow: 'visible' }}>
    <path d={`M17 41 q-4 ${string * 0.3} 2 ${string * 0.6} t-2 ${string * 0.4}`} stroke={ink} strokeWidth="1" fill="none" opacity=".7" />
    <path d="M17 1 C30 1 34 14 31 24 C28 33 21 38 17 38 C13 38 6 33 3 24 C0 14 4 1 17 1Z" fill={color} stroke={ink} strokeWidth="1.4" />
    <path d="M14 38 L17 42 L20 38Z" fill={color} stroke={ink} strokeWidth="1" />
    <ellipse cx="11" cy="11" rx="3.5" ry="6" fill="#fff" opacity=".55" transform="rotate(20 11 11)" />
  </svg>
);

/** Balloon clusters tied beside the dock + strays floating up the gutters. */
export const Balloons: React.FC<{ colors: string[]; ink: string; many: boolean; seed: number }> = ({ colors, ink, many, seed }) => {
  const strays = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: many ? 6 : 2 }, (_, i) => ({ i, x: i % 2 ? 1236 + r() * 10 : 4 + r() * 10, dur: 18 + r() * 10, delay: -r() * 28, c: colors[i % colors.length] }));
  }, [colors, many, seed]);
  const cluster = (x: number, flip: number) => (
    <div style={{ ...abs(x, 700), width: 110, height: 110 }}>
      {[0, 1, 2].map((k) => (
        <div key={k} style={{ position: 'absolute', left: k * 30 * flip + (flip < 0 ? 60 : 0), top: [10, -6, 14][k], animation: `ek-bob ${3 + k * 0.6}s ease-in-out ${-k}s infinite alternate`, transformOrigin: '50% 100%' }}>
          <Balloon color={colors[(k + (flip < 0 ? 1 : 0)) % colors.length]} ink={ink} string={70 + k * 8} />
        </div>
      ))}
    </div>
  );
  return (
    <>
      {cluster(300, 1)}
      {cluster(870, -1)}
      {strays.map((b) => (
        <div key={b.i} style={{ ...abs(b.x, 820), animation: `ek-balloon-rise ${b.dur}s linear ${b.delay}s infinite` }}>
          <Balloon color={b.c} ink={ink} size={30} string={40} />
        </div>
      ))}
    </>
  );
};

/** Fireworks popping in the top band. */
export const Fireworks: React.FC<{ colors: string[]; seed: number }> = ({ colors, seed }) => {
  const bursts = useMemo(() => {
    const r = rng(seed + 9);
    return Array.from({ length: 5 }, (_, i) => ({ i, x: 380 + r() * 520, y: 20 + r() * 50, c: colors[i % colors.length], delay: -i * 1.3 - r(), dur: 3.2 + r() * 1.2 }));
  }, [colors, seed]);
  return (
    <>
      {bursts.map((b) => (
        <div key={b.i} style={{ ...abs(b.x, b.y), width: 0, height: 0 }}>
          {Array.from({ length: 12 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2;
            return (
              <span
                key={k}
                style={{
                  position: 'absolute',
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  background: '#fff',
                  boxShadow: `0 0 8px 3px ${b.c}`,
                  opacity: 0,
                  ['--fx' as string]: `${Math.cos(a) * 46}px`,
                  ['--fy' as string]: `${Math.sin(a) * 46}px`,
                  animation: `ek-burst ${b.dur}s ease-out ${b.delay}s infinite`,
                }}
              />
            );
          })}
        </div>
      ))}
    </>
  );
};

/** Ribbon banner for the header — forked tails, display face, sparkles. */
export const Banner: React.FC<{ sp: Special; font: string; weight: number; ink: string }> = ({ sp, font, weight, ink }) => {
  const c = sp.colors[0] === '#FFFFFF' ? sp.colors[1] : sp.colors[0];
  const tail = (side: 1 | -1) => (
    <svg width="46" height="44" viewBox="0 0 46 44" style={{ position: 'absolute', top: 10, [side < 0 ? 'left' : 'right']: -34, transform: side > 0 ? 'scaleX(-1)' : undefined }}>
      <path d="M46 4 L4 4 L16 22 L4 40 L46 40Z" fill={c} stroke={ink} strokeWidth="2" strokeLinejoin="round" style={{ filter: 'brightness(.82)' }} />
      <path d="M46 4 L36 0 L36 10Z" fill={ink} opacity=".5" />
    </svg>
  );
  return (
    <div style={{ position: 'relative', animation: sp.intensity === 'full' ? 'ek-banner 4s ease-in-out infinite' : undefined }}>
      {tail(-1)}
      {tail(1)}
      <div
        style={{
          position: 'relative',
          padding: '8px 30px 9px',
          background: `linear-gradient(180deg, #ffffff55, transparent 60%), ${c}`,
          border: `2px solid ${ink}`,
          borderRadius: 6,
          fontFamily: font,
          fontWeight: weight,
          fontSize: sp.intensity === 'full' ? 25 : 21,
          lineHeight: 1.1,
          color: ink,
          whiteSpace: 'nowrap',
          boxShadow: `0 4px 0 ${ink}55, 0 0 30px ${c}aa`,
        }}
      >
        {sp.banner}
      </div>
      {sp.intensity === 'full' &&
        [[-14, -8], [40, -14], [96, 44], [-8, 40]].map(([x, y], k) => (
          <span key={k} style={{ position: 'absolute', left: k % 2 ? `calc(100% - ${x}px)` : x, top: y, fontSize: 16, color: '#FFD84D', textShadow: '0 0 8px #fff', animation: `ek-twinkle ${1.4 + k * 0.3}s ease-in-out ${-k * 0.4}s infinite alternate` }}>
            ✦
          </span>
        ))}
    </div>
  );
};

/** Party hat perched on an avatar. */
export const PartyHat: React.FC<{ colors: string[]; ink: string }> = ({ colors, ink }) => (
  <svg width="40" height="46" viewBox="0 0 40 46" style={{ position: 'absolute', left: 30, top: -30, transform: 'rotate(18deg)', animation: 'ek-hat 3s ease-in-out infinite', transformOrigin: '50% 100%' }}>
    <path d="M20 6 L36 42 Q20 46 4 42Z" fill={colors[0]} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M14 20 L27 18 M10 30 L31 28" stroke={colors[1]} strokeWidth="4" />
    <circle cx="9" cy="35" r="2" fill="#fff" />
    <circle cx="22" cy="12" r="1.6" fill="#fff" />
    <circle cx="20" cy="5" r="5" fill={colors[2] === '#FFFFFF' ? colors[3] ?? '#fff' : colors[2]} stroke={ink} strokeWidth="1.2" />
  </svg>
);

export const FESTIVE_CSS = `
@keyframes ek-bob { from { transform: rotate(-4deg) translateY(0); } to { transform: rotate(4deg) translateY(-6px); } }
@keyframes ek-balloon-rise { 0% { transform: translate(0, 0) rotate(-3deg); opacity: 0; } 8% { opacity: 1; } 50% { transform: translate(8px, -460px) rotate(3deg); } 92% { opacity: 1; } 100% { transform: translate(-4px, -940px) rotate(-2deg); opacity: 0; } }
@keyframes ek-burst { 0% { transform: translate(0, 0) scale(.3); opacity: 0; } 4% { opacity: 1; } 30% { transform: translate(var(--fx), var(--fy)) scale(1); opacity: 1; } 50% { transform: translate(var(--fx), calc(var(--fy) + 14px)) scale(.6); opacity: 0; } 100% { opacity: 0; } }
@keyframes ek-banner { 0%, 100% { transform: rotate(-1deg) translateY(0); } 50% { transform: rotate(1deg) translateY(-3px); } }
@keyframes ek-twinkle { from { opacity: .2; transform: scale(.7); } to { opacity: 1; transform: scale(1.2); } }
@keyframes ek-hat { 0%, 100% { transform: rotate(18deg); } 50% { transform: rotate(10deg) translateY(-2px); } }
`;
