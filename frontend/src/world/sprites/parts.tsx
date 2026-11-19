// EarnKeep — the Sprite rig's reusable drawn parts: braids, flowers, hats, tops and
// wings. Hats, tops and wings are drawn in the ORIGINAL rig's coordinates
// (head centre (0,-103) r≈23.5; torso y -77…-40, ±15); Sprite.tsx places them
// on the anime rig with a group transform, so they refit without redrawing.

import React from 'react';
import type { Outfit, Wings } from './types';

export const OUT = '#3B2A22'; // storybook outline
const SW_ = 3; // outline width (original rig units)

/** A plait: alternating rotated lobes along a polyline. */
export function Plait({ pts, w, c, tie, len = 6.5 }: { pts: [number, number][]; w: number; c: { base: string; light: string; dark: string }; tie?: string; len?: number }) {
  const out: React.ReactNode[] = [];
  let k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0);
    const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
    const n = Math.max(1, Math.round(L / len));
    for (let s = 0; s < n; s++) {
      const t = (s + 0.5) / n;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const flip = k++ % 2 ? 28 : -28;
      out.push(<ellipse key={`${i}-${s}`} cx={x} cy={y} rx={len * 0.62} ry={w * 0.5} transform={`rotate(${ang + flip} ${x} ${y})`} fill={k % 3 ? c.base : c.light} stroke={c.dark} strokeWidth={1.4} />);
    }
  }
  const [ex, ey] = pts[pts.length - 1];
  return (
    <g>
      {out}
      {tie && (
        <>
          <path d={`M${ex - 3} ${ey + 1} Q${ex} ${ey + 9} ${ex + 3} ${ey + 1} Q${ex + 4} ${ey + 8} ${ex - 1} ${ey + 11} Q${ex - 5} ${ey + 8} ${ex - 3} ${ey + 1}Z`} fill={c.base} stroke={c.dark} strokeWidth={1.2} />
          <circle cx={ex} cy={ey + 1} r={2.6} fill={tie} stroke={OUT} strokeWidth={1} />
        </>
      )}
    </g>
  );
}

export const Flower: React.FC<{ x: number; y: number; c: string; r?: number }> = ({ x, y, c, r = 3.4 }) => (
  <g>
    {[0, 72, 144, 216, 288].map((a) => (
      <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * r} cy={y + Math.sin((a * Math.PI) / 180) * r} r={r * 0.75} fill={c} stroke={OUT} strokeWidth={0.8} />
    ))}
    <circle cx={x} cy={y} r={r * 0.6} fill="#F6C443" />
  </g>
);

export function HatBack({ o }: { o: Outfit }) {
  if (o.hat === 'hood') return <ellipse cx={0} cy={-104} rx={31} ry={31} fill={o.top1} stroke={OUT} strokeWidth={SW_} />;
  if (o.top === 'hoodie' && o.hat === 'none') return <path d="M-22 -86 Q-30 -76 -18 -72 L18 -72 Q30 -76 22 -86Z" fill={o.top1} stroke={OUT} strokeWidth={SW_} />;
  return null;
}

