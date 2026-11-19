// EarnKeep — Sprite hair: the back layer (behind the head) and the front
// layer (over the face), drawn from the character's hair traits:
//
//  • style   — the day's hairstyle (Outfit.hair, picked from hair.styles);
//  • length  — how far hanging hair reaches (short: jaw, medium: shoulder,
//              long: past the shoulders);
//  • texture — straight (jagged tips), wavy (rippled), curly (scalloped
//              edge) or coily (a rounded cloud);
//  • front   — bangs, pulled-back, side-swept or curls at the forehead;
//  • dye     — all (palette.ts), tips (the lower part of hanging hair) or
//              streak (one lock at the front).
// Rig units, head centre near (0,-90), facing right.

import React from 'react';
import type { Outfit } from './types';
import type { Character } from './traits';
import { dyeTriple, hairColors, type HairTriple } from './palette';
import { Flower, OUT, Plait } from './parts';

const LW = 2.2;

export const swayStyle = (moving: boolean, b: number, a: number, origin: string): React.CSSProperties =>
  moving
    ? { ['--b' as string]: `${b}deg`, ['--a' as string]: `${a}deg`, animation: 'ek-tw-rot calc(var(--T) * 0.5) ease-in-out calc(var(--T) * -0.14) infinite alternate', transformOrigin: origin }
    : { ['--b' as string]: `${b * 0.3}deg`, ['--a' as string]: `${a * 0.25}deg`, animation: 'ek-tw-rot 2.6s ease-in-out infinite alternate', transformOrigin: origin };

type Len = Character['hair']['length'];
/** How much of a full-length shape a hair length keeps. */
const KEEP: Record<Len, number> = { short: 0.52, medium: 0.78, long: 1 };
/** The same for braids, which shorten less. */
const KEEP_PLAIT: Record<Len, number> = { short: 0.62, medium: 0.82, long: 1 };
/** Where hanging hair ends (rig y). */
const BOTTOM: Record<Len, number> = { short: -70, medium: -54, long: -40 };
/** Shorten a shape toward its top edge at `oy`. */
const shorten = (f: number, oy: number) => (f === 1 ? undefined : `translate(0 ${oy}) scale(1 ${f}) translate(0 ${-oy})`);

const stroked = (c: HairTriple) => ({ fill: c.base, stroke: c.dark, strokeWidth: LW, strokeLinejoin: 'round' }) as const;

/** A scalloped mass: outlined rounds along `pts`, then the inside filled. */
function Scallops({ pts, r, c, close }: { pts: [number, number][]; r: number; c: HairTriple; close?: [number, number][] }) {
  const poly = [...pts, ...(close ?? [])].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <g>
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r} fill={c.base} stroke={c.dark} strokeWidth={LW} />)}
      <polygon points={poly} fill={c.base} />
      {pts.filter((_, i) => i % 3 === 1).map(([x, y], i) => <path key={`l${i}`} d={`M${x - r * 0.5} ${y - r * 0.2} Q${x} ${y - r * 0.75} ${x + r * 0.5} ${y - r * 0.2}`} stroke={c.light} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.8} />)}
    </g>
  );
}

/** A round cloud of coils centred behind the head. */
function Cloud({ R, c, cy = -92 }: { R: number; c: HairTriple; cy?: number }) {
  const n = Math.round((2 * Math.PI * R) / 9.5);
  const pts = Array.from({ length: n }, (_, i): [number, number] => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * R, cy + Math.sin(a) * R];
  });
  return <Scallops pts={pts} r={6.5} c={c} />;
}

