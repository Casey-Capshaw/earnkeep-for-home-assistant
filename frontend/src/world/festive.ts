// EarnKeep — special days: birthdays + major holidays.
// specialFor(date) decides what (if anything) today celebrates; the
// decorate*() generators paint static festive SVG (rasterized once like the
// rest of the scene); festive.tsx adds the animated bits (balloons,
// fireworks, bats, banner, party hats).
//
// Birthdays outrank holidays. Each birthday also gets an "eve" teaser.
// People + dates come from data: each kid's FamilyMember.birthday and
// settings.celebrations (grown-ups etc.) — see collectBirthdays().

import { leaf, spiral, mix } from './scene';

const f = (n: number) => n.toFixed(1);

/* ------------------------------------------------------------------ */
/* who + when                                                          */
/* ------------------------------------------------------------------ */

export interface Birthday {
  who: string[]; // display names (siblings sharing a day share one entry)
  kidIds?: string[]; // desk cards that get the party treatment
  month: number; // 1-12
  day: number;
  born: number; // year
  colors: string[]; // celebration colors
}

/** Celebration palettes for birthdays that aren't a kid's (the kid's own
 * color leads theirs). Chosen by index so each person keeps theirs. */
export const PARTY_PALETTES = [
  ['#F28DB2', '#B58BE8', '#FFFFFF', '#FFD36E'],
  ['#4FA3E0', '#2E9C78', '#FFFFFF', '#FFD36E'],
  ['#F0A33C', '#7A5BD8', '#FFFFFF', '#7CC4F0'],
  ['#E0474C', '#FFD36E', '#FFFFFF', '#5AA8E8'],
];

/** Build the birthday list from the family (kids) + settings.celebrations
 * (grown-ups, pets…). People sharing a day (e.g. siblings) merge into one party. */
export function collectBirthdays(
  kids: { id: string; name: string; color: string; birthday?: string }[],
  others: { name: string; date: string }[],
): Birthday[] {
  const out: Birthday[] = [];
  const parse = (iso?: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
    return m ? { born: +m[1], month: +m[2], day: +m[3] } : null;
  };
  for (const k of kids) {
    const d = parse(k.birthday);
    if (!d) continue;
    const twin = out.find((b) => b.month === d.month && b.day === d.day && b.born === d.born && b.kidIds);
    if (twin) {
      twin.who.push(k.name);
      twin.kidIds!.push(k.id);
      twin.colors.splice(twin.who.length - 1, 0, k.color);
    } else out.push({ who: [k.name], kidIds: [k.id], ...d, colors: [k.color, '#FFFFFF', '#7CC4F0', '#FFD36E'] });
  }
  others.forEach((o, i) => {
    const d = parse(o.date);
    if (d && o.name.trim()) out.push({ who: [o.name.trim()], ...d, colors: PARTY_PALETTES[i % PARTY_PALETTES.length] });
  });
  return out;
}


export type HolidayKind =
  | 'new-year' | 'valentines' | 'st-patricks' | 'easter' | 'mothers-day'
  | 'fathers-day' | 'july-4' | 'halloween' | 'thanksgiving' | 'christmas' | 'new-years-eve';

export interface Special {
  kind: 'birthday' | 'birthday-eve' | HolidayKind;
  banner: string;
  colors: string[];
  intensity: 'full' | 'lead-up'; // lead-up = seasonal dressing before the day
  kidIds?: string[];
  age?: number;
}

function nthWeekday(year: number, month0: number, weekday: number, n: number): number {
  const first = new Date(year, month0, 1).getDay();
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
}

/** Gregorian Easter (anonymous algorithm). Returns [month0, day]. */
function easter(y: number): [number, number] {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const g = Math.floor((8 * b + 13) / 25), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 19 * l) / 433);
  const month = Math.floor((h + l - 7 * m + 90) / 25);
  const day = (h + l - 7 * m + 33 * month + 19) % 32;
  return [month - 1, day];
}

const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
};

const joinNames = (n: string[]) => (n.length < 2 ? n[0] : `${n.slice(0, -1).join(', ')} & ${n[n.length - 1]}`);

