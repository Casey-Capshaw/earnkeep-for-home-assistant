// EarnKeep — the Sprites' toys. Held items (drawn in the hand, rig units,
// pointing along the arm), rides (drawn at the feet: bikes, go-karts,
// sleds, boxes, leaf piles, clouds…), free-moving things with their own
// tracks (balls, kites, paper planes, snowmen…), one-shot effect bursts
// and the little emote bubbles. All original, all transform-animated.

import React, { useMemo } from 'react';
import type { Emote, Fx, Held, Ride, Thing } from './types';

// The number on a kart's nose: any digit, fixed per kart color.
const kartNumber = (c: string) => ([...c].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 9) + 1;

const OUT = '#3B2A22';
const s = (w = 2.4) => ({ stroke: OUT, strokeWidth: w, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const });

/* ------------------------------------------------------------------ */
/* held (arm-local: hand at 0,29, arm points +y)                       */
/* ------------------------------------------------------------------ */

export const HeldItem: React.FC<{ id: Held }> = ({ id }) => {
  switch (id) {
    case 'wand':
      return (
        <g>
          <path d="M0 26 L0 54" stroke="#F2E6C9" strokeWidth={3} {...{ strokeLinecap: 'round' }} />
          <path d="M0 50 L3 57 L10 58 L4.5 62 L6 69 L0 65 L-6 69 L-4.5 62 L-10 58 L-3 57Z" fill="#FFE066" {...s(1.6)} style={{ animation: 'ek-tw-glow .6s ease-in-out infinite alternate' }} />
        </g>
      );
    case 'net':
      return (
        <g>
          <path d="M0 24 L0 62" stroke="#B07B45" strokeWidth={3.4} />
          <ellipse cx={0} cy={72} rx={11} ry={10} fill="rgba(255,255,255,.55)" {...s(2)} />
          <path d="M-8 66 L8 78 M8 66 L-8 78 M-11 72 L11 72" stroke={OUT} strokeWidth={0.8} opacity={0.5} />
        </g>
      );
    case 'sword':
      return (
        <g>
          <rect x={-4} y={30} width={8} height={40} rx={4} fill="#7CC8F0" {...s(2)} />
          <rect x={-9} y={28} width={18} height={5} rx={2.5} fill="#F2C230" {...s(1.6)} />
        </g>
      );
    case 'stick':
      return <path d="M0 24 L2 46 L-1 64 M2 46 L9 52" stroke="#8A5A33" strokeWidth={3.6} fill="none" strokeLinecap="round" />;
    case 'dandelion':
      return (
        <g>
          <path d="M0 26 Q3 38 0 48" stroke="#5E9B4A" strokeWidth={2.2} fill="none" />
          <circle cx={0} cy={54} r={9} fill="rgba(255,255,255,.92)" stroke="#D9D2C2" strokeWidth={1.4} />
          <circle cx={0} cy={54} r={2.6} fill="#C9B98F" />
        </g>
      );
    case 'bubblewand':
      return (
        <g>
          <path d="M0 26 L0 46" stroke="#F48FB1" strokeWidth={3} />
          <circle cx={0} cy={52} r={6.5} fill="rgba(200,240,255,.45)" stroke="#F48FB1" strokeWidth={2.4} />
        </g>
      );
    case 'lantern':
      return (
        <g>
          <circle cx={0} cy={46} r={24} fill="rgba(255,214,120,.35)" style={{ animation: 'ek-tw-glow 1.3s ease-in-out infinite alternate' }} />
          <path d="M0 28 L0 36" stroke={OUT} strokeWidth={1.6} />
          <rect x={-7} y={36} width={14} height={18} rx={4} fill="#FFE29A" {...s(2)} />
          <path d="M-8 36 L8 36 M-8 54 L8 54" stroke={OUT} strokeWidth={3} />
        </g>
      );
    case 'flashlight':
      return (
        <g>
          <path d="M-3 36 L-40 120 L40 120 L3 36Z" fill="rgba(255,248,200,.28)" />
          <rect x={-4} y={24} width={8} height={14} rx={2} fill="#3F4A5A" {...s(1.6)} />
        </g>
      );
    case 'jar':
      return (
        <g>
          <rect x={-8} y={30} width={16} height={18} rx={4} fill="rgba(220,245,255,.5)" {...s(1.8)} />
          {[[-3, 36], [3, 42], [0, 39]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={1.8} fill="#FFF59A" style={{ animation: `ek-tw-glow ${0.5 + i * 0.2}s ease-in-out infinite alternate` }} />
          ))}
          <rect x={-9} y={28} width={18} height={4} rx={1.5} fill="#B07B45" />
        </g>
      );
    case 'umbrella':
      return (
        <g>
          <path d="M0 22 L0 74" stroke={OUT} strokeWidth={2.4} />
          <path d="M-32 72 Q-30 100 0 102 Q30 100 32 72 Q24 78 16 72 Q8 78 0 72 Q-8 78 -16 72 Q-24 78 -32 72Z" fill="#F2C230" {...s(2)} />
          <path d="M0 72 L0 102 M-16 72 Q-12 90 0 102 M16 72 Q12 90 0 102" stroke={OUT} strokeWidth={1} opacity={0.4} fill="none" />
          <path d="M0 22 Q-6 22 -6 16" stroke={OUT} strokeWidth={2.4} fill="none" />
        </g>
      );
    case 'leaf':
      return (
        <g>
          <path d="M0 24 L0 50" stroke="#6B8E3A" strokeWidth={2.4} />
          <path d="M0 48 Q-26 66 0 96 Q26 66 0 48Z" fill="#7FB34F" {...s(2)} />
          <path d="M0 50 L0 94" stroke="#4E7A35" strokeWidth={1.2} />
        </g>
      );
    case 'balloon':
    case 'balloons': {
      const many = id === 'balloons';
      const cs = ['#FF6B8A', '#FFD166', '#6EC6FF', '#B79CF0'];
      const pos = many ? [[-12, 96], [12, 100], [0, 110]] : [[0, 100]];
      return (
        <g>
          {pos.map(([x, y], i) => (
            <g key={i}>
              <path d={`M0 28 Q${x / 2} ${(28 + y) / 2 + 6} ${x} ${y - 10}`} stroke={OUT} strokeWidth={1} fill="none" />
              <ellipse cx={x} cy={y} rx={10} ry={12} fill={cs[i]} {...s(1.6)} />
              <ellipse cx={x - 3} cy={y + 4} rx={2.4} ry={3.4} fill="#FFFFFF" opacity={0.6} />
            </g>
          ))}
        </g>
      );
    }
    case 'teddy':
      return (
        <g transform="translate(0 40)">
          <circle cx={0} cy={0} r={9} fill="#B07B45" {...s(1.8)} />
          <circle cx={0} cy={13} r={8} fill="#B07B45" {...s(1.8)} />
          <circle cx={-7} cy={-6} r={3.4} fill="#B07B45" {...s(1.4)} />
          <circle cx={7} cy={-6} r={3.4} fill="#B07B45" {...s(1.4)} />
          <circle cx={-3} cy={-1} r={1.2} fill={OUT} />
          <circle cx={3} cy={-1} r={1.2} fill={OUT} />
        </g>
      );
    case 'bucket':
      return (
        <g>
          <path d="M-8 30 Q0 22 8 30" stroke={OUT} strokeWidth={1.6} fill="none" />
          <path d="M-11 32 Q-12 50 0 50 Q12 50 11 32Z" fill="#F08A24" {...s(2)} />
          <path d="M-5 38 L-2 40 M5 38 L2 40 M-5 45 Q0 48 5 45" stroke={OUT} strokeWidth={1.4} fill="none" />
        </g>
      );
    case 'horn':
      return (
        <g>
          <path d="M-2 22 L-14 56 L10 56 L2 22Z" fill="#FFD166" {...s(1.6)} />
          <path d="M-12 50 L8 50" stroke="#F48FB1" strokeWidth={3} />
        </g>
      );
    case 'snowball':
      return <circle cx={0} cy={36} r={7} fill="#FFFFFF" {...s(1.6)} />;
    case 'flower':
      return (
        <g>
          <path d="M0 26 L0 48" stroke="#5E9B4A" strokeWidth={2.2} />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 4} cy={52 + Math.sin((a * Math.PI) / 180) * 4} r={3.4} fill="#F48FB1" {...s(1)} />
          ))}
          <circle cx={0} cy={52} r={2.4} fill="#FFD166" />
        </g>
      );
    case 'kitestring':
      return <rect x={-4} y={28} width={8} height={7} rx={2} fill="#B07B45" {...s(1.2)} />;
    case 'hook':
      return (
        <g>
          <rect x={-5} y={26} width={10} height={16} rx={3} fill="#5A6472" {...s(1.6)} />
          <rect x={-3} y={40} width={6} height={10} fill="#3F4A5A" />
        </g>
      );
    case 'rope':
      return <rect x={-3.5} y={26} width={7} height={11} rx={3} fill="#F48FB1" {...s(1.2)} />;
    case 'present':
      return (
        <g transform="translate(0 44)">
          <rect x={-11} y={-9} width={22} height={18} rx={2} fill="#6EC6FF" {...s(1.8)} />
          <path d="M0 -9 L0 9 M-11 0 L11 0" stroke="#FF6B8A" strokeWidth={3.4} />
        </g>
      );
    case 'popsicle':
      return (
        <g>
          <path d="M0 28 L0 40" stroke="#E5C38E" strokeWidth={3} />
          <rect x={-6} y={38} width={12} height={20} rx={6} fill="#FF7F6E" {...s(1.6)} />
        </g>
      );
    case 'flag':
      return (
        <g>
          <path d="M0 22 L0 70" stroke="#8A5A33" strokeWidth={2.4} />
          <path d="M0 70 L20 64 L0 56Z" fill="#FF6B8A" {...s(1.4)} />
        </g>
      );
    default:
      return null;
  }
};