export function Hat({ o }: { o: Outfit }) {
  const s = { stroke: OUT, strokeWidth: SW_, strokeLinejoin: 'round' as const };
  const h1 = o.hat1, h2 = o.hat2;
  switch (o.hat) {
    case 'cap':
    case 'capback': {
      const b = o.hat === 'cap' ? 1 : -1;
      return (
        <g>
          <path d="M-25 -112 Q-24 -136 0 -137 Q24 -136 25 -112Z" fill={h1} {...s} />
          {b === 1 && <path d="M2 -135 Q20 -132 24 -114 L6 -114Z" fill="#FFFFFF" opacity={0.85} />}
          <path d={`M${18 * b} -114 Q${38 * b} -117 ${42 * b} -110 L${20 * b} -109Z`} fill={h1} {...s} />
          <circle cx={0} cy={-136} r={2.2} fill={h1} stroke={OUT} strokeWidth={1.2} />
        </g>
      );
    }
    case 'beanie':
      return (
        <g>
          <path d="M-26 -106 Q-27 -139 0 -140 Q27 -139 26 -106Z" fill={h1} {...s} />
          <rect x={-27} y={-113} width={54} height={9} rx={4} fill={h2} {...s} strokeWidth={2} />
          <path d="M-18 -113 L-18 -104 M-9 -113 L-9 -104 M0 -113 L0 -104 M9 -113 L9 -104 M18 -113 L18 -104" stroke={OUT} strokeWidth={1} opacity={0.4} />
          <circle cx={0} cy={-142} r={7} fill={h2} {...s} strokeWidth={2} />
        </g>
      );
    case 'sunhat':
      return (
        <g>
          <ellipse cx={0} cy={-114} rx={40} ry={8} fill={h1} {...s} />
          <path d="M-20 -114 Q-20 -138 0 -138 Q20 -138 20 -114Z" fill={h1} {...s} />
          <path d="M-20 -119 L20 -119" stroke={h2 === '#FFFFFF' ? '#F48FB1' : h2} strokeWidth={5} />
        </g>
      );
    case 'hood':
      return <path d="M-29 -96 Q-30 -132 0 -134 Q30 -132 29 -96 Q24 -126 0 -127 Q-24 -126 -29 -96Z" fill={o.top1} {...s} />;
    case 'flowercrown':
      return (
        <g>
          <path d="M-24 -116 Q0 -130 24 -116" stroke="#4E9A57" strokeWidth={3} fill="none" />
          {[-20, -10, 0, 10, 20].map((x, i) => (
            <Flower key={x} x={x} y={-120 - (i % 2 ? 6 : 3) + Math.abs(x) * 0.18} c={['#F48FB1', '#FFFFFF', '#B79CF0', '#FFD166', '#F48FB1'][i]} r={3} />
          ))}
        </g>
      );
    case 'party':
      return (
        <g transform="rotate(-12 0 -126)">
          <path d="M-13 -124 L0 -160 L13 -124Z" fill={h1} {...s} />
          <path d="M-9 -134 L9 -134 M-5 -145 L5 -145" stroke={h2} strokeWidth={3.4} />
          <circle cx={0} cy={-161} r={4.6} fill={h2} {...s} strokeWidth={1.6} />
        </g>
      );
    case 'witch':
      return (
        <g>
          <ellipse cx={0} cy={-119} rx={36} ry={7} fill={h1} {...s} />
          <path d="M-16 -121 Q-6 -152 12 -170 Q8 -146 17 -121Z" fill={h1} {...s} />
          <path d="M-15 -127 L16 -127" stroke={h2} strokeWidth={4} />
        </g>
      );
    case 'santa':
    case 'elf': {
      const elf = o.hat === 'elf';
      return (
        <g>
          <path d={elf ? 'M-24 -114 Q-14 -152 30 -150 Q8 -134 24 -114Z' : 'M-24 -114 Q-12 -150 18 -146 Q32 -140 28 -126 Q20 -130 24 -114Z'} fill={h1} {...s} />
          <rect x={-27} y={-120} width={54} height={9} rx={4.5} fill={h2} {...s} strokeWidth={2} />
          <circle cx={elf ? 30 : 28} cy={elf ? -150 : -124} r={5} fill={elf ? '#F2C230' : h2} {...s} strokeWidth={1.6} />
        </g>
      );
    }
    case 'earmuffs':
      return (
        <g>
          <path d="M-25 -104 Q-26 -136 0 -136 Q26 -136 25 -104" stroke={OUT} strokeWidth={4} fill="none" />
          <circle cx={-26} cy={-102} r={9} fill={h1} {...s} />
          <circle cx={26} cy={-102} r={9} fill={h1} {...s} />
        </g>
      );
    case 'crown':
      return <path d="M-14 -124 L-16 -140 L-8 -132 L0 -144 L8 -132 L16 -140 L14 -124Z" fill={h1} {...s} />;
    case 'bandana':
      return (
        <g>
          <path d="M-26 -108 Q0 -124 26 -108 L25 -118 Q0 -134 -25 -118Z" fill={h1} {...s} />
          <path d="M-25 -114 L-36 -108 L-31 -118 L-37 -122Z" fill={h1} {...s} strokeWidth={2} />
          <circle cx={-8} cy={-119} r={1.6} fill="#FFFFFF" />
          <circle cx={8} cy={-120} r={1.6} fill="#FFFFFF" />
        </g>
      );
    case 'helmet':
      return (
        <g>
          <path d="M-28 -106 Q-28 -142 0 -142 Q28 -142 28 -106 Z" fill={h1} {...s} />
          <path d="M-12 -138 L-14 -116 M0 -141 L0 -118 M12 -138 L14 -116" stroke="#FFFFFF" strokeWidth={3} opacity={0.6} />
          <path d="M-24 -104 L-12 -82 M24 -104 L12 -82" stroke={OUT} strokeWidth={1.4} />
        </g>
      );
    case 'headband':
    case 'bow':
      return (
        <g>
          {o.hat === 'headband' && <path d="M-24 -112 Q0 -132 24 -112" stroke={h1} strokeWidth={5} fill="none" />}
          <g transform="translate(14 -126) rotate(18)">
            <path d="M0 0 L-11 -7 L-11 7Z M0 0 L11 -7 L11 7Z" fill={h1} {...s} strokeWidth={1.8} />
            <circle r={3} fill={h1} {...s} strokeWidth={1.4} />
          </g>
        </g>
      );
    case 'pumpkin':
      return (
        <g>
          <path d="M-27 -104 Q-29 -140 0 -140 Q29 -140 27 -104Z" fill={h1} {...s} />
          <path d="M-12 -138 Q-16 -120 -14 -105 M12 -138 Q16 -120 14 -105 M0 -140 L0 -104" stroke={OUT} strokeWidth={1.2} opacity={0.5} />
          <path d="M-2 -140 Q0 -150 6 -151" stroke="#4E7A35" strokeWidth={4} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'knight':
      return (
        <g>
          <path d="M-28 -98 Q-29 -140 0 -141 Q29 -140 28 -98 L22 -98 L22 -112 L-22 -112 L-22 -98Z" fill={h1} {...s} />
          <path d="M0 -141 Q-14 -160 -26 -150 Q-14 -152 -6 -140" fill="#D9493C" {...s} strokeWidth={1.6} />
        </g>
      );
    case 'sweatband':
      return <path d="M-25 -112 Q0 -124 25 -112 L25 -106 Q0 -118 -25 -106Z" fill={h1} {...s} strokeWidth={2} />;
    case 'cowboy':
      return (
        <g>
          <path d="M-40 -114 Q-30 -106 0 -107 Q30 -106 40 -114 Q30 -110 0 -112 Q-30 -110 -40 -114Z" fill={h1} {...s} />
          <path d="M-20 -112 Q-22 -138 -8 -140 Q0 -134 8 -140 Q22 -138 20 -112Z" fill={h1} {...s} />
          <path d="M-20 -118 L20 -118" stroke={h2 === '#FFFFFF' ? '#B8872A' : h2} strokeWidth={3.4} />
        </g>
      );
    case 'newsboy':
      return (
        <g>
          <path d="M-26 -110 Q-28 -136 2 -137 Q30 -134 26 -110Z" fill={h1} {...s} />
          <path d="M14 -113 Q32 -114 36 -108 L16 -107Z" fill={h1} {...s} />
          <circle cx={0} cy={-135} r={2.4} fill={h1} stroke={OUT} strokeWidth={1.2} />
          <path d="M-14 -132 Q0 -122 16 -130" stroke={OUT} strokeWidth={1} opacity={0.4} fill="none" />
        </g>
      );
    case 'clip':
      return <Flower x={-17} y={-120} c={h1} r={3.2} />;
    case 'goggles':
      return (
        <g>
          <path d="M-25 -116 L25 -116" stroke={OUT} strokeWidth={4} />
          <circle cx={-9} cy={-117} r={6.5} fill="#9FE3F5" {...s} strokeWidth={2.4} />
          <circle cx={9} cy={-117} r={6.5} fill="#9FE3F5" {...s} strokeWidth={2.4} />
        </g>
      );
    default:
      return null;
  }
}

export const LONG = new Set(['ruffle', 'hoodie', 'raincoat', 'puffer', 'sweater', 'pjs', 'wetsuit', 'tunic', 'robe', 'bones', 'dragon', 'flannel', 'rashguard']);
export const sleeveLen = (o: Outfit) => (o.top === 'tank' || o.top === 'swim' ? 0 : LONG.has(o.top) ? 25 : o.top === 'dress' || o.top === 'gown' ? 8 : 11);
export const sleeveColor = (o: Outfit) => (o.top === 'overalls' ? o.top2 : o.top1);

export function Print({ o }: { o: Outfit }) {
  const c = o.top2;
  const y = -58;
  switch (o.print) {
    case 'star':
      return <path d={`M0 ${y - 7} L2.2 ${y - 2} L7 ${y - 2} L3 ${y + 1.5} L4.6 ${y + 7} L0 ${y + 3.6} L-4.6 ${y + 7} L-3 ${y + 1.5} L-7 ${y - 2} L-2.2 ${y - 2}Z`} fill={c} />;
    case 'bolt':
      return <path d={`M2 ${y - 8} L-5 ${y + 1} L0 ${y + 1} L-2 ${y + 8} L5 ${y - 1} L0 ${y - 1}Z`} fill={c} />;
    case 'heart':
      return <path d={`M0 ${y + 6} C-9 ${y - 1} -5 ${y - 9} 0 ${y - 4} C5 ${y - 9} 9 ${y - 1} 0 ${y + 6}Z`} fill={c} />;
    case 'flower':
      return <Flower x={0} y={y} c={c} r={3.4} />;
    case 'mountain':
      return (
        <g>
          <path d={`M-9 ${y + 6} L0 ${y - 8} L9 ${y + 6}Z`} fill={c} opacity={0.9} />
          <path d={`M-9 ${y + 2} Q-4 ${y - 2} 0 ${y + 2} Q4 ${y + 6} 9 ${y + 2}`} stroke="#3AA6C8" strokeWidth={2.2} fill="none" />
        </g>
      );
    case 'stripes':
      return <path d={`M-14 ${y - 3} L14 ${y - 3} M-14 ${y + 4} L14 ${y + 4}`} stroke={c} strokeWidth={3} />;
    case 'number':
      return <text x={0} y={y + 5} textAnchor="middle" fontSize={15} fontWeight={900} fontFamily="sans-serif" fill={c}>7</text>;
    case 'snowflake':
      return <path d={`M0 ${y - 7} L0 ${y + 7} M-6 ${y - 3.5} L6 ${y + 3.5} M-6 ${y + 3.5} L6 ${y - 3.5}`} stroke={c} strokeWidth={2.2} strokeLinecap="round" />;
    case 'pixel': // a blocky green game face (generic)
      return (
        <g>
          <rect x={-8} y={y - 8} width={16} height={16} fill="#5DBB4C" />
          <rect x={-5} y={y - 4} width={3.5} height={3.5} fill="#1E2A1C" />
          <rect x={1.5} y={y - 4} width={3.5} height={3.5} fill="#1E2A1C" />
          <rect x={-2} y={y} width={4} height={3} fill="#1E2A1C" />
          <rect x={-4} y={y + 2} width={8} height={3} fill="#1E2A1C" />
        </g>
      );
    case 'saber': // a glowing light-sword
      return (
        <g>
          <path d={`M-7 ${y + 7} L6 ${y - 7}`} stroke="#7DF9FF" strokeWidth={3.4} strokeLinecap="round" />
          <path d={`M-9 ${y + 9} L-6 ${y + 6}`} stroke="#9AA3AE" strokeWidth={3.6} strokeLinecap="round" />
        </g>
      );
    case 'pony':
    case 'rainbow':
      return (
        <g fill="none" strokeWidth={2.2}>
          <path d={`M-8 ${y + 5} A8 8 0 0 1 8 ${y + 5}`} stroke="#F48FB1" />
          <path d={`M-5 ${y + 5} A5 5 0 0 1 5 ${y + 5}`} stroke="#9FD6F0" />
          {o.print === 'pony' && <circle cx={0} cy={y - 6} r={1.8} fill="#FFFFFF" stroke="none" />}
        </g>
      );
    default:
      return null;
  }
}

export function Torso({ o }: { o: Outfit }) {
  const s = { stroke: OUT, strokeWidth: SW_, strokeLinejoin: 'round' as const };
  const t = o.top;
  const wide = t === 'puffer' ? 3 : 0;
  const parts: React.ReactNode[] = [];
  // skirts / long hems go first so the torso overlaps them
  if (t === 'dress' || t === 'gown' || t === 'robe' || t === 'raincoat')
    parts.push(<path key="hem" d={t === 'raincoat' ? 'M-15 -46 L-18 -28 Q0 -25 18 -28 L15 -46Z' : t === 'gown' ? 'M-14 -46 L-26 -10 Q0 -4 26 -10 L14 -46Z' : t === 'robe' ? 'M-15 -46 L-22 -14 Q0 -9 22 -14 L15 -46Z' : 'M-14 -46 L-23 -22 Q0 -17 23 -22 L14 -46Z'} fill={o.top1} {...s} />);
  if (o.bottom === 'skirt') parts.push(<path key="skirt" d="M-15 -44 L-22 -26 Q0 -22 22 -26 L15 -44Z" fill={o.bottom1} {...s} />);
  const torsoFill = t === 'overalls' ? o.top2 : o.top1;
  parts.push(<path key="torso" d={`M${-14 - wide} -77 Q0 -81 ${14 + wide} -77 L${15 + wide} -40 Q0 -36 ${-15 - wide} -40Z`} fill={torsoFill} {...s} />);
  switch (t) {
    case 'tee':
    case 'jersey':
    case 'pjs':
    case 'sweater':
    case 'gown':
    case 'dress':
      parts.push(<path key="neck" d="M-6 -79 Q0 -73 6 -79" stroke={OUT} strokeWidth={1.6} fill={t === 'sweater' ? o.top2 : '#F7D5BC'} />);
      break;
    case 'tank':
      parts.push(<path key="neck" d="M-7 -79 Q0 -68 7 -79" fill="#F7D5BC" stroke={OUT} strokeWidth={1.6} />);
      break;
    case 'ruffle':
      parts.push(<path key="ruf" d="M-15 -42 q2.5 5 5 0 q2.5 5 5 0 q2.5 5 5 0 q2.5 5 5 0 q2.5 5 5 0 q2.5 5 5 0" fill={o.top1} stroke={OUT} strokeWidth={1.8} />);
      parts.push(<path key="neck" d="M-7 -80 Q0 -76 7 -80" stroke={OUT} strokeWidth={1.6} fill="none" />);
      break;
    case 'hoodie':
      parts.push(<rect key="pk" x={-9} y={-54} width={18} height={9} rx={3} fill={o.top2} opacity={0.55} stroke={OUT} strokeWidth={1.2} />);
      parts.push(<path key="str" d="M-4 -78 L-4 -68 M4 -78 L4 -68" stroke="#FFFFFF" strokeWidth={1.6} />);
      break;
    case 'raincoat':
      parts.push(<path key="btn" d="M0 -76 L0 -30" stroke={OUT} strokeWidth={1.2} opacity={0.6} />);
      [-68, -56, -44].forEach((y) => parts.push(<circle key={y} cx={3.5} cy={y} r={1.8} fill={OUT} opacity={0.6} />));
      break;
    case 'puffer':
      if (o.print === 'stripes') [-66, -54].forEach((y) => parts.push(<path key={`b${y}`} d={`M-17 ${y} Q0 ${y + 3} 17 ${y} L17 ${y + 6} Q0 ${y + 9} -17 ${y + 6}Z`} fill={o.top2} />));
      [-68, -58, -48].forEach((y) => parts.push(<path key={y} d={`M-17 ${y} Q0 ${y + 3} 17 ${y}`} stroke={OUT} strokeWidth={1.2} fill="none" opacity={0.55} />));
      parts.push(<path key="zip" d="M0 -79 L0 -39" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.7} />);
      break;
    case 'overalls':
      parts.push(<path key="bib" d="M-10 -66 L10 -66 L13 -40 Q0 -37 -13 -40Z" fill={o.top1} {...s} strokeWidth={2} />);
      parts.push(<path key="str" d="M-10 -66 L-12 -78 M10 -66 L12 -78" stroke={o.top1} strokeWidth={4} />);
      parts.push(<circle key="b1" cx={-7} cy={-63} r={1.6} fill="#F2C230" />, <circle key="b2" cx={7} cy={-63} r={1.6} fill="#F2C230" />);
      break;
    case 'wetsuit':
      parts.push(<path key="side" d="M-15 -60 Q-12 -48 -15 -40 L-10 -40 Q-8 -52 -12 -62Z M15 -60 Q12 -48 15 -40 L10 -40 Q8 -52 12 -62Z" fill={o.top2} />);
      parts.push(<path key="pipe" d="M-14 -72 Q0 -60 14 -72 M-12 -42 Q0 -52 12 -42" stroke="#E7C79A" strokeWidth={1.4} fill="none" />);
      break;
    case 'rashguard':
      parts.push(<path key="rg" d="M-15 -62 L-11 -40 M15 -62 L11 -40" stroke={o.top2} strokeWidth={3} />);
      parts.push(<path key="neck" d="M-6 -79 Q0 -75 6 -79" stroke={OUT} strokeWidth={1.6} fill="none" />);
      break;
    case 'swim': // swimsuit + little swim vest
      parts.push(<path key="vest" d="M-15 -76 L-6 -76 L-5 -50 L-15 -48Z M15 -76 L6 -76 L5 -50 L15 -48Z" fill={o.top2} stroke={OUT} strokeWidth={1.6} />);
      parts.push(<path key="buckle" d="M-6 -60 L6 -60" stroke={OUT} strokeWidth={2} />);
      break;
    case 'flannel':
      parts.push(<path key="pl" d="M-14 -66 L15 -66 M-15 -54 L15 -54 M-7 -78 L-7 -38 M7 -78 L7 -38" stroke={o.top2} strokeWidth={2.4} opacity={0.6} />);
      break;
    case 'tunic':
      parts.push(<path key="cr" d="M0 -72 L0 -50 M-7 -64 L7 -64" stroke={o.top2} strokeWidth={4} />);
      parts.push(<rect key="belt" x={-15} y={-46} width={30} height={5} fill="#6B4A2B" />);
      break;
    case 'bones':
      parts.push(<path key="ribs" d="M0 -76 L0 -42 M-10 -70 Q0 -66 10 -70 M-11 -62 Q0 -58 11 -62 M-11 -54 Q0 -50 11 -54" stroke={o.top2} strokeWidth={2.2} fill="none" />);
      break;
    case 'dragon':
      parts.push(<path key="belly" d="M-8 -74 L8 -74 L9 -42 L-9 -42Z" fill={o.top2} opacity={0.85} />);
      parts.push(<path key="pl" d="M-8 -66 L8 -66 M-8 -58 L8 -58 M-9 -50 L9 -50" stroke={OUT} strokeWidth={1} opacity={0.4} />);
      break;
    default:
      break;
  }
  if (o.print !== 'none' && ['tee', 'jersey', 'pjs', 'sweater', 'tank', 'ruffle', 'dress', 'hoodie'].includes(t)) parts.push(<Print key="pr" o={o} />);
  return <>{parts}</>;
}

