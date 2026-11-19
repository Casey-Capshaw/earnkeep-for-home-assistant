// EarnKeep — the family's Sprites at play in the living world.
//
// <SpritesProvider> (in App) runs the director: it reads each family
// member's character file (members without one don't appear), dresses the
// sprites for the day, measures where the panels are, and keeps picking
// play "episodes" (episodes.ts) — together or apart, at every depth level
// of the world. Sprites are matched to members by member id.
// <SpriteSlot layer=…> is placed once per level: far/mid/near inside the
// parallax backdrop (between its layers, panning with them), behind under
// the panels, front over them, fore over the dark front framing.
// Everything is pointer-events: none and transform-animated; with calm
// motion (lib/motion.ts) the sprites stay home.

import React, { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useStore } from '../../store';
import { useCalmMotion } from '../../lib/motion';
import { rng } from '../scene';
import { daySeed, type Day } from '../daily';
import { Engine, LAYER_S, type Seg } from './engine';
import { Sprite, SPRITE_CSS, RIG, STRIDE } from './Sprite';
import { EmoteBubble, FxBurst, PROPS_CSS, RIDES, RideItem, ThingItem } from './props';
import { CHAIR_SEAT_Y, Wheelchair, usesChair } from './aids';
import { outfitFor } from './wardrobe';
import { resolveSprite, validateSprite, type Character } from './traits';
import { pickEpisode, cheerEpisode, makeEpisode, type Ctx, type Rect } from './episodes';
import type { Expr, Layer, Outfit, Pose } from './types';

interface SpritesCtx {
  engine: Engine;
  chars: Record<string, Character>;
  outfits: Record<string, Outfit>;
  wind: boolean;
}
const Ctx_ = createContext<SpritesCtx | null>(null);

/* ------------------------------------------------------------------ */
/* director                                                            */
/* ------------------------------------------------------------------ */

/** Panels (Ornate, data-ek-surface) in 1280×800 stage coordinates. */
function measure(root: HTMLElement | null): { cards: Rect[]; dock: Rect | null } {
  if (!root) return { cards: [], dock: null };
  const rr = root.getBoundingClientRect();
  const scale = Math.max(rr.width / 1280, rr.height / 800);
  const sx = rr.left + (rr.width - 1280 * scale) / 2;
  const sy = rr.top + rr.height - 800 * scale;
  const cards: Rect[] = [];
  let dock: Rect | null = null;
  root.querySelectorAll<HTMLElement>('[data-ek-surface]').forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.width < 2) return;
    const r = { left: (b.left - sx) / scale, top: (b.top - sy) / scale, right: (b.right - sx) / scale, bottom: (b.bottom - sy) / scale };
    if (el.dataset.ekSurface === 'dock') dock = r;
    else if (r.right - r.left > 260 && r.bottom - r.top > 160) cards.push(r);
  });
  cards.sort((a, b) => a.left - b.left);
  return { cards, dock };
}