export function specialFor(d: Date, birthdays: Birthday[]): Special | null {
  const y = d.getFullYear(), m0 = d.getMonth(), day = d.getDate();
  const is = (mm0: number, dd: number) => m0 === mm0 && day === dd;

  for (const b of birthdays) {
    const age = y - b.born;
    if (is(b.month - 1, b.day)) {
      return { kind: 'birthday', banner: `Happy ${ordinal(age)} Birthday, ${joinNames(b.who)}!`, colors: b.colors, intensity: 'full', kidIds: b.kidIds, age };
    }
    const eve = new Date(y, b.month - 1, b.day - 1);
    if (is(eve.getMonth(), eve.getDate())) {
      return { kind: 'birthday-eve', banner: `1 more sleep until ${joinNames(b.who)}'s birthday!`, colors: b.colors, intensity: 'lead-up', kidIds: b.kidIds, age };
    }
  }

  const [em, ed] = easter(y);
  if (is(0, 1)) return { kind: 'new-year', banner: `Happy New Year! Hello, ${y}!`, colors: ['#FFD36E', '#FFFFFF', '#B58BE8', '#7CC4F0'], intensity: 'full' };
  if (is(1, 14)) return { kind: 'valentines', banner: "Happy Valentine's Day!", colors: ['#FF6F91', '#FFB3C6', '#FFFFFF', '#E0457B'], intensity: 'full' };
  if (is(2, 17)) return { kind: 'st-patricks', banner: "Happy St. Patrick's Day!", colors: ['#2EA65A', '#7BD389', '#FFD36E', '#FFFFFF'], intensity: 'full' };
  if (is(em, ed)) return { kind: 'easter', banner: 'Happy Easter!', colors: ['#F6AFC6', '#B9E3F7', '#FFF1A6', '#C9B6F2', '#B5E8C2'], intensity: 'full' };
  if (m0 === 4 && day === nthWeekday(y, 4, 0, 2)) return { kind: 'mothers-day', banner: "Happy Mother's Day!", colors: ['#F28DB2', '#FFFFFF', '#FFD36E', '#B58BE8'], intensity: 'full' };
  if (m0 === 5 && day === nthWeekday(y, 5, 0, 3)) return { kind: 'fathers-day', banner: "Happy Father's Day!", colors: ['#4FA3E0', '#FFFFFF', '#FFD36E', '#2E9C78'], intensity: 'full' };
  if (m0 === 6 && (day === 3 || day === 4)) return { kind: 'july-4', banner: day === 4 ? 'Happy Fourth of July!' : 'Fireworks tomorrow!', colors: ['#E0474C', '#FFFFFF', '#3E6FD8'], intensity: day === 4 ? 'full' : 'lead-up' };
  if (m0 === 9 && day >= 24) return { kind: 'halloween', banner: day === 31 ? 'Happy Halloween!' : `${31 - day} ${31 - day === 1 ? 'sleep' : 'sleeps'} until Halloween!`, colors: ['#F28A2E', '#8E5CC9', '#FFD36E', '#2B2A3A'], intensity: day === 31 ? 'full' : 'lead-up' };
  const tg = nthWeekday(y, 10, 4, 4);
  if (m0 === 10 && day >= tg - 1 && day <= tg) return { kind: 'thanksgiving', banner: day === tg ? 'Happy Thanksgiving!' : 'Thanksgiving is tomorrow!', colors: ['#E8893A', '#C9533F', '#F0B44C', '#7A8F3A'], intensity: day === tg ? 'full' : 'lead-up' };
  if (m0 === 11 && day >= 1 && day <= 26) {
    const full = day === 24 || day === 25;
    return { kind: 'christmas', banner: day === 25 ? 'Merry Christmas!' : day === 24 ? "It's Christmas Eve!" : `${25 - day} sleeps until Christmas!`, colors: ['#E0474C', '#2E9C5A', '#FFD36E', '#FFFFFF', '#5AA8E8'], intensity: full ? 'full' : 'lead-up' };
  }
  if (is(11, 31)) return { kind: 'new-years-eve', banner: "Happy New Year's Eve!", colors: ['#FFD36E', '#FFFFFF', '#B58BE8', '#7CC4F0'], intensity: 'full' };
  return null;
}

