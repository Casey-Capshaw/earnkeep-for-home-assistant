// EarnKeep — "a different world every day". Pure function of (date,
// weather): the date seeds the scene (same scene all day, a new one
// tomorrow), the season picks the palette + seasonal accents + which kits
// are in rotation, and HA's weather.home state picks the atmosphere.

import { accents, mix, svgDoc, toDataUri } from './scene';
import { SW, SH } from './worlds';
import { specialFor, decorations, festiveLandmark, haloColors, type Special, type Birthday } from './festive';
import { forestWorld, hallWorld, type Palette, type World } from './worlds';
import { lakeWorld, caveWorld, ruinsWorld, canopyWorld, landmarkLayer, LANDMARKS, type LandmarkKind } from './kits2';
import type { CritterKind } from './critters';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Kit = 'forest' | 'mushroom' | 'hall' | 'lake' | 'cave' | 'ruins' | 'canopy';

/** HA weather entity states (https://www.home-assistant.io/integrations/weather/). */
export type Weather =
  | 'sunny' | 'clear-night' | 'partlycloudy' | 'cloudy' | 'fog' | 'rainy'
  | 'pouring' | 'lightning' | 'lightning-rainy' | 'snowy' | 'snowy-rainy'
  | 'hail' | 'windy' | 'windy-variant' | 'exceptional';

export type ParticleKind = 'mote' | 'petal' | 'leaf' | 'snow' | 'rain' | 'firefly';

export interface Atmosphere {
  shafts: number; // 0..1 light-shaft strength
  overlay: string; // tint laid over the whole scene (under the UI)
  fog: number; // 0..1 fog-band strength between layers
  particles: { kind: ParticleKind; count: number; color: string }[];
  wind: number; // drift multiplier
  lightning: boolean;
}

export interface Day {
  date: Date;
  season: Season;
  kit: Kit;
  landmark: LandmarkKind | 'cake' | 'holiday-tree' | 'giant-pumpkin';
  special: Special | null;
  festiveUri: string | null; // front decorations (bunting, lights, webs…)
  critters: CritterKind[];
  palette: Palette;
  sky: string;
  sun: { x: string; y: string };
  world: World;
  atmosphere: Atmosphere;
  ink: string;
  inkSoft: string;
  critterAccent: string;
  panel: string;
  label: string;
}

const SEASON_PALETTES: Record<Season, Palette & { sky: [string, string, string, string]; bloom?: string; snow?: string; leafTint?: string }> = {
  spring: {
    haze: '#FCFDF2',
    stops: ['#E2F2D3', '#C1E3B0', '#93CB8F', '#5C9F77', '#22513F'],
    glow: '#FFF0C6',
    sky: ['#FFFDF4', '#F3FAE6', '#E2F2D3', '#D2EAC2'],
    bloom: '#F6AFC6',
  },
  summer: {
    haze: '#F7FCE6',
    stops: ['#DCEFC5', '#B3DB9C', '#82BF7C', '#4F9268', '#1C4A40'],
    glow: '#FFF1A6',
    sky: ['#FFFBE0', '#EEF8D8', '#DCEFC5', '#CBE6B6'],
  },
  autumn: {
    haze: '#FFF7E4',
    stops: ['#F8DFBE', '#F0C196', '#DD9A72', '#B0645B', '#4A2034'],
    glow: '#FFE7A0',
    sky: ['#FFF8E2', '#FFEACB', '#F8DFBE', '#F2CFA6'],
    leafTint: '#E8893A',
  },
  winter: {
    haze: '#F8FBFF',
    stops: ['#E2EAF6', '#C5D4EB', '#9CB2D8', '#6D84B6', '#2A3866'],
    glow: '#D8F2FF',
    sky: ['#FFFFFF', '#F1F5FC', '#E2EAF6', '#D3DFF1'],
    snow: '#FFFFFF',
  },
};

/** Seasonal weights per kit — every kind can appear any time of year,
 * but e.g. winter leans on halls and caves, summer on lakes and canopies. */
const KIT_WEIGHTS: Record<Season, Record<Kit, number>> = {
  spring: { forest: 3, mushroom: 1, hall: 1, lake: 3, cave: 1, ruins: 3, canopy: 2 },
  summer: { forest: 3, mushroom: 1, hall: 1, lake: 3, cave: 1, ruins: 2, canopy: 3 },
  autumn: { forest: 2, mushroom: 3, hall: 2, lake: 1, cave: 1, ruins: 2, canopy: 2 },
  winter: { forest: 2, mushroom: 1, hall: 3, lake: 1, cave: 3, ruins: 2, canopy: 1 },
};

