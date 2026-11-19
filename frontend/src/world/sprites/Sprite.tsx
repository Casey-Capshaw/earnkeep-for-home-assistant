// EarnKeep — the Sprite rig: an anime-chibi kid drawn from a character file.
//
//  • a big anime head (large layered eyes with gradient irises and two
//    highlights, lash lines, blush hatching) on a small body;
//  • the face is drawn from the character's face traits (eye size, lashes,
//    brows, chin, smile, grin, blush, freckles, a missing tooth, earrings),
//    the colors from palette.ts; hair is in hair.tsx, and glasses, hearing
//    aids, head coverings and mobility aids in aids.tsx;
//  • knees and elbows, so walk/run are real cycles (contact → down →
//    passing → lift) with a body bob and hair/braid follow-through. The
//    cycle period comes from the actor's ground speed (see STRIDE), so the
//    feet plant instead of skating.
// Drawn in rig units with the FEET at (0,0), facing right.

import React from 'react';
import type { Expr, Held, Outfit, Pose, Wings } from './types';
import type { Character } from './traits';
import { IRIS, SKIN, blinkSeconds, hairColors, hashSeed, type SkinColors } from './palette';
import { HeldItem } from './props';
import { Hat, HatBack, OUT, Torso, WingPair, sleeveColor, sleeveLen } from './parts';
import { HairBack, HairFront, swayStyle } from './hair';
import { CoveringBack, CoveringFront, Glasses, HearingAid, StandingAid, hidesHair } from './aids';

export { OUT };
const LW = 2.2; // line weight (rig units)

/** Ground covered per full gait cycle, in rig units (two steps; the run
 * adds its flight phase). The runtime turns speed into a cycle period. */
export const STRIDE = { walk: 51, run: 108 };

/* ------------------------------------------------------------------ */
/* poses                                                               */
/* ------------------------------------------------------------------ */

/** [base°, amplitude°, period s, phase 0|1] — rotation about the joint. */
type J = [number, number?, number?, number?];
interface PoseDef {
  al?: J; ar?: J; // upper arms (shoulder)
  el?: J; er?: J; // forearms (elbow), relative
  ll?: J; lr?: J; // thighs (hip)
  kl?: J; kr?: J; // shins (knee), relative; + bends the foot back
  body?: J; // lean about the hips
  bob?: [number, number]; // [px, period]
  head?: J;
  y?: number; // whole-rig drop
  rot?: number; // whole-rig rotation (lying down)
  twirl?: boolean;
  flap?: number;
  frontL?: boolean; // left arm crosses in front
  cyc?: 'walk' | 'run'; // legs (and arms unless given) run a gait cycle
}

