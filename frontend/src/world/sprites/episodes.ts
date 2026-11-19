// EarnKeep — the Sprites' games. Each generator builds one "episode": a
// timeline of beats for one or more kids plus any toys, placed on a world
// level (far hills → right in front of the glass) and around the real
// panel geometry (card tops are ledges to walk, sit and swing between;
// card edges are corners to peek around; the dock is something to hide
// behind or sit on).
//
// Variety: every generator is randomized (who leads, which level, where,
// how long, which toy), the season/weather/hour/holiday gate and weight
// them, and a per-day "favorites" draw re-weights the whole library each
// morning — so no two days play the same.

import type { Season, Weather, Kit } from '../daily';
import type { Special } from '../festive';
import { GROUND, LAYER_S } from './engine';
import type { Beat, Episode, Held, Layer, Outfit, Thing, Track, Wings } from './types';
import type { Character } from './traits';
import { ableKid, can } from './mobility';

export interface Rect { left: number; top: number; right: number; bottom: number }

export interface Ctx {
  r: () => number; // this episode's dice
  today: () => number; // stable per day (favorites)
  kids: string[]; // member ids of the kids with a sprite
  chars: Record<string, Character>; // by member id
  season: Season;
  weather: Weather;
  hour: number;
  night: boolean;
  wet: boolean;
  snowy: boolean;
  windy: boolean;
  special: Special | null;
  kit: Kit;
  cards: Rect[];
  dock: Rect | null;
  outfits: Record<string, Outfit>; // by member id
}

const W = 1280;

/* ------------------------------------------------------------------ */
/* timeline builder                                                    */
/* ------------------------------------------------------------------ */

class T {
  beats: Beat[] = [];
  /** set on the first beat (a critter's kind) */
  variant0?: number;
  dress: Partial<Outfit> | undefined;
  tether?: string;
  id: string;
  who?: string;
  thing?: Thing;
  constructor(id: string, who?: string, thing?: Thing) {
    this.id = id;
    this.who = who;
    this.thing = thing;
  }
  get t() {
    return this.beats.reduce((a, b) => a + b.dur, 0);
  }
  at(x: number, y: number, o: Partial<Beat> = {}) {
    const first = !this.beats.length && this.variant0 !== undefined ? { variant: this.variant0 } : {};
    this.beats.push({ dur: 0, at: { x, y }, ...first, ...o });
    return this;
  }
  go(x: number, y: number, dur: number, o: Partial<Beat> = {}) {
    this.beats.push({ dur: Math.max(0.05, dur), to: { x, y }, ...o });
    return this;
  }
  hop(x: number, y: number, dur: number, arc: number, o: Partial<Beat> = {}) {
    this.beats.push({ dur, to: { x, y }, arc, ease: 'linear', ...o });
    return this;
  }
  hold(dur: number, o: Partial<Beat> = {}) {
    this.beats.push({ dur, ...o });
    return this;
  }
  gone(dur: number) {
    this.beats.push({ dur, hidden: true });
    return this;
  }
  /** idle (or hidden) until absolute time t */
  until(t: number, o: Partial<Beat> = {}) {
    const d = t - this.t;
    if (d > 0.01) this.beats.push({ dur: d, ...o });
    return this;
  }
  track(): Track {
    return { id: this.id, who: this.who, thing: this.thing, beats: this.beats, dress: this.dress, tether: this.tether };
  }
}

const kid = (who: string) => new T(who, who);
const thing = (id: string, th: Thing) => new T(id, undefined, th);
const ep = (name: string, ...ts: T[]): Episode => ({ name, tracks: ts.map((t) => t.track()) });

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const pick = <X,>(r: () => number, xs: readonly X[]): X => xs[Math.floor(r() * xs.length) % xs.length];
/** The next kid after `id`, wrapping around (with one kid, that kid). */
const other = (c: Ctx, id: string): string => c.kids[(c.kids.indexOf(id) + 1) % c.kids.length];
/** size relative to the front level (distances/hops scale with it) */
const k = (l: Layer) => LAYER_S[l] / 0.21;
/** travel speeds fall off more gently than size, so distant play still moves */
const v = (l: Layer) => Math.sqrt(k(l));
/** off-screen margin: deep levels pan with the camera, so they need more */
const OFF = (l: Layer) => ({ far: 70, mid: 110, near: 170, behind: 50, front: 50, fore: 50 })[l];
// paces chosen so the gait cycle (Kid.STRIDE) lands at a natural tempo
const walkT = (dx: number, l: Layer) => Math.abs(dx) / (38 * v(l));
const runT = (dx: number, l: Layer) => Math.abs(dx) / (100 * v(l));
const flyT = (d: number, l: Layer) => Math.abs(d) / (120 * v(l));
const two = (c: Ctx) => c.kids.length >= 2;
/** Every kid but `id`, starting with the one after them. */
const others = (c: Ctx, id: string): string[] => {
  const i = c.kids.indexOf(id);
  return [...c.kids.slice(i + 1), ...c.kids.slice(0, i)];
};
/** The kids a two-player game didn't cast. */
const rest = (c: Ctx, ...cast: string[]): string[] => c.kids.filter((id) => !cast.includes(id));

/** A critter friend for a kid who's on their own: a bunny in spring and
 * summer, a fox the rest of the year. It takes the partner's part. */
function pal(c: Ctx): T {
  const t = thing('pal', 'pal');
  t.variant0 = c.season === 'spring' || c.season === 'summer' ? 1 : 0;
  return t;
}
/** The partner in a two-player game: the next kid, or a critter. */
const mate = (c: Ctx, a: string): T => (two(c) ? kid(other(c, a)) : pal(c));
/** A game for two, also played by one kid with a critter friend. */
const pairW = (c: Ctx, w: number) => (two(c) ? w : w * 0.6);

/** Another kid doing what `src` does, `dx` further along (points off the
 * screen move further off, so they still leave), `lag` seconds behind
 * and `dy` lower. Wings become their own. */
function copy(c: Ctx, src: T, who: string, dx: number, lag = 0, dy = 0): T {
  const t = kid(who);
  t.dress = src.dress && { ...src.dress };
  if (lag > 0) t.beats.push({ dur: lag, hidden: true });
  const shift = (x: number) => (x < 0 ? x - Math.abs(dx) : x > W ? x + Math.abs(dx) : x + dx);
  for (const b of src.beats) {
    const n: Beat = { ...b };
    if (b.at) n.at = { x: shift(b.at.x), y: b.at.y + dy };
    if (b.to) n.to = { x: shift(b.to.x), y: b.to.y + dy };
    if (b.swing) n.swing = { x: b.swing.x + dx, y: b.swing.y };
    if (b.wings) n.wings = wingsOf(c, who);
    t.beats.push(n);
  }
  return t;
}

/** Someone who sits a game out (it needs legs they don't use) comes to
 * watch from the ground nearby and cheers at the end. */
function watcher(who: string, x: number, from: number, until: number): T {
  const l: Layer = 'front';
  const g = GROUND[l];
  const x0 = x < W / 2 ? -OFF(l) : W + OFF(l);
  const t = kid(who).gone(from).at(x0, g, { layer: l, hidden: false }).go(x, g, walkT(x - x0, l), { pose: 'walk' });
  t.until(until - 1.6, { pose: 'look', face: (x0 < 0 ? 1 : -1) as 1 | -1 }).hold(1.6, { pose: 'cheer', emote: 'heart', expr: 'laugh' });
  return t.go(x0, g, walkT(x - x0, l), { pose: 'walk' });
}
/** Offsets that fan out from a spot: 1, -1, 2, -2, … */
const fan = (i: number) => (i % 2 ? -1 : 1) * Math.ceil((i + 1) / 2);
type Like = Character['personality']['likes'][number];
/** The kid who leads: with a `like`, usually (0.7) a kid who likes it; else anyone. */
const lead = (c: Ctx, like?: Like): string => {
  if (c.kids.length === 1) return c.kids[0];
  const fans = like ? c.kids.filter((id) => c.chars[id]?.personality.likes.includes(like)) : [];
  return fans.length && c.r() < 0.7 ? pick(c.r, fans) : pick(c.r, c.kids);
};
const has = (c: Ctx, id: string, prop: Character['personality']['props'][number]) => !!c.chars[id]?.personality.props.includes(prop);
const likes = (c: Ctx, id: string, like: Like) => !!c.chars[id]?.personality.likes.includes(like);

/** A ground x that isn't hidden behind the dock (front levels). */
function openX(c: Ctx, _l: Layer, lo = 70, hi = W - 70): number {
  for (let i = 0; i < 8; i++) {
    const x = lo + c.r() * (hi - lo);
    if (!c.dock || x < c.dock.left - 30 || x > c.dock.right + 30) return x;
  }
  return c.r() < 0.5 ? 140 : W - 140;
}

/** dev: ?ekspriteslayer=<level> pins ground games to one level */
const forcedLayer = (): Layer | null => (typeof location !== 'undefined' ? (new URLSearchParams(location.search).get('ekspriteslayer') as Layer | null) : null);
/** An x along a panel's top edge that isn't under the greeting (top-left)
 * or the clock (top-right) — those headers sit above everything. */
function topX(c: Ctx, card: Rect, pad = 50): number {
  const lo = Math.max(card.left + pad, 450);
  const hi = Math.min(card.right - pad, 1110);
  if (hi <= lo) return card.left + pad + c.r() * Math.max(10, card.right - card.left - 2 * pad);
  return lo + c.r() * (hi - lo);
}

const groundLayer = (c: Ctx): Layer => forcedLayer() ?? pick(c.r, ['mid', 'near', 'near', 'front', 'front', 'front'] as Layer[]);

/** What each season lets a kid carry (winter keeps its own rule). */
const SEASON_HELD: Record<Exclude<Season, 'winter'>, readonly Held[]> = {
  spring: ['flower', 'dandelion', 'wand', 'net', 'stick', 'flag'],
  summer: ['popsicle', 'dandelion', 'bubblewand', 'wand', 'stick', 'sword'],
  autumn: ['leaf', 'teddy', 'wand', 'stick', 'sword'],
};
function seasonalHeld(c: Ctx, who: string): Held | null {
  const r = c.r();
  if (c.night) return pick(c.r, ['lantern', 'jar', 'flashlight', 'teddy'] as Held[]);
  if (c.wet) return 'umbrella';
  if (c.special?.kind === 'birthday') return r < 0.6 ? 'balloon' : 'present';
  if (c.special?.kind === 'halloween') return 'bucket';
  if (c.special?.kind === 'christmas') return pick(c.r, ['present', 'snowball'] as Held[]);
  if (r < 0.35) return null;
  if (c.season === 'winter') return pick(c.r, ['snowball', 'teddy'] as Held[]);
  // their own things, the ones that fit the season (or any of them)
  const props: readonly Held[] = c.chars[who]?.personality.props ?? [];
  const fits = props.filter((p) => SEASON_HELD[c.season as Exclude<Season, 'winter'>].includes(p));
  return fits.length ? pick(c.r, fits) : props.length ? pick(c.r, props) : null;
}
const walkPoseFor = (h: Held | null) => (h === 'balloon' || h === 'balloons' || h === 'umbrella' ? 'holdup' : 'walk');

const wingsOf = (c: Ctx, who: string): Wings => c.outfits[who]?.wings ?? c.chars[who]?.wardrobe.wings[0] ?? 'fairy';
const gear = (c: Ctx, who: string, i: number): string => c.chars[who].wardrobe.gearColors[i];