/* ------------------------------------------------------------------ */
/* rides (feet-local)                                                  */
/* ------------------------------------------------------------------ */

/** riderY: shift the kid rig (rig units). pose: the kid's pose while riding.
 * over: draw the ride OVER the kid (sitting inside it). */
export const RIDES: Record<Ride, { riderY: number; pose: import('./types').Pose; over: boolean }> = {
  bike: { riderY: -13, pose: 'ride', over: false },
  kart: { riderY: -15, pose: 'drive', over: true },
  scooter: { riderY: -8, pose: 'skate', over: false },
  skateboard: { riderY: -9, pose: 'skate', over: false },
  sled: { riderY: -11, pose: 'drive', over: true },
  box: { riderY: 0, pose: 'hide', over: true },
  leafpile: { riderY: 0, pose: 'hide', over: true },
  snowpile: { riderY: 0, pose: 'crouch', over: true },
  cloud: { riderY: -27, pose: 'sit', over: true },
  broom: { riderY: -10, pose: 'ride', over: false },
  board: { riderY: -6, pose: 'balance', over: false },
  tube: { riderY: -8, pose: 'sit', over: true },
};

const Wheel: React.FC<{ x: number; y: number; r: number; spin: boolean }> = ({ x, y, r, spin }) => (
  <g transform={`translate(${x} ${y})`}>
    <g style={spin ? { animation: 'ek-tw-spin .35s linear infinite' } : undefined}>
      <circle r={r} fill="#2B2F36" {...s(2)} />
      <circle r={r * 0.45} fill="#C9CED6" />
      <path d={`M${-r * 0.8} 0 L${r * 0.8} 0 M0 ${-r * 0.8} L0 ${r * 0.8}`} stroke="#C9CED6" strokeWidth={1.2} />
    </g>
  </g>
);