export const WING_FILL: Record<Wings, [string, string]> = {
  fairy: ['rgba(196,240,255,.72)', '#F7A8D0'],
  butterfly: ['#FFB547', '#5B7BE0'],
  dragonfly: ['rgba(214,248,240,.65)', '#7FCFC2'],
  dragon: ['#5DAA62', '#2F6B3A'],
  bat: ['#3B2C4E', '#5A4374'],
  feather: ['#FFFFFF', '#E6E9F2'],
};

export function WingPair({ kind, flap }: { kind: Wings; flap: number }) {
  const [f, e] = WING_FILL[kind];
  const one = (() => {
    switch (kind) {
      case 'dragon':
      case 'bat':
        return (
          <g>
            <path d="M0 0 L-14 -26 L-40 -34 L-34 -18 L-44 -12 L-32 -4 L-36 6 Q-18 4 0 6Z" fill={f} stroke={OUT} strokeWidth={2.4} strokeLinejoin="round" />
            <path d="M-14 -26 L-22 4 M-30 -30 L-28 0" stroke={e} strokeWidth={1.6} />
          </g>
        );
      case 'dragonfly':
        return (
          <g fill={f} stroke={e} strokeWidth={1.8}>
            <ellipse cx={-24} cy={-10} rx={24} ry={6} transform="rotate(-16 -24 -10)" />
            <ellipse cx={-21} cy={4} rx={20} ry={5} transform="rotate(14 -21 4)" />
          </g>
        );
      case 'feather':
        return (
          <g fill={f} stroke="#B9C0D3" strokeWidth={1.6}>
            <path d="M0 -2 Q-26 -36 -44 -26 Q-34 -18 -40 -12 Q-30 -8 -34 -2 Q-18 4 0 4Z" />
          </g>
        );
      default: // fairy + butterfly
        return (
          <g stroke={kind === 'fairy' ? '#FFFFFF' : OUT} strokeWidth={2}>
            <path d="M0 -2 Q-18 -40 -38 -28 Q-42 -10 0 0Z" fill={f} />
            <path d="M0 2 Q-30 8 -26 22 Q-12 26 0 4Z" fill={kind === 'fairy' ? 'rgba(255,214,236,.7)' : e} />
            {kind === 'butterfly' && <circle cx={-24} cy={-22} r={4} fill="#FFFFFF" stroke="none" />}
            {kind === 'fairy' && <circle cx={-26} cy={-24} r={2} fill="#FFFFFF" stroke="none" />}
          </g>
        );
    }
  })();
  const anim = (side: 1 | -1): React.CSSProperties => ({
    ['--b' as string]: '0deg',
    animation: `ek-tw-flap ${flap}s ease-in-out infinite alternate`,
    transform: side === 1 ? undefined : undefined,
  });
  return (
    <g transform="translate(0 -72) scale(1.5)">
      <g style={anim(-1)}>{one}</g>
      <g transform="scale(-1 1)">
        <g style={anim(1)}>{one}</g>
      </g>
    </g>
  );
}