/** Climb up from behind a panel onto its top edge. */
function climbOnto(t: T, x: number, top: number, held?: Held | null) {
  t.at(x, top + 46, { layer: 'behind', pose: 'climb', held: held ?? null, ride: null });
  t.go(x, top + 1, 1.1, { pose: 'climb', ease: 'out' });
  t.hold(0.25, { layer: 'front', pose: 'idle' });
}
/** Drop down behind a panel's top edge and vanish. */
function slipBehind(t: T, top: number) {
  const last = t.beats[t.beats.length - 1];
  const x = last?.to?.x ?? last?.at?.x ?? 0;
  t.hold(0.15, { layer: 'behind', pose: 'crouch' });
  t.go(x, top + 54, 0.55, { pose: 'hang', ease: 'in' });
}

/* ------------------------------------------------------------------ */
/* the games                                                           */
/* ------------------------------------------------------------------ */

type Gen = { name: string; w: (c: Ctx) => number; make: (c: Ctx) => Episode | null };

const G: Gen[] = [];
const def = (name: string, w: Gen['w'], make: Gen['make']) => G.push({ name, w, make });

// — a stroll that stops to say hi to whoever's watching ———————————————
def('stroll', () => 3, (c) => {
  const who = lead(c);
  const l = groundLayer(c);
  const g = GROUND[l];
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) : W + OFF(l);
  const x2 = dir > 0 ? W + OFF(l) : -OFF(l);
  const stop = openX(c, l, 160, W - 160);
  const held = seasonalHeld(c, who);
  const wp = walkPoseFor(held);
  const t = kid(who).at(x0, g, { layer: l, held });
  if (c.r() < 0.35 && wp === 'walk' && can(c, who, 'legs')) { // legs
    // skipping
    const n = Math.ceil(Math.abs(stop - x0) / (46 * k(l)));
    for (let i = 1; i <= n; i++) t.hop(x0 + ((stop - x0) * i) / n, g, 0.42, 12 * k(l), { pose: 'jump' });
  } else t.go(stop, g, walkT(stop - x0, l), { pose: wp, ease: 'linear' });
  t.hold(0.5, { pose: 'idle' });
  t.hold(1.8, { pose: held === 'dandelion' ? 'blow' : 'wave', expr: held === 'dandelion' ? 'blow' : undefined, fxEvery: held === 'dandelion' ? 'seeds' : held === 'bubblewand' ? 'bubbles' : undefined, emote: pick(c.r, ['hi', 'heart', 'star', 'hi'] as const) });
  if (c.r() < 0.4) t.hold(1.4, { pose: pick(c.r, ['dance', 'twirl', 'cheer', 'look'] as const), emote: 'music' });
  t.hold(0.4, { pose: 'idle', look: 'viewer' });
  t.go(x2, g, walkT(x2 - stop, l), { pose: wp, ease: 'linear' });
  return ep('stroll', t);
});

// — the two of them out for a walk ————————————————————————————————————
def('together', (c) => pairW(c, 3), (c) => {
  const l = groundLayer(c);
  const g = GROUND[l];
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) : W + OFF(l);
  const x2 = dir > 0 ? W + OFF(l) : -OFF(l);
  const stop = openX(c, l, 220, W - 220);
  const gap = 34 * k(l);
  const a = pick(c.r, c.kids);
  const A = kid(a).at(x0, g, { layer: l, held: seasonalHeld(c, a) });
  const B = mate(c, a).at(x0 - dir * gap, g, { layer: l, held: seasonalHeld(c, other(c, a)) });
  const d = walkT(stop - x0, l);
  A.go(stop, g, d, { pose: 'walk', ease: 'linear' });
  B.go(stop - dir * gap, g, d, { pose: 'walk', ease: 'linear' });
  A.hold(0.8, { face: (-dir) as 1 | -1, pose: 'idle', emote: pick(c.r, ['music', 'ha', 'heart'] as const) });
  B.hold(0.8, { face: dir as 1 | -1, pose: 'idle', expr: 'laugh' });
  const party = pick(c.r, ['dance', 'twirl', 'cheer'] as const);
  A.hold(2, { pose: party });
  B.hold(2, { pose: c.r() < 0.5 ? party : 'dance' });
  A.hold(1.3, { pose: 'wave', look: 'viewer' });
  B.hold(1.3, { pose: 'wave', look: 'viewer', emote: 'hi' });
  A.go(x2, g, runT(x2 - stop, l), { pose: 'run', ease: 'linear', expr: 'laugh' });
  B.go(x2 - dir * gap, g, runT(x2 - stop, l) + 0.3, { pose: 'run', ease: 'linear' });
  // the rest fall in behind, in a line
  const line = rest(c, a, other(c, a)).map((w, i) => copy(c, B, w, -dir * gap * (i + 1), 0.15 * (i + 1)));
  return ep('together', A, B, ...line);
});

// — tag, you're it ————————————————————————————————————————————————————
def('tag', (c) => pairW(c, 2.5), (c) => {
  const l = pick(c.r, ['mid', 'near', 'front', 'front'] as Layer[]);
  const g = GROUND[l];
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) : W + OFF(l);
  const mid = openX(c, l, 300, W - 300);
  const a = pick(c.r, c.kids);
  const A = kid(a).at(x0, g, { layer: l });
  const B = mate(c, a).at(x0 - dir * 120 * k(l), g, { layer: l });
  const d = runT(mid - x0, l);
  A.go(mid, g, d, { pose: 'run', ease: 'linear', expr: 'laugh' });
  B.go(mid - dir * 16 * k(l), g, d, { pose: 'run', ease: 'linear' });
  A.hold(0.5, { pose: 'jump', emote: '!', expr: 'o' });
  B.hold(0.5, { pose: 'point', emote: 'ha', expr: 'laugh' });
  const back = dir > 0 ? -OFF(l) : W + OFF(l);
  B.go(back, g, runT(back - mid, l), { pose: 'run', ease: 'linear', expr: 'laugh' });
  A.hold(0.35, { pose: 'idle' }).go(back, g, runT(back - mid, l) + 0.2, { pose: 'run', ease: 'linear' });
  // everyone else is being chased too, running just ahead
  const pack = rest(c, a, other(c, a)).map((w, i) => copy(c, A, w, dir * 30 * k(l) * (i + 1), 0.1 * i));
  return ep('tag', A, B, ...pack);
});

// — kick the ball ————————————————————————————————————————————————————
def('kickball', (c) => (c.wet ? 0 : pairW(c, 2.5)), (c) => {
  const l = pick(c.r, ['near', 'front', 'front', 'mid'] as Layer[]);
  const g = GROUND[l];
  const xa = openX(c, l, 120, 420);
  const xb = openX(c, l, 860, W - 120);
  const a = pick(c.r, c.kids);
  if (!can(c, a, 'legs') || (two(c) && !can(c, other(c, a), 'legs'))) return null; // legs: both kick
  const A = kid(a).at(-OFF(l), g, { layer: l });
  const B = mate(c, a).at(W + OFF(l), g, { layer: l });
  A.go(xa, g, runT(xa + OFF(l), l), { pose: 'run', ease: 'out' });
  B.go(xb, g, runT(W + OFF(l) - xb, l), { pose: 'run', ease: 'out' });
  const start = Math.max(A.t, B.t);
  A.until(start, { pose: 'idle', face: 1 });
  B.until(start, { pose: 'idle', face: -1 });
  const ball = thing('ball', c.season === 'summer' ? 'beachball' : 'ball').gone(start - 0.01);
  ball.at(xa + 12 * k(l), g - 10 * k(l), { layer: l, variant: Math.floor(c.r() * 3) });
  const passes = 3 + Math.floor(c.r() * 3);
  let atA = true;
  for (let i = 0; i < passes; i++) {
    const [K, R] = atA ? [A, B] : [B, A];
    const kx = atA ? xa + 12 * k(l) : xb - 12 * k(l);
    const rx = atA ? xb - 12 * k(l) : xa + 12 * k(l);
    K.hold(0.3, { pose: 'kick', expr: 'grin' });
    R.hold(0.3, { pose: 'idle' });
    ball.hold(0.3).go(rx, g - 10 * k(l), 1.15, { arc: (30 + c.r() * 90) * k(l) });
    K.hold(1.15, { pose: 'idle', emote: i === 0 ? 'ha' : undefined });
    R.hold(0.85, { pose: 'idle' }).hold(0.3, { pose: 'catch' });
    void kx;
    atA = !atA;
  }
  // the big kick — away it goes, and the other one chases it
  const [K, R] = atA ? [A, B] : [B, A];
  const away = atA ? W + OFF(l) + 60 : -OFF(l) - 60;
  K.hold(0.35, { pose: 'kick', expr: 'laugh' });
  R.hold(0.35, { pose: 'idle' });
  ball.hold(0.35).go(away, g - 10 * k(l), 1.6, { arc: 220 * k(l) });
  R.hold(0.6, { pose: 'look', look: 'up', emote: '!' }).go(away, g, runT(away - (atA ? xb : xa), l), { pose: 'run', ease: 'linear' });
  K.hold(1.2, { pose: 'cheer', emote: 'star' }).go(atA ? -OFF(l) : W + OFF(l), g, walkT(700, l), { pose: 'walk', ease: 'linear' });
  // the rest make two teams, each a step behind their side's kicker
  const teams = rest(c, a, other(c, a)).map((w, i) => {
    const side = i % 2 ? B : A;
    const dx = (side === A ? -1 : 1) * 30 * k(l) * (1 + Math.floor(i / 2));
    return can(c, w, 'legs') ? copy(c, side, w, dx, 0.1) : watcher(w, side === A ? xa - 90 : xb + 90, 0.5, ball.t);
  });
  return ep('kickball', A, B, ball, ...teams);
});

// — throw it over the panels ——————————————————————————————————————————
def('overthrow', (c) => (two(c) && c.cards.length > 0 ? 2 : 0), (c) => {
  if (!two(c)) return null; // a game for two or more
  const l: Layer = 'front';
  const g = GROUND[l];
  const xa = 60 + c.r() * 120;
  const xb = W - 60 - c.r() * 120;
  const a = pick(c.r, c.kids);
  const A = kid(a).at(-40, g, { layer: l });
  const B = kid(other(c, a)).at(W + 40, g, { layer: l });
  A.go(xa, g, runT(xa + 40, l));
  B.go(xb, g, runT(W + 40 - xb, l));
  const s0 = Math.max(A.t, B.t) + 0.2;
  A.until(s0, { face: 1 });
  B.until(s0, { face: -1 });
  const what: Thing = c.snowy ? 'snowball' : c.season === 'summer' ? pick(c.r, ['frisbee', 'beachball', 'waterballoon'] as Thing[]) : 'ball';
  const ball = thing('ball', what).gone(s0);
  const n = 2 + Math.floor(c.r() * 2);
  let fromA = true;
  for (let i = 0; i < n; i++) {
    const [K, R] = fromA ? [A, B] : [B, A];
    const fx = fromA ? xa + 8 : xb - 8;
    const tx = fromA ? xb - 8 : xa + 8;
    K.hold(0.45, { pose: 'throw' });
    R.hold(0.45, { pose: 'idle' });
    ball.at(fx, g - 24, { layer: l }).hold(0.4, { hidden: true }).go(tx, g - 22, 2.3, { arc: 640 + c.r() * 60, layer: l });
    K.hold(2.3, { pose: 'idle', look: 'up' });
    R.hold(1.6, { pose: 'look', look: 'up', emote: i === 0 ? '!' : undefined }).hold(0.7, { pose: 'catch', fx: what === 'waterballoon' ? 'splash' : what === 'snowball' ? 'snow' : undefined, expr: what === 'waterballoon' ? 'o' : 'grin' });
    fromA = !fromA;
  }
  A.hold(1.2, { pose: 'cheer', emote: 'ha' }).go(-50, g, runT(xa + 50, l));
  B.hold(1.2, { pose: 'wave', look: 'viewer' }).go(W + 50, g, runT(W + 50 - xb, l));
  // the rest split between the two sides, a step in toward the panels
  const teams = rest(c, a, other(c, a)).map((w, i) => {
    const side = i % 2 ? B : A;
    return copy(c, side, w, (side === A ? 1 : -1) * 34 * (1 + Math.floor(i / 2)), 0.1);
  });
  return ep('overthrow', A, B, ball, ...teams);
});