/* ------------------------------------------------------------------ */
/* static decorations (viewport-sized 1280x800, drawn above the cards) */
/* All of it stays in the top band (<100px), the side gutters, and the */
/* bottom band (>720px) so nothing covers a control.                   */
/* ------------------------------------------------------------------ */

function hang(x0: number, x1: number, y: number, sag: number, t: number) {
  return { x: x0 + (x1 - x0) * t, y: y + sag * 4 * t * (1 - t) };
}

export function bunting(colors: string[], y = 14, sag = 44, ink = '#3A2A3A') {
  let s = '';
  const spans: [number, number][] = [[-20, 430], [420, 860], [850, 1300]];
  for (const [x0, x1] of spans) {
    let d = '';
    for (let i = 0; i <= 20; i++) { const p = hang(x0, x1, y, sag, i / 20); d += `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`; }
    s += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="2"/>`;
    const n = 11;
    for (let i = 1; i < n; i++) {
      const a = hang(x0, x1, y, sag, (i - 0.38) / n), b = hang(x0, x1, y, sag, (i + 0.38) / n);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const c = colors[(((i + Math.round(x0)) % colors.length) + colors.length) % colors.length];
      s += `<path d="M${f(a.x)} ${f(a.y)} L${f(b.x)} ${f(b.y)} L${f(mx)} ${f(my + 30)}Z" fill="${c}" stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"/>`;
      s += `<path d="M${f(a.x + 4)} ${f(a.y + 4)} L${f(b.x - 4)} ${f(b.y + 4)}" stroke="#FFFFFF" stroke-width="1.5" opacity=".5"/>`;
    }
  }
  return s;
}

export function stringLights(colors: string[], y = 10, sag = 34, ink = '#2B3A30') {
  let s = '';
  const spans: [number, number][] = [[-20, 330], [320, 660], [650, 980], [970, 1300]];
  for (const [x0, x1] of spans) {
    let d = '';
    for (let i = 0; i <= 16; i++) { const p = hang(x0, x1, y, sag, i / 16); d += `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`; }
    s += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="2"/>`;
    for (let i = 1; i < 10; i++) {
      const p = hang(x0, x1, y, sag, i / 10);
      const c = colors[(((i + Math.round(x0 / 7)) % colors.length) + colors.length) % colors.length];
      s += `<circle cx="${f(p.x)}" cy="${f(p.y + 10)}" r="16" fill="url(#halo-${c.slice(1)})"/>`;
      s += `<rect x="${f(p.x - 3)}" y="${f(p.y)}" width="6" height="5" fill="${ink}"/>`;
      s += `<ellipse cx="${f(p.x)}" cy="${f(p.y + 11)}" rx="5" ry="7.5" fill="${c}"/>`;
    }
  }
  return s;
}

export function pumpkin(x: number, base: number, w: number, lit: boolean, _ink?: string) {
  const h = w * 0.72;
  let s = lit ? `<circle cx="${f(x)}" cy="${f(base - h / 2)}" r="${f(w * 1.1)}" fill="url(#halo-FFB547)"/>` : '';
  for (const [dx, rx] of [[-0.28, 0.3], [0.28, 0.3], [0, 0.32]] as const) s += `<ellipse cx="${f(x + dx * w)}" cy="${f(base - h / 2)}" rx="${f(rx * w)}" ry="${f(h / 2)}" fill="#F28A2E" stroke="#C25E1C" stroke-width="2"/>`;
  s += `<path d="M${f(x)} ${f(base - h)} q4 -14 12 -16" stroke="#5B7A2E" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  s += leaf(x + 4, base - h - 4, -0.4, w * 0.3, w * 0.08, '#6E9440');
  if (lit) {
    s += `<path d="M${f(x - w * 0.22)} ${f(base - h * 0.62)} l${f(w * 0.08)} -${f(w * 0.1)} l${f(w * 0.08)} ${f(w * 0.1)}Z M${f(x + w * 0.06)} ${f(base - h * 0.62)} l${f(w * 0.08)} -${f(w * 0.1)} l${f(w * 0.08)} ${f(w * 0.1)}Z" fill="#FFE27A"/>`;
    s += `<path d="M${f(x - w * 0.24)} ${f(base - h * 0.36)} Q${f(x)} ${f(base - h * 0.12)} ${f(x + w * 0.24)} ${f(base - h * 0.36)} L${f(x + w * 0.12)} ${f(base - h * 0.32)} L${f(x)} ${f(base - h * 0.38)} L${f(x - w * 0.12)} ${f(base - h * 0.32)}Z" fill="#FFE27A"/>`;
  }
  return s;
}

export function cobweb(cx: number, cy: number, r: number, flipX: boolean, flipY: boolean, ink: string) {
  const sx = flipX ? -1 : 1, sy = flipY ? -1 : 1;
  let s = `<g transform="translate(${cx} ${cy}) scale(${sx} ${sy})" stroke="${ink}" stroke-width="1.4" fill="none" opacity=".55">`;
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2); s += `<path d="M0 0 L${f(Math.cos(a) * r)} ${f(Math.sin(a) * r)}"/>`; }
  for (let k = 1; k <= 4; k++) {
    let d = '';
    for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2); const rr = (r * k) / 4.4; const p = [Math.cos(a) * rr, Math.sin(a) * rr]; d += i ? ` Q${f(Math.cos(a - 0.157) * rr * 0.86)} ${f(Math.sin(a - 0.157) * rr * 0.86)} ${f(p[0])} ${f(p[1])}` : `M${f(p[0])} ${f(p[1])}`; }
    s += `<path d="${d}"/>`;
  }
  return s + '</g>';
}

