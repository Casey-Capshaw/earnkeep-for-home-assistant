// EarnKeep — small ambient creatures (original designs). They live on the
// 1280x800 stage ABOVE the desk cards and below the front framing, and
// interact with the UI: a bird perches on a desk's top edge, a snail crawls
// the ground beside the dock, wings flutter through the top band.
// Pure CSS animation (transform/opacity only) — cheap on the tablet; the
// global prefers-reduced-motion rule freezes them in place.

import React from 'react';

export type CritterKind = 'bird' | 'snail' | 'butterflies' | 'moths' | 'beetle' | 'bats';

interface Props {
  ink: string;
  accent: string; // palette glow / seasonal accent
  seed: number;
}

const abs = (x: number, y: number): React.CSSProperties => ({ position: 'absolute', left: x, top: y, pointerEvents: 'none' });

export const Bird: React.FC<Props & { hat?: string[] }> = ({ ink, accent, seed, hat }) => {
  // perch on the top edge of one desk (cards start ~112px on the kiosk)
  const x = seed % 2 ? 180 + (seed % 230) : 820 + (seed % 260);
  return (
    <div style={{ ...abs(x, 112 - 30), width: 40, height: 32, animation: 'ek-hop 7s ease-in-out infinite', transformOrigin: '50% 100%' }}>
      <svg width="40" height="32" viewBox="0 0 40 32" style={{ overflow: 'visible' }}>
        <path d="M6 18 L-2 12 L4 20Z" fill={ink} />
        <ellipse cx="17" cy="19" rx="13" ry="9" fill={ink} />
        <ellipse cx="21" cy="22" rx="7" ry="5" fill={accent} />
        <g style={{ animation: 'ek-peck 7s ease-in-out infinite', transformOrigin: '27px 14px' }}>
          <circle cx="28" cy="12" r="7" fill={ink} />
          <path d="M34 11 L40 13 L34 15Z" fill={accent} />
          <circle cx="30" cy="10.5" r="1.6" fill="#fff" />
          {hat && (
            <g transform="rotate(-14 28 6)">
              <path d="M22 7 L28 -9 L34 7Z" fill={hat[0]} stroke={ink} strokeWidth="1" />
              <path d="M24.5 1 L31.5 1" stroke={hat[1]} strokeWidth="2.2" />
              <circle cx="28" cy="-9" r="2.4" fill={hat[1]} />
            </g>
          )}
        </g>
        <path d="M14 27 L13 32 M20 27 L21 32" stroke={ink} strokeWidth="1.6" />
      </svg>
    </div>
  );
};

export const Snail: React.FC<Props> = ({ ink, accent, seed }) => {
  const x = 70 + (seed % 90);
  return (
    <div style={{ ...abs(x, 800 - 24), width: 44, height: 26, ['--crawl' as string]: '260px', animation: 'ek-crawl 90s linear infinite' }}>
      <svg width="44" height="26" viewBox="0 0 44 26">
        <path d="M2 24 Q10 18 30 20 L36 12 Q38 8 40 12 L38 22 Q30 26 2 25Z" fill={ink} />
        <path d="M36 12 L35 4 M38 12 L40 5" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="35" cy="4" r="1.6" fill={ink} />
        <circle cx="40" cy="5" r="1.6" fill={ink} />
        <circle cx="17" cy="13" r="10" fill={accent} stroke={ink} strokeWidth="2" />
        <path d="M17 13 m0 -6 a6 6 0 1 1 -5 9 a4 4 0 1 1 6 -5 a2 2 0 1 1 -2 2" fill="none" stroke={ink} strokeWidth="1.6" />
      </svg>
    </div>
  );
};