// — hide and seek —————————————————————————————————————————————————————
def('hideseek', (c) => pairW(c, 2.5), (c) => {
  const l: Layer = 'front';
  const g = GROUND[l];
  const seeker = pick(c.r, c.kids);
  const S = kid(seeker);
  const H = mate(c, seeker); // with one kid, their critter hides
  const sx = openX(c, l, 140, 360);
  S.at(-40, g, { layer: l }).go(sx, g, walkT(sx + 40, l));
  H.at(-80, g, { layer: l }).go(sx + 26, g, walkT(sx + 66, l));
  S.hold(3.6, { pose: 'cover', expr: 'closed', emote: 'count', face: -1 });
  // hiding spot: behind the dock, or in a box
  const box = !c.dock || c.r() < 0.35;
  const hx = box ? openX(c, l, 820, 1180) : c.dock!.left + 60 + c.r() * (c.dock!.right - c.dock!.left - 120);
  H.hold(0.4, { pose: 'idle', expr: 'laugh', look: 'viewer', emote: 'ha' });
  H.go(hx, g, runT(hx - sx, l), { pose: 'run', ease: 'linear' });
  const extra: T[] = [];
  if (box) {
    const bx = thing('box', 'box').gone(H.t - 0.01).at(hx, g, { layer: l });
    H.hold(0.3, { pose: 'hide', hidden: true });
    extra.push(bx);
  } else H.hold(0.3, { pose: 'crouch' });
  const found = S.t + 1.2 + 2.4 + walkT(hx - 60 - sx, l);
  S.hold(1.2, { pose: 'look', emote: '?' })
    .go(sx + 60, g, walkT(60, l), { pose: 'walk' })
    .hold(1.2, { pose: 'look', face: -1, emote: '?' })
    .go(hx - 60, g, walkT(hx - 60 - sx - 60, l), { pose: 'walk' });
  H.until(found, box ? { pose: 'hide', hidden: true } : { pose: 'crouch', expr: 'laugh' });
  if (box) {
    const b = extra[0];
    b.until(found - 1.4).hold(0.5, { wobble: true }).hold(0.4).hold(0.5, { wobble: true });
  }
  H.hop(hx, g, 0.6, 26, { pose: 'cheer', emote: 'boo', expr: 'laugh', hidden: false, fx: box ? 'dust' : undefined });
  S.hop(hx - 70, g, 0.6, 22, { pose: 'jump', emote: '!', expr: 'o' });
  H.hold(1.4, { pose: 'dance', expr: 'laugh' });
  S.hold(1.4, { pose: 'cheer', expr: 'laugh', emote: 'ha' });
  const ex = W + 50;
  H.go(ex, g, runT(ex - hx, l), { pose: 'run' });
  S.go(ex, g, runT(ex - hx + 70, l) + 0.3, { pose: 'run' });
  // everyone else seeks too, trailing the seeker
  const seekers = rest(c, seeker, other(c, seeker)).map((w, i) => copy(c, S, w, -36 * (i + 1), 0.15 * (i + 1)));
  for (const b of extra) b.until(Math.max(H.t, S.t, ...seekers.map((t) => t.t)));
  return ep('hideseek', S, H, ...extra, ...seekers);
});

// — peekaboo over the top of a panel ———————————————————————————————————
def('peekover', (c) => (c.cards.length ? 3 : 0), (c) => {
  const card = pick(c.r, c.cards);
  const who = lead(c);
  const t = kid(who);
  const x1 = topX(c, card);
  const x2 = topX(c, card);
  const night = c.night;
  t.at(x1, card.top + 60, { layer: 'behind', pose: 'idle', held: night ? 'flashlight' : null });
  t.go(x1, card.top + 9, 0.7, { pose: 'idle', look: 'viewer', ease: 'out' });
  t.hold(1.6, { pose: 'peek', look: 'viewer', emote: pick(c.r, ['hi', '?', 'heart'] as const) });
  t.go(x1, card.top + 60, 0.4, { pose: 'idle', ease: 'in' });
  t.go(x2, card.top + 60, walkT(x2 - x1, 'behind') * 0.6, { pose: 'walk' });
  t.go(x2, card.top + 5, 0.3, { pose: 'cheer', ease: 'out', emote: 'boo', expr: 'laugh' });
  t.hold(1.1, { pose: 'cheer', expr: 'laugh' });
  t.go(x2, card.top + 64, 0.45, { pose: 'idle', ease: 'in' });
  const tracks = [t];
  if (two(c) && c.r() < 0.55) {
    // the others answer from another panel, one after another
    const card2 = c.cards.length > 1 ? c.cards.find((x) => x !== card)! : card;
    others(c, who).forEach((w, i) => {
      const y = kid(w);
      const xo = topX(c, card2, 60);
      y.gone(2.2 + i * 0.7).at(xo, card2.top + 60, { layer: 'behind', hidden: false }).go(xo, card2.top + 9, 0.6, { look: 'viewer', ease: 'out' });
      y.hold(1.8, { pose: 'wave', look: 'viewer', emote: 'hi' }).hold(1.2, { pose: 'peek', expr: 'wink' }).go(xo, card2.top + 64, 0.5, { ease: 'in' });
      tracks.push(y);
    });
  }
  return ep('peekover', ...tracks);
});

// — fluttering out from behind a panel's edge ——————————————————————————
def('sidepeek', (c) => (c.cards.length ? 2 : 0), (c) => {
  const card = pick(c.r, c.cards);
  const who = lead(c, 'flying');
  const left = c.r() < 0.5;
  const ex = left ? card.left : card.right;
  const y = card.top + 120 + c.r() * Math.max(60, card.bottom - card.top - 260);
  const inX = ex + (left ? 26 : -26);
  const outX = ex + (left ? -16 : 16);
  const t = kid(who).at(inX, y, { layer: 'behind', wings: wingsOf(c, who), hover: 2, face: (left ? -1 : 1) as 1 | -1 });
  t.go(outX, y, 0.8, { pose: 'fly', hover: 2, face: (left ? -1 : 1) as 1 | -1 });
  t.hold(1.5, { pose: 'fly', hover: 2.5, look: 'viewer', emote: pick(c.r, ['hi', 'heart', 'star'] as const), fxEvery: 'sparkle' });
  t.go(inX, y + 10, 0.6, { pose: 'fly', hover: 1, face: (left ? 1 : -1) as 1 | -1 });
  t.hold(1.2, { pose: 'fly', hover: 1 });
  t.go(outX, y - 40, 0.5, { pose: 'fly', hover: 1, expr: 'laugh', emote: 'boo', face: (left ? -1 : 1) as 1 | -1 });
  const exitX = left ? -60 : W + 60;
  t.go(exitX, y - 160, flyT(Math.abs(exitX - outX) + 160, 'front'), { pose: 'fly', hover: 3, fxEvery: 'sparkle', layer: 'front' });
  return ep('sidepeek', t);
});

// — up onto a panel: balance, sit, swing your legs, jump down ——————————
def('ledge', (c) => (c.cards.length ? 3 : 0), (c) => {
  const card = pick(c.r, c.cards);
  let who = lead(c);
  const able = ableKid(c, 'legs', who); // legs: climb, balance, jump down
  if (!able) return null;
  who = able;
  const t = kid(who);
  const w = card.right - card.left;
  const x0 = topX(c, card, 60);
  const x1 = topX(c, card);
  void w;
  climbOnto(t, x0, card.top);
  t.go(x1, card.top, walkT(x1 - x0, 'front') * 1.4, { pose: 'balance', ease: 'linear' });
  t.hold(c.night ? 4 : 2.6, { pose: c.night && c.r() < 0.6 ? 'sleep' : 'dangle', emote: c.night ? 'zzz' : 'music', expr: c.night ? 'closed' : undefined, look: 'viewer' });
  t.hold(1.3, { pose: 'wave', look: 'viewer', emote: 'hi' });
  // jump down off the panel's side if there's room, else slip back behind
  const gapRight = c.cards.find((o) => o.left > card.right) ? card.right + (c.cards.find((o) => o.left > card.right)!.left - card.right) / 2 : card.right + 20 < W - 10 ? card.right + 20 : null;
  const gapLeft = card.left - 20 > 10 ? card.left - 20 : null;
  const jx = gapRight ?? gapLeft;
  if (jx !== null && c.r() < 0.75) {
    t.go(jx > x1 ? card.right - 10 : card.left + 10, card.top, runT(Math.abs(jx - x1), 'front'), { pose: 'run' });
    t.hop(jx, GROUND.front, 1.0, 50, { pose: 'jump', expr: 'laugh', ease: 'linear' });
    t.hold(0.25, { pose: 'crouch', fx: 'dust' });
    t.hold(0.6, { pose: 'cheer', emote: 'star' });
    const ex = jx < W / 2 ? -50 : W + 50;
    t.go(ex, GROUND.front, runT(ex - jx, 'front'), { pose: 'run' });
  } else slipBehind(t, card.top);
  return ep('ledge', t);
});

// — leap across the gap between the panels —————————————————————————————
def('gapleap', (c) => (two(c) && c.cards.length >= 2 ? 2 : 0), (c) => {
  if (!two(c)) return null; // a game for two or more
  const [L, R] = [c.cards[0], c.cards[c.cards.length - 1]];
  const a = pick(c.r, c.kids);
  if (!can(c, a, 'legs') || !can(c, other(c, a), 'legs')) return null; // legs: both climb, one leaps
  const A = kid(a);
  const B = kid(other(c, a));
  const ax = Math.max(470, L.right - 120 - c.r() * 120);
  const bx = Math.min(1090, R.left + 90 + c.r() * 160);
  climbOnto(A, ax, L.top);
  B.gone(0.8);
  climbOnto(B, bx, R.top);
  A.hold(0.6, { face: 1 });
  B.hold(0.2, { face: -1 }).hold(1.4, { pose: 'wave', emote: 'hi', face: -1 });
  A.hold(1.0, { pose: 'point', emote: '!', face: 1 });
  A.go(L.right - 16, L.top, runT(L.right - 16 - ax, 'front'), { pose: 'run' });
  B.until(A.t, { pose: 'cheer', face: -1 });
  A.hop(R.left + 26, R.top, 0.9, 70, { pose: 'jump', expr: 'laugh' });
  B.hold(0.9, { pose: 'cover', expr: 'o' });
  A.hold(0.3, { pose: 'crouch', fx: 'dust' }).hold(1.4, { pose: 'cheer', emote: 'star' });
  B.hold(0.3, { pose: 'idle' }).hold(1.4, { pose: 'cheer', emote: 'ha', expr: 'laugh' });
  A.hold(2.6, { pose: 'dangle', look: 'viewer' });
  B.go(R.left + 70, R.top, 0.4).hold(2.2, { pose: 'dangle', look: 'viewer', emote: 'heart' });
  slipBehind(A, R.top);
  slipBehind(B, R.top);
  // the rest wait on the far panel with the catcher
  const crew = rest(c, a, other(c, a)).map((w, i) =>
    can(c, w, 'legs') ? copy(c, B, w, Math.min(36 * (i + 1), R.right - 50 - bx), 0.2 * (i + 1)) : watcher(w, (L.right + R.left) / 2 + fan(i) * 50, 0.5, A.t),
  );
  return ep('gapleap', A, B, ...crew);
});