const P: Record<Pose, PoseDef> = {
  idle: { al: [8, 3, 1.6], ar: [-8, 3, 1.6, 1], el: [-10], er: [-10], bob: [1.4, 1.6], head: [0, 2.5, 2.4] },
  walk: { cyc: 'walk' },
  run: { cyc: 'run', body: [13] },
  wave: { al: [8, 3, 1.4], el: [-10], ar: [-122], er: [-44, 26, 0.24], bob: [1.6, 0.5], head: [5, 4, 0.5] },
  cheer: { al: [150, 12, 0.3], el: [18], ar: [-150, 12, 0.3, 1], er: [-18], ll: [6], lr: [-6], bob: [-6, 0.3] },
  jump: { al: [150], el: [15], ar: [-150], er: [-15], ll: [-32], kl: [52], lr: [14], kr: [42] },
  tuck: { al: [-60], el: [-62], ar: [-60], er: [-62], ll: [-100], kl: [122], lr: [-90], kr: [122], frontL: true },
  fly: { al: [100, 14, 0.32], ar: [-100, 14, 0.32], ll: [24, 6, 0.6], kl: [22], lr: [40, 6, 0.6, 1], kr: [36], body: [18], flap: 0.12 },
  sit: { al: [16], el: [-22], ar: [-16], er: [-22], ll: [-84], kl: [6], lr: [-78], kr: [6], y: 25, bob: [0.8, 1.8] },
  dangle: { al: [26], el: [-16], ar: [-26], er: [-16], ll: [-82], kl: [78, 18, 0.7], lr: [-82], kr: [78, 18, 0.7, 1], y: 26, head: [0, 4, 1.4] },
  ride: { al: [-55, 3, 0.3], el: [-26], ar: [-55, 3, 0.3, 1], er: [-26], ll: [-58, 18, 0.28], kl: [70, 18, 0.28], lr: [-58, 18, 0.28, 1], kr: [70, 18, 0.28, 1], body: [10] },
  drive: { al: [-50, 5, 0.24], el: [-30], ar: [-50, 5, 0.24, 1], er: [-30], ll: [-84], kl: [10], lr: [-80], kr: [10], y: 25, body: [4], bob: [-1.2, 0.12] },
  skate: { al: [45, 8, 1.1], ar: [-45, 8, 1.1, 1], ll: [-8], kl: [12], lr: [18, 14, 0.7], kr: [26], body: [6] },
  throw: { al: [26, 6, 0.7], ar: [-100, 55, 0.34], er: [-40], ll: [-14], kl: [10], lr: [14], kr: [8], body: [0, 6, 0.34] },
  kick: { al: [30, 10, 0.3], ar: [-30, 10, 0.3, 1], ll: [6], kl: [6], lr: [-25, 40, 0.3], kr: [22], body: [-4] },
  hang: { al: [172, 3, 1.1], ar: [-172, 3, 1.1, 1], ll: [6, 8, 1.1], kl: [16], lr: [-6, 8, 1.1, 1], kr: [22] },
  crouch: { al: [-20], el: [-42], ar: [-20], er: [-42], ll: [-56], kl: [110], lr: [-46], kr: [104], y: 11 },
  hide: {},
  peek: { al: [20], ar: [-112], er: [-48, 26, 0.3], body: [-12, 3, 1.2], head: [-8] },
  cover: { al: [-170], el: [-8], ar: [170], er: [8], bob: [1.5, 0.5], head: [8], frontL: true },
  look: { al: [10], el: [-10], ar: [-150], er: [-60], body: [0, 5, 1.4], head: [0, 8, 1.4] },
  dance: { al: [100, 50, 0.4], el: [-30], ar: [-100, 50, 0.4], er: [30], ll: [0, 12, 0.4], kl: [12], lr: [0, 12, 0.4, 1], kr: [12], body: [0, 8, 0.4], bob: [-3.5, 0.2] },
  twirl: { al: [160], ar: [-160], lr: [-30], kr: [62], twirl: true, bob: [-2, 0.4] },
  push: { cyc: 'walk', al: [-80, 3, 0.4], el: [-6], ar: [-80, 3, 0.4, 1], er: [-6], body: [14], frontL: true },
  carry: { cyc: 'walk', al: [-50], el: [-52], ar: [-50], er: [-52], frontL: true },
  lie: { al: [40], ar: [-40], rot: -90, y: -10 },
  angel: { al: [80, 40, 0.6], ar: [-80, 40, 0.6], ll: [14, 12, 0.6], lr: [-14, 12, 0.6], rot: -90, y: -10 },
  blow: { al: [12], el: [-10], ar: [-140], er: [-70], head: [-4], bob: [1, 1.2] },
  climb: { al: [165, 15, 0.34], ar: [-165, 15, 0.34, 1], ll: [-30, 25, 0.34], kl: [52], lr: [-30, 25, 0.34, 1], kr: [52] },
  balance: { cyc: 'walk', al: [90, 12, 0.8], ar: [-90, 12, 0.8], body: [0, 7, 0.8] },
  point: { al: [10], el: [-10], ar: [-96] },
  sleep: { al: [16], el: [-22], ar: [-16], er: [-22], ll: [-84], kl: [6], lr: [-78], kr: [6], y: 25, head: [14], bob: [1.4, 2.2] },
  sword: { al: [30], ar: [-100, 45, 0.24], er: [-20], ll: [-26], kl: [22], lr: [28], kr: [10], body: [8, 4, 0.48] },
  catch: { al: [-140], el: [-20], ar: [-140], er: [-20], head: [-8], frontL: true },
  rope: { al: [40, 30, 0.25], ar: [-40, 30, 0.25], ll: [-8], lr: [-8], bob: [-8, 0.25] },
  holdup: { cyc: 'walk', ar: [-170, 3, 0.8], er: [5] },
};

function jStyle(j: J | undefined): React.CSSProperties {
  if (!j) return {};
  const [b, a = 0, d = 1, ph = 0] = j;
  if (!a) return { transform: `rotate(${b}deg)` };
  return {
    ['--b' as string]: `${b}deg`,
    ['--a' as string]: `${a}deg`,
    animation: `ek-tw-rot ${d}s ease-in-out ${ph ? -d : 0}s infinite alternate`,
  };
}
/** A gait keyframe animation on the shared cycle clock (--T). */
const gait = (name: string, half: boolean): React.CSSProperties => ({
  animation: `${name} var(--T) linear infinite`,
  animationDelay: half ? 'calc(var(--T) * -0.5)' : '0s',
});

/* ------------------------------------------------------------------ */
/* faces — drawn from face traits                                      */
/* ------------------------------------------------------------------ */

type Look = 'side' | 'viewer' | 'up' | 'down';

/** The iris gradient's id: member ids can hold anything, and url(#…) needs
 * a plain token. The hash keeps ids that sanitize alike apart. */
const irisId = (id: string) => `ekIris-${id.replace(/[^A-Za-z0-9_-]/g, '_')}-${hashSeed(id).toString(36)}`;

