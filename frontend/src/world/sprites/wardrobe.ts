// EarnKeep — the Sprite wardrobe. Every day each sprite gets a seeded
// morning outfit and an afternoon change (pajamas after 19:00), drawn from
// its own closet (`Character.wardrobe`, `Character.hair.styles`) and
// dressed for the season, the live weather and any holiday. Weather,
// pajamas, holidays and scenes still force their own items (raincoats,
// puffers, wetsuits, boots, hoods, costumes); episodes can swap in gear.
// Format reference: docs/sprites/README.md

import type { Season, Weather } from '../daily';
import type { Special } from '../festive';
import { hashSeed } from './palette.ts';
import { COSTUMES_HALLOWEEN, type Character } from './traits.ts';
import type { Bottom, Hat, Outfit, Shoes, Top } from './types';

type R = () => number;
const pick = <T,>(r: R, xs: readonly T[]): T => xs[Math.floor(r() * xs.length) % xs.length];
/** The first of `prefs` the list holds, else `fallback`. */
const firstOf = <T,>(list: readonly T[], prefs: readonly T[], fallback: T): T => prefs.find((p) => list.includes(p)) ?? fallback;

export interface WardrobeCtx {
  season: Season;
  weather: Weather;
  special: Special | null;
  hour: number;
  kit: string;
}

type Warmth = 'hot' | 'mild' | 'cold' | 'any';
/** How warm each top is, so the season can pick among a closet's tops. */
export const TOP_WARMTH: Record<Top, Warmth> = {
  tank: 'hot', swim: 'hot', rashguard: 'hot',
  hoodie: 'cold', sweater: 'cold', flannel: 'cold', puffer: 'cold',
  tee: 'mild', ruffle: 'mild', dress: 'mild', jersey: 'mild', overalls: 'mild', raincoat: 'mild', wetsuit: 'mild',
  // forced-only tops (pajamas, costumes): never in a closet
  pjs: 'any', tunic: 'any', robe: 'any', bones: 'any', dragon: 'any', gown: 'any',
};

const ALLOWED: Record<'hot' | 'cold' | 'mild', ReadonlySet<Warmth>> = {
  hot: new Set(['hot', 'mild', 'any']),
  cold: new Set(['cold', 'mild', 'any']),
  mild: new Set(['hot', 'mild', 'cold', 'any']),
};

/** Keep the entries that pass, or the whole list if none do. */
const only = <T,>(xs: readonly T[], ok: (x: T) => boolean): readonly T[] => {
  const f = xs.filter(ok);
  return f.length ? f : xs;
};

function base(ch: Character, r: R, c: WardrobeCtx): Outfit {
  const W = ch.wardrobe;
  const hot = c.season === 'summer';
  const cold = c.season === 'winter';
  const temp = hot ? 'hot' : cold ? 'cold' : 'mild';
  const top = pick(r, only(W.tops, (t) => ALLOWED[temp].has(TOP_WARMTH[t]))) as Top;
  const top1 = pick(r, W.colors);
  let top2 = pick(r, W.colors);
  if (top2 === top1) top2 = W.colors[(W.colors.indexOf(top1) + 1) % W.colors.length];
  const bottom: Bottom = top === 'dress' ? 'none'
    : (cold || top === 'overalls') && W.bottoms.includes('pants') ? 'pants'
    : pick(r, W.bottoms);
  const shoes: Shoes = pick(r, only(W.shoes, (s) => hot || s !== 'sandals'));
  const hat: Hat = cold
    ? (W.hats.includes('earmuffs') && r() < 0.5 ? 'earmuffs' : 'beanie')
    : pick(r, only(W.hats, (h) => !hot || (h !== 'beanie' && h !== 'earmuffs')));
  const extras: Outfit['extras'] = [];
  let extra1 = pick(r, W.colors);
  if (cold) extras.push('scarf', 'mittens');
  else if (hat === 'cowboy' && W.extras.includes('scarf')) { extras.push('scarf'); extra1 = '#8C9AB5'; } // the bandana
  else if (W.extras.length && r() < 0.18) extras.push(pick(r, W.extras));
  const hat1 = hat === 'cowboy' ? pick(r, ['#22262E', '#6B4A2B'])
    : hat === 'newsboy' ? '#E9DFC8'
    : hat === 'cap' && r() < 0.6 ? W.colors[0]
    : pick(r, W.colors);
  return {
    top, top1, top2,
    print: pick(r, W.prints),
    bottom, bottom1: pick(r, W.bottomColors),
    shoes, shoe1: pick(r, W.shoeColors),
    hat, hat1, hat2: '#FFFFFF',
    hair: pick(r, ch.hair.styles),
    ribbon: pick(r, W.ribbons),
    extras,
    extra1,
    wings: pick(r, W.wings),
  };
}