// — grappling hook swing across the panels —————————————————————————————
def('grapple', (c) => (c.cards.length ? 2.2 : 0), (c) => {
  let who = lead(c, 'wheels');
  const able = ableKid(c, 'legs', who); // legs: climb onto the panel
  if (!able) return null;
  who = able;
  const t = kid(who);
  t.dress = { hat: 'goggles' };
  const L = c.cards[0];
  const R = c.cards[c.cards.length - 1];
  const x0 = Math.max(450, L.left + 50 + c.r() * 120);
  const x1 = Math.min(1110, R.right - 50 - c.r() * 120);
  const pivot = { x: (x0 + x1) / 2 + (c.r() - 0.5) * 120, y: -30 };
  const hook = thing('hook', 'hook');
  hook.tether = who;
  climbOnto(t, x0, L.top, 'hook');
  t.hold(0.6, { pose: 'point', face: 1, emote: '!' });
  const fire = t.t;
  t.hold(0.7, { pose: 'point', face: 1 });
  hook.gone(fire).at(x0 + 6, L.top - 30, { layer: 'front', hidden: false }).go(pivot.x, pivot.y + 8, 0.7, { ease: 'out' });
  t.hold(0.25, { pose: 'hang', expr: 'grin' });
  t.go(x1, R.top, 2.0, { swing: pivot, pose: 'hang', expr: 'laugh', layer: 'front' });
  hook.hold(0.25).hold(2.0);
  t.hold(0.2, { pose: 'crouch', fx: 'dust' });
  hook.go(x1 + 6, R.top - 40, 0.6, { ease: 'in' });
  t.hold(1.6, { pose: 'cheer', emote: 'star', held: null });
  t.hold(1.4, { pose: 'wave', look: 'viewer' });
  slipBehind(t, R.top);
  const tracks = [t, hook];
  if (two(c) && c.r() < 0.6) {
    // the others run in underneath to watch
    others(c, who).forEach((w, i) => {
      const o = kid(w);
      const ox = openX(c, 'front', 120, 1160);
      o.gone(fire - 1 + i * 0.3).at(-40, GROUND.front, { layer: 'front', hidden: false }).go(ox, GROUND.front, runT(ox + 40, 'front'), { pose: 'run' });
      o.hold(2.4, { pose: 'look', look: 'up', emote: '!', expr: 'o' }).hold(1.6, { pose: 'cheer', emote: 'ha' }).go(W + 40, GROUND.front, runT(W - ox, 'front'));
      tracks.push(o);
    });
  }
  return ep('grapple', ...tracks);
});

// — wings! a flight over the world ———————————————————————————————————
def('flight', () => 2.6, (c) => {
  const who = lead(c, 'flying');
  const distant = c.r() < 0.4;
  const l: Layer = distant ? pick(c.r, ['far', 'far', 'mid'] as Layer[]) : 'front';
  const t = kid(who);
  const w = wingsOf(c, who);
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) : W + OFF(l);
  const yBand = distant ? [12, 74] : [20, 120];
  let x = x0;
  let y = yBand[0] + c.r() * (yBand[1] - yBand[0]);
  t.at(x, y, { layer: l, wings: w, held: has(c, who, 'wand') && c.r() < 0.5 ? 'wand' : null });
  const hops = 3 + Math.floor(c.r() * 3);
  for (let i = 0; i < hops; i++) {
    const nx = x + dir * (160 + c.r() * 200) * (distant ? 1.2 : 1);
    const ny = yBand[0] + c.r() * (yBand[1] - yBand[0]) + (!distant && c.r() < 0.3 ? 200 : 0);
    // far fairies stay in the open sky above the panels
    t.go(nx, ny, flyT(Math.hypot(nx - x, ny - y), l), { pose: 'fly', hover: 3, fxEvery: 'sparkle' });
    x = nx;
    y = ny;
    if (i === 1) t.hold(1.4, { pose: 'fly', hover: 4, look: 'viewer', emote: pick(c.r, ['hi', 'heart', 'star'] as const), fxEvery: 'sparkle' });
  }
  // land on a panel top for a moment (near level only)
  if (!distant && c.cards.length && c.r() < 0.6) {
    const card = pick(c.r, c.cards);
    const lx = topX(c, card, 60);
    t.go(lx, card.top, flyT(Math.hypot(lx - x, card.top - y), l), { pose: 'fly', hover: 1 });
    t.hold(2, { pose: 'idle', look: 'viewer', wings: w }).hold(1, { pose: 'twirl' });
    x = lx;
    y = card.top;
  }
  const ex = dir > 0 ? W + OFF(l) : -OFF(l);
  t.go(ex, yBand[0], flyT(Math.abs(ex - x) + 100, l), { pose: 'fly', hover: 3, fxEvery: 'sparkle' });
  return ep('flight', t);
});

// — fairy chase: two pairs of wings ———————————————————————————————————
def('wingchase', (c) => (two(c) ? 1.8 : 0), (c) => {
  if (!two(c)) return null; // a game for two or more
  const l: Layer = c.r() < 0.35 ? pick(c.r, ['far', 'mid'] as Layer[]) : 'front';
  const a = lead(c, 'flying');
  const b = other(c, a);
  const A = kid(a);
  const B = kid(b);
  const dir = c.r() < 0.5 ? 1 : -1;
  const pts: [number, number][] = [];
  let x = dir > 0 ? -OFF(l) : W + OFF(l);
  for (let i = 0; i < 6; i++) {
    x += dir * (190 + c.r() * 120);
    pts.push([x, (l === 'front' ? 26 : 12) + c.r() * (l === 'front' ? 110 : 60)]);
  }
  const lag = 0.9;
  A.at(dir > 0 ? -OFF(l) : W + OFF(l), pts[0][1], { layer: l, wings: wingsOf(c, a) });
  B.gone(lag).at(dir > 0 ? -OFF(l) : W + OFF(l), pts[0][1], { layer: l, wings: wingsOf(c, b), hidden: false });
  let px = dir > 0 ? -OFF(l) : W + OFF(l);
  let py = pts[0][1];
  pts.forEach(([nx, ny], i) => {
    const d = flyT(Math.hypot(nx - px, ny - py), l) * 0.8;
    A.go(nx, ny, d, { pose: 'fly', hover: 3, fxEvery: 'sparkle', expr: 'laugh', emote: i === 2 ? 'ha' : undefined });
    B.go(nx, ny + 8, d, { pose: 'fly', hover: 3, expr: 'grin', emote: i === 3 ? '!' : undefined });
    px = nx;
    py = ny;
  });
  // the rest join the chase, one after another
  const flock = rest(c, a, b).map((w, i) => copy(c, B, w, 0, lag * (i + 1), 10 * (i + 1)));
  return ep('wingchase', A, B, ...flock);
});

// — bikes and scooters ————————————————————————————————————————————————
def('bikes', (c) => (c.snowy ? 0.3 : 2.2), (c) => {
  const l = pick(c.r, ['mid', 'near', 'front', 'front'] as Layer[]);
  const g = GROUND[l];
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) - 40 : W + OFF(l) + 40;
  const x1 = dir > 0 ? W + OFF(l) + 40 : -OFF(l) - 40;
  const a = lead(c, 'wheels');
  const A = kid(a).at(x0, g, { layer: l, ride: likes(c, a, 'wheels') ? 'bike' : pick(c.r, ['bike', 'scooter'] as const) });
  A.dress = { hat: 'helmet', hat1: gear(c, a, 2) };
  const mid = W / 2 + (c.r() - 0.5) * 300;
  const sp = 210 * k(l);
  A.go(mid, g, Math.abs(mid - x0) / sp, { ease: 'linear' });
  A.go(mid + dir * 180 * k(l), g, (180 * k(l)) / sp, { ease: 'linear', rot: -16 * dir, emote: 'ha', expr: 'laugh' });
  A.go(x1, g, Math.abs(x1 - mid) / sp, { ease: 'linear' });
  const tracks = [A];
  // the others follow on whatever they like to ride
  others(c, a).forEach((b, i) => {
    const B = kid(b).gone(1.2 * (i + 1)).at(x0, g, { layer: l, hidden: false, ride: likes(c, b, 'wheels') ? 'skateboard' : pick(c.r, ['scooter', 'bike', 'skateboard'] as const) });
    B.dress = { hat: 'helmet', hat1: gear(c, b, 2) };
    B.go(x1, g, Math.abs(x1 - x0) / (sp * (0.85 + c.r() * 0.1)), { ease: 'linear', emote: i ? undefined : 'hi' });
    tracks.push(B);
  });
  return ep('bikes', ...tracks);
});

// — go-kart race ————————————————————————————————————————————————————
def('karts', (c) => (two(c) && !c.snowy ? 2 : 0), (c) => {
  const l = pick(c.r, ['mid', 'near', 'near', 'front'] as Layer[]);
  const g = GROUND[l];
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) - 50 : W + OFF(l) + 50;
  const x1 = dir > 0 ? W + OFF(l) + 60 : -OFF(l) - 60;
  const xm = (x0 + x1) / 2;
  // everyone races: the leader starts on the front row, the rest a kart behind each
  const a = lead(c, 'wheels');
  const racers = [a, ...others(c, a)];
  const sp = 280 * k(l);
  const half = Math.abs(xm - x0) / sp;
  const winner = Math.floor(c.r() * racers.length);
  const tracks = racers.map((w, i) => {
    const y = g + 4 * k(l) * i;
    const t = kid(w).at(x0 - dir * 70 * k(l) * i, y, { layer: l, ride: 'kart' });
    t.dress = { hat: 'helmet', hat1: gear(c, w, 0) }; // helmets match their karts
    const lead1 = 0.9 + c.r() * 0.2; // who's ahead at halfway is anyone's guess…
    const fin = i === winner ? 0.78 : 0.86 + c.r() * 0.22; // …but one of them takes it
    t.go(xm + dir * (c.r() - 0.5) * 80 * k(l), y, half * lead1, { ease: 'linear', fxEvery: 'dust', emote: c.r() < 0.4 ? 'ha' : undefined });
    t.go(x1, y, half * fin, { ease: 'linear', fxEvery: 'dust', emote: i === winner ? '!' : undefined });
    return t;
  });
  return ep('karts', ...tracks);
});

// — a box that wiggles… —————————————————————————————————————————————
def('boxboo', (c) => pairW(c, 2), (c) => {
  const l = pick(c.r, ['near', 'front', 'front'] as Layer[]);
  const g = GROUND[l];
  const bx = openX(c, l, 300, 980);
  // with one kid, their critter is the one in the box
  const hider = pick(c.r, c.kids);
  const H = (two(c) ? kid(hider) : pal(c)).gone(0.1);
  const box = thing('box', 'box').at(bx, g, { layer: l });
  const v = two(c) ? other(c, hider) : hider;
  const V = kid(v).at(-OFF(l), g, { layer: l });
  V.go(bx - 70 * k(l), g, walkT(bx - 70 * k(l) + OFF(l), l), { pose: 'walk' });
  const t1 = V.t;
  V.hold(1.3, { pose: 'look', emote: '?' });
  box.until(t1 + 0.6).hold(0.6, { wobble: true }).hold(0.2);
  H.until(box.t);
  H.at(bx, g, { layer: l, hidden: false }).hop(bx, g, 0.5, 34 * k(l), { pose: 'cheer', emote: 'boo', expr: 'laugh', fx: 'dust' });
  V.until(H.t - 0.5).hop(bx - 110 * k(l), g, 0.5, 24 * k(l), { pose: 'jump', emote: '!', expr: 'o', face: 1 });
  H.hold(1.3, { pose: 'dance', expr: 'laugh' });
  V.hold(1.3, { pose: 'cheer', emote: 'ha', expr: 'laugh' });
  // and push the box off together
  const ex = W + OFF(l) + 40;
  box.until(H.t).go(ex + 40, g, walkT(ex - bx, l) * 1.3, { ease: 'linear' });
  H.go(ex + 4, g, walkT(ex - bx, l) * 1.3, { pose: 'push', ease: 'linear' });
  V.go(ex - 30, g, walkT(ex - bx, l) * 1.3 + 0.4, { pose: 'push', ease: 'linear' });
  // the rest come along with the one who finds the box
  const pals = two(c) ? rest(c, hider, v).map((w, i) => copy(c, V, w, -34 * k(l) * (i + 1), 0.2 * (i + 1))) : [];
  return ep('boxboo', V, H, box, ...pals);
});