/** One hanging rope of hair: a twist (with turns marked) or a loc. */
function Strand({ x, y0, y1, w, c, twist }: { x: number; y0: number; y1: number; w: number; c: HairTriple; twist: boolean }) {
  const marks: string[] = [];
  if (twist) for (let y = y0 + 5, k = 0; y < y1 - 2; y += 5, k++) marks.push(`M${x - w / 2} ${y + (k % 2 ? 2 : -2)} L${x + w / 2} ${y + (k % 2 ? -2 : 2)}`);
  return (
    <g>
      <rect x={x - w / 2} y={y0} width={w} height={y1 - y0} rx={w / 2} fill={c.base} stroke={c.dark} strokeWidth={1.5} />
      {twist ? <path d={marks.join(' ')} stroke={c.dark} strokeWidth={1} fill="none" /> : <path d={`M${x - w * 0.15} ${y0 + 8} L${x - w * 0.15} ${y1 - 8}`} stroke={c.light} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />}
    </g>
  );
}

/** The loose back hair: a curtain whose edge follows the hair's texture. */
function Curtain({ ch, c, jagged }: { ch: Character; c: HairTriple; jagged: boolean }) {
  const { length, texture } = ch.hair;
  const st = stroked(c);
  if (texture === 'coily') return <Cloud R={{ short: 31, medium: 36, long: 41 }[length]} c={c} />;
  if (texture === 'curly') {
    const by = BOTTOM[length];
    const side: [number, number][] = [];
    for (let y = -98; y < by - 4; y += 11) side.push([-31, y]);
    const bottom: [number, number][] = [-26, -13, 0, 13, 26].map((x) => [x, by + (Math.abs(x) > 20 ? -3 : 0)]);
    const pts: [number, number][] = [...side, ...bottom, ...side.map(([x, y]): [number, number] => [-x, y]).reverse()];
    return <Scallops pts={pts} r={8} c={c} close={[[26, -108], [0, -122], [-26, -108]]} />;
  }
  const t = shorten(KEEP[length], -104);
  if (texture === 'wavy')
    return (
      <g transform={t}>
        <path d="M-28 -104 Q-38 -90 -31 -76 Q-26 -62 -33 -50 Q-30 -38 -22 -42 Q-14 -34 -6 -41 Q2 -34 10 -41 Q18 -34 26 -42 Q32 -38 33 -50 Q26 -62 31 -76 Q38 -90 28 -104 Q0 -126 -28 -104Z" {...st} />
        <path d="M-20 -86 Q-25 -74 -20 -62 Q-16 -54 -20 -46 M-4 -80 Q-8 -68 -3 -58 Q0 -50 -3 -44 M12 -80 Q16 -68 11 -58 Q8 -50 11 -44" stroke={c.light} strokeWidth={1.6} fill="none" opacity={0.9} />
      </g>
    );
  return jagged ? (
    <g transform={t}>
      {/* the long curtain, past the shoulders, with jagged tips */}
      <path d="M-28 -104 Q-35 -80 -32 -52 L-28 -38 L-24 -49 L-19 -34 L-14 -47 L-8 -36 L-2 -47 L5 -35 L11 -47 L17 -35 L22 -48 L27 -38 L31 -52 Q35 -80 28 -104 Q0 -126 -28 -104Z" {...st} />
      <path d="M-20 -84 Q-23 -64 -20 -46 M-6 -78 Q-7 -62 -5 -46 M10 -78 Q12 -62 10 -46 M22 -84 Q25 -66 22 -48" stroke={c.light} strokeWidth={1.6} fill="none" opacity={0.9} />
    </g>
  ) : (
    <g transform={t}>
      <path d="M-27 -102 Q-34 -78 -30 -50 Q-26 -40 -20 -44 Q-12 -36 -4 -42 Q4 -36 12 -42 Q20 -36 26 -44 Q32 -50 30 -62 Q34 -80 27 -102 Q0 -124 -27 -102Z" {...st} />
      <path d="M-18 -80 Q-21 -62 -16 -46 M0 -76 Q-1 -60 2 -44 M17 -80 Q20 -62 16 -46" stroke={c.light} strokeWidth={1.6} fill="none" />
    </g>
  );
}

interface LayerProps { ch: Character; o: Outfit; c: HairTriple; wind: boolean; moving: boolean }