export function egg(x: number, base: number, size: number, c1: string, c2: string, ink: string) {
  const h = size, w = size * 0.74;
  let s = `<path d="M${f(x)} ${f(base - h)} C${f(x + w * 0.62)} ${f(base - h)} ${f(x + w * 0.62)} ${f(base)} ${f(x)} ${f(base)} C${f(x - w * 0.62)} ${f(base)} ${f(x - w * 0.62)} ${f(base - h)} ${f(x)} ${f(base - h)}Z" fill="${c1}" stroke="${ink}" stroke-width="1.5"/>`;
  s += `<path d="M${f(x - w * 0.42)} ${f(base - h * 0.45)} q${f(w * 0.21)} -6 ${f(w * 0.42)} 0 t${f(w * 0.42)} 0" stroke="${c2}" stroke-width="3" fill="none"/>`;
  s += `<circle cx="${f(x)}" cy="${f(base - h * 0.72)}" r="${f(w * 0.08)}" fill="${c2}"/>`;
  return s;
}

export function clover(x: number, y: number, r: number, c: string) {
  let s = '';
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / 3;
    const cx = x + Math.cos(a) * r * 0.55, cy = y + Math.sin(a) * r * 0.55;
    s += `<circle cx="${f(cx - Math.sin(a) * r * 0.22)}" cy="${f(cy + Math.cos(a) * r * 0.22)}" r="${f(r * 0.4)}" fill="${c}"/><circle cx="${f(cx + Math.sin(a) * r * 0.22)}" cy="${f(cy - Math.cos(a) * r * 0.22)}" r="${f(r * 0.4)}" fill="${c}"/>`;
  }
  return s + `<path d="M${f(x)} ${f(y)} q4 ${f(r * 0.8)} -2 ${f(r * 1.4)}" stroke="${c}" stroke-width="2.5" fill="none"/>`;
}

export function heart(x: number, y: number, s: number, c: string) {
  return `<path d="M${f(x)} ${f(y + s * 0.35)} C${f(x - s)} ${f(y - s * 0.4)} ${f(x - s * 0.35)} ${f(y - s)} ${f(x)} ${f(y - s * 0.4)} C${f(x + s * 0.35)} ${f(y - s)} ${f(x + s)} ${f(y - s * 0.4)} ${f(x)} ${f(y + s * 0.35)}Z" fill="${c}"/>`;
}