// — paper airplane ————————————————————————————————————————————————————
def('plane', (c) => (c.wet ? 0.3 : 1.8), (c) => {
  const a = lead(c);
  const A = kid(a);
  const ax = openX(c, 'front', 80, 300);
  A.at(-40, GROUND.front, { layer: 'front' }).go(ax, GROUND.front, walkT(ax + 40, 'front'));
  A.hold(0.5, { pose: 'throw', face: 1 });
  const p = thing('plane', 'plane').gone(A.t - 0.1).at(ax + 6, GROUND.front - 28, { layer: 'front', hidden: false });
  const path: [number, number][] = [[ax + 220, 300], [ax + 420, 120], [ax + 560, 220], [ax + 700, 60], [900, 160], [1160, GROUND.front - 26]];
  for (const [x, y] of path) p.go(x, y + (c.r() - 0.5) * 60, 1.1, { ease: 'linear', rot: y < 200 ? -14 : 10 });
  A.hold(p.t - A.t, { pose: 'look', look: 'up', emote: 'star' });
  const tracks = [A, p];
  if (two(c)) {
    const B = kid(other(c, a)).at(W + 40, GROUND.front, { layer: 'front' }).go(1180, GROUND.front, walkT(100, 'front'));
    B.until(p.t - 0.6, { pose: 'look', look: 'up', face: -1 }).hold(1.2, { pose: 'catch', emote: '!', held: 'flag' });
    B.hold(1, { pose: 'wave', look: 'viewer', held: null }).go(W + 40, GROUND.front, walkT(120, 'front'));
    p.hold(0.1, { hidden: true });
    tracks.push(B);
    // the rest wait beside the catcher and cheer the catch
    others(c, a).slice(1).forEach((w, i) => {
      const t = copy(c, B, w, -40 * (i + 1));
      for (const b of t.beats) if (b.pose === 'catch') Object.assign(b, { pose: 'cheer', held: null, emote: 'ha' });
      tracks.push(t);
    });
  } else p.go(W + 60, GROUND.front - 40, 0.8, { ease: 'linear' });
  A.go(-40, GROUND.front, walkT(ax + 40, 'front'));
  return ep('plane', ...tracks);
});

// — toy rocket launch ——————————————————————————————————————————————
def('rocket', (c) => (c.wet || c.windy ? 0.2 : 1.5), (c) => {
  const a = lead(c, 'wheels');
  const l: Layer = pick(c.r, ['near', 'front', 'front'] as Layer[]);
  const g = GROUND[l];
  const rx = openX(c, l, 200, 1080);
  const A = kid(a).at(-OFF(l), g, { layer: l });
  A.go(rx - 14 * k(l), g, walkT(rx + OFF(l), l), { pose: 'carry' });
  A.hold(0.8, { pose: 'crouch' });
  const rk = thing('rocket', 'rocket').gone(A.t).at(rx + 10 * k(l), g - 18 * k(l), { layer: l, hidden: false, variant: 0 });
  A.go(rx - 90 * k(l), g, 0.8, { pose: 'run', face: -1 }).hold(2.4, { pose: 'cover', expr: 'closed', emote: 'count', face: 1 });
  rk.until(A.t).go(rx + 30 * k(l), -120, 1.4, { ease: 'in', variant: 1, fx: 'smoke' });
  A.hold(1.6, { pose: 'cheer', look: 'up', emote: 'star', expr: 'laugh' }).hold(0.8, { pose: 'wave', look: 'viewer' }).go(W + OFF(l), g, runT(W - rx, l));
  const tracks = [A, rk];
  others(c, a).forEach((w, i) => {
    const B = kid(w).gone(1 + i * 0.4).at(W + OFF(l), g, { layer: l, hidden: false }).go(rx + (120 + 36 * i) * k(l), g, walkT(W - rx, l));
    B.until(A.t - 3.2 - walkT(W - rx, l), { pose: 'cover', expr: 'o' });
    tracks.push(B);
  });
  return ep('rocket', ...tracks);
});

// — bubbles ————————————————————————————————————————————————————————
def('bubbles', (c) => (c.wet || c.season === 'winter' ? 0.2 : 2), (c) => {
  const l = pick(c.r, ['mid', 'near', 'front', 'front'] as Layer[]);
  const g = GROUND[l];
  const bx = openX(c, l, 160, 1000);
  const blower = lead(c, 'flying');
  const A = kid(blower).at(-OFF(l), g, { layer: l, held: 'bubblewand' });
  A.go(bx, g, walkT(bx + OFF(l), l));
  A.hold(5.5, { pose: 'blow', expr: 'blow', fxEvery: 'bubbles', face: 1 });
  A.hold(1, { pose: 'cheer', expr: 'laugh' });
  const tracks = [A];
  if (two(c)) {
    const B = kid(other(c, blower)).at(W + OFF(l), g, { layer: l });
    const bTracks = [B];
    B.go(bx + 80 * k(l), g, runT(W + OFF(l) - bx, l));
    B.until(A.t - 6.5 + 0.8);
    for (let i = 0; i < 5; i++) B.hop(bx + (50 + c.r() * 110) * k(l), g, 0.55, (30 + c.r() * 30) * k(l), { pose: 'cheer', expr: 'laugh', emote: i === 2 ? 'ha' : undefined });
    B.until(A.t);
    tracks.push(B);
    B.go(W + OFF(l), g, runT(W - bx, l));
    // the others chase bubbles too
    others(c, blower).slice(1).forEach((w, i) => tracks.push(copy(c, bTracks[0], w, 36 * k(l) * (i + 1), 0.3 * (i + 1))));
  }
  A.go(W + OFF(l), g, walkT(W - bx, l), { pose: 'walk' });
  return ep('bubbles', ...tracks);
});

// — dandelion wishes ————————————————————————————————————————————————
def('dandelion', (c) => (c.season === 'spring' || c.season === 'summer') && !c.wet ? 2.4 : 0, (c) => {
  const l = pick(c.r, ['mid', 'near', 'front'] as Layer[]);
  const g = GROUND[l];
  const x = openX(c, l, 140, 1140);
  const who = lead(c, 'flying');
  const A = kid(who).at(x < W / 2 ? -OFF(l) : W + OFF(l), g, { layer: l, held: 'dandelion' }).go(x, g, walkT(Math.min(x + OFF(l), W - x + OFF(l)), l));
  A.hold(0.8, { pose: 'idle', look: 'down' });
  A.hold(3.4, { pose: 'blow', expr: 'blow', fxEvery: 'seeds' });
  A.hold(1.8, { pose: 'look', look: 'up', emote: 'star', held: null });
  const tracks = [A];
  if (two(c) && c.r() < 0.6) {
    // the others sit and watch the seeds go
    others(c, who).forEach((w, i) => {
      const B = kid(w).gone(1.5 + i * 0.4).at(x + fan(i) * 50 * k(l), g + 2, { layer: l, hidden: false, pose: 'sit' });
      B.hold(5 - i * 0.4, { pose: 'sit', look: 'up', expr: 'smile' }).hold(1.5, { pose: 'wave', look: 'viewer' });
      tracks.push(B);
    });
  }
  A.hold(1.2, { pose: 'wave', look: 'viewer', emote: 'heart' });
  return ep('dandelion', ...tracks);
});

// — kite on a windy day ——————————————————————————————————————————————
def('kite', (c) => (c.windy ? 4 : c.wet || c.snowy ? 0 : c.season === 'spring' || c.season === 'autumn' ? 1.6 : 0.6), (c) => {
  const who = lead(c);
  const l = pick(c.r, ['near', 'front', 'front'] as Layer[]);
  const g = GROUND[l];
  const A = kid(who).at(-OFF(l), g, { layer: l, held: 'kitestring' });
  const kx = openX(c, l, 420, 900);
  const kite = thing('kite', 'kite');
  kite.tether = who;
  kite.at(-OFF(l) + 10, g - 20, { layer: l });
  A.go(kx, g, runT(kx + OFF(l), l), { pose: 'run' });
  kite.go(kx - 150 * k(l), 300, runT(kx + OFF(l), l), { ease: 'out' });
  for (let i = 0; i < 5; i++) kite.go(kx - (120 + c.r() * 120) * k(l), 70 + c.r() * 160, 1.6);
  A.hold(kite.t - A.t, { pose: 'holdup', look: 'up', face: -1, emote: 'star' });
  const tracks = [A, kite];
  others(c, who).forEach((w, i) => {
    const B = kid(w).gone(2 + i * 0.5).at(W + OFF(l), g, { layer: l, hidden: false }).go(kx + (70 + 40 * i) * k(l), g, runT(W - kx, l));
    B.until(kite.t - 1.5, { pose: 'cheer', look: 'up', emote: i ? undefined : '!' }).hold(1.5, { pose: 'point', look: 'up' }).go(W + OFF(l), g, runT(W - kx, l));
    tracks.push(B);
  });
  A.go(W + OFF(l), g, runT(W - kx, l), { pose: 'run' });
  kite.go(W + OFF(l) + 100, 60, runT(W - kx, l), { ease: 'linear' });
  return ep('kite', ...tracks);
});

// — butterfly net ————————————————————————————————————————————————————
def('butterfly', (c) => (c.season === 'spring' || c.season === 'summer') && !c.wet && !c.night ? 1.8 : 0, (c) => {
  const l = pick(c.r, ['near', 'front'] as Layer[]);
  const g = GROUND[l];
  const chaser = lead(c, 'flying');
  const A = kid(chaser).at(-OFF(l), g, { layer: l, held: 'net' });
  const bf = thing('bf', 'butterfly').at(-OFF(l) + 80, g - 60 * k(l), { layer: l });
  const xs = [260, 470, 640, 800].map((x) => x + (c.r() - 0.5) * 80);
  for (const x of xs) {
    bf.go(x, g - (40 + c.r() * 70) * k(l), 1.4);
    A.go(x - 30 * k(l), g, 1.4, { pose: 'run', expr: 'grin' });
    A.hold(0.35, { pose: 'throw' });
    bf.hold(0.35);
  }
  A.hold(0.8, { pose: 'idle', emote: 'sweat', expr: 'o' });
  const tracks = [A, bf];
  if (two(c)) {
    const B = kid(other(c, chaser)).at(W + OFF(l), g, { layer: l });
    const bx = xs[3] + 140 * k(l);
    B.go(bx, g, walkT(W + OFF(l) - bx, l)).until(A.t, { pose: 'idle', face: -1 });
    bf.go(bx + 2, g - 134 * k(l), 1.0);
    B.hold(1.0, { pose: 'idle', look: 'up', expr: 'o' }).hold(2.2, { pose: 'idle', look: 'up', emote: '!', expr: 'o' });
    A.hold(1.0).hold(2.2, { pose: 'cover', expr: 'laugh', emote: 'ha' });
    bf.hold(2.2).go(W + 80, 120, 2.5);
    B.hold(1.2, { pose: 'wave', look: 'viewer' });
    tracks.push(B);
    // the others stand by and laugh
    others(c, chaser).slice(1).forEach((w, i) => {
      const t = copy(c, B, w, 40 * k(l) * (i + 1), 0.2);
      for (const b of t.beats) if (b.emote === '!') Object.assign(b, { emote: 'ha', expr: 'laugh' });
      tracks.push(t);
    });
  } else bf.go(W + 80, 100, 2.5);
  return ep('butterfly', ...tracks);
});