export const SpritesProvider: React.FC<{ day: Day; rootRef: React.RefObject<HTMLElement>; children: React.ReactNode }> = ({ day, rootRef, children }) => {
  const calm = useCalmMotion();
  const family = useStore((s) => s.family);
  const weatherLive = useStore((s) => s.weather);
  const confetti = useStore((s) => s.confetti);
  const view = useStore((s) => s.activeView);
  const engine = useMemo(() => new Engine(), []);
  const seed = daySeed(day.date);
  const hour = day.date.getHours();
  const weather = (new URLSearchParams(location.search).get('ekweather') || weatherLive || 'sunny') as Ctx['weather'];

  // only members with a character file appear, keyed by member id
  const chars = useMemo(() => {
    const out: Character[] = [];
    for (const m of family) {
      if (!m.sprite) continue;
      const v = validateSprite(m.sprite);
      if (v.sprite) out.push(resolveSprite(v.sprite, m.id));
      else if (!warnedInvalid.has(m.id)) {
        warnedInvalid.add(m.id);
        console.warn('sprite: invalid character on member', m.id, v.errors);
      }
    }
    return out;
  }, [family]);
  const kids = chars.map((c) => c.id);
  const kidsKey = kids.join(',');
  const charsById = useMemo(() => Object.fromEntries(chars.map((c) => [c.id, c])) as Record<string, Character>, [chars]);

  const outfits = useMemo(() => {
    const ctx = { season: day.season, weather, special: day.special, hour, kit: day.kit };
    return Object.fromEntries(chars.map((c) => [c.id, outfitFor(c, seed, ctx, rng)])) as Record<string, Outfit>;
    // dress changes at the half-day and at bedtime, and with the weather
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars, seed, weather, hour < 13, hour >= 19 || hour < 6, day.special?.kind, day.season, day.kit]);

  // the freshest world facts for the director (read at pick time)
  const facts = useRef({ day, weather, hour, kids, chars: charsById, outfits });
  facts.current = { day, weather, hour, kids, chars: charsById, outfits };

  const makeCtx = (salt: number): Ctx | null => {
    const f = facts.current;
    if (!f.kids.length) return null;
    const m = measure(rootRef.current);
    const night = f.hour >= 19 || f.hour < 6 || f.weather === 'clear-night';
    return {
      r: rng(seed * 131 + salt * 7919 + Math.floor(Math.random() * 1e6)),
      today: rng(seed * 17 + 3),
      kids: f.kids,
      chars: f.chars,
      season: f.day.season,
      weather: f.weather,
      hour: f.hour,
      night,
      wet: /rain|pouring|lightning|hail/.test(f.weather),
      snowy: /snow/.test(f.weather) || f.day.season === 'winter',
      windy: /windy/.test(f.weather),
      special: f.day.special,
      kit: f.day.kit,
      cards: m.cards,
      dock: m.dock,
      outfits: f.outfits,
    };
  };

  useEffect(() => {
    if (calm || !kidsKey) {
      engine.stop();
      return;
    }
    let timer = 0;
    let n = 0;
    const next = () => {
      const ctx = makeCtx(++n);
      const forced = new URLSearchParams(location.search).get('eksprites'); // dev: ?eksprites=<game>
      const ep = ctx ? (forced ? makeEpisode(forced, ctx) : null) ?? pickEpisode(ctx) : null;
      if (ep) engine.play(ep);
      else timer = window.setTimeout(next, 4000);
    };
    engine.onDone = () => {
      // a breather between games: mostly short, sometimes a quiet minute
      const r = Math.random();
      timer = window.setTimeout(next, r < 0.7 ? 1500 + r * 6000 : 12000 + r * 30000);
    };
    timer = window.setTimeout(next, 2500);
    return () => {
      window.clearTimeout(timer);
      engine.onDone = null;
      engine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calm, kidsKey, seed, engine]);

  // a new dock view moves the panels: drop the current game (its ledges
  // and corners belong to the old layout) and start fresh once it settles
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    if (calm || !kidsKey || !engine.ep) return;
    engine.clear();
    const t = window.setTimeout(() => engine.onDone?.(), 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // a kid finished a set of habits → whoever's around runs in to cheer
  useEffect(() => {
    if (!confetti || calm || !kidsKey) return;
    const ctx = makeCtx(999);
    if (ctx) engine.play(cheerEpisode(ctx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confetti]);

  const value = useMemo(() => ({ engine, chars: charsById, outfits, wind: day.atmosphere.wind > 1.2 }), [engine, charsById, outfits, day.atmosphere.wind]);
  return <Ctx_.Provider value={value}>{children}</Ctx_.Provider>;
};

/* ------------------------------------------------------------------ */
/* level slots + actors                                                */
/* ------------------------------------------------------------------ */

function defaultPose(seg: Seg): Pose {
  if (seg.beat.pose) return seg.beat.pose;
  if (seg.ride) return RIDES[seg.ride].pose;
  if (seg.wings && seg.beat.hover !== undefined) return 'fly';
  const moving = Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y) > 4;
  return moving ? 'walk' : 'idle';
}

// invalid sprites warn once per member per page load, in production too
const warnedInvalid = new Set<string>();

const GO = new Set<Pose>(['run', 'ride', 'drive', 'skate', 'hang', 'climb', 'sword', 'throw', 'kick', 'push', 'fly', 'balance']);
const JOY = new Set<Pose>(['cheer', 'dance', 'twirl', 'jump', 'tuck']);
/** Each sprite's own range of faces (personality rest / go / joy), so they
 * read as themselves. */
function moodFor(c: Character, pose: Pose, seg: Seg): Expr {
  const m = c.personality;
  const pool = JOY.has(pose) ? m.joy : GO.has(pose) ? m.go : m.rest;
  return pool[Math.floor(seg.t0 * 7.3 + seg.from.x * 0.11) % pool.length];
}

/** Foot-speed matching: the gait cycle period that makes the planted foot
 * travel exactly as fast as the ground goes by (no skating). */
function cycleFor(pose: Pose, seg: Seg, sc: number): number | undefined {
  const dur = seg.t1 - seg.t0;
  const dist = Math.abs(seg.to.x - seg.from.x);
  if (dur <= 0 || dist < 4) return undefined;
  const stride = (pose === 'run' ? STRIDE.run : STRIDE.walk) * sc;
  return Math.max(0.2, Math.min(0.9, stride / (dist / dur)));
}

const KidActor: React.FC<{ id: string; seg: Seg; c: Character; outfit: Outfit; wind: boolean; engine: Engine }> = ({ id, seg, c, outfit, wind, engine }) => {
  const sc = LAYER_S[seg.layer] * seg.s * c.body.height;
  const pose = defaultPose(seg);
  const mine = useRef<HTMLDivElement | null>(null);
  const ride = seg.ride ? RIDES[seg.ride] : null;
  const moving = Math.abs(seg.to.x - seg.from.x) > 4;
  const wings = seg.wings ?? (pose === 'fly' ? outfit.wings : null);
  const expr = seg.beat.expr ?? moodFor(c, pose, seg);
  const cycle = cycleFor(pose, seg, sc);
  // a wheelchair user stays in their chair for everything done on the ground
  const chair = usesChair(c, pose, !!seg.ride);
  const chairEl = (layer: 'back' | 'front') =>
    chair && (
      <svg width={RIG.w} height={RIG.h} viewBox={`${-RIG.ox} ${-RIG.oy} ${RIG.w} ${RIG.h}`} style={{ position: 'absolute', left: -RIG.ox, top: -RIG.oy, overflow: 'visible' }}>
        <Wheelchair color={c.aids.mobility!.color} moving={moving} layer={layer} />
      </svg>
    );
  const rideEl = seg.ride && (
    <svg width={RIG.w} height={RIG.h} viewBox={`${-RIG.ox} ${-RIG.oy} ${RIG.w} ${RIG.h}`} style={{ position: 'absolute', left: -RIG.ox, top: -RIG.oy, overflow: 'visible' }}>
      <RideItem id={seg.ride} moving={moving} color={c.wardrobe.gearColors[0]} color2={c.wardrobe.gearColors[1]} />
    </svg>
  );
  return (
    <div
      ref={(el) => {
        if (el) {
          mine.current = el;
          engine.els.set(id, el);
          engine.heights.set(id, 60 * sc);
          engine.apply(id);
        } else {
          if (engine.els.get(id) === mine.current) engine.els.delete(id);
          mine.current = null;
        }
      }}
      style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: `0px ${-60 * sc}px`, willChange: 'transform' }}
    >
      <div style={{ position: 'absolute', transform: `scale(${sc})`, transformOrigin: '0 0' }}>
        {/* turning is a quick flip through the middle, not an instant mirror */}
        <div style={{ position: 'absolute', transform: `scaleX(${seg.face})`, transition: 'transform 150ms cubic-bezier(.4,0,.2,1.4)' }}>
          {ride && !ride.over && rideEl}
          {chairEl('back')}
          <div style={{ position: 'absolute', transform: `translateY(${chair ? CHAIR_SEAT_Y : (ride?.riderY ?? 0)}px)` }}>
            <Sprite character={c} outfit={outfit} pose={pose} expr={expr} look={seg.beat.look} held={seg.held} wings={wings} wind={wind} cycle={cycle} seated={chair} />
          </div>
          {chairEl('front')}
          {ride && ride.over && rideEl}
        </div>
      </div>
      {seg.beat.emote && (
        <div style={{ position: 'absolute', left: 0, top: -140 * sc - (ride ? -ride.riderY * sc : 0) }}>
          <EmoteBubble key={`${seg.t0}`} e={seg.beat.emote} />
        </div>
      )}
    </div>
  );
};

const ThingActor: React.FC<{ id: string; seg: Seg; engine: Engine }> = ({ id, seg, engine }) => {
  const mine = useRef<HTMLDivElement | null>(null);
  const sc = LAYER_S[seg.layer] * seg.s;
  const moving = Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y) > 4;
  const thing = engine.tracks.find((t) => t.track.id === id)!.track.thing!;
  return (
    <div
      ref={(el) => {
        if (el) {
          mine.current = el;
          engine.els.set(id, el);
          engine.apply(id);
        } else {
          if (engine.els.get(id) === mine.current) engine.els.delete(id);
          mine.current = null;
        }
      }}
      style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, willChange: 'transform' }}
    >
      <div style={{ position: 'absolute', transform: `scale(${sc})`, transformOrigin: '0 0' }}>
        <svg width={160} height={200} viewBox="-80 -120 160 200" style={{ position: 'absolute', left: -80, top: -120, overflow: 'visible' }}>
          <g style={seg.beat.wobble ? { animation: 'ek-tw-rot .22s ease-in-out infinite alternate', ['--b' as string]: '0deg', ['--a' as string]: '6deg' } : undefined}>
            {/* critters face where they're going; toys don't turn */}
            <g transform={thing === 'pal' ? `scale(${seg.face} 1)` : undefined}>
              <ThingItem id={thing} variant={seg.variant} moving={moving} />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
};