/** Giant layered cake with lit candles — the birthday landmark. */
export function cakeLandmark(x: number, base: number, colors: string[], candles: number, ink: string, glow: string) {
  let s = `<circle cx="${f(x)}" cy="${f(base - 470)}" r="230" fill="url(#halo-${glow.slice(1)})"/>`;
  const tiers = [[300, 130], [230, 120], [160, 110]];
  let y = base;
  tiers.forEach(([w, h], i) => {
    const c = colors[i % colors.length];
    s += `<rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${w}" height="${h}" rx="14" fill="${c}" stroke="${ink}" stroke-width="3"/>`;
    // frosting drips
    let d = `M${f(x - w / 2)} ${f(y - h + 10)}`;
    for (let k = 0; k < 8; k++) { const sx = x - w / 2 + (w * k) / 8; d += ` Q${f(sx + w / 32)} ${f(y - h + 34 + (k % 2) * 14)} ${f(sx + w / 16)} ${f(y - h + 18)} T${f(sx + w / 8)} ${f(y - h + 10)}`; }
    s += `<path d="${d} L${f(x + w / 2)} ${f(y - h)} L${f(x - w / 2)} ${f(y - h)}Z" fill="#FFFFFF" opacity=".92"/>`;
    for (let k = 0; k < 7; k++) s += `<circle cx="${f(x - w / 2 + 18 + k * ((w - 36) / 6))}" cy="${f(y - h * 0.4)}" r="6" fill="${colors[(i + k + 1) % colors.length]}" stroke="${ink}" stroke-width="1"/>`;
    y -= h;
  });
  const n = Math.min(candles, 10);
  for (let k = 0; k < n; k++) {
    const cx = x - 60 + (n === 1 ? 60 : (k * 120) / (n - 1));
    s += `<rect x="${f(cx - 5)}" y="${f(y - 46)}" width="10" height="46" rx="3" fill="${colors[k % colors.length]}" stroke="${ink}" stroke-width="1.5"/>`;
    s += `<circle cx="${f(cx)}" cy="${f(y - 58)}" r="22" fill="url(#halo-FFE27A)"/>`;
    s += `<path d="M${f(cx)} ${f(y - 70)} Q${f(cx + 7)} ${f(y - 58)} ${f(cx)} ${f(y - 50)} Q${f(cx - 7)} ${f(y - 58)} ${f(cx)} ${f(y - 70)}Z" fill="#FFD84D"/>`;
  }
  return s;
}

/** Decorated evergreen — the Christmas landmark. */
export function holidayTree(x: number, base: number, ink: string, colors: string[]) {
  let s = `<rect x="${f(x - 18)}" y="${f(base - 60)}" width="36" height="70" fill="#6B4A3A"/>`;
  const layers = 5;
  for (let i = 0; i < layers; i++) {
    const w = 320 - i * 52, top = base - 60 - (i + 1) * 92, bot = base - 40 - i * 92;
    s += `<path d="M${f(x)} ${f(top - 30)} Q${f(x - w * 0.2)} ${f(top + 40)} ${f(x - w / 2)} ${f(bot)} Q${f(x)} ${f(bot - 22)} ${f(x + w / 2)} ${f(bot)} Q${f(x + w * 0.2)} ${f(top + 40)} ${f(x)} ${f(top - 30)}Z" fill="#2E7A52" stroke="${ink}" stroke-width="2.5"/>`;
    s += `<path d="M${f(x - w / 2 + 10)} ${f(bot - 8)} Q${f(x)} ${f(bot + 18)} ${f(x + w / 2 - 10)} ${f(bot - 8)}" fill="none" stroke="#FFD36E" stroke-width="3"/>`;
    for (let k = 0; k < 5; k++) {
      const bx = x - w * 0.36 + (k * w * 0.72) / 4, by = bot - 18 - (k % 2) * 16;
      const c = colors[(i + k) % colors.length];
      s += `<circle cx="${f(bx)}" cy="${f(by)}" r="16" fill="url(#halo-${c.slice(1)})"/><circle cx="${f(bx)}" cy="${f(by)}" r="7" fill="${c}" stroke="${ink}" stroke-width="1"/>`;
    }
  }
  const ty = base - 60 - layers * 92 - 40;
  s += `<circle cx="${f(x)}" cy="${f(ty)}" r="60" fill="url(#halo-FFE27A)"/>`;
  let d = '';
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 11 : 26; d += `${k ? 'L' : 'M'}${f(x + Math.cos(a) * r)} ${f(ty + Math.sin(a) * r)}`; }
  return s + `<path d="${d}Z" fill="#FFD84D" stroke="${ink}" stroke-width="2"/>`;
}