function Eye({ c, x, expr, look, right }: { c: Character; x: number; expr: Expr; look: Look; right: boolean }) {
  const big = c.face.eyeSize === 'big';
  const y = -85;
  const m = right ? 1 : -1; // outer corner side
  const dx = look === 'side' ? 1.6 : 0;
  const dy = look === 'up' ? -2.2 : look === 'down' ? 2 : 0;
  if (expr === 'closed' || expr === 'laugh' || (expr === 'wink' && right))
    return <path d={`M${x - 6} ${y + 2} Q${x} ${expr === 'closed' ? y + 6 : y - 6} ${x + 6} ${y + 2}`} stroke={OUT} strokeWidth={2.6} fill="none" strokeLinecap="round" />;
  if (expr === 'scrunch') return <path d={`M${x + 5 * m} ${y - 5} L${x - 4 * m} ${y} L${x + 5 * m} ${y + 5}`} stroke={OUT} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  const rx = big ? 6.4 : 6;
  const ry = expr === 'o' ? (big ? 9.4 : 8.6) : big ? 8.4 : expr === 'determined' || expr === 'smirk' ? 6.2 : 7.2;
  const irx = big ? 5.2 : 4.7;
  const iry = Math.min(ry - 0.8, big ? 7.2 : 6.2);
  const ix = x + dx;
  const iy = y + 0.6 + dy;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFFFFF" />
      <ellipse cx={ix} cy={iy} rx={irx} ry={iry} fill={`url(#${irisId(c.id)})`} />
      <ellipse cx={ix} cy={iy + 0.4} rx={irx * 0.46} ry={iry * 0.52} fill="#16243F" />
      <path d={`M${ix - irx * 0.75} ${iy + iry * 0.45} Q${ix} ${iy + iry * 1.02} ${ix + irx * 0.75} ${iy + iry * 0.45}`} stroke="#BFE9FF" strokeWidth={1.3} fill="none" opacity={0.9} />
      {expr === 'sparkle' ? (
        <path d={`M${ix - 1} ${iy - 5.4} l1.3 2.7 l2.7 1.3 l-2.7 1.3 l-1.3 2.7 l-1.3 -2.7 l-2.7 -1.3 l2.7 -1.3Z`} fill="#FFFFFF" />
      ) : (
        <circle cx={ix - 1.9} cy={iy - iry * 0.45} r={big ? 2.3 : 2} fill="#FFFFFF" />
      )}
      <circle cx={ix + 2.1} cy={iy + iry * 0.42} r={1} fill="#FFFFFF" />
      {/* upper lid: a thick lash line; full lashes curl, soft ones angle up-and-out */}
      {c.face.lashes === 'full' ? (
        <>
          <path d={`M${x - 6.8} ${y - ry + 4} Q${x} ${y - ry - 2.6} ${x + 6.8} ${y - ry + 4}`} stroke={OUT} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <path d={`M${x + 6.2 * m} ${y - ry + 3.4} l${3.2 * m} -2.6 M${x + 4.6 * m} ${y - ry + 1.4} l${2 * m} -3.2`} stroke={OUT} strokeWidth={1.4} strokeLinecap="round" />
        </>
      ) : (
        <path d={`M${x - 6.8 * m} ${y - ry + 3.8} Q${x} ${y - ry - 1.2} ${x + 7.2 * m} ${y - ry + 1.4}`} stroke={OUT} strokeWidth={2.8} fill="none" strokeLinecap="round" />
      )}
      <path d={`M${x - 3.6} ${y + ry} Q${x} ${y + ry + 0.9} ${x + 3.6} ${y + ry}`} stroke={OUT} strokeWidth={1} fill="none" opacity={0.55} />
    </g>
  );
}