function weighted<T extends string>(weights: Record<T, number>, roll: number, avoid?: T): T {
  const entries = (Object.entries(weights) as [T, number][]).filter(([k]) => k !== avoid);
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let x = (roll % 10007) / 10007 * total;
  for (const [k, w] of entries) { if ((x -= w) < 0) return k; }
  return entries[0][0];
}

function kitFor(d: Date): Kit {
  // Walk forward from a week back so "yesterday" is yesterday's ACTUAL
  // kit (which itself avoided the day before) — never the same kind of
  // place two days running.
  let prev: Kit | undefined;
  for (let back = 7; back >= 0; back--) {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
    prev = weighted(KIT_WEIGHTS[seasonOf(day)], hash(daySeed(day)), prev);
  }
  return prev!;
}

/** Landmarks cycle through a seeded shuffle in 6-day blocks, so every one
 * shows up each week-ish and none repeats on back-to-back days. */
function landmarkFor(d: Date): LandmarkKind {
  const dayNo = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const n = LANDMARKS.length;
  const order = (block: number) => {
    const a = [...LANDMARKS];
    let x = hash(block);
    for (let i = n - 1; i > 0; i--) { const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; x = hash(x); }
    return a;
  };
  const block = Math.floor(dayNo / n), i = dayNo % n;
  const cur = order(block);
  // seam between blocks: if today's first pick equals yesterday's last, swap
  if (i === 0 && cur[0] === order(block - 1)[n - 1]) return cur[1];
  if (i === 1 && cur[0] === order(block - 1)[n - 1]) return cur[0];
  return cur[i];
}

export function crittersFor(season: Season, weather: Weather, kit: Kit, hour: number, roll: number, special: Special | null): CritterKind[] {
  const night = hour >= 18 || hour < 6 || weather === 'clear-night';
  const wet = /rain|pouring|lightning|hail/.test(weather);
  const pool: CritterKind[] = [];
  if (special?.kind === 'halloween') return ['bats', 'snail'];
  if (special?.kind === 'birthday') return wet ? ['bird', 'snail'] : ['bird', season === 'winter' ? 'snail' : 'butterflies'];
  if (!/pouring|lightning|hail/.test(weather)) pool.push('bird');
  if (season !== 'winter' && weather !== 'snowy') pool.push('snail');
  if (wet) pool.push('snail');
  if (!wet && !night && (season === 'spring' || season === 'summer') && weather !== 'snowy') pool.push('butterflies', 'butterflies');
  if (night || kit === 'hall' || kit === 'canopy') pool.push('moths');
  if (!wet && (season === 'summer' || season === 'autumn')) pool.push('beetle');
  const picked: CritterKind[] = [];
  let x = roll;
  while (picked.length < 2 && pool.length) {
    const k = pool[x % pool.length];
    if (!picked.includes(k)) picked.push(k);
    pool.splice(x % pool.length, 1);
    x = Math.floor(x / 7) + 3;
  }
  return picked;
}