export const Beetle: React.FC<Props> = ({ ink, accent, seed }) => {
  const x = 900 + (seed % 120);
  return (
    <div style={{ ...abs(x, 800 - 18), width: 30, height: 18, ['--crawl' as string]: '200px', animation: 'ek-crawl 40s linear infinite' }}>
      <svg width="30" height="18" viewBox="0 0 30 18" style={{ animation: 'ek-scuttle .25s steps(2) infinite' }}>
        <path d="M6 14 L3 18 M12 15 L11 18 M18 15 L19 18 M23 14 L26 18" stroke={ink} strokeWidth="1.5" />
        <ellipse cx="14" cy="10" rx="11" ry="7" fill={ink} />
        <path d="M14 3 L14 16" stroke={accent} strokeWidth="1.4" />
        <circle cx="26" cy="10" r="4" fill={ink} />
        <path d="M28 7 Q31 3 30 1 M28 8 Q32 6 33 5" stroke={ink} strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
};

const Wings: React.FC<{ color: string; ink: string; size: number }> = ({ color, ink, size }) => (
  <svg width={size} height={size} viewBox="0 0 20 20">
    <g style={{ animation: 'ek-flap .22s ease-in-out infinite alternate', transformOrigin: '10px 10px' }}>
      <path d="M10 10 Q2 0 1 7 Q0 13 10 11Z" fill={color} stroke={ink} strokeWidth=".8" />
      <path d="M10 10 Q18 0 19 7 Q20 13 10 11Z" fill={color} stroke={ink} strokeWidth=".8" />
      <path d="M10 11 Q4 18 6 19 Q9 18 10 12Z M10 11 Q16 18 14 19 Q11 18 10 12Z" fill={color} stroke={ink} strokeWidth=".8" />
    </g>
    <path d="M10 6 L10 15" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const Butterflies: React.FC<Props & { night?: boolean; bats?: boolean }> = ({ ink, accent, seed, night, bats }) => {
  const colors = bats ? ['#3B2C4E', '#4A3560'] : night ? ['#F4F1E6', '#E9E4F7', '#FFF6D8'] : [accent, '#F6AFC6', '#9FD6F0'];
  const n = night ? 3 : 2;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = night ? 600 + ((seed * (i + 3)) % 300) : 300 + ((seed * (i + 7)) % 700);
        return (
          <div
            key={i}
            style={{
              ...abs(x, night ? 40 + i * 14 : 30 + i * 30),
              animation: `${night ? 'ek-orbit' : 'ek-wander'} ${night ? 5 + i * 1.3 : 22 + i * 6}s ease-in-out ${-i * 4}s infinite`,
            }}
          >
            <Wings color={colors[i % colors.length]} ink={ink} size={night ? 14 : 22} />
          </div>
        );
      })}
    </>
  );
};

export const CRITTER_CSS = `
@keyframes ek-hop { 0%, 80%, 100% { transform: translateY(0) scale(1); } 83% { transform: translateY(0) scale(1.1, .88); } 87% { transform: translateY(-12px) scale(.94, 1.08); } 91% { transform: translateY(0) scale(1.08, .92); } 94% { transform: translateY(-5px); } 97% { transform: translateY(0); } }
@keyframes ek-peck { 0%, 40%, 52%, 100% { transform: rotate(0); } 44% { transform: rotate(28deg); } 48% { transform: rotate(-8deg); } 60% { transform: rotate(-14deg); } 66% { transform: rotate(0); } }
@keyframes ek-crawl { 0% { transform: translateX(0) scaleX(1); } 49.9% { transform: translateX(var(--crawl)) scaleX(1); } 50% { transform: translateX(var(--crawl)) scaleX(-1); } 99.9% { transform: translateX(0) scaleX(-1); } 100% { transform: translateX(0) scaleX(1); } }
@keyframes ek-scuttle { from { transform: translateY(0); } to { transform: translateY(-1px); } }
@keyframes ek-flap { from { transform: scaleX(1); } to { transform: scaleX(.25); } }
@keyframes ek-wander { 0% { transform: translate(0, 0); } 20% { transform: translate(140px, 30px); } 40% { transform: translate(260px, -10px); } 60% { transform: translate(160px, 50px); } 80% { transform: translate(40px, 20px); } 100% { transform: translate(0, 0); } }
@keyframes ek-orbit { 0% { transform: translate(0, 0); } 25% { transform: translate(40px, 20px); } 50% { transform: translate(0, 38px); } 75% { transform: translate(-40px, 16px); } 100% { transform: translate(0, 0); } }
`;
