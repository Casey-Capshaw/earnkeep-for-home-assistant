// EarnKeep — Sprite aids: glasses, hearing aids, head coverings and
// mobility aids, drawn from Character.aids. Rig units, feet at (0,0),
// head centre near (0,-90), facing right.

import type { Pose } from './types';
import type { Character } from './traits';
import { OUT } from './parts';

type Aids = Character['aids'];
const LW = 2.2;
const mixTo = (hex: string, to: number, t: number) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t) + to * t).toString(16).padStart(2, '0')).join('');
const shade = (hex: string) => mixTo(hex, 0, 0.22);
const tint = (hex: string) => mixTo(hex, 255, 0.35);

/* ------------------------------------------------------------------ */
/* glasses (inside the face group, over the eyes)                      */
/* ------------------------------------------------------------------ */

export function Glasses({ g }: { g: NonNullable<Aids['glasses']> }) {
  const lens = (x: number) => {
    const m = x < 0 ? -1 : 1;
    if (g.style === 'square') return <rect key={x} x={x - 9} y={-93.5} width={18} height={16} rx={3.2} />;
    if (g.style === 'cat-eye') return <path key={x} d={`M${x - 8.5 * m} -90 Q${x - 9 * m} -78 ${x} -77.5 Q${x + 9 * m} -78 ${x + 9.5 * m} -89 L${x + 12 * m} -95 Q${x + 2 * m} -94 ${x - 8.5 * m} -90Z`} />;
    return <circle key={x} cx={x} cy={-85} r={9.2} />;
  };
  return (
    <g fill="#FFFFFF" fillOpacity={0.16} stroke={g.color} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round">
      {lens(-12.5)}
      {lens(12.5)}
      <path d="M-3.4 -86 Q0 -88.4 3.4 -86" fill="none" />
      <path d="M-21.6 -87 L-27 -89 M21.6 -87 L27 -89" fill="none" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* hearing aids (on the head, over the hair)                           */
/* ------------------------------------------------------------------ */

export function HearingAid({ h }: { h: NonNullable<Aids['hearing']> }) {
  const sides = h.side === 'both' ? [-1, 1] : [h.side === 'left' ? -1 : 1];
  return (
    <>
      {sides.map((m) =>
        h.kind === 'cochlear' ? (
          <g key={m}>
            {/* the coil on the side of the head, wired to a piece behind the ear */}
            <path d={`M${25.5 * m} -103 Q${31 * m} -98 ${29.5 * m} -92`} stroke={OUT} strokeWidth={1.2} fill="none" />
            <circle cx={24.5 * m} cy={-104} r={4.6} fill={h.color} stroke={OUT} strokeWidth={1.4} />
            <circle cx={24.5 * m} cy={-104} r={1.6} fill={shade(h.color)} />
            <path d={`M${29 * m} -93 Q${33 * m} -91 ${31 * m} -84`} stroke={OUT} strokeWidth={4.4} fill="none" strokeLinecap="round" />
            <path d={`M${29 * m} -93 Q${33 * m} -91 ${31 * m} -84`} stroke={h.color} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          </g>
        ) : (
          <g key={m}>
            {/* behind-the-ear: a hook over the top of the ear and a clear tube */}
            <path d={`M${27.5 * m} -93 Q${33.5 * m} -94 ${32 * m} -84`} stroke={OUT} strokeWidth={4.6} fill="none" strokeLinecap="round" />
            <path d={`M${27.5 * m} -93 Q${33.5 * m} -94 ${32 * m} -84`} stroke={h.color} strokeWidth={2.8} fill="none" strokeLinecap="round" />
            <path d={`M${27.5 * m} -93 Q${26 * m} -89 ${28 * m} -86`} stroke="#EAF4F8" strokeWidth={1.3} fill="none" strokeLinecap="round" />
          </g>
        ),
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* head coverings                                                      */
/* ------------------------------------------------------------------ */

type Covering = NonNullable<Aids['headCovering']>;
/** A covering that hides the hair (everything but a kippah). */
export const hidesHair = (c: Covering | null): boolean => !!c && c.kind !== 'kippah';

/** The part behind the head and shoulders. */
export function CoveringBack({ c }: { c: Covering }) {
  if (c.kind !== 'hijab') return null;
  return <path d="M-30 -100 Q-36 -74 -30 -50 Q-20 -40 0 -40 Q20 -40 30 -50 Q36 -74 30 -100Z" fill={shade(c.color)} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />;
}

/** The part over the head, drawn after the face. */
export function CoveringFront({ c }: { c: Covering }) {
  const st = { fill: c.color, stroke: OUT, strokeWidth: LW, strokeLinejoin: 'round' } as const;
  const fold = { stroke: shade(c.color), strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' } as const;
  switch (c.kind) {
    case 'hijab':
      return (
        <g>
          {/* wraps the head and neck, open around the face, draping to the chest */}
          <path
            fillRule="evenodd"
            d="M-30 -92 Q-33 -127 0 -128 Q33 -127 30 -92 Q31 -70 23 -60 Q28 -52 22 -45 Q0 -40 -22 -45 Q-28 -52 -23 -60 Q-31 -70 -30 -92Z M-22.5 -92 Q-22.5 -113 0 -113 Q22.5 -113 22.5 -92 Q22.5 -70 12 -62.5 Q0 -57.5 -12 -62.5 Q-22.5 -70 -22.5 -92Z"
            {...st}
          />
          <path d="M-22.5 -100 Q0 -118 22.5 -100" stroke={tint(c.color)} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <path d="M-18 -56 Q-8 -48 4 -50 M10 -58 Q16 -52 21 -52" {...fold} />
        </g>
      );
    case 'turban':
      return (
        <g>
          {/* a full wrap, its folds meeting in a point at the forehead */}
          <path d="M-29 -95 Q-37 -131 0 -136 Q37 -131 29 -95 Q15 -108 0 -113 Q-15 -108 -29 -95Z" {...st} />
          <path d="M0 -113 Q-14 -122 -29 -106 M0 -113 Q14 -122 29 -106 M0 -113 Q-12 -130 -24 -124 M0 -113 Q12 -130 24 -124 M0 -113 L0 -135" {...fold} />
          <path d="M-5 -110 L0 -115.5 L5 -110" fill={tint(c.color)} stroke={OUT} strokeWidth={1.2} strokeLinejoin="round" />
        </g>
      );
    case 'patka':
      return (
        <g>
          {/* a close cloth with the hair knotted on top */}
          <circle cx={0} cy={-127} r={8.5} {...st} />
          <path d="M-28 -94 Q-32 -124 0 -125 Q32 -124 28 -94 Q14 -105 0 -108 Q-14 -105 -28 -94Z" {...st} />
          <path d="M-7 -122 Q0 -117 7 -122 M-5 -131 Q0 -127 5 -131" {...fold} />
        </g>
      );
    case 'headwrap':
      return (
        <g>
          {/* wrapped up and tied in a knot at the front */}
          <path d="M-29 -95 Q-36 -128 0 -131 Q36 -128 29 -95 Q15 -107 0 -110 Q-15 -107 -29 -95Z" {...st} />
          <path d="M-27 -104 Q0 -120 27 -104 M-22 -116 Q0 -128 22 -116" {...fold} />
          <path d="M0 -113 Q-13 -127 -15 -114 Q-12 -108 0 -113Z M0 -113 Q13 -127 15 -114 Q12 -108 0 -113Z" fill={tint(c.color)} stroke={OUT} strokeWidth={1.6} strokeLinejoin="round" />
          <circle cx={0} cy={-113} r={3.2} fill={c.color} stroke={OUT} strokeWidth={1.4} />
        </g>
      );
    default: // kippah: a small cap on the crown, over the hair
      return (
        <g>
          <path d="M-15 -120 Q0 -136 15 -120 Q0 -116.5 -15 -120Z" {...st} />
          <path d="M-9 -123.5 Q0 -121.5 9 -123.5" {...fold} />
        </g>
      );
  }
}

/* ------------------------------------------------------------------ */
/* mobility aids                                                       */
/* ------------------------------------------------------------------ */

type Mobility = NonNullable<Aids['mobility']>;

/** Poses a wheelchair user does from the chair. In the rest they fly,
 * climb, swim or ride something else, and the chair stays behind. */
const NO_CHAIR = new Set<Pose>(['fly', 'hang', 'climb', 'jump', 'tuck', 'lie', 'angel', 'hide', 'rope', 'skate', 'ride', 'drive', 'dangle', 'balance', 'crouch', 'kick', 'twirl']);
export const usesChair = (c: Character, pose: Pose, riding: boolean): boolean => !riding && c.aids.mobility?.kind === 'wheelchair' && !NO_CHAIR.has(pose);
/** How far the chair's seat lifts a sitting sprite off the ground. */
export const CHAIR_SEAT_Y = -21;

/** A wheelchair, side on. `layer` splits it around the rider: the frame
 * goes behind them, the near wheel in front. */
export function Wheelchair({ color, moving, layer }: { color: string; moving: boolean; layer: 'back' | 'front' }) {
  const frame = { stroke: OUT, strokeWidth: 5.4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const paint = { ...frame, stroke: color, strokeWidth: 3.2 } as const;
  const d = 'M-19 -57 L-13 -54 L-11 -22 L17 -22 L24 -7 L31 -7 M-11 -22 L-6 -17 M17 -22 L21 -6';
  if (layer === 'back')
    return (
      <g>
        <path d={d} {...frame} />
        <path d={d} {...paint} />
        <path d="M-11 -24 L15 -24" stroke={shade(color)} strokeWidth={4} strokeLinecap="round" />
      </g>
    );
  return (
    <g>
      <g transform="translate(-6 -17)">
        <g style={moving ? { animation: 'ek-tw-spin .7s linear infinite' } : undefined}>
          <circle r={16.4} fill="none" stroke={OUT} strokeWidth={4.2} />
          <circle r={16.4} fill="none" stroke="#2B2F36" strokeWidth={2.6} />
          <circle r={12.6} fill="none" stroke="#C9CED6" strokeWidth={1.4} />
          <path d="M-12.6 0 L12.6 0 M0 -12.6 L0 12.6 M-8.9 -8.9 L8.9 8.9 M-8.9 8.9 L8.9 -8.9" stroke="#C9CED6" strokeWidth={1} />
          <circle r={3} fill={color} stroke={OUT} strokeWidth={1.2} />
        </g>
      </g>
      <g transform="translate(21 -5)">
        <circle r={4.6} fill="#2B2F36" stroke={OUT} strokeWidth={1.6} />
        <circle r={1.6} fill="#C9CED6" />
      </g>
    </g>
  );
}

/** Poses where a standing aid is in use. */
const STANDING = new Set<Pose>(['idle', 'walk', 'run', 'wave', 'cheer', 'look', 'point', 'peek', 'blow', 'throw', 'catch', 'cover', 'holdup', 'carry', 'push', 'dance', 'sword']);

/** A cane, crutches or a walker, standing on the ground beside the sprite. */
export function StandingAid({ m, pose, layer }: { m: Mobility; pose: Pose; layer: 'back' | 'front' }) {
  if (m.kind === 'wheelchair' || !STANDING.has(pose)) return null;
  const line = (d: string, w = 3) => (
    <>
      <path d={d} stroke={OUT} strokeWidth={w + 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={m.color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
  const tip = (x: number) => <ellipse cx={x} cy={-1.4} rx={2.8} ry={1.8} fill="#2B2F36" stroke={OUT} strokeWidth={1} />;
  if (m.kind === 'cane')
    return layer === 'front' ? (
      <g>
        {line('M20 -1 L18 -32 Q17.5 -39 12 -38')}
        {tip(20)}
      </g>
    ) : null;
  if (m.kind === 'crutches') {
    // forearm crutches: a cuff, a grip, and a tip on the ground
    const crutch = (x: number) => (
      <g>
        {line(`M${x * 1.25} -1 L${x} -44`)}
        {line(`M${x} -31 L${x - 5 * Math.sign(x)} -31`, 2.4)}
        <rect x={x - 3.6} y={-48} width={7.2} height={6} rx={2.6} fill={shade(m.color)} stroke={OUT} strokeWidth={1.4} />
        {tip(x * 1.25)}
      </g>
    );
    return layer === 'back' ? crutch(-17) : crutch(17);
  }
  // walker: a frame the sprite walks inside, wheels on the front legs
  return layer === 'back' ? (
    <g>{line('M-2 -2 L2 -35 L24 -35', 2.6)}</g>
  ) : (
    <g>
      {line('M4 -2 L8 -37 L30 -37 L33 -5 M6 -19 L32 -19', 2.8)}
      <path d="M6 -37 L13 -37" stroke={OUT} strokeWidth={5.6} strokeLinecap="round" />
      {tip(4)}
      <circle cx={33} cy={-3.4} r={3.4} fill="#2B2F36" stroke={OUT} strokeWidth={1.2} />
    </g>
  );
}