export function seasonOf(d: Date): Season {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export function daySeed(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function hash(n: number): number {
  let x = n ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

const SEASON_PARTICLE: Record<Season, { kind: ParticleKind; color: string }> = {
  spring: { kind: 'petal', color: '#F9C4D4' },
  summer: { kind: 'mote', color: '#FFF3B0' },
  autumn: { kind: 'leaf', color: '#E8893A' },
  winter: { kind: 'snow', color: '#FFFFFF' },
};

export function atmosphereFor(weather: Weather, season: Season, hour: number): Atmosphere {
  const seasonal = SEASON_PARTICLE[season];
  const base: Atmosphere = {
    shafts: 1,
    overlay: 'transparent',
    fog: 0,
    particles: [{ ...seasonal, count: seasonal.kind === 'mote' ? 30 : 22 }],
    wind: 1,
    lightning: false,
  };
  const evening = hour >= 18 || hour < 6;
  if (evening && weather === 'sunny') weather = 'clear-night';
  switch (weather) {
    case 'sunny':
      return base;
    case 'clear-night':
      return { ...base, shafts: 0.35, overlay: 'linear-gradient(180deg, rgba(120,110,200,0.22), rgba(255,170,120,0.12))', particles: [{ kind: 'firefly', count: 26, color: '#FFF3A0' }, { ...seasonal, count: 8 }] };
    case 'partlycloudy':
      return { ...base, shafts: 0.55 };
    case 'cloudy':
      return { ...base, shafts: 0, overlay: 'rgba(214, 220, 232, 0.32)', particles: [{ ...seasonal, count: 10 }] };
    case 'fog':
      return { ...base, shafts: 0.25, fog: 1, overlay: 'rgba(255,255,255,0.18)', particles: [{ ...seasonal, count: 8 }] };
    case 'rainy':
    case 'snowy-rainy':
      return { ...base, shafts: 0.1, overlay: 'rgba(196, 210, 232, 0.3)', particles: [{ kind: 'rain', count: 70, color: '#7E97C6' }, ...(weather === 'snowy-rainy' ? [{ kind: 'snow' as const, count: 30, color: '#FFFFFF' }] : [])] };
    case 'pouring':
    case 'hail':
      return { ...base, shafts: 0, overlay: 'rgba(180, 196, 224, 0.38)', particles: [{ kind: 'rain', count: 140, color: '#7E97C6' }], wind: 1.6 };
    case 'lightning':
    case 'lightning-rainy':
      return { ...base, shafts: 0, overlay: 'rgba(170, 180, 220, 0.38)', particles: [{ kind: 'rain', count: 110, color: '#7E97C6' }], lightning: true, wind: 1.5 };
    case 'snowy':
      return { ...base, shafts: 0.3, overlay: 'rgba(235, 242, 255, 0.28)', particles: [{ kind: 'snow', count: 80, color: '#FFFFFF' }] };
    case 'windy':
    case 'windy-variant':
      return { ...base, wind: 3, particles: [{ ...seasonal, count: 36 }] };
    default:
      return base;
  }
}

export function buildDay(date: Date, weather: Weather, birthdays: Birthday[] = []): Day {
  const season = seasonOf(date);
  const seed = daySeed(date);
  const h = hash(seed);
  const p = SEASON_PALETTES[season];
  const kit = kitFor(date);
  const landmark = landmarkFor(date);

  // Seasonal accents are painted into the silhouettes at generation time.
  accents.snow = p.snow;
  accents.bloom = p.bloom;
  accents.leafTint = p.leafTint;
  const world =
    kit === 'hall' ? hallWorld(p, seed)
    : kit === 'lake' ? lakeWorld(p, seed)
    : kit === 'cave' ? caveWorld(p, seed)
    : kit === 'ruins' ? ruinsWorld(p, seed)
    : kit === 'canopy' ? canopyWorld(p, seed)
    : forestWorld(p, seed, kit === 'mushroom');
  const special = specialFor(date, birthdays);
  const festiveLm = special ? festiveLandmark(special, p.stops[4], p.glow) : null;
  world.back.splice(2, 0, festiveLm
    ? { uri: toDataUri(svgDoc(SW, SH, festiveLm, [p.glow, ...haloColors(special!)])), depth: 0.3, drift: 0 }
    : landmarkLayer(landmark, p, seed));
  accents.snow = accents.bloom = accents.leafTint = undefined;

  const sunX = 20 + (h % 60);
  const ink = p.stops[4];
  return {
    date,
    season,
    kit,
    landmark: special?.kind === 'birthday' ? 'cake' : special?.kind === 'christmas' && festiveLm ? 'holiday-tree' : special?.kind === 'halloween' && festiveLm ? 'giant-pumpkin' : landmark,
    special,
    festiveUri: special ? toDataUri(svgDoc(1280, 800, decorations(special, p.stops[4]), haloColors(special))) : null,
    critters: crittersFor(season, weather, kit, date.getHours(), h >>> 3, special),
    palette: p,
    sky: `linear-gradient(180deg, ${p.sky[0]} 0%, ${p.sky[1]} 35%, ${p.sky[2]} 70%, ${p.sky[3]} 100%)`,
    sun: { x: `${sunX}%`, y: `${-5 + ((h >> 8) % 12)}%` },
    world,
    atmosphere: atmosphereFor(weather, season, date.getHours()),
    ink,
    inkSoft: mix(ink, p.haze, 0.38),
    critterAccent: mix(p.glow, '#E39B2F', 0.5),
    panel: `${p.haze}BF`,
    label: `${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${season} · ${kit} · ${special?.kind === 'birthday' ? 'cake' : festiveLm && special?.kind === 'christmas' ? 'holiday-tree' : festiveLm ? 'giant-pumpkin' : landmark}${special ? ` · ${special.kind}` : ''}`,
  };
}