// — sword fight (foam swords, autumn sticks) ————————————————————————————
def('duel', (c) => (two(c) && !c.wet ? 1.6 : 0), (c) => {
  if (!two(c)) return null; // a game for two or more
  const l = pick(c.r, ['near', 'front', 'front'] as Layer[]);
  const g = GROUND[l];
  const cx = openX(c, l, 260, 1020);
  const weapon: Held = c.season === 'autumn' ? 'stick' : c.snowy ? 'snowball' : 'sword';
  const a = pick(c.r, c.kids);
  const b = other(c, a);
  const A = kid(a).at(-OFF(l), g, { layer: l, held: weapon });
  const B = kid(b).at(W + OFF(l), g, { layer: l, held: c.special?.kind === 'halloween' && has(c, b, 'wand') ? 'wand' : weapon });
  A.go(cx - 34 * k(l), g, runT(cx + OFF(l), l), { pose: 'run' });
  B.go(cx + 34 * k(l), g, runT(W + OFF(l) - cx, l), { pose: 'run' });
  const s = Math.max(A.t, B.t);
  A.until(s, { face: 1 });
  B.until(s, { face: -1 });
  for (let i = 0; i < 4; i++) {
    const push = i % 2 ? B : A;
    const back = i % 2 ? A : B;
    const d = i % 2 ? -1 : 1;
    push.go(cx + d * 6 * k(l) - (push === A ? 28 : -28) * k(l) + d * 14 * k(l), g, 0.5, { pose: 'sword', expr: 'grin', face: (push === A ? 1 : -1) as 1 | -1 });
    back.hop(cx + (back === A ? -50 : 50) * k(l), g, 0.5, 10 * k(l), { pose: 'sword', expr: 'o', face: (back === A ? 1 : -1) as 1 | -1, emote: i === 2 ? '!' : undefined });
  }
  A.hold(2.4, { pose: 'lie', expr: 'laugh', held: null, emote: 'ha' });
  B.hold(2.4, { pose: 'lie', expr: 'laugh', held: null });
  A.hold(0.6, { pose: 'idle' }).go(-OFF(l), g, runT(cx + OFF(l), l), { pose: 'run' });
  B.hold(0.6, { pose: 'wave', look: 'viewer' }).go(W + OFF(l), g, runT(W - cx + OFF(l), l), { pose: 'run' });
  // a free-for-all: the rest join one side or the other, a step back
  const sides = rest(c, a, b).map((w, i) => {
    const side = i % 2 ? B : A;
    return copy(c, side, w, (side === A ? -1 : 1) * 40 * k(l) * (1 + Math.floor(i / 2)), 0.1);
  });
  return ep('duel', A, B, ...sides);
});

// — cartwheels and flips ——————————————————————————————————————————————
def('tumbles', () => 1.8, (c) => {
  const l = pick(c.r, ['mid', 'near', 'front', 'front'] as Layer[]);
  const g = GROUND[l];
  let who = lead(c);
  const able = ableKid(c, 'legs', who); // legs: cartwheels and flips
  if (!able) return null;
  who = able;
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) : W + OFF(l);
  const A = kid(who).at(x0, g, { layer: l });
  let x = dir > 0 ? 180 + c.r() * 200 : W - 180 - c.r() * 200;
  A.go(x, g, runT(x - x0, l), { pose: 'run' });
  const n = 3 + Math.floor(c.r() * 3);
  const flip = likes(c, who, 'sports'); // sporty kids flip, the rest cartwheel
  for (let i = 0; i < n; i++) {
    const nx = x + dir * (flip ? 70 : 90) * k(l);
    A.hop(nx, g, 0.75, (flip ? 46 : 22) * k(l), { pose: flip ? 'tuck' : 'cheer', spin: (flip ? -360 : 360) * dir, expr: 'laugh' });
    x = nx;
  }
  A.hold(0.3, { pose: 'crouch', fx: 'dust' }).hold(1.5, { pose: flip ? 'cheer' : 'twirl', emote: 'star', look: 'viewer' });
  const tracks = [A];
  others(c, who).forEach((w, i) => {
    const B = kid(w).at(x0, g, { layer: l }).go(x - dir * (120 + 40 * i) * k(l), g, runT(x - x0, l) + 2 + i * 0.3, { pose: 'walk' });
    B.until(A.t - 1.2, { pose: 'idle', face: dir as 1 | -1 }).hold(1.2, { pose: 'cheer', emote: i ? 'star' : 'heart' });
    tracks.push(B);
  });
  const ex = dir > 0 ? W + OFF(l) : -OFF(l);
  A.go(ex, g, runT(ex - x, l), { pose: 'run' });
  return ep('tumbles', ...tracks);
});

// — puddle jumping ————————————————————————————————————————————————————
def('puddles', (c) => (c.wet ? 5 : c.season === 'spring' && c.r() < 0.3 ? 0.6 : 0), (c) => {
  const l = pick(c.r, ['near', 'front', 'front'] as Layer[]);
  const g = GROUND[l];
  const xs = [openX(c, l, 140, 380), openX(c, l, 860, 1100)].sort((a, b) => a - b);
  const pud = xs.map((x, i) => thing(`p${i}`, 'puddle').at(x, g, { layer: l }));
  let who = lead(c);
  const able = ableKid(c, 'legs', who); // legs: puddle jumps
  if (!able) return null;
  who = able;
  const A = kid(who).at(-OFF(l), g, { layer: l, held: c.r() < 0.5 ? 'umbrella' : null });
  A.dress = { top: 'raincoat', shoes: 'rainboots', hat: 'hood', top1: pick(c.r, c.chars[who].wardrobe.colors), shoe1: pick(c.r, c.chars[who].wardrobe.shoeColors) };
  for (const x of xs) {
    A.go(x - 60 * k(l), g, walkT(160, l), { pose: 'run' });
    A.hop(x, g, 0.6, 40 * k(l), { pose: 'jump', expr: 'laugh' });
    A.hold(0.5, { pose: 'cheer', fx: 'splash', emote: 'ha' });
    A.hop(x, g, 0.5, 30 * k(l), { pose: 'jump' }).hold(0.4, { pose: 'cheer', fx: 'splash' });
  }
  A.go(W + OFF(l), g, runT(W - xs[1], l), { pose: 'run' });
  const tracks = [A, ...pud];
  others(c, who).forEach((b, i) => {
    const B = kid(b).gone(1.6 + i * 1.2).at(-OFF(l), g, { layer: l, hidden: false, held: 'umbrella' });
    B.dress = { top: 'raincoat', shoes: 'rainboots', hat: 'hood', top1: pick(c.r, c.chars[b].wardrobe.colors) };
    B.go(xs[0] - 40 * k(l), g, walkT(xs[0] + OFF(l), l), { pose: 'holdup' }).hop(xs[0], g, 0.6, 30 * k(l), { pose: 'jump' }).hold(1, { pose: 'cheer', fx: 'splash', expr: 'laugh' });
    B.go(W + OFF(l), g, walkT(W - xs[0], l), { pose: 'holdup' });
    tracks.push(B);
  });
  for (const p of pud) p.until(Math.max(...tracks.map((t) => t.t)));
  return ep('puddles', ...tracks);
});

// — umbrella lift-off ————————————————————————————————————————————————
def('umbrellafloat', (c) => (c.wet || c.windy ? 1.6 : 0.2), (c) => {
  const who = lead(c, 'flying');
  const A = kid(who).at(-40, GROUND.front, { layer: 'front', held: 'umbrella' });
  const x = openX(c, 'front', 160, 400);
  A.go(x, GROUND.front, walkT(x + 40, 'front'), { pose: 'holdup' });
  A.hold(0.8, { pose: 'holdup', emote: '!', expr: 'o' });
  A.go(x + 160, 420, 2.4, { pose: 'holdup', hover: 4, expr: 'laugh' });
  A.go(x + 420, 120, 2.6, { pose: 'holdup', hover: 4, emote: 'ha' });
  A.go(x + 700, 60, 2.4, { pose: 'holdup', hover: 4, look: 'viewer' });
  A.go(W + 60, -20, 2.4, { pose: 'holdup', hover: 4 });
  const tracks = [A];
  if (two(c)) {
    const B = kid(other(c, who)).gone(2).at(-40, GROUND.front, { layer: 'front', hidden: false }).go(x + 200, GROUND.front, runT(x + 240, 'front'), { pose: 'run' });
    B.hold(1.5, { pose: 'point', look: 'up', emote: '!' }).go(x + 600, GROUND.front, runT(400, 'front'), { pose: 'run' }).hold(1.2, { pose: 'wave', look: 'up' }).go(W + 40, GROUND.front, runT(W - x - 560, 'front'));
    tracks.push(B);
    // the others run after it too
    others(c, who).slice(1).forEach((w, i) => tracks.push(copy(c, B, w, -44 * (i + 1), 0.4 * (i + 1))));
  }
  return ep('umbrellafloat', ...tracks);
});

// — snowball fight ——————————————————————————————————————————————————
def('snowballs', (c) => (two(c) && (c.snowy || c.season === 'winter') ? 4 : 0), (c) => {
  if (!two(c)) return null; // a game for two or more
  const l = pick(c.r, ['near', 'front', 'front'] as Layer[]);
  const g = GROUND[l];
  const xa = openX(c, l, 140, 380);
  const xb = openX(c, l, 880, 1140);
  const a = pick(c.r, c.kids);
  const A = kid(a).at(xa, g, { layer: l, ride: 'snowpile', face: 1 });
  const B = kid(other(c, a)).at(xb, g, { layer: l, ride: 'snowpile', face: -1 });
  A.hold(0.8, { pose: 'crouch', face: 1 });
  B.hold(0.8, { pose: 'crouch', face: -1 });
  const balls: T[] = [];
  for (let i = 0; i < 5; i++) {
    const fromA = i % 2 === 0;
    const [K, R] = fromA ? [A, B] : [B, A];
    const sb = thing(`sb${i}`, 'snowball').gone(K.t + 0.4);
    K.hold(0.45, { pose: 'throw', ride: null, face: (fromA ? 1 : -1) as 1 | -1 });
    R.hold(0.45, { pose: 'crouch', ride: 'snowpile', face: (fromA ? -1 : 1) as 1 | -1 });
    sb.at(fromA ? xa + 10 : xb - 10, g - 26 * k(l), { layer: l, hidden: false }).go(fromA ? xb - 4 : xa + 4, g - 22 * k(l), 1.1, { arc: 90 * k(l) });
    sb.hold(0.05, { hidden: true });
    K.hold(1.1, { pose: 'crouch', ride: 'snowpile', expr: 'grin' });
    const hit = c.r() < 0.5;
    R.hold(1.1, { pose: hit ? 'idle' : 'crouch', ride: hit ? null : 'snowpile', fx: undefined }).hold(0.01, { fx: 'snow', emote: hit ? 'ha' : undefined, expr: hit ? 'laugh' : undefined });
    balls.push(sb);
  }
  A.hold(1.6, { pose: 'cheer', ride: null, emote: 'star', expr: 'laugh' });
  B.hold(1.6, { pose: 'cheer', ride: null, emote: 'heart', expr: 'laugh' });
  A.go(-OFF(l), g, runT(xa + OFF(l), l), { pose: 'run' });
  B.go(W + OFF(l), g, runT(W - xb + OFF(l), l), { pose: 'run' });
  // the rest get a snow fort on one side or the other
  const forts = rest(c, a, other(c, a)).map((w, i) => {
    const side = i % 2 ? B : A;
    return copy(c, side, w, (side === A ? -1 : 1) * 40 * k(l) * (1 + Math.floor(i / 2)));
  });
  return ep('snowballs', A, B, ...balls, ...forts);
});