/** Halos needed by the decorations (gradient ids are color-keyed). */
export function haloColors(sp: Special): string[] {
  return [...new Set([...sp.colors, '#FFE27A', '#FFB547'])];
}

/** The festive front decoration for a special day. */
export function decorations(sp: Special, ink: string): string {
  const H = 800, W = 1280;
  let s = '';
  const c = sp.colors;
  switch (sp.kind) {
    case 'birthday':
    case 'birthday-eve':
    case 'new-year':
    case 'new-years-eve':
    case 'mothers-day':
    case 'fathers-day':
    case 'july-4':
      s += bunting(c, 10, sp.intensity === 'full' ? 44 : 30, ink);
      break;
    case 'christmas':
      s += stringLights(['#E0474C', '#FFD36E', '#2E9C5A', '#5AA8E8', '#FFFFFF'], 8, 32, ink);
      break;
    case 'halloween':
      s += cobweb(0, 0, 150, false, false, ink) + cobweb(W, 0, 150, true, false, ink);
      s += stringLights(['#F28A2E', '#8E5CC9', '#FFD36E'], 8, 28, ink);
      s += pumpkin(36, H - 4, 70, true, ink) + pumpkin(96, H - 2, 46, sp.intensity === 'full', ink);
      s += pumpkin(W - 40, H - 4, 76, true, ink) + pumpkin(W - 104, H - 2, 44, false, ink);
      break;
    case 'thanksgiving':
      s += bunting(c, 10, 30, ink);
      s += pumpkin(40, H - 4, 60, false, ink) + pumpkin(W - 46, H - 4, 66, false, ink);
      break;
    case 'easter':
      s += bunting(c, 10, 30, ink);
      for (const [x, sz, i] of [[30, 34, 0], [72, 26, 1], [W - 36, 36, 2], [W - 80, 28, 3], [380, 22, 4], [900, 24, 0]] as const) s += egg(x, H - 4, sz, c[i % c.length], c[(i + 2) % c.length], ink);
      break;
    case 'st-patricks':
      for (let k = 0; k < 18; k++) s += clover(20 + k * 72 + (k % 2) * 20, 18 + (k % 3) * 14, 12 + (k % 2) * 4, k % 3 ? '#2EA65A' : '#7BD389');
      break;
    case 'valentines':
      for (let k = 0; k < 16; k++) s += heart(30 + k * 82, 26 + (k % 3) * 16, 14 + (k % 2) * 6, c[k % c.length]);
      break;
  }
  return s;
}

/** The day's landmark override, if any (drawn in the mid layer). */
export function festiveLandmark(sp: Special, ink: string, glow: string): string | null {
  const x = 160 + 640; // centered on the Roles view (scene coords)
  if (sp.kind === 'birthday') return cakeLandmark(x, 790, sp.colors, sp.age ?? 1, mix(ink, '#ffffff', 0.15), glow);
  if (sp.kind === 'christmas') return holidayTree(x, 800, mix(ink, '#ffffff', 0.15), sp.colors);
  if (sp.kind === 'halloween' && sp.intensity === 'full') return pumpkin(x, 800, 420, true, ink) + spiral(x + 90, 470, 30, 1.2, 0, 1, '#5B7A2E', 6);
  return null;
}