function Back({ ch, o, c, wind, moving }: LayerProps) {
  const st = stroked(c);
  const len = ch.hair.length;
  const curled = ch.hair.texture === 'curly' || ch.hair.texture === 'coily';
  const by = BOTTOM[len];
  switch (o.hair) {
    case 'lowpony':
      return (
        <g>
          <path d="M-28 -104 Q-33 -84 -29 -66 L28 -66 Q33 -84 28 -104Z" {...st} />
          <g style={swayStyle(moving, 8, 9, '-20px -68px')}>
            <g transform={shorten(KEEP_PLAIT[len], -72)}>
              <path d="M-22 -72 Q-36 -58 -30 -38 L-26 -46 L-23 -36 Q-17 -54 -14 -68Z" {...st} />
            </g>
          </g>
        </g>
      );
    case 'loose':
    case 'tucked':
    case 'windswept': {
      const sweep = o.hair === 'windswept' || wind;
      return (
        <g style={swayStyle(moving || sweep, moving ? -5 : sweep ? 7 : 2, moving ? 6 : 4, '0px -100px')}>
          <Curtain ch={ch} c={c} jagged />
        </g>
      );
    }
    case 'crown':
    case 'waterfall':
    case 'strands':
      return (
        <g style={swayStyle(moving, moving ? -4 : 1, moving ? 5 : 3, '0px -100px')}>
          <Curtain ch={ch} c={c} jagged={false} />
        </g>
      );
    case 'braidpony':
      return (
        <g style={swayStyle(moving, moving ? 14 : 2, moving ? 12 : 7, '-14px -118px')}>
          <g transform={shorten(KEEP_PLAIT[len], -120)}>
            <Plait pts={[[-14, -120], [-33, -106], [-39, -80], [-35, -54]]} w={9} c={c} tie={o.ribbon} len={7} />
          </g>
        </g>
      );
    case 'pigtails':
      return (
        <>
          {[-1, 1].map((m) => (
            <g key={m} style={swayStyle(moving, moving ? 10 : 0, moving ? 10 : 5, `${26 * m}px -90px`)}>
              <g transform={shorten(KEEP_PLAIT[len], -90)}>
                <Plait pts={[[26 * m, -90], [34 * m, -70], [35 * m, -44]]} w={9} c={c} tie={o.ribbon} len={7} />
              </g>
            </g>
          ))}
        </>
      );
    case 'ponytail':
      // a high tail swinging off the back of the crown
      return (
        <g style={swayStyle(moving, moving ? 14 : 3, moving ? 12 : 6, '-14px -118px')}>
          {curled ? (
            <Scallops pts={[[-22, -118], [-33, -110], [-38, -98], [-37, -86], [-31, -78], [-24, -86], [-25, -100]]} r={len === 'short' ? 5.5 : 7.5} c={c} />
          ) : (
            <g transform={shorten(KEEP_PLAIT[len], -120)}>
              <path d="M-12 -122 Q-40 -120 -42 -92 Q-42 -70 -32 -56 L-29 -65 L-25 -54 Q-31 -78 -26 -98 Q-22 -110 -10 -114Z" {...st} />
              <path d="M-30 -110 Q-36 -92 -32 -72" stroke={c.light} strokeWidth={1.6} fill="none" strokeLinecap="round" />
            </g>
          )}
        </g>
      );
    case 'afro':
      return <Cloud R={{ short: 34, medium: 40, long: 46 }[len]} c={c} cy={-94} />;
    case 'twists':
      return (
        <g style={swayStyle(moving, moving ? -4 : 1, moving ? 5 : 2, '0px -100px')}>
          {[-30, -23, -16, -9, -2, 5, 12, 19, 26].map((x, i) => <Strand key={x} x={x + 2} y0={-106} y1={by + (i % 2 ? 4 : 0)} w={5.6} c={c} twist />)}
        </g>
      );
    case 'locs':
      return (
        <g style={swayStyle(moving, moving ? -4 : 1, moving ? 5 : 2, '0px -100px')}>
          {[-28, -19, -10, -1, 8, 17, 26].map((x, i) => <Strand key={x} x={x + 1} y0={-106} y1={by + (i % 2 ? 5 : 0)} w={7.6} c={c} twist={false} />)}
        </g>
      );
    case 'cornrows':
      // the rows end in short braids at the nape
      return (
        <g style={swayStyle(moving, moving ? -5 : 1, moving ? 6 : 2, '0px -76px')}>
          {[-20, -10, 0, 10, 20].map((x) => <Strand key={x} x={x} y0={-78} y1={Math.min(by + 6, -52)} w={4.6} c={c} twist />)}
        </g>
      );
    case 'bob':
      // one blunt line at the jaw, whatever the length
      return <path d="M-29 -104 Q-37 -84 -34 -66 Q-33 -59 -26 -59 L26 -59 Q33 -59 34 -66 Q37 -84 29 -104 Q0 -126 -29 -104Z" {...st} />;
    default: // dutch, sidebraid, buns, puffs, buzz: nothing hangs behind
      return null;
  }
}