// — build a snowman ——————————————————————————————————————————————————
def('snowman', (c) => (c.snowy || c.season === 'winter' ? 3 : 0), (c) => {
  const l = pick(c.r, ['mid', 'near', 'front'] as Layer[]);
  const g = GROUND[l];
  const sx = openX(c, l, 220, 1060);
  const A = kid(lead(c)).at(-OFF(l), g, { layer: l });
  A.go(sx - 30 * k(l), g, walkT(sx + OFF(l), l), { pose: 'push' });
  const sm = thing('sm', 'snowman').gone(A.t).at(sx, g, { layer: l, hidden: false, variant: 1 });
  A.hold(0.3, { fx: 'snow' }).hold(1.6, { pose: 'crouch' });
  sm.hold(1.9).hold(2.2, { variant: 2, fx: 'snow' }).hold(3, { variant: 3, fx: 'sparkle' });
  A.hold(2.2, { pose: 'carry', expr: 'grin' }).hold(1.2, { pose: 'cheer', emote: 'star', fx: 'sparkle' }).hold(1.4, { pose: 'wave', look: 'viewer', emote: 'hi' });
  const tracks = [A, sm];
  others(c, A.who!).forEach((b, i) => {
    const B = kid(b).gone(1.8 + i * 0.6).at(W + OFF(l), g, { layer: l, hidden: false }).go(sx + (34 + 30 * i) * k(l), g, walkT(W - sx, l), { pose: 'carry' });
    B.until(A.t - 2.6, { pose: 'crouch' }).hold(1.2, { pose: 'cheer', emote: 'heart' }).hold(1.4, { pose: 'idle', face: -1 });
    B.go(W + OFF(l), g, walkT(W - sx, l));
    tracks.push(B);
  });
  A.go(-OFF(l), g, walkT(sx + OFF(l), l));
  sm.until(Math.max(...tracks.map((t) => t.t)));
  return ep('snowman', ...tracks);
});

// — sledding + snow angels ————————————————————————————————————————————
def('sled', (c) => (c.snowy || c.season === 'winter' ? 3 : 0), (c) => {
  const l = pick(c.r, ['mid', 'near', 'front'] as Layer[]);
  const g = GROUND[l];
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) - 40 : W + OFF(l) + 40;
  const x1 = dir > 0 ? W + OFF(l) + 40 : -OFF(l) - 40;
  const who = lead(c);
  const A = kid(who).at(x0, g, { layer: l, ride: 'sled' });
  const ax = openX(c, l, 360, 920);
  A.go(ax, g, Math.abs(ax - x0) / (230 * k(l)), { ease: 'out', fxEvery: 'snow', expr: 'laugh', emote: 'ha' });
  A.hold(0.4, { ride: null, pose: 'idle' }).hold(0.3, { pose: 'lie' }).hold(3, { pose: 'angel', expr: 'laugh', look: 'up' });
  A.hold(0.4, { pose: 'crouch', fx: 'snow' }).hold(1.2, { pose: 'wave', look: 'viewer', emote: 'heart' });
  A.go(x1, g, walkT(x1 - ax, l), { pose: 'walk' });
  const tracks = [A];
  others(c, who).forEach((w, i) => {
    const B = kid(w).gone(0.8 + i * 0.9).at(x0, g + i * 3 * k(l), { layer: l, hidden: false, ride: 'sled' });
    B.go(x1, g + i * 3 * k(l), Math.abs(x1 - x0) / ((230 + c.r() * 30) * k(l)), { ease: 'linear', fxEvery: 'snow', expr: 'laugh', emote: i ? 'ha' : '!' });
    tracks.push(B);
  });
  return ep('sled', ...tracks);
});

// — the leaf pile ————————————————————————————————————————————————————
def('leafpile', (c) => (c.season === 'autumn' && !c.wet ? 4 : 0), (c) => {
  const l = pick(c.r, ['near', 'front', 'front', 'mid'] as Layer[]);
  const g = GROUND[l];
  const px = openX(c, l, 260, 1020);
  const pile = thing('pile', 'leafpile').at(px, g, { layer: l });
  const first = pick(c.r, c.kids);
  const order = [first, ...others(c, first)].filter((id) => can(c, id, 'legs')); // legs: run and jump in
  if (!order.length) return null;
  const gap = order.length > 2 ? 2.4 : 3.2; // a bigger crowd piles in faster
  const tracks: T[] = [];
  order.forEach((w, i) => {
    const right = i % 2 === 1; // in turns from each side
    const x0 = right ? W + OFF(l) : -OFF(l);
    const t = kid(w).gone(i * gap).at(x0, g, { layer: l, hidden: false });
    const runup = px + (right ? 120 : -120) * k(l);
    t.go(runup, g, runT(runup - x0, l), { pose: 'run', expr: 'laugh' });
    t.hop(px, g - 10 * k(l), 0.7, 60 * k(l), { pose: 'jump', emote: i ? 'ha' : '!' });
    t.hold(1.4 + (order.length - 1 - i) * gap, { hidden: true, fx: 'leaves' });
    t.hop(px + (right ? 1 : -1) * 40 * (1 + Math.floor(i / 2)) * k(l), g, 0.6, 40 * k(l), { pose: 'cheer', fx: 'leaves', expr: 'laugh' });
    t.hold(1.5, { pose: 'dance', expr: 'laugh' }).hold(1.2, { pose: 'wave', look: 'viewer', emote: 'heart' });
    t.go(x0, g, runT(600, l), { pose: 'run' });
    tracks.push(t);
  });
  // anyone who can't jump in watches from the side
  const crowd = c.kids.filter((id) => !order.includes(id)).map((w, i) => watcher(w, px + fan(i) * 160 * k(l), 0.5, Math.max(...tracks.map((t) => t.t)) - 2));
  pile.until(Math.max(...tracks.map((t) => t.t)));
  return ep('leafpile', ...tracks, ...crowd, pile);
});

// — night: lanterns and fireflies —————————————————————————————————————
def('lanterns', (c) => (c.night ? 4 : 0), (c) => {
  const l = pick(c.r, ['mid', 'near', 'front'] as Layer[]);
  const g = GROUND[l];
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) : W + OFF(l);
  const x1 = dir > 0 ? W + OFF(l) : -OFF(l);
  const stop = openX(c, l, 300, 980);
  const tracks: T[] = [];
  c.kids.forEach((w, i) => {
    const t = kid(w).at(x0 - dir * i * 40 * k(l), g, { layer: l, held: i ? 'jar' : 'lantern' });
    t.go(stop - dir * i * 40 * k(l), g, walkT(stop - x0, l), { pose: 'walk', fxEvery: i ? 'fireflies' : undefined });
    t.hold(2.4, { pose: i ? 'holdup' : 'look', look: 'up', emote: i ? 'star' : undefined, fxEvery: 'fireflies' });
    t.hold(1.2, { pose: 'wave', look: 'viewer' });
    t.go(x1, g, walkT(x1 - stop, l), { pose: 'walk' });
    tracks.push(t);
  });
  return ep('lanterns', ...tracks);
});

// — night: lie back and watch for shooting stars ——————————————————————
def('stargaze', (c) => (c.night && !c.wet ? 2.5 : 0), (c) => {
  const l = pick(c.r, ['near', 'front'] as Layer[]);
  const g = GROUND[l];
  const x = openX(c, l, 200, 1000);
  const tracks: T[] = [];
  c.kids.forEach((w, i) => {
    const t = kid(w).at(-OFF(l) - i * 40, g, { layer: l }).go(x + i * 54 * k(l), g, walkT(x + OFF(l), l) + i * 0.3, { pose: 'walk' });
    t.hold(0.4, { pose: 'sit' }).hold(5, { pose: 'lie', look: 'up', face: (i ? -1 : 1) as 1 | -1 }).hold(1.6, { pose: 'lie', look: 'up', emote: i ? 'star' : '!' });
    t.hold(2.6, { pose: 'lie', expr: 'closed', emote: 'zzz' });
    tracks.push(t);
  });
  const end = Math.max(...tracks.map((t) => t.t));
  const star = thing('star', 'star').gone(end - 4.6).at(900, 40, { layer: l, hidden: false }).go(300, 140, 1.2, { ease: 'in' }).hold(0.05, { hidden: true });
  tracks.forEach((t) => t.until(end));
  return ep('stargaze', ...tracks, star);
});

// — summer at the lake: board riding in wetsuits ——————————————————————————
def('lakeboard', (c) => (c.kit === 'lake' && c.season === 'summer' ? 4 : c.season === 'summer' && !c.wet ? 0.5 : 0), (c) => {
  const l = pick(c.r, ['mid', 'near'] as Layer[]);
  const g = GROUND[l] - 4;
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) - 40 : W + OFF(l) + 40;
  const x1 = dir > 0 ? W + OFF(l) + 40 : -OFF(l) - 40;
  const tracks: T[] = [];
  c.kids.forEach((w, i) => {
    const t = kid(w).gone(i * 1.4).at(x0, g, { layer: l, ride: 'board', hidden: false });
    t.dress = { top: 'wetsuit', top1: '#1F2329', top2: '#FF7A2F', bottom: 'none', shoes: 'bare', hat: 'none', extras: [] };
    const mid = W / 2 + (i - 0.5) * 200;
    t.go(mid, g, Math.abs(mid - x0) / (150 * k(l)), { ease: 'linear', fxEvery: 'splash' });
    t.hop(mid + dir * 60 * k(l), g, 0.8, 40 * k(l), { spin: i ? 0 : 360 * dir, emote: i ? 'hi' : '!', expr: 'laugh', fx: 'splash' });
    t.go(x1, g, Math.abs(x1 - mid) / (150 * k(l)), { ease: 'linear', fxEvery: 'splash' });
    tracks.push(t);
  });
  return ep('lakeboard', ...tracks);
});

// — river tubing ————————————————————————————————————————————————————
def('tubing', (c) => (c.season === 'summer' && !c.wet && !c.night ? (c.kit === 'lake' ? 4 : 1.6) : 0), (c) => {
  const l = forcedLayer() ?? pick(c.r, ['mid', 'near', 'near', 'front'] as Layer[]);
  const g = GROUND[l] - 2;
  const dir = c.r() < 0.5 ? 1 : -1;
  const x0 = dir > 0 ? -OFF(l) - 50 : W + OFF(l) + 50;
  const x1 = dir > 0 ? W + OFF(l) + 50 : -OFF(l) - 50;
  const tracks: T[] = [];
  c.kids.forEach((w, i) => {
    const t = kid(w).gone(i * 2.2).at(x0, g + i * 3, { layer: l, ride: 'tube', hidden: false });
    const wd = c.chars[w].wardrobe;
    t.dress = wd.tops.includes('swim')
      ? { top: 'swim', top1: wd.colors[0], top2: wd.colors[1], bottom: 'none', shoes: 'bare', hat: 'none', extras: [] }
      : { top: 'rashguard', top1: wd.colors[0], top2: wd.colors[1], bottom: 'shorts', bottom1: wd.bottomColors[0], shoes: 'bare', hat: 'none', extras: [] };
    const mid = W / 2 + (c.r() - 0.5) * 300 - dir * i * 90;
    const sp = 34 * v(l); // drifting with the current
    t.go(mid, g + i * 3, Math.abs(mid - x0) / sp, { ease: 'linear', hover: 1.5, pose: 'sit', fxEvery: 'splash' });
    t.hold(2.4, { pose: 'sit', look: 'viewer', hover: 1.5, expr: 'grin', emote: i ? 'heart' : 'hi' });
    t.go(x1, g + i * 3, Math.abs(x1 - mid) / sp, { ease: 'linear', hover: 1.5, pose: i ? 'sit' : 'dangle', expr: 'laugh', fxEvery: 'splash' });
    tracks.push(t);
  });
  return ep('tubing', ...tracks);
});