const SLOT_LOOK: Partial<Record<Layer, React.CSSProperties>> = {
  // opacity only — a filter on a full-stage layer would re-run every frame
  far: { opacity: 0.7 },
  mid: { opacity: 0.82 },
  near: { opacity: 0.94 },
};

export const SpriteSlot: React.FC<{ layer: Layer }> = ({ layer }) => {
  const c = useContext(Ctx_);
  const engine = c?.engine;
  useSyncExternalStore(engine?.subscribe ?? noopSub, engine?.getVersion ?? zero);
  if (!c || !engine || !engine.ep) return null;
  const items: React.ReactNode[] = [];
  const lines: React.ReactNode[] = [];
  for (const r of engine.tracks) {
    const seg = engine.seg(r.track.id);
    if (!seg || seg.layer !== layer || seg.hidden) continue;
    const id = r.track.id;
    if (r.track.who) {
      const ch = c.chars[r.track.who];
      if (!ch) continue; // a member's sprite was removed mid-game
      const o = { ...c.outfits[ch.id], ...(r.track.dress ?? {}) };
      items.push(<KidActor key={id} id={id} seg={seg} c={ch} outfit={o} wind={c.wind} engine={engine} />);
    } else {
      items.push(<ThingActor key={id} id={id} seg={seg} engine={engine} />);
      if (r.track.tether)
        lines.push(
          <line
            key={id}
            ref={(el) => {
              if (el) engine.tethers.set(id, el);
              else engine.tethers.delete(id);
            }}
            stroke="rgba(59,42,34,.75)"
            strokeWidth={layer === 'front' || layer === 'behind' || layer === 'fore' ? 0.9 : 0.6}
          />,
        );
    }
  }
  const bursts = engine.fx.filter((f) => f.layer === layer);
  if (!items.length && !bursts.length) return null;
  return (
    <div className="ek-sprites" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...SLOT_LOOK[layer] }}>
      {lines.length > 0 && (
        <svg width={1280} height={800} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          {lines}
        </svg>
      )}
      {items}
      {bursts.map((f) => (
        <FxBurst key={f.id} kind={f.kind} x={f.x} y={f.y} scale={f.scale} seed={f.id} />
      ))}
    </div>
  );
};

const noopSub = () => () => {};
const zero = () => 0;

export const SPRITES_CSS = SPRITE_CSS + PROPS_CSS;