export const RideItem: React.FC<{ id: Ride; moving: boolean; color: string; color2: string }> = ({ id, moving, color, color2 }) => {
  switch (id) {
    case 'bike':
      return (
        <g>
          <Wheel x={-24} y={-15} r={15} spin={moving} />
          <Wheel x={26} y={-15} r={15} spin={moving} />
          <path d="M-24 -15 L-4 -40 L20 -40 L26 -15 M-4 -40 L4 -15 L20 -40 M20 -40 L16 -54 L24 -56" fill="none" stroke={color} strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M-12 -42 L2 -42" stroke={OUT} strokeWidth={5} strokeLinecap="round" />
        </g>
      );
    case 'kart':
      return (
        <g>
          <path d="M-40 -30 L-34 -50 L-24 -50 L-26 -28Z" fill={color2} {...s()} />
          <path d="M-38 -10 L-38 -30 Q-10 -36 28 -26 L40 -16 L38 -8 Z" fill={color} {...s()} />
          <circle cx={0} cy={-20} r={6} fill="#FFFFFF" {...s(1.4)} />
          <text x={0} y={-16.5} textAnchor="middle" fontSize={9} fontWeight={900} fontFamily="sans-serif" fill={OUT}>{kartNumber(color)}</text>
          <path d="M18 -26 L22 -40" stroke={OUT} strokeWidth={2.6} />
          <ellipse cx={22} cy={-41} rx={6} ry={2.4} fill="#2B2F36" />
          <Wheel x={-27} y={-9} r={9.5} spin={moving} />
          <Wheel x={27} y={-9} r={9.5} spin={moving} />
        </g>
      );
    case 'scooter':
      return (
        <g>
          <path d="M-26 -6 L22 -6 L26 -60 M18 -60 L32 -62" fill="none" stroke={color} strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
          <Wheel x={-24} y={-5} r={5.5} spin={moving} />
          <Wheel x={22} y={-5} r={5.5} spin={moving} />
        </g>
      );
    case 'skateboard':
      return (
        <g>
          <path d="M-30 -9 Q-34 -9 -33 -13 L33 -13 Q34 -9 30 -9Z" fill={color} {...s(2)} />
          <Wheel x={-20} y={-4} r={4.4} spin={moving} />
          <Wheel x={20} y={-4} r={4.4} spin={moving} />
        </g>
      );
    case 'sled':
      return (
        <g>
          <path d="M-36 -4 L30 -4 Q44 -4 42 -18 Q40 -26 34 -22" fill="none" stroke="#B9C0CA" strokeWidth={3.4} strokeLinecap="round" />
          <path d="M-34 -10 L32 -10 L36 -26 L-34 -26Z" fill="#C0583A" {...s(2.2)} />
          <path d="M-22 -26 L-22 -10 M-6 -26 L-6 -10 M10 -26 L10 -10" stroke={OUT} strokeWidth={1} opacity={0.45} />
        </g>
      );
    case 'box':
      return (
        <g>
          <path d="M-30 0 L-30 -44 L30 -44 L30 0Z" fill="#D2A26B" {...s(2.4)} />
          <path d="M-30 -44 L-40 -58 L-8 -50 Z M30 -44 L40 -58 L8 -50Z" fill="#C08F57" {...s(2)} />
          <path d="M-14 -26 L14 -26" stroke="#9C7040" strokeWidth={4} opacity={0.6} />
        </g>
      );
    case 'leafpile':
    case 'snowpile': {
      const snow = id === 'snowpile';
      return (
        <g>
          <path d="M-44 0 Q-46 -26 -24 -34 Q-12 -50 6 -40 Q26 -48 36 -30 Q48 -22 44 0Z" fill={snow ? '#FFFFFF' : '#E8893A'} {...s(2.4)} />
          {!snow &&
            [[-28, -16, '#D9663A'], [-6, -30, '#F0B44C'], [18, -20, '#B9533F'], [30, -8, '#F0B44C'], [-14, -6, '#B9533F']].map(([x, y, c], i) => (
              <path key={i} d={`M${x} ${y} q6 -6 12 0 q-6 6 -12 0Z`} fill={c as string} stroke={OUT} strokeWidth={1} />
            ))}
          {snow && <path d="M-30 -14 Q-20 -20 -10 -16 M8 -28 Q18 -32 26 -26" stroke="#CFE3F2" strokeWidth={2.4} fill="none" />}
        </g>
      );
    }
    case 'cloud':
      return (
        <g>
          <path d="M-46 -8 Q-56 -26 -36 -30 Q-32 -48 -10 -42 Q4 -56 22 -42 Q44 -46 44 -26 Q58 -18 46 -8Z" fill="#FFFFFF" stroke="#C9D7E8" strokeWidth={2.4} />
          <path d="M-30 -16 Q-10 -10 10 -16 Q26 -20 36 -14" stroke="#E2EAF4" strokeWidth={3} fill="none" />
        </g>
      );
    case 'broom':
      return (
        <g>
          <path d="M-38 -36 L44 -40" stroke="#8A5A33" strokeWidth={4} strokeLinecap="round" />
          <path d="M-38 -36 L-62 -46 L-64 -24 Z" fill="#E0B95C" {...s(2)} />
          <path d="M-38 -36 L-42 -36" stroke="#6B4BA8" strokeWidth={5} />
        </g>
      );
    case 'tube': // striped inner tube
      return (
        <g>
          <ellipse cx={0} cy={-8} rx={44} ry={13} fill="#F2C230" {...s(2.4)} />
          <ellipse cx={0} cy={-11} rx={24} ry={5} fill="rgba(80,120,150,.55)" />
          {[-30, -12, 8, 26].map((x) => (
            <path key={x} d={`M${x} ${-20} Q${x + 4} ${-8} ${x} ${3}`} stroke="#22262E" strokeWidth={4.5} fill="none" />
          ))}
          <path d="M-58 4 Q-48 0 -38 4 M40 4 Q50 0 60 4" stroke="#BFE6F5" strokeWidth={2.4} fill="none" style={{ animation: 'ek-tw-glow .6s ease-in-out infinite alternate' }} />
        </g>
      );
    case 'board':
      return (
        <g>
          <ellipse cx={0} cy={-3} rx={44} ry={5} fill={color} {...s(2)} />
          <path d="M-30 -3 L30 -3" stroke="#FFFFFF" strokeWidth={1.6} opacity={0.7} />
          <path d="M-56 2 Q-46 -2 -36 2 M40 2 Q50 -2 60 2" stroke="#BFE6F5" strokeWidth={2.4} fill="none" style={{ animation: 'ek-tw-glow .5s ease-in-out infinite alternate' }} />
        </g>
      );
    default:
      return null;
  }
};