// — water balloons ————————————————————————————————————————————————————
def('waterballoons', (c) => (two(c) && c.season === 'summer' && !c.wet ? 2 : 0), (c) => {
  if (!two(c)) return null; // a game for two or more
  const l = pick(c.r, ['near', 'front'] as Layer[]);
  const g = GROUND[l];
  const xa = openX(c, l, 160, 380);
  const xb = openX(c, l, 860, 1100);
  const a = pick(c.r, c.kids);
  const A = kid(a).at(-OFF(l), g, { layer: l }).go(xa, g, runT(xa + OFF(l), l));
  const B = kid(other(c, a)).at(W + OFF(l), g, { layer: l }).go(xb, g, walkT(W + OFF(l) - xb, l));
  const s = Math.max(A.t, B.t);
  A.until(s, { face: 1 });
  B.until(s, { face: -1, pose: 'idle', look: 'viewer' });
  A.hold(0.5, { pose: 'throw', expr: 'grin' });
  B.hold(0.5);
  const wb = thing('wb', 'waterballoon').gone(s + 0.4).at(xa + 8, g - 30 * k(l), { layer: l, hidden: false }).go(xb, g - 26 * k(l), 1.2, { arc: 110 * k(l) }).hold(0.05, { hidden: true });
  A.hold(1.2, { pose: 'idle' });
  B.hold(1.2).hold(1.4, { pose: 'idle', fx: 'splash', expr: 'o', emote: 'sweat' });
  A.hold(1.4, { pose: 'dance', expr: 'laugh', emote: 'ha' });
  B.go(xa + 30 * k(l), g, runT(xb - xa, l), { pose: 'run', emote: '!' });
  A.go(-OFF(l), g, runT(xa + OFF(l), l) * 0.9, { pose: 'run', expr: 'laugh' });
  B.go(-OFF(l), g, runT(xa + OFF(l), l), { pose: 'run' });
  // the rest were in on it: they laugh with the thrower and run too
  const gang = rest(c, a, other(c, a)).map((w, i) => copy(c, A, w, -34 * k(l) * (i + 1), 0.1 * (i + 1)));
  return ep('waterballoons', A, B, wb, ...gang);
});

// — a present to open ————————————————————————————————————————————————
def('present', (c) => (c.special && /birthday$|christmas/.test(c.special.kind) && c.special.intensity === 'full' ? 4 : 0), (c) => {
  const l: Layer = 'front';
  const g = GROUND[l];
  const px = openX(c, l, 200, 1080);
  const gift = thing('gift', 'present').at(px, g - 12, { layer: l, variant: 0 });
  const tracks: T[] = [];
  // round the gift, in turns from each side
  const side = (i: number) => (i % 2 ? 1 : -1);
  c.kids.forEach((w, i) => {
    const t = kid(w).at(side(i) > 0 ? W + 40 : -40, g, { layer: l }).go(px + side(i) * 40 * (1 + Math.floor(i / 2)), g, runT(side(i) > 0 ? W - px : px, l), { pose: 'run', expr: 'laugh' });
    tracks.push(t);
  });
  const s = Math.max(...tracks.map((t) => t.t));
  tracks.forEach((t, i) => t.until(s, { face: (-side(i)) as 1 | -1, pose: 'crouch' }).hold(1.2, { pose: 'crouch', emote: i ? '?' : '!' }));
  gift.until(s).hold(1.2, { wobble: true }).hold(4, { variant: 1, fx: 'confetti' });
  tracks.forEach((t, i) => t.hold(2.2, { pose: i ? 'dance' : 'cheer', expr: 'laugh', emote: i ? 'heart' : 'star' }).hold(1.8, { pose: 'wave', look: 'viewer' }));
  return ep('present', ...tracks, gift);
});

// — up, up and away (balloons) ————————————————————————————————————————
def('balloons', (c) => (c.special?.kind === 'birthday' ? 3 : c.wet ? 0 : 0.5), (c) => {
  const who = lead(c, 'flying');
  const x = openX(c, 'front', 160, 1100);
  const A = kid(who).at(-40, GROUND.front, { layer: 'front', held: 'balloons' }).go(x, GROUND.front, walkT(x + 40, 'front'), { pose: 'holdup' });
  A.hold(1, { pose: 'holdup', emote: '!', expr: 'o' });
  A.go(x + 60, 400, 3, { pose: 'holdup', hover: 4, expr: 'laugh' });
  A.hold(1.6, { pose: 'holdup', hover: 4, look: 'viewer', emote: 'heart' });
  A.go(x + 200, 120, 2.8, { pose: 'holdup', hover: 4 });
  A.go(x + 140, GROUND.front, 3.6, { pose: 'holdup', hover: 2, ease: 'inout' });
  A.hold(1.4, { pose: 'cheer', emote: 'star', held: null }).go(W + 40, GROUND.front, walkT(W - x, 'front'));
  return ep('balloons', A);
});

// — Halloween: trick-or-treat + broom flight ——————————————————————————————
def('trickortreat', (c) => (c.special?.kind === 'halloween' ? 5 : 0), (c) => {
  const l = pick(c.r, ['mid', 'near', 'front'] as Layer[]);
  const g = GROUND[l];
  const tracks: T[] = [];
  const stop = openX(c, l, 300, 980);
  c.kids.forEach((w, i) => {
    const t = kid(w).at(-OFF(l) - i * 40 * k(l), g, { layer: l, held: 'bucket' }).go(stop - i * 40 * k(l), g, walkT(stop + OFF(l), l), { pose: 'walk' });
    t.hold(1.8, { pose: 'cheer', emote: i ? 'boo' : 'star', expr: 'laugh', look: 'viewer' }).go(W + OFF(l), g, walkT(W - stop, l));
    tracks.push(t);
  });
  const flyers = c.kids.filter((id) => likes(c, id, 'flying'));
  if (flyers.length && c.r() < 0.7) {
    const b = kid(pick(c.r, flyers));
    b.id = 'broom';
    const y = 60 + c.r() * 80;
    b.gone(tracks[0].t - 1).at(W + 60, y, { layer: 'front', ride: 'broom', hidden: false }).go(-80, y + 40, 6, { hover: 5, fxEvery: 'sparkle', emote: 'ha' });
    tracks.push(b);
  }
  return ep('trickortreat', ...tracks);
});

// — sitting on the dock together —————————————————————————————————————
def('docksit', (c) => (c.dock ? 1.6 : 0), (c) => {
  const d = c.dock!;
  const tracks: T[] = [];
  c.kids.filter((id) => can(c, id, 'legs')).forEach((w, i) => { // legs: climb up, jump down
    const x = d.left + 60 + i * 60 + c.r() * 60;
    const t = kid(w).gone(i * 0.7).at(x, d.top + 52, { layer: 'behind', hidden: false, pose: 'climb' }).go(x, d.top + 1, 1, { pose: 'climb', ease: 'out' });
    t.hold(0.2, { layer: 'fore', pose: 'idle' });
    t.hold(3.5, { pose: 'dangle', look: 'viewer', emote: i ? 'heart' : 'hi' });
    t.hold(c.night ? 3 : 1.5, { pose: c.night ? 'sleep' : 'dangle', emote: c.night ? 'zzz' : undefined, expr: c.night ? 'closed' : 'smile' });
    t.hop(x + (i ? 50 : -50), GROUND.front, 0.8, 30, { pose: 'jump', layer: 'front' });
    t.go(i ? W + 40 : -40, GROUND.front, runT(640, 'front'), { pose: 'run' });
    tracks.push(t);
  });
  return ep('docksit', ...tracks);
});

// — a dance party ————————————————————————————————————————————————————
def('dance', () => 1.4, (c) => {
  const l = pick(c.r, ['mid', 'near', 'front'] as Layer[]);
  const g = GROUND[l];
  const x = openX(c, l, 200, 1080);
  const tracks: T[] = [];
  c.kids.forEach((w, i) => {
    const right = i % 2 === 1;
    const t = kid(w).at(right ? W + OFF(l) : -OFF(l), g, { layer: l }).go(x + (right ? 1 : -1) * 30 * (1 + Math.floor(i / 2)) * k(l), g, walkT(right ? W - x : x, l), { pose: 'walk' });
    tracks.push(t);
  });
  const s = Math.max(...tracks.map((t) => t.t));
  tracks.forEach((t, i) => {
    t.until(s, { face: (i % 2 ? -1 : 1) as 1 | -1 });
    t.hold(1.6, { pose: 'dance', emote: i ? undefined : 'music', expr: 'laugh' })
      .hold(1.2, { pose: i ? 'twirl' : 'cheer' })
      .hold(1.6, { pose: 'dance', emote: i ? 'music' : undefined })
      .hold(1, { pose: 'wave', look: 'viewer' });
    t.go(i % 2 ? W + OFF(l) : -OFF(l), g, walkT(640, l), { pose: 'walk' });
  });
  return ep('dance', ...tracks);
});

/* ------------------------------------------------------------------ */
/* the director's choice                                               */
/* ------------------------------------------------------------------ */

const recent: string[] = [];

export function pickEpisode(c: Ctx): Episode | null {
  // today's favorites: a stable per-day multiplier per game
  const fav = new Map(G.map((g) => [g.name, 0.35 + c.today() * 1.6]));
  const cands = G.map((g) => {
    let w = g.w(c);
    if (w <= 0) return { g, w: 0 };
    w *= fav.get(g.name)!;
    const ago = recent.indexOf(g.name);
    if (ago >= 0) w *= 0.08 + ago * 0.12;
    return { g, w };
  }).filter((x) => x.w > 0);
  for (let tries = 0; tries < 6 && cands.length; tries++) {
    const sum = cands.reduce((a, x) => a + x.w, 0);
    let roll = c.r() * sum;
    const chosen = cands.find((x) => (roll -= x.w) <= 0) ?? cands[cands.length - 1];
    try {
      const e = chosen.g.make(c);
      if (e && e.tracks.length) {
        recent.unshift(chosen.g.name);
        recent.length = Math.min(recent.length, 5);
        return e;
      }
    } catch (err) {
      console.warn('[earnkeep] sprite episode failed', chosen.g.name, err);
    }
    cands.splice(cands.indexOf(chosen), 1);
  }
  return null;
}

/** Run in and celebrate when someone finishes their habits. */
export function cheerEpisode(c: Ctx): Episode {
  const g = GROUND.front;
  const tracks: T[] = [];
  c.kids.forEach((w, i) => {
    // in from alternate sides, each a little further in than the last
    const right = i % 2 === 1;
    const j = Math.floor(i / 2) * 150;
    const x = right ? openX(c, 'front', 1050 - j, 1180 - j) : openX(c, 'front', 100 + j, 230 + j);
    const t = kid(w).at(right ? W + 40 : -40, g, { layer: 'front' }).go(x, g, runT(right ? W - x : x, 'front'), { pose: 'run', expr: 'laugh' });
    t.hop(x, g, 0.6, 30, { pose: 'cheer', fx: 'confetti', emote: i ? 'heart' : 'star' }).hold(1.4, { pose: 'cheer', expr: 'laugh' }).hop(x, g, 0.6, 30, { pose: 'cheer' });
    t.hold(1.2, { pose: 'wave', look: 'viewer' }).go(right ? W + 40 : -40, g, runT(right ? W - x : x, 'front'), { pose: 'run' });
    tracks.push(t);
  });
  return ep('cheer', ...tracks);
}

export const EPISODE_NAMES = G.map((g) => g.name);
export function makeEpisode(name: string, c: Ctx): Episode | null {
  return G.find((g) => g.name === name)?.make(c) ?? null;
}