function Mouth({ c, expr }: { c: Character; expr: Expr }) {
  const dark = '#8A3540';
  const gap = c.face.missingTooth; // a front tooth out: shows in open-mouthed faces
  const o = { stroke: OUT, strokeWidth: 1.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  switch (expr) {
    case 'grin': // toothy-lopsided: new front teeth, tiny gap; even: a symmetric grin
      return c.face.grin === 'toothy-lopsided' ? (
        <g>
          <path d="M-8.5 -72.5 Q0 -73.5 9.5 -75.5 Q7 -62 -2 -63.5 Q-7 -65 -8.5 -72.5Z" fill={dark} {...o} />
          <path d="M-7.6 -72.2 Q0 -73.2 8.8 -75 L8 -71.4 Q0 -69.4 -6.8 -69.2Z" fill="#FFFFFF" />
          {gap ? <path d="M-1.6 -73.4 L-1.4 -69.2 L2 -69.6 L2 -73.6Z" fill={dark} /> : <path d="M0.6 -73 L0.4 -69.6" stroke={OUT} strokeWidth={0.8} />}
        </g>
      ) : (
        <g>
          <path d="M-7 -73 Q0 -72 7 -73 Q6 -63.5 0 -63.5 Q-6 -63.5 -7 -73Z" fill={dark} {...o} />
          <path d="M-6.2 -72.6 Q0 -71.6 6.2 -72.6 L5.6 -70 Q0 -69 -5.6 -70Z" fill="#FFFFFF" />
          {gap && <path d="M-2.4 -72.4 L-2.2 -69 L1 -69 L1 -72.4Z" fill={dark} />}
        </g>
      );
    case 'laugh':
    case 'scrunch':
      return (
        <g>
          <path d="M-8 -74 Q0 -72.6 8 -74 Q8 -60.5 0 -60.5 Q-8 -60.5 -8 -74Z" fill={dark} {...o} />
          <path d="M-7 -73.4 Q0 -72.2 7 -73.4 L6.4 -70.6 Q0 -69.6 -6.4 -70.6Z" fill="#FFFFFF" />
          {gap && <path d="M-2.6 -73.2 L-2.4 -69.8 L1 -69.8 L1 -73.2Z" fill={dark} />}
          <ellipse cx={0} cy={-63.6} rx={4} ry={2.6} fill="#F28C9A" />
        </g>
      );
    case 'smirk':
      return (
        <g>
          <path d="M-6 -69.5 Q2 -67.5 8.5 -74.5" fill="none" {...o} strokeWidth={2} />
          <path d="M3.6 -70.6 L5.2 -67.6 L6.6 -72Z" fill="#FFFFFF" stroke={OUT} strokeWidth={0.8} strokeLinejoin="round" />
        </g>
      );
    case 'determined':
      return <path d="M-5 -69.5 Q0 -71 6 -70.5" fill="none" {...o} strokeWidth={2} />;
    case 'o':
      return <ellipse cx={0.5} cy={-68} rx={3} ry={3.8} fill={dark} {...o} />;
    case 'blow':
      return (
        <g>
          <circle cx={2} cy={-68.5} r={2.2} fill={dark} {...o} />
          <path d="M8 -70 l4 -1.4 M8 -67 l4 0.8" stroke="#9ED8F5" strokeWidth={1.2} strokeLinecap="round" />
        </g>
      );
    case 'tongue':
      return (
        <g>
          <path d="M-5 -71 Q0 -68.4 5.5 -71.4" fill="none" {...o} strokeWidth={1.8} />
          <path d="M-1 -70 Q-1.4 -64.4 2 -64.4 Q5 -64.6 4.4 -70.4Z" fill="#F28C9A" {...o} strokeWidth={1.1} />
        </g>
      );
    case 'smile':
    case 'sparkle':
    case 'wink':
    case 'closed':
    default: // a little cat-smile, or a plain upturned line
      return c.face.smile === 'cat' ? (
        <path d="M-5.6 -71.4 Q-2.8 -67.6 0 -70.6 Q2.8 -67.6 5.6 -71.4" fill="none" {...o} strokeWidth={1.9} />
      ) : (
        <path d="M-6 -71.5 Q1 -66.5 8 -72.5" fill="none" {...o} strokeWidth={2} />
      );
  }
}

function Face({ c, sk, expr, look, turn }: { c: Character; sk: SkinColors; expr: Expr; look: Look; turn: number }) {
  const fine = c.face.brows === 'fine';
  const rosy = c.face.blush === 'rosy';
  const hd = hairColors(c).dark;
  const shut = expr === 'closed' || expr === 'laugh' || expr === 'scrunch';
  const brow = (x: number, right: boolean) => {
    const m = right ? 1 : -1;
    if (expr === 'determined') return <path key={x} d={`M${x - 5.5 * m} -94.5 L${x + 6 * m} -99`} stroke={hd} strokeWidth={2.8} strokeLinecap="round" />;
    if (expr === 'o' || expr === 'sparkle') return <path key={x} d={`M${x - 5} -100.5 Q${x} -103.5 ${x + 5} -100.5`} stroke={hd} strokeWidth={fine ? 1.5 : 2.2} fill="none" strokeLinecap="round" />;
    if (expr === 'scrunch') return <path key={x} d={`M${x - 5 * m} -95 L${x + 5 * m} -97.5`} stroke={hd} strokeWidth={fine ? 1.5 : 2.2} strokeLinecap="round" />;
    if (fine) return <path key={x} d={`M${x - 5} -98.6 Q${x} -101 ${x + 5} -98.8`} stroke={hd} strokeWidth={1.5} fill="none" strokeLinecap="round" />;
    // bold: heavier, tilted up and out; one cocked a little higher (smirk)
    return <path key={x} d={`M${x - 5.5 * m} -97 L${x + 6 * m} ${expr === 'smirk' && right ? -102 : -99.6}`} stroke={hd} strokeWidth={2.7} strokeLinecap="round" />;
  };
  // turn > 0: a three-quarter turn toward the direction of travel — the
  // features slide across the face and the far eye narrows
  return (
    <g transform={`translate(${turn * 5} 0)`}>
      {/* blush: soft ovals + anime hatching */}
      {[-17.5, 17.5].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={-75} rx={expr === 'blow' ? 6.4 : 5.4} ry={3.2} fill={sk.blush} opacity={rosy ? 0.6 : 0.42} />
          <path d={`M${x - 3} -73.8 l1.6 -2.8 M${x - 0.4} -73.8 l1.6 -2.8 M${x + 2.2} -73.8 l1.6 -2.8`} stroke="#E0707A" strokeWidth={0.9} strokeLinecap="round" opacity={rosy ? 0.8 : 0.5} />
        </g>
      ))}
      <g style={shut ? undefined : { animation: `ek-tw-blink ${blinkSeconds(c.id)}s infinite`, transformOrigin: '0px -85px' }}>
        <g transform={turn ? `translate(${-12.5 + turn * 1.5} 0) scale(${1 - turn * 0.2} 1) translate(12.5 0)` : undefined}>
          <Eye c={c} x={-12.5} expr={expr} look={look} right={false} />
        </g>
        <Eye c={c} x={12.5} expr={expr} look={look} right />
      </g>
      {brow(-12.5, false)}
      {brow(12.5, true)}
      <path d={expr === 'scrunch' ? 'M-1.6 -77.6 L0.4 -76 L-1.6 -74.6' : 'M0.4 -77.4 Q1.8 -76.2 0.6 -75.2'} stroke={sk.shade} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {c.face.freckles && (
        <g fill={sk.shade} opacity={0.95}>
          {[-1, 1].map((m) => [[14, -79], [17.5, -77.4], [20.5, -79.4], [11, -77], [4, -79.4]].map(([x, y]) => <circle key={`${m}-${x}`} cx={x * m} cy={y} r={0.95} />))}
        </g>
      )}
      <Mouth c={c} expr={expr} />
      {c.aids.glasses && <Glasses g={c.aids.glasses} />}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* limbs (two segments each)                                           */
/* ------------------------------------------------------------------ */

const SEG = { thigh: 14, shin: 14, upper: 13, fore: 13 };

function legColors(o: Outfit, skin: string) {
  const full = o.bottom === 'pants' || o.bottom === 'leggings' || o.top === 'pjs' || o.top === 'overalls';
  if (o.top === 'wetsuit') return { thigh: o.top1, shin: o.top2 };
  const c = o.top === 'pjs' || o.top === 'overalls' ? o.top1 : full ? o.bottom1 : skin;
  return { thigh: c, shin: c };
}

function Thigh({ o, skin }: { o: Outfit; skin: string }) {
  const lc = legColors(o, skin);
  return (
    <g>
      <path d={`M-4.8 -2 L-4.3 ${SEG.thigh} Q0 ${SEG.thigh + 2.4} 4.3 ${SEG.thigh} L4.8 -2Z`} fill={lc.thigh} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
      {o.bottom === 'shorts' && o.top !== 'overalls' && <path d="M-6 -3 L-5.6 9 L5.6 9 L6 -3Z" fill={o.bottom1} stroke={OUT} strokeWidth={1.8} strokeLinejoin="round" />}
    </g>
  );
}

function Shin({ o, skin }: { o: Outfit; skin: string }) {
  const lc = legColors(o, skin);
  const boots = o.shoes === 'rainboots' || o.shoes === 'snowboots';
  const bare = o.shoes === 'bare' || o.shoes === 'sandals';
  return (
    <g>
      <path d={`M-4.3 -1 L-3.7 ${SEG.shin - 1.5} L3.7 ${SEG.shin - 1.5} L4.3 -1Z`} fill={lc.shin} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
      {boots && <path d="M-5 4 L-5 12.5 L5 12.5 L5 4Z" fill={o.shoe1} stroke={OUT} strokeWidth={1.8} strokeLinejoin="round" />}
      {o.shoes === 'snowboots' && <rect x={-5.8} y={2.4} width={11.6} height={3.8} rx={1.9} fill="#FFFFFF" stroke={OUT} strokeWidth={1.2} />}
      {bare ? (
        <>
          <path d="M-4 10.4 Q-4.4 14.4 2 14.4 Q8.2 14.4 8 12 Q7.4 10 3.6 10.4Z" fill={skin} stroke={OUT} strokeWidth={1.8} strokeLinejoin="round" />
          {o.shoes === 'sandals' && <path d="M-2.6 11.6 L5.6 11.2" stroke={o.shoe1} strokeWidth={2.2} strokeLinecap="round" />}
        </>
      ) : (
        <>
          <path d="M-4.8 9 Q-5.2 14.4 2.6 14.4 Q9.6 14.4 9.4 11.6 Q8.6 8.8 4.2 9Z" fill={o.shoe1} stroke={OUT} strokeWidth={1.9} strokeLinejoin="round" />
          {!boots && <path d="M-4.4 13 L9 13" stroke={o.shoes === 'lightup' ? '#7DF9FF' : '#FFFFFF'} strokeWidth={1.7} strokeLinecap="round" style={o.shoes === 'lightup' ? { animation: 'ek-tw-glow .5s steps(2) infinite' } : undefined} />}
          {!boots && <path d="M0.6 9.6 L2.2 11.4 M3 9.4 L4.6 11.2" stroke="#FFFFFF" strokeWidth={0.9} opacity={0.8} />}
        </>
      )}
    </g>
  );
}

function UpperArm({ o, skin }: { o: Outfit; skin: string }) {
  const sl = sleeveLen(o);
  return (
    <g>
      <path d={`M-3.6 -1 L-3.3 ${SEG.upper} Q0 ${SEG.upper + 2} 3.3 ${SEG.upper} L3.6 -1Z`} fill={skin} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
      {sl > 0 && <path d={`M-4.8 -2.4 L-4.4 ${sl > 12 ? SEG.upper + 1 : 7.5} L4.4 ${sl > 12 ? SEG.upper + 1 : 7.5} L4.8 -2.4Z`} fill={sleeveColor(o)} stroke={OUT} strokeWidth={1.8} strokeLinejoin="round" />}
      {(o.top === 'dress' || o.top === 'gown') && <circle cx={0} cy={2} r={5.2} fill={o.top1} stroke={OUT} strokeWidth={1.6} />}
    </g>
  );
}

function Forearm({ o, skin, held }: { o: Outfit; skin: string; held?: Held | null }) {
  const long = sleeveLen(o) > 12;
  const mitt = o.extras.includes('mittens');
  return (
    <g>
      <path d={`M-3.3 -1 L-2.9 ${SEG.fore - 1} L2.9 ${SEG.fore - 1} L3.3 -1Z`} fill={skin} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
      {long && <path d="M-4.2 -1.6 L-3.8 9.4 L3.8 9.4 L4.2 -1.6Z" fill={sleeveColor(o)} stroke={OUT} strokeWidth={1.8} strokeLinejoin="round" />}
      {o.top === 'ruffle' && <path d="M-4.4 9.2 q2.2 3.4 4.4 0 q2.2 3.4 4.4 0" fill={o.top1} stroke={OUT} strokeWidth={1.2} />}
      {held && (
        <g transform={`translate(0 ${SEG.fore}) scale(.86) translate(0 -29)`}>
          <HeldItem id={held} />
        </g>
      )}
      <circle cx={0} cy={SEG.fore} r={3.9} fill={mitt ? o.extra1 : skin} stroke={OUT} strokeWidth={1.9} />
      {!mitt && <path d="M1.4 10.6 Q3.4 12 2.4 14.6" stroke={OUT} strokeWidth={0.9} fill="none" opacity={0.6} />}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* the sprite                                                          */
/* ------------------------------------------------------------------ */

export interface SpriteProps {
  character: Character;
  outfit: Outfit;
  pose: Pose;
  expr?: Expr;
  look?: 'viewer' | 'up' | 'down';
  held?: Held | null;
  wings?: Wings | null;
  wind?: boolean;
  /** Gait cycle period (s) for walking/running poses — set from ground speed. */
  cycle?: number;
  /** Sitting in their wheelchair: the legs sit, the arms keep the pose
   * (or push the wheels when the pose is a walk or run). */
  seated?: boolean;
}

/** Rig box: x −70…70, y −180…20 (feet at 0,0). */
export const RIG = { w: 140, h: 200, ox: 70, oy: 180 };

const HIP = { x: 5.4, y: -28 };
const SHO = { x: 11.5, y: -53 };
/** Old-rig parts (tops, capes, wings) refit onto the small anime body. */
const BODY_FIT = 'translate(0 2) scale(.75)';
/** Old-rig hats refit onto the big anime head. */
const HEAD_FIT = 'translate(0 -88) scale(1.17) translate(0 103)';

const SIT: PoseDef = { ll: [-84], kl: [6], lr: [-78], kr: [6], y: 25 };
/** Arms working the push rims. */
const PUSH: PoseDef = { al: [16, 18, 0.3], el: [-26], ar: [16, 18, 0.3], er: [-26], body: [6] };

export const Sprite: React.FC<SpriteProps> = React.memo(({ character: c, outfit: o, pose, expr, look, held, wings, wind, cycle, seated }) => {
  if (pose === 'hide') return null; // tucked inside a box / leaf pile
  const standing = P[pose] ?? P.idle;
  const d: PoseDef = seated ? { ...standing, ...(standing.cyc ? PUSH : {}), ...SIT, cyc: undefined, rot: undefined, twirl: false, bob: standing.cyc ? [0.8, 0.3] : (standing.bob ?? [0.8, 1.8]) } : standing;
  const sk = SKIN[c.body.skin];
  const skin = sk.base;
  const iris = IRIS[c.face.eyes];
  const e: Expr = expr ?? c.personality.rest[0];
  const lookDir: Look = look ?? (pose === 'wave' || pose === 'peek' || pose === 'cheer' ? 'viewer' : 'side');
  const flying = pose === 'fly';
  const w = wings ?? null;
  const cyc = d.cyc;
  const cover = c.aids.headCovering;
  const bare = !hidesHair(cover); // hair shows
  const hairId = irisId(c.id).replace('ekIris', 'ekHair');
  const moving = !!cyc || !!standing.cyc || pose === 'ride' || pose === 'fly' || pose === 'skate' || pose === 'drive';
  const T = cycle ?? (cyc === 'run' ? 0.3 : 0.44);
  const k = cyc === 'run' ? 'rn' : 'wk';

  /** a joint: translate to the pivot, then rotate (pose or gait cycle) */
  const joint = (x: number, y: number, st: React.CSSProperties, children: React.ReactNode) => (
    <g transform={`translate(${x} ${y})`}>
      <g style={st}>{children}</g>
    </g>
  );
  const leg = (side: -1 | 1) => {
    const hipJ = side < 0 ? d.ll : d.lr;
    const kneeJ = side < 0 ? d.kl : d.kr;
    const half = side > 0;
    return joint(
      side * HIP.x,
      HIP.y,
      cyc ? gait(`ek-${k}-th`, half) : jStyle(hipJ),
      <>
        {joint(0, SEG.thigh, cyc ? gait(`ek-${k}-kn`, half) : jStyle(kneeJ), <Shin o={o} skin={skin} />)}
        <Thigh o={o} skin={skin} />
      </>,
    );
  };
  const arm = (side: -1 | 1) => {
    const shJ = side < 0 ? d.al : d.ar;
    const elJ = side < 0 ? d.el : d.er;
    // arms swing opposite their own-side leg
    const shSt = cyc && !shJ ? gait(`ek-${k}-arm`, side < 0) : jStyle(shJ);
    const elSt = cyc && !shJ ? { transform: `rotate(${cyc === 'run' ? -78 : -14}deg)` } : jStyle(elJ);
    return joint(
      side * SHO.x,
      SHO.y,
      shSt,
      <>
        {joint(0, SEG.upper, elSt, <Forearm o={o} skin={skin} held={side > 0 ? held : null} />)}
        <UpperArm o={o} skin={skin} />
      </>,
    );
  };

  const lean = d.body?.[0] ?? 0;
  const bodyStyle: React.CSSProperties = cyc
    ? { ['--b' as string]: `${lean}deg`, animation: `ek-${k}-body var(--T) ease-in-out infinite` }
    : d.bob
      ? { ['--b' as string]: `${lean}deg`, ['--a' as string]: `${d.body?.[1] ?? 0}deg`, ['--y' as string]: `${d.bob[0]}px`, animation: `ek-tw-bob ${d.bob[1]}s ease-in-out infinite alternate` }
      : jStyle(d.body);
  const headStyle: React.CSSProperties = cyc ? { animation: `ek-${k}-head var(--T) ease-in-out infinite` } : jStyle(d.head);
  const rootT = `translate(0 ${d.y ?? 0})${d.rot ? ` rotate(${d.rot})` : ''}`;

  return (
    <svg width={RIG.w} height={RIG.h} viewBox={`${-RIG.ox} ${-RIG.oy} ${RIG.w} ${RIG.h}`} style={{ position: 'absolute', left: -RIG.ox, top: -RIG.oy, overflow: 'visible', ['--T' as string]: `${T}s` }}>
      <defs>
        <linearGradient id={irisId(c.id)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={iris[0]} />
          <stop offset="0.55" stopColor={iris[1]} />
          <stop offset="1" stopColor={iris[2]} />
        </linearGradient>
      </defs>
      <g transform={rootT}>
        <g style={d.twirl ? { animation: 'ek-tw-twirl .9s ease-in-out infinite' } : undefined}>
          {/* the whole upper body bobs + leans about the hips; legs stay planted */}
          {c.aids.mobility && <StandingAid m={c.aids.mobility} pose={pose} layer="back" />}
          {leg(-1)}
          {leg(1)}
          <g transform={`translate(0 ${HIP.y})`}>
            <g style={bodyStyle}>
              <g transform={`translate(0 ${-HIP.y})`}>
                <g transform={BODY_FIT}>
                  {o.extras.includes('cape') && <path d="M-13 -76 Q-30 -40 -26 -18 Q0 -12 26 -18 Q30 -40 13 -76Z" fill={o.extra1} stroke={OUT} strokeWidth={3} style={swayStyle(moving, moving ? 10 : 4, moving ? 7 : 4, '0px -76px')} />}
                  {o.extras.includes('tail') && <path d="M-6 -44 Q-30 -40 -36 -20 Q-38 -10 -44 -12 Q-36 -4 -30 -16 Q-24 -32 -4 -38Z" fill={o.extra1} stroke={OUT} strokeWidth={2.4} />}
                  {o.top === 'dragon' && <path d="M-15 -76 l-6 -4 l4 8 l-6 2 l6 6 l-6 4 l7 4Z" fill={o.top2} stroke={OUT} strokeWidth={1.4} />}
                  {w && <WingPair kind={w} flap={flying ? (d.flap ?? 0.14) : 0.9} />}
                  {o.extras.includes('backpack') && <rect x={-21} y={-74} width={10} height={28} rx={4} fill={o.extra1} stroke={OUT} strokeWidth={2.4} />}
                  {o.hat !== 'hood' && <HatBack o={o} />}
                </g>
                {o.hat === 'hood' && (
                  <g transform={HEAD_FIT}>
                    <HatBack o={o} />
                  </g>
                )}
                {bare ? <HairBack ch={c} o={o} wind={!!wind} moving={moving} clipId={hairId} /> : <CoveringBack c={cover!} />}
                {!d.frontL && arm(-1)}
                <rect x={-3.2} y={-60} width={6.4} height={7} fill={skin} stroke={OUT} strokeWidth={1.8} />
                <g transform={BODY_FIT}>
                  <Torso o={o} />
                  {o.extras.includes('scarf') && (
                    <g>
                      <path d="M-15 -82 Q0 -74 15 -82 L15 -76 Q0 -68 -15 -76Z" fill={o.extra1} stroke={OUT} strokeWidth={2.2} />
                      <path d="M-9 -76 L-13 -56 L-5 -57 L-3 -74Z" fill={o.extra1} stroke={OUT} strokeWidth={2} style={swayStyle(moving, moving ? 16 : 6, moving ? 12 : 8, '-6px -76px')} />
                    </g>
                  )}
                  {o.extras.includes('necklace') && <path d="M-7 -78 Q0 -70 7 -78" stroke="#FFFFFF" strokeWidth={1.8} strokeDasharray="0.1 3" strokeLinecap="round" fill="none" />}
                </g>
                {/* head */}
                <g transform="translate(0 -58)">
                  <g style={headStyle}>
                    <g transform="translate(0 58)">
                      {bare && (c.hair.front !== 'bangs' || o.hair === 'tucked' || o.hair === 'lowpony' || o.hair === 'buzz' || o.hair === 'cornrows') && <path d="M-26 -89 Q-32 -95 -31.5 -87 Q-31 -81 -26.5 -80Z M26 -89 Q32 -95 31.5 -87 Q31 -81 26.5 -80Z" fill={skin} stroke={OUT} strokeWidth={1.6} strokeLinejoin="round" />}
                      {bare && c.face.earrings && <circle cx={-29} cy={-81} r={1.5} fill={c.face.earrings} stroke={OUT} strokeWidth={0.7} />}
                      <path
                        d={c.face.chin === 'soft' ? 'M-27 -94 Q-28 -70 -13 -61 Q0 -55.5 13 -61 Q28 -70 27 -94 Q27 -119 0 -119 Q-27 -119 -27 -94Z' : 'M-27 -94 Q-27.5 -71 -11.5 -61 Q0 -55 11.5 -61 Q27.5 -71 27 -94 Q27 -119 0 -119 Q-27 -119 -27 -94Z'}
                        fill={skin}
                        stroke={OUT}
                        strokeWidth={LW}
                      />
                      <Face c={c} sk={sk} expr={e} look={lookDir} turn={(cyc || pose === 'ride' || pose === 'skate' || pose === 'fly' || pose === 'drive') && lookDir === 'side' ? 1 : 0} />
                      {bare && <HairFront ch={c} o={o} moving={moving} clipId={hairId} />}
                      {c.aids.hearing && <HearingAid h={c.aids.hearing} />}
                      {cover && <CoveringFront c={cover} />}
                      {/* a covering that hides the hair takes the place of a hat, except safety gear */}
                      {(bare || o.hat === 'helmet' || o.hat === 'goggles') && (
                        <g transform={HEAD_FIT}>
                          <Hat o={o} />
                        </g>
                      )}
                    </g>
                  </g>
                </g>
                {d.frontL && arm(-1)}
                {arm(1)}
              </g>
            </g>
          </g>
          {c.aids.mobility && <StandingAid m={c.aids.mobility} pose={pose} layer="front" />}
        </g>
      </g>
    </svg>
  );
});
Sprite.displayName = 'Sprite';

export const SPRITE_CSS = `
.ek-sprites svg g { transform-box: view-box; }
@keyframes ek-tw-rot { from { transform: rotate(calc(var(--b) - var(--a))); } to { transform: rotate(calc(var(--b) + var(--a))); } }
@keyframes ek-tw-bob { from { transform: translateY(0) rotate(calc(var(--b) - var(--a))); } to { transform: translateY(var(--y)) rotate(calc(var(--b) + var(--a))); } }
@keyframes ek-tw-blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(.08); } }
@keyframes ek-tw-flap { from { transform: scaleX(1); } to { transform: scaleX(.3); } }
@keyframes ek-tw-twirl { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(-1); } }
@keyframes ek-tw-glow { from { opacity: 1; } to { opacity: .2; } }

/* WALK — one leg: contact (0) → down → push-off (50) → lift → passing → reach.
   The other leg runs half a cycle later. Body is lowest at each contact and
   highest as a leg passes under: two bobs per cycle. */
@keyframes ek-wk-th { 0% { transform: rotate(-28deg); } 25% { transform: rotate(-2deg); } 50% { transform: rotate(26deg); } 62% { transform: rotate(15deg); } 78% { transform: rotate(-15deg); } 90% { transform: rotate(-31deg); } 100% { transform: rotate(-28deg); } }
@keyframes ek-wk-kn { 0% { transform: rotate(4deg); } 25% { transform: rotate(9deg); } 50% { transform: rotate(20deg); } 62% { transform: rotate(64deg); } 78% { transform: rotate(60deg); } 90% { transform: rotate(16deg); } 100% { transform: rotate(4deg); } }
@keyframes ek-wk-arm { 0% { transform: rotate(26deg); } 50% { transform: rotate(-26deg); } 100% { transform: rotate(26deg); } }
@keyframes ek-wk-body { 0%, 50%, 100% { transform: translateY(3.4px) rotate(calc(var(--b) + 2deg)); } 25%, 75% { transform: translateY(-3.4px) rotate(calc(var(--b) - 1deg)); } }
@keyframes ek-wk-head { 0%, 50%, 100% { transform: rotate(2.5deg) translateY(.8px); } 25%, 75% { transform: rotate(-2.5deg) translateY(-.8px); } }

/* RUN — bigger reach, knees fold right up, a forward lean and a deeper bob. */
@keyframes ek-rn-th { 0% { transform: rotate(-48deg); } 20% { transform: rotate(-6deg); } 45% { transform: rotate(34deg); } 60% { transform: rotate(20deg); } 78% { transform: rotate(-30deg); } 92% { transform: rotate(-53deg); } 100% { transform: rotate(-48deg); } }
@keyframes ek-rn-kn { 0% { transform: rotate(10deg); } 20% { transform: rotate(26deg); } 45% { transform: rotate(32deg); } 60% { transform: rotate(108deg); } 78% { transform: rotate(96deg); } 92% { transform: rotate(30deg); } 100% { transform: rotate(10deg); } }
@keyframes ek-rn-arm { 0% { transform: rotate(52deg); } 50% { transform: rotate(-58deg); } 100% { transform: rotate(52deg); } }
@keyframes ek-rn-body { 0%, 50%, 100% { transform: translateY(4.6px) rotate(calc(var(--b) + 3deg)); } 25%, 75% { transform: translateY(-5.6px) rotate(calc(var(--b) - 2deg)); } }
@keyframes ek-rn-head { 0%, 50%, 100% { transform: rotate(3deg) translateY(1px); } 25%, 75% { transform: rotate(-3.5deg) translateY(-1px); } }
`;