function weatherize(o: Outfit, ch: Character, r: R, c: WardrobeCtx): Outfit {
  const W = ch.wardrobe;
  const w = c.weather;
  if (/rain|pouring|lightning|hail/.test(w)) {
    return { ...o, top: 'raincoat', top1: pick(r, W.colors), shoes: 'rainboots', shoe1: pick(r, W.shoeColors), hat: 'hood', bottom: firstOf(W.bottoms, ['leggings'], 'pants') };
  }
  // snow forces the puffer; a plain winter day wears it only from the closet
  if (/snow/.test(w) || (c.season === 'winter' && W.tops.includes('puffer') && r() < 0.5)) {
    const striped = W.prints.includes('stripes') && r() < 0.5; // a puffer with navy bands
    return { ...o, top: 'puffer', top1: pick(r, W.colors), top2: striped ? '#24345E' : o.top2, print: striped ? 'stripes' : o.print, bottom: 'pants', shoes: 'snowboots', hat: pick(r, ['beanie', 'beanie', W.hats.includes('earmuffs') ? 'earmuffs' : 'beanie'] as Hat[]), extras: ['scarf', 'mittens'] };
  }
  if (c.season === 'summer' && c.kit === 'lake' && r() < 0.6) {
    // matching black + orange wetsuits
    return { ...o, top: 'wetsuit', top1: '#1F2329', top2: '#FF7A2F', bottom: 'none', shoes: 'bare', hat: 'none', extras: [] };
  }
  if (/windy/.test(w) && o.hat === 'sunhat') return { ...o, hat: W.hats.includes('cap') ? 'cap' : 'none' };
  return o;
}

/** Halloween costume ids → the outfit each one wears. */
const HALLOWEEN: Record<(typeof COSTUMES_HALLOWEEN)[number], (o: Outfit, ch: Character) => Outfit> = {
  knight: (o) => ({ ...o, top: 'tunic', top1: '#9AA3AE', top2: '#D9493C', bottom: 'pants', bottom1: '#4B5563', hat: 'knight', hat1: '#B8C0CA', extras: ['cape'], extra1: '#D9493C' }),
  dragon: (o) => ({ ...o, top: 'dragon', top1: '#4FA35A', top2: '#F2C230', bottom: 'pants', bottom1: '#3E7F48', hat: 'none', extras: ['tail'], extra1: '#4FA35A', wings: 'dragon' }),
  skeleton: (o) => ({ ...o, top: 'bones', top1: '#22262E', top2: '#F4F4F0', bottom: 'pants', bottom1: '#22262E', hat: 'none', extras: [] }),
  cowboy: (o) => ({ ...o, top: 'flannel', top1: '#7A4E2D', top2: '#3B2A22', bottom: 'pants', bottom1: '#3B3F4A', hat: 'cowboy', hat1: '#22262E', hat2: '#B8872A', extras: ['scarf'], extra1: '#8C9AB5' }),
  witch: (o) => ({ ...o, top: 'robe', top1: '#6B4BA8', top2: '#F2C230', bottom: 'leggings', bottom1: '#22262E', hat: 'witch', hat1: '#3E2B66', hat2: '#F2C230', extras: ['cape'], extra1: '#3E2B66' }),
  princess: (o) => ({ ...o, top: 'gown', top1: '#F7B9D7', top2: '#FFFFFF', bottom: 'none', hat: 'crown', hat1: '#F2C230', wings: 'fairy', extras: [] }),
  pumpkin: (o) => ({ ...o, top: 'robe', top1: '#22262E', top2: '#E8732C', bottom: 'leggings', bottom1: '#E8732C', hat: 'pumpkin', hat1: '#E8732C', extras: [], wings: 'bat' }),
  prairie: (o, ch) => ({ ...o, top: 'dress', top1: '#8A5A3C', top2: '#F2E6C9', bottom: 'none', hat: 'cowboy', hat1: '#6B4A2B', hat2: '#B8872A', hair: ch.hair.styles.includes('waterfall') ? 'waterfall' : o.hair, extras: ['necklace'] }),
};