/* ------------------------------------------------------------------ */
/* things (own tracks; center-local, rig units)                        */
/* ------------------------------------------------------------------ */

export const ThingItem: React.FC<{ id: Thing; variant?: number; moving: boolean }> = ({ id, variant = 0, moving }) => {
  switch (id) {
    case 'ball':
    case 'beachball': {
      const kind = id === 'beachball' ? 1 : variant % 3;
      const r = kind === 1 ? 14 : 10;
      return (
        <g style={moving ? { animation: 'ek-tw-spin .5s linear infinite' } : undefined}>
          <circle r={r} fill={kind === 2 ? '#F08A24' : '#FFFFFF'} {...s(2)} />
          {kind === 0 && <path d="M0 -4 L4 -1 L2.5 4 L-2.5 4 L-4 -1Z" fill={OUT} />}
          {kind === 1 && (
            <>
              <path d={`M0 ${-r} Q-9 0 0 ${r}`} stroke="#FF6B8A" strokeWidth={4} fill="none" />
              <path d={`M0 ${-r} Q9 0 0 ${r}`} stroke="#6EC6FF" strokeWidth={4} fill="none" />
            </>
          )}
          {kind === 2 && <path d={`M${-r} 0 L${r} 0 M0 ${-r} L0 ${r} M-6 -8 Q-2 0 -6 8 M6 -8 Q2 0 6 8`} stroke={OUT} strokeWidth={1.2} fill="none" />}
        </g>
      );
    }
    case 'frisbee':
      return <ellipse rx={13} ry={4} fill="#FF6B8A" {...s(2)} />;
    case 'snowball':
      return <circle r={7} fill="#FFFFFF" {...s(1.6)} />;
    case 'waterballoon':
      return <path d="M0 -10 Q10 -6 8 4 Q4 10 0 10 Q-4 10 -8 4 Q-10 -6 0 -10Z" fill="#6EC6FF" {...s(1.6)} />;
    case 'plane':
      return (
        <g>
          <path d="M-18 0 L18 -2 L-14 -10Z" fill="#FFFFFF" {...s(1.6)} />
          <path d="M-18 0 L18 -2 L-10 6Z" fill="#E9EEF5" {...s(1.6)} />
        </g>
      );
    case 'rocket':
      return (
        <g>
          {variant === 1 && <path d="M-5 18 Q0 40 5 18Z" fill="#FFB547" style={{ animation: 'ek-tw-glow .12s steps(2) infinite' }} />}
          <path d="M-7 18 L-7 -6 Q0 -24 7 -6 L7 18Z" fill="#F4F4F0" {...s(2)} />
          <path d="M-7 8 L-14 20 L-7 18Z M7 8 L14 20 L7 18Z" fill="#E2483D" {...s(1.6)} />
          <circle cx={0} cy={-2} r={3} fill="#6EC6FF" {...s(1.2)} />
        </g>
      );
    case 'kite':
      return (
        <g style={{ animation: 'ek-tw-rot 1.6s ease-in-out infinite alternate', ['--b' as string]: '0deg', ['--a' as string]: '10deg' }}>
          <path d="M0 -24 L17 0 L0 26 L-17 0Z" fill="#FF6B8A" {...s(2)} />
          <path d="M0 -24 L0 26 M-17 0 L17 0" stroke={OUT} strokeWidth={1.2} />
          <path d="M0 -24 L17 0 L0 0Z" fill="#FFD166" />
          <path d="M0 26 Q-8 38 2 46 Q10 54 0 62" stroke={OUT} strokeWidth={1.2} fill="none" />
          {[38, 50, 60].map((y) => (
            <path key={y} d={`M-5 ${y} L5 ${y + 4} M5 ${y} L-5 ${y + 4}`} stroke="#6EC6FF" strokeWidth={2.6} />
          ))}
        </g>
      );
    case 'hook':
      return (
        <g>
          <path d="M0 -4 L0 6 M0 -4 Q-9 -6 -9 2 M0 -4 Q9 -6 9 2 M0 -4 L0 -12" stroke="#5A6472" strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'present':
      return (
        <g>
          {variant === 1 ? (
            <path d="M-16 -2 L-24 -22 L4 -26Z" fill="#FF6B8A" {...s(1.8)} />
          ) : (
            <>
              <rect x={-17} y={-18} width={34} height={6} rx={1.5} fill="#FF6B8A" {...s(1.8)} />
              <path d="M0 -18 Q-10 -30 -10 -20 M0 -18 Q10 -30 10 -20" stroke="#FFD166" strokeWidth={3.4} fill="none" />
            </>
          )}
          <rect x={-15} y={-12} width={30} height={24} rx={2} fill="#6EC6FF" {...s(1.8)} />
          <path d="M0 -12 L0 12" stroke="#FFD166" strokeWidth={4} />
        </g>
      );
    case 'snowman': {
      const st = Math.max(1, variant);
      return (
        <g>
          <circle cx={0} cy={-16} r={17} fill="#FFFFFF" {...s(2)} />
          {st >= 2 && <circle cx={0} cy={-44} r={12} fill="#FFFFFF" {...s(2)} />}
          {st >= 3 && (
            <g>
              <circle cx={0} cy={-64} r={9} fill="#FFFFFF" {...s(2)} />
              <circle cx={-3} cy={-66} r={1.4} fill={OUT} />
              <circle cx={3} cy={-66} r={1.4} fill={OUT} />
              <path d="M0 -63 L8 -61 L0 -60Z" fill="#F08A24" />
              <path d="M-10 -54 Q0 -50 10 -54 L10 -50 Q0 -46 -10 -50Z" fill="#E2483D" />
              <rect x={-7} y={-80} width={14} height={9} fill={OUT} />
              <rect x={-10} y={-72} width={20} height={2.5} fill={OUT} />
              <path d="M-12 -46 L-24 -54 M12 -46 L24 -54" stroke="#8A5A33" strokeWidth={2.2} />
            </g>
          )}
        </g>
      );
    }
    case 'puddle':
      return <ellipse cx={0} cy={-2} rx={34} ry={6} fill="rgba(110,170,220,.65)" stroke="#5B8DB8" strokeWidth={1.6} />;
    case 'box':
      return <RideItem id="box" moving={false} color="" color2="" />;
    case 'leafpile':
      return <RideItem id="leafpile" moving={false} color="" color2="" />;
    case 'butterfly':
      return (
        <g>
          <g style={{ animation: 'ek-tw-flap .18s ease-in-out infinite alternate' }}>
            <path d="M0 0 Q-12 -14 -14 -4 Q-14 6 0 2Z M0 0 Q12 -14 14 -4 Q14 6 0 2Z" fill="#B79CF0" {...s(1.2)} />
          </g>
          <path d="M0 -6 L0 6" stroke={OUT} strokeWidth={2} />
        </g>
      );
    case 'balloon':
      return (
        <g>
          <path d="M0 12 Q-4 24 2 36" stroke={OUT} strokeWidth={1} fill="none" />
          <ellipse cx={0} cy={0} rx={10} ry={12} fill={['#FF6B8A', '#FFD166', '#6EC6FF'][variant % 3]} {...s(1.6)} />
        </g>
      );
    case 'pumpkin':
      return (
        <g>
          <ellipse cx={0} cy={-10} rx={14} ry={11} fill="#F08A24" {...s(2)} />
          <path d="M-5 -20 Q-8 -10 -5 0 M5 -20 Q8 -10 5 0" stroke={OUT} strokeWidth={1} opacity={0.5} fill="none" />
          <path d="M0 -21 L1 -27" stroke="#4E7A35" strokeWidth={3} />
        </g>
      );
    case 'star':
      return (
        <g>
          <path d="M0 0 L-60 -14" stroke="rgba(255,255,255,.7)" strokeWidth={3} strokeLinecap="round" />
          <path d="M0 -7 L2 -2 L7 -2 L3 1.5 L4.6 7 L0 3.6 L-4.6 7 L-3 1.5 L-7 -2 L-2 -2Z" fill="#FFF3A6" />
        </g>
      );
    case 'firefly':
      return <circle r={3} fill="#FFF59A" style={{ filter: 'drop-shadow(0 0 4px #FFF59A)', animation: 'ek-tw-glow .7s ease-in-out infinite alternate' }} />;
    case 'teddy':
      return <HeldItem id="teddy" />;
    case 'pal':
      return <Pal kind={variant % 2 === 1 ? 'bunny' : 'fox'} moving={moving} />;
    default:
      return null;
  }
};

/** A critter friend, side on and facing right, feet at (0,0). It bounds
 * along when it moves and wags its tail when it stops. */
const Pal: React.FC<{ kind: 'fox' | 'bunny'; moving: boolean }> = ({ kind, moving }) => {
  const fox = kind === 'fox';
  const fur = fox ? '#E8732C' : '#B9A58F';
  const dark = fox ? '#B9521D' : '#8E7A66';
  const light = '#FFF6EA';
  const legs = fox ? '#3B2A22' : dark;
  const tail = fox ? (
    <g style={{ transformOrigin: '-16px -14px', animation: `ek-pal-wag ${moving ? 0.25 : 0.6}s ease-in-out infinite alternate` }}>
      <path d="M-15 -15 Q-34 -22 -38 -36 Q-26 -36 -14 -22Z" fill={fur} {...s(1.8)} />
      <path d="M-33 -30 Q-37 -35 -38 -36 Q-33 -36 -29 -33Z" fill={light} />
    </g>
  ) : (
    <circle cx={-16} cy={-17} r={5.5} fill={light} {...s(1.6)} style={{ transformOrigin: '-16px -17px', animation: `ek-pal-wag ${moving ? 0.25 : 0.7}s ease-in-out infinite alternate` }} />
  );
  return (
    <g style={moving ? { animation: 'ek-pal-hop .32s ease-in-out infinite alternate' } : undefined}>
      {tail}
      {[-10, 8].map((x) => <path key={x} d={`M${x} -8 L${x - 1} 0 M${x + 4} -8 L${x + 4} 0`} stroke={legs} strokeWidth={3.4} strokeLinecap="round" />)}
      <ellipse cx={0} cy={-15} rx={17} ry={10} fill={fur} {...s(1.9)} />
      <path d="M-8 -9 Q2 -4 12 -10" stroke={fox ? light : dark} strokeWidth={3} fill="none" strokeLinecap="round" opacity={fox ? 1 : 0.5} />
      {fox ? (
        <g>
          <path d="M11 -30 L13 -44 L20 -33Z M19 -32 L25 -44 L27 -30Z" fill={fur} {...s(1.6)} />
          <path d="M8 -26 Q8 -36 19 -36 Q28 -36 30 -27 L38 -22 Q34 -17 26 -17 Q12 -16 8 -26Z" fill={fur} {...s(1.8)} />
          <path d="M26 -22 L38 -22 Q34 -17 26 -17Z" fill={light} />
          <circle cx={38} cy={-22} r={1.8} fill={OUT} />
          <circle cx={23} cy={-28} r={1.7} fill={OUT} />
        </g>
      ) : (
        <g>
          <path d="M14 -32 Q8 -56 15 -56 Q20 -54 19 -33Z M20 -32 Q20 -54 26 -53 Q30 -50 23 -31Z" fill={fur} {...s(1.6)} />
          <path d="M15 -36 Q13 -50 15.5 -52 M23 -35 Q24 -48 25.5 -50" stroke="#F2B8B8" strokeWidth={2} fill="none" strokeLinecap="round" />
          <ellipse cx={22} cy={-25} rx={11} ry={9.5} fill={fur} {...s(1.8)} />
          <circle cx={32.5} cy={-23} r={1.6} fill="#E58C8C" />
          <circle cx={25} cy={-28} r={1.7} fill={OUT} />
        </g>
      )}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* emotes (stage px, unscaled by the rig)                              */
/* ------------------------------------------------------------------ */

export const EmoteBubble: React.FC<{ e: Emote }> = ({ e }) => {
  const icon = (() => {
    switch (e) {
      case 'heart':
        return <path d="M8 12 C1 7 3 1 8 4.5 C13 1 15 7 8 12Z" fill="#FF5A7A" />;
      case '!':
        return <text x={8} y={12.5} textAnchor="middle" fontSize={13} fontWeight={900} fill="#E2483D" fontFamily="sans-serif">!</text>;
      case '?':
        return <text x={8} y={12.5} textAnchor="middle" fontSize={12} fontWeight={900} fill="#2F6FD0" fontFamily="sans-serif">?</text>;
      case 'music':
        return <path d="M6 12 a2.2 2 0 1 1 0 -0.1 L6 3 L12 2 L12 10 a2.2 2 0 1 1 0 -0.1 L12 4.6 L6 5.6" fill="#6B4BA8" stroke="#6B4BA8" strokeWidth={0.8} />;
      case 'zzz':
        return <text x={8} y={12} textAnchor="middle" fontSize={8} fontWeight={900} fill="#5A78C0" fontFamily="sans-serif">zz</text>;
      case 'star':
        return <path d="M8 2 L9.6 6 L14 6.2 L10.6 9 L11.8 13.4 L8 11 L4.2 13.4 L5.4 9 L2 6.2 L6.4 6Z" fill="#F2C230" />;
      case 'ha':
        return <text x={8} y={11.5} textAnchor="middle" fontSize={7.5} fontWeight={900} fill="#E2483D" fontFamily="sans-serif">ha!</text>;
      case 'boo':
        return <text x={8} y={11.5} textAnchor="middle" fontSize={6.5} fontWeight={900} fill="#6B4BA8" fontFamily="sans-serif">boo!</text>;
      case 'hi':
        return <text x={8} y={11.5} textAnchor="middle" fontSize={8} fontWeight={900} fill="#2E9C78" fontFamily="sans-serif">hi!</text>;
      case 'sweat':
        return <path d="M8 3 Q12 9 8 12 Q4 9 8 3Z" fill="#6EC6FF" />;
      case 'count':
        return <text x={8} y={11.5} textAnchor="middle" fontSize={7} fontWeight={900} fill="#2B2F36" fontFamily="sans-serif" style={{ animation: 'ek-tw-glow .5s steps(2) infinite' }}>1·2·3</text>;
      default:
        return null;
    }
  })();
  return (
    <div style={{ position: 'absolute', left: -9, top: -22, width: 18, height: 16, animation: 'ek-tw-pop .35s cubic-bezier(.3,1.6,.5,1) both' }}>
      <svg width={18} height={16} viewBox="-1 -1 18 16" style={{ overflow: 'visible' }}>
        <path d="M2 0 L14 0 Q16 0 16 2 L16 11 Q16 13 14 13 L10 13 L8 16 L6 13 L2 13 Q0 13 0 11 L0 2 Q0 0 2 0Z" fill="rgba(255,255,255,.95)" stroke={OUT} strokeWidth={0.9} />
        {icon}
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* effect bursts (stage px)                                            */
/* ------------------------------------------------------------------ */

const FX_STYLE: Record<Fx, { n: number; colors: string[]; size: [number, number]; dur: number; up: number; spread: number; round: boolean; glow?: boolean }> = {
  splash: { n: 10, colors: ['#8CCBF2', '#BFE6F5', '#FFFFFF'], size: [2, 4], dur: 0.8, up: 22, spread: 26, round: true },
  leaves: { n: 12, colors: ['#E8893A', '#D9663A', '#F0B44C', '#B9533F'], size: [4, 6], dur: 1.6, up: 34, spread: 40, round: false },
  snow: { n: 10, colors: ['#FFFFFF', '#EAF4FF'], size: [2.5, 4.5], dur: 1.1, up: 22, spread: 28, round: true },
  sparkle: { n: 7, colors: ['#FFF3A6', '#FFFFFF', '#F7B9D7', '#9FE3F5'], size: [2, 3.5], dur: 1.1, up: 14, spread: 18, round: true, glow: true },
  seeds: { n: 9, colors: ['#FFFFFF'], size: [1.6, 2.6], dur: 3.2, up: 46, spread: 70, round: true, glow: true },
  bubbles: { n: 5, colors: ['rgba(210,240,255,.5)'], size: [4, 8], dur: 3, up: 70, spread: 40, round: true },
  confetti: { n: 14, colors: ['#FF6B8A', '#FFD166', '#6EC6FF', '#7FD8B4', '#B79CF0'], size: [2.5, 4], dur: 1.5, up: 40, spread: 40, round: false },
  dust: { n: 6, colors: ['rgba(200,190,170,.7)'], size: [4, 7], dur: 0.9, up: 8, spread: 18, round: true },
  hearts: { n: 5, colors: ['#FF5A7A', '#F48FB1'], size: [4, 5], dur: 1.8, up: 36, spread: 20, round: false },
  smoke: { n: 8, colors: ['rgba(235,235,240,.85)', 'rgba(210,210,220,.8)'], size: [6, 11], dur: 1.6, up: 26, spread: 22, round: true },
  fireflies: { n: 6, colors: ['#FFF59A'], size: [2, 3], dur: 2.6, up: 30, spread: 40, round: true, glow: true },
};

export const FxBurst: React.FC<{ kind: Fx; x: number; y: number; scale: number; seed: number }> = ({ kind, x, y, scale, seed }) => {
  const f = FX_STYLE[kind];
  const ps = useMemo(() => {
    let a = seed * 9301 + 49297;
    const r = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: f.n }, (_, i) => ({
      i,
      dx: (r() - 0.5) * 2 * f.spread * (kind === 'seeds' ? 0.4 : 1) + (kind === 'seeds' ? f.spread * 0.6 : 0),
      dy: -f.up * (0.5 + r() * 0.8),
      sz: f.size[0] + r() * (f.size[1] - f.size[0]),
      c: f.colors[i % f.colors.length],
      d: f.dur * (0.7 + r() * 0.6),
      delay: r() * 0.15,
    }));
  }, [kind, seed, f]);
  const k = Math.max(0.45, scale / 0.21);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, pointerEvents: 'none', transform: `scale(${k})` }}>
      {ps.map((p) => (
        <div
          key={p.i}
          style={{
            position: 'absolute',
            left: -p.sz / 2,
            top: -p.sz / 2,
            width: kind === 'hearts' ? p.sz * 1.2 : p.sz,
            height: p.sz,
            borderRadius: f.round ? '50%' : kind === 'hearts' ? '50% 50% 10% 50%' : '70% 0 70% 0',
            background: p.c,
            border: kind === 'bubbles' ? '1px solid rgba(255,255,255,.9)' : undefined,
            boxShadow: f.glow ? `0 0 ${p.sz * 2}px ${p.c}` : undefined,
            opacity: 0,
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--fall' as string]: kind === 'bubbles' || kind === 'seeds' || kind === 'hearts' || kind === 'smoke' || kind === 'fireflies' || kind === 'sparkle' ? '0px' : `${f.up * 0.9}px`,
            animation: `ek-tw-burst ${p.d}s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
};

export const PROPS_CSS = `
@keyframes ek-tw-spin { to { transform: rotate(360deg); } }
@keyframes ek-pal-hop { from { transform: translateY(0); } to { transform: translateY(-5px); } }
@keyframes ek-pal-wag { from { transform: rotate(-10deg); } to { transform: rotate(12deg); } }
@keyframes ek-tw-pop { from { transform: scale(0) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
@keyframes ek-tw-burst {
  0% { opacity: 0; transform: translate(0,0) rotate(0); }
  12% { opacity: 1; }
  55% { transform: translate(calc(var(--dx) * .7), var(--dy)) rotate(160deg); }
  100% { opacity: 0; transform: translate(var(--dx), calc(var(--dy) + var(--fall))) rotate(320deg); }
}
`;