/** Rounds along the top of the head: the outline of curly and coily hair. */
function CrownCurls({ c }: { c: HairTriple }) {
  const pts: [number, number][] = [];
  for (let a = 200; a <= 340; a += 17.5) pts.push([Math.cos((a * Math.PI) / 180) * 28.5, -94 + Math.sin((a * Math.PI) / 180) * 28.5]);
  return <>{pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5.4} fill={c.base} stroke={c.dark} strokeWidth={LW} />)}</>;
}

function Front({ ch, o, c, moving }: LayerProps) {
  const st = stroked(c);
  const len = ch.hair.length;
  const curled = ch.hair.texture === 'curly' || ch.hair.texture === 'coily';
  const under = o.hat === 'beanie' || o.hat === 'helmet' || o.hat === 'knight' || o.hat === 'pumpkin' || o.hat === 'hood';
  const hatted = under || /cap|sunhat|witch|santa|elf|cowboy|newsboy|bandana|party/.test(o.hat);
  const streak = ch.hair.dye?.where === 'streak' && !under ? dyeTriple(ch) : null;
  const streakEl = streak && <path d="M5 -123 Q17 -120 24 -103 L18 -106 Q13 -116 2 -118Z" fill={streak.base} stroke={streak.dark} strokeWidth={1.2} strokeLinejoin="round" />;
  const part = !under && <path d="M1 -123 L2 -116" stroke={c.dark} strokeWidth={1.4} />;
  const shine = !under && <path d="M-19 -112 Q-10 -119 -3 -119 M8 -119 Q16 -117 21 -110" stroke={c.light} strokeWidth={2} fill="none" strokeLinecap="round" />;
  const wisps = <path d="M-26 -98 Q-30 -88 -27 -78 M26 -98 Q30 -88 27 -78 M-8 -115 Q-10 -108 -7 -104" stroke={c.dark} strokeWidth={1.2} fill="none" strokeLinecap="round" />;
  const crownCurls = curled && !hatted && <CrownCurls c={c} />;
  /** side pieces that hang in front of the ears */
  const sides = (
    <g transform={shorten(KEEP[len], -99)}>
      <path d="M-27 -98 Q-33 -78 -29 -56 L-25 -62 L-22 -54 Q-24 -80 -21 -98Z M27 -98 Q33 -78 29 -56 L25 -62 L22 -54 Q24 -80 21 -98Z" {...st} />
    </g>
  );
  /** things worn on top of the head, whatever the hairline */
  const top = !hatted && (
    <>
      {o.hair === 'buns' &&
        [-18, 18].map((x) => (
          <g key={x}>
            <circle cx={x} cy={-121} r={10} fill={c.base} stroke={c.dark} strokeWidth={LW} />
            <path d={`M${x - 7} -124 Q${x} -114 ${x + 7} -124 M${x - 8} -119 Q${x} -128 ${x + 8} -119`} stroke={c.dark} strokeWidth={1.2} fill="none" />
            <path d={`M${x - 5} -127 Q${x} -130 ${x + 4} -127`} stroke={c.light} strokeWidth={1.6} fill="none" />
            <circle cx={x + (x < 0 ? 8 : -8)} cy={-113} r={2.6} fill={o.ribbon} stroke={OUT} strokeWidth={1} />
          </g>
        ))}
      {o.hair === 'puffs' &&
        [-1, 1].map((m) => (
          <g key={m}>
            <Scallops pts={Array.from({ length: 7 }, (_, i): [number, number] => [22 * m + Math.cos((i / 7) * Math.PI * 2) * 8, -118 + Math.sin((i / 7) * Math.PI * 2) * 8])} r={5.2} c={c} />
            <circle cx={15 * m} cy={-110} r={2.6} fill={o.ribbon} stroke={OUT} strokeWidth={1} />
          </g>
        ))}
      {(o.hair === 'ponytail' || o.hair === 'braidpony') && <circle cx={-14} cy={-121} r={3.2} fill={o.ribbon} stroke={OUT} strokeWidth={1} />}
    </>
  );

  // styles that set their own hairline
  if (o.hair === 'buzz')
    return (
      <g>
        {!under && <path d="M-27 -92 Q-29.5 -121 0 -121.5 Q29.5 -121 27 -92 Q25 -108 0 -111.5 Q-25 -108 -27 -92Z" fill={c.base} stroke={c.dark} strokeWidth={1.4} strokeLinejoin="round" />}
        {!under && <path d="M-18 -113 l1 0 M-9 -116 l1 0 M0 -117 l1 0 M9 -116 l1 0 M18 -113 l1 0 M-13 -110.5 l1 0 M-4 -112.5 l1 0 M5 -112.5 l1 0 M14 -110.5 l1 0" stroke={c.light} strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />}
        {streakEl}
      </g>
    );
  if (o.hair === 'cornrows')
    return (
      <g>
        {!under && <path d="M-27 -92 Q-31 -123 0 -124 Q31 -123 27 -92 Q23 -110 2 -114 Q-23 -110 -27 -92Z" {...st} />}
        {!under && <path d="M-21 -103 Q-19 -116 -12 -121 M-12 -108 Q-10 -118 -5 -123 M-2 -112 Q-1 -119 0 -124 M8 -110 Q8 -118 6 -123 M17 -106 Q16 -116 12 -121 M24 -99 Q23 -110 19 -117" stroke={c.dark} strokeWidth={1.5} fill="none" strokeLinecap="round" />}
        {streakEl}
      </g>
    );
  if (o.hair === 'afro')
    return (
      <g>
        {!under && <path d="M-27 -92 Q-31 -123 0 -124 Q31 -123 27 -92 Q23 -109 2 -113 Q-23 -109 -27 -92Z" fill={c.base} />}
        {!under && [-19, -10, 0, 10, 19].map((x) => <circle key={x} cx={x} cy={-111 + Math.abs(x) * 0.22} r={5.2} fill={c.base} stroke={c.dark} strokeWidth={1.6} />)}
        {!under && <path d="M-27 -92 Q-28 -100 -24 -106 M27 -92 Q28 -100 24 -106" stroke={c.dark} strokeWidth={LW} fill="none" strokeLinecap="round" />}
        {streakEl}
      </g>
    );
  if (o.hair === 'twists' || o.hair === 'locs') {
    const twist = o.hair === 'twists';
    const by = BOTTOM[len] + 4;
    return (
      <g>
        {!under && <path d="M-27 -92 Q-31 -123 0 -124 Q31 -123 27 -92 Q23 -111 2 -116 Q-23 -111 -27 -92Z" {...st} />}
        {!under && <path d="M-16 -111 Q-12 -119 -8 -123 M-6 -114 Q-4 -120 -3 -124 M6 -114 Q6 -120 5 -124 M16 -111 Q14 -118 10 -123" stroke={c.dark} strokeWidth={1.2} fill="none" strokeLinecap="round" />}
        {[-1, 1].map((m) => (
          <g key={m} style={swayStyle(moving, moving ? 6 : 0, moving ? 7 : 3, `${27 * m}px -98px`)}>
            <Strand x={28 * m} y0={-102} y1={by} w={twist ? 5.6 : 7.4} c={c} twist={twist} />
            <Strand x={(twist ? 22 : 20) * m} y0={-104} y1={by - 6} w={twist ? 5.6 : 7.4} c={c} twist={twist} />
          </g>
        ))}
        {streakEl}
      </g>
    );
  }

  const sway = (ox: number, child: React.ReactNode) => (
    <g style={swayStyle(moving, moving ? 8 : 0, moving ? 9 : 4, `${ox}px -88px`)}>
      <g transform={shorten(KEEP_PLAIT[len], -90)}>{child}</g>
    </g>
  );
  /** what a braided or cut style adds over the hairline, whichever hairline it is */
  const styled: Partial<Record<Outfit['hair'], React.ReactNode>> = {
    dutch: (
      <>
        {!under && <Plait pts={[[-3, -122], [-17, -116], [-25, -103], [-27, -90]]} w={7} c={c} len={5.5} />}
        {!under && <Plait pts={[[4, -122], [18, -116], [25, -103], [27, -90]]} w={7} c={c} len={5.5} />}
        {sway(-27, <Plait pts={[[-27, -90], [-27, -68], [-24, -44]]} w={9} c={c} tie={o.ribbon} len={7} />)}
        {sway(27, <Plait pts={[[27, -90], [27, -68], [24, -44]]} w={9} c={c} tie={o.ribbon} len={7} />)}
      </>
    ),
    crown: !under && <Plait pts={[[-27, -98], [-20, -115], [0, -123], [20, -115], [27, -98]]} w={7.5} c={c} len={5.5} />,
    sidebraid: sway(22, <Plait pts={[[21, -103], [29, -84], [24, -62], [17, -42]]} w={10} c={c} tie={o.ribbon} len={7} />),
    waterfall: (
      <>
        {!under && <Plait pts={[[-27, -100], [-9, -111], [11, -111], [27, -100]]} w={5} c={c} len={4.5} />}
        {sides}
        <Flower x={22} y={-107} c="#FFFFFF" r={3.6} />
      </>
    ),
    strands: (
      <>
        {sides}
        <g transform={shorten(KEEP_PLAIT[len], -116)}>
          <Plait pts={[[-15, -116], [-25, -98], [-26, -76], [-23, -56]]} w={4.4} c={c} len={4} tie={o.ribbon} />
          <Plait pts={[[17, -115], [26, -96], [25, -72]]} w={4.4} c={c} len={4} />
        </g>
      </>
    ),
    bob: <path d="M-27 -99 Q-35 -80 -32 -62 Q-26 -58 -22 -66 Q-25 -84 -21 -100Z M27 -99 Q35 -80 32 -62 Q26 -58 22 -66 Q25 -84 21 -100Z" {...st} />,
  };

  if (ch.hair.front === 'bangs') {
    // the bangs' own side locks, unless the style ties the sides back or hangs something there
    const locks = !['tucked', 'lowpony', 'ponytail', 'dutch', 'waterfall', 'strands', 'bob'].includes(o.hair);
    return (
      <g>
        {crownCurls}
        {/* chunky pointed bangs from an off-centre part */}
        {!under && (
          <path
            d="M-28 -92 Q-32 -123 0 -124 Q32 -123 28 -92 L24 -101 Q21 -107 15 -108 L11 -95 Q8 -106 0 -111 L-5 -113 L-9 -97 Q-13 -107 -21 -105 L-24 -96Z"
            {...st}
          />
        )}
        {under && <path d="M-28 -92 L-24 -101 Q-19 -106 -13 -104 L-9 -96 Q-3 -106 5 -105 L10 -95 Q15 -105 22 -103 L28 -92 L28 -100 L-28 -100Z" {...st} />}
        {locks && (
          <g transform={shorten(KEEP[len], -99)}>
            <path d="M-28 -99 Q-34 -78 -30 -58 L-26 -64 L-24 -53 L-20 -66 Q-24 -84 -21 -100Z" {...st} />
            <path d="M28 -99 Q34 -78 30 -58 L26 -64 L24 -53 L20 -66 Q24 -84 21 -100Z" {...st} />
          </g>
        )}
        {ch.hair.cowlick && !hatted && <path d="M-3 -122 Q-11 -138 5 -134 Q-1 -131 3 -121Z" {...st} strokeWidth={1.8} />}
        {!under && <path d="M-19 -113 Q-8 -120 6 -116 M12 -116 Q18 -114 22 -109" stroke={c.light} strokeWidth={2} fill="none" strokeLinecap="round" />}
        {streakEl}
        {styled[o.hair]}
        {top}
      </g>
    );
  }

  // off the forehead: pulled back from a centre part, swept to one side, or
  // a row of curls along the hairline
  const swept = ch.hair.front === 'side-swept';
  const cap = !under && (
    <>
      {crownCurls}
      {swept ? (
        <path d="M-27 -92 Q-31 -123 0 -124 Q31 -123 27 -92 Q26 -106 15 -113 Q5 -103 -12 -101.5 Q-22 -100.5 -27 -92Z" {...st} />
      ) : (
        <path d="M-27 -92 Q-31 -123 0 -124 Q31 -123 27 -92 Q23 -111 2 -116 Q-23 -111 -27 -92Z" {...st} />
      )}
      {swept && <path d="M13 -114 Q2 -106 -14 -104" stroke={c.light} strokeWidth={1.8} fill="none" strokeLinecap="round" />}
      {ch.hair.front === 'curls' && [-18, -9, 0, 9, 18].map((x) => <circle key={x} cx={x} cy={-109 + Math.abs(x) * 0.2} r={5.4} fill={c.base} stroke={c.dark} strokeWidth={1.6} />)}
      {streakEl}
    </>
  );
  const centre = swept ? null : part;
  const plain = !['crown', 'waterfall'].includes(o.hair); // those two cover the part and the shine
  return (
    <g>
      {cap}
      {plain && shine}
      {styled[o.hair]}
      {plain && centre}
      {o.hair !== 'waterfall' && o.hair !== 'strands' && o.hair !== 'bob' && wisps}
      {top}
    </g>
  );
}

/** Draw a hair layer; with dyed tips, draw its lower part again in the dye. */
function layer(Part: React.FC<LayerProps>, p: Omit<LayerProps, 'c'>, clipId: string) {
  const natural = hairColors(p.ch);
  const tips = p.ch.hair.dye?.where === 'tips' ? dyeTriple(p.ch) : null;
  if (!tips) return <Part {...p} c={natural} />;
  const y = { short: -80, medium: -66, long: -58 }[p.ch.hair.length];
  return (
    <g>
      <Part {...p} c={natural} />
      <clipPath id={clipId}>
        <rect x={-90} y={y} width={180} height={140} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <Part {...p} c={tips} />
      </g>
    </g>
  );
}

export const HairBack = ({ clipId, ...p }: Omit<LayerProps, 'c'> & { clipId: string }) => layer(Back, p, `${clipId}-b`);
export const HairFront = ({ clipId, ...p }: Omit<LayerProps, 'c' | 'wind'> & { clipId: string }) => layer(Front, { ...p, wind: false }, `${clipId}-f`);