// Holidays dress sprites in the holiday's own colors, not each sprite's
// palette, so two sprites can match. Decided 2026-11-11.
function festive(o: Outfit, ch: Character, r: R, s: Special | null, hour: number): Outfit {
  if (!s) return o;
  const W = ch.wardrobe;
  // which of the holiday's first two colors this sprite wears
  const sc = (k: number) => s.colors[(hashSeed(ch.id) + k) % 2 % s.colors.length];
  switch (s.kind) {
    case 'birthday':
      return { ...o, hat: 'party', hat1: sc(0), hat2: s.colors[2 % s.colors.length] };
    case 'halloween': {
      if (s.intensity !== 'full' && hour < 16) return { ...o, extras: [...o.extras, 'cape'], extra1: '#E8732C' };
      const listed = W.costumes.filter((k): k is (typeof COSTUMES_HALLOWEEN)[number] => (COSTUMES_HALLOWEEN as readonly string[]).includes(k));
      return HALLOWEEN[listed.length ? pick(r, listed) : 'knight'](o, ch);
    }
    case 'christmas': {
      const hat = W.costumes.find((k) => k === 'santa' || k === 'elf') ?? 'santa';
      return { ...o, top: o.top === 'puffer' ? 'puffer' : 'sweater', print: 'snowflake', top1: W.colors[0], top2: '#FFFFFF', hat, hat1: hat === 'santa' ? '#C8333A' : '#2E8B57', hat2: '#FFFFFF', extras: ['scarf'], extra1: W.colors[1] };
    }
    case 'new-years-eve':
    case 'new-year':
      return { ...o, hat: 'party', hat1: '#F2C230', hat2: '#22262E' };
    case 'valentines':
      return { ...o, print: 'heart', top1: sc(0), top2: '#FFFFFF' };
    case 'st-patricks':
      return { ...o, top1: '#2E9C4F', print: firstOf(W.prints, ['number', 'flower'], 'star'), top2: '#F2C230', hat: firstOf(W.hats, ['capback', 'headband'], 'capback'), hat1: '#2E9C4F' };
    case 'july-4':
      return { ...o, top: firstOf(W.tops, ['ruffle', 'tee'], 'tee'), print: 'star', top1: hashSeed(ch.id) % 2 ? '#FFFFFF' : '#2F4FA0', top2: '#D9333F', hat: firstOf(W.hats, ['bow', 'bandana'], 'bandana'), hat1: '#D9333F' };
    case 'easter':
      return { ...o, top1: sc(0), top2: '#FFF3B0', hat: W.hats.includes('flowercrown') ? 'flowercrown' : o.hat };
    case 'thanksgiving':
      return { ...o, top: W.tops.includes('flannel') ? 'flannel' : o.top, top1: sc(0), top2: '#6B3A1E' };
    default:
      return o;
  }
}

const PJS = (ch: Character, r: R): Partial<Outfit> => ({
  top: 'pjs', top1: pick(r, ch.wardrobe.colors), top2: '#F2C230', print: 'star', bottom: 'pants', shoes: 'bare', hat: 'none', extras: [],
  ...(ch.hair.styles.includes('pigtails') ? { hair: 'pigtails' } : {}),
});

/** The outfit a sprite is wearing right now (stable for a given day + half-day). */
export function outfitFor(ch: Character, seed: number, c: WardrobeCtx, mk: (s: number) => R): Outfit {
  const half = c.hour < 13 ? 0 : 1;
  const r = mk(seed * 7 + hashSeed(ch.id) + half * 101);
  let o = base(ch, r, c);
  o = weatherize(o, ch, r, c);
  o = festive(o, ch, r, c.special, c.hour);
  if (c.hour >= 19 || c.hour < 6) {
    const keepHat = c.special?.kind === 'birthday' || c.special?.kind === 'christmas';
    o = { ...o, ...PJS(ch, r), ...(keepHat ? { hat: o.hat, hat1: o.hat1, hat2: o.hat2 } : {}) };
  }
  return o;
}
