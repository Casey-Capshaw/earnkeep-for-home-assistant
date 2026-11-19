// EarnKeep — the living world behind the UI (layered-2D redesign,
// 2026-11-10). Renders a Day (see daily.ts) on a fixed 1280x800 stage —
// the Fire HD 10's CSS viewport — uniformly scaled to COVER whatever
// viewport it's in and anchored to the bottom (scale is exactly 1 on the
// tablet).
//
// Performance on the Fire HD 10:
//  • Each depth layer is generated once per day as SVG, then RASTERIZED
//    ONCE to a 1x PNG blob (rasterize() below). The layers are hazy
//    silhouettes, so 1x looks the same as 1.5x at ~44% of the GPU memory.
//  • At runtime only those bitmaps move (transform-only drift + a spring
//    pan when the dock view changes) — no SVG is re-painted per frame.
//  • Particles/critters/fireworks are a few dozen absolutely-positioned
//    divs animated with CSS transform/opacity.
//  • reduce-motion freezes it all unless Admin → Motion is "Always"
//    (lib/motion.ts; CSS rules scoped to .ek-motion-auto).

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useCalmMotion } from '../lib/motion';
import { rng } from './scene';
import { SW, SH, type WorldLayer } from './worlds';
import { daySeed, type Day, type ParticleKind } from './daily';
import { Bird, Snail, Beetle, Butterflies, CRITTER_CSS } from './critters';
import { Balloons, Fireworks, FESTIVE_CSS } from './celebrate';
import { SpriteSlot, SPRITES_CSS } from './sprites/Sprites';
import type { Layer } from './sprites/types';

export const STAGE_W = 1280;
export const STAGE_H = 800;
const PAN = 200; // px of camera travel per dock step at depth 1

/* ------------------------------------------------------------------ */
/* rasterize once                                                      */
/* ------------------------------------------------------------------ */

const rasterCache = new Map<string, Promise<string>>();

/** `url("data:image/svg+xml…")` → `url("blob:…png")` at 1x, cached. */
function rasterize(cssUrl: string, w: number, h: number): Promise<string> {
  const hit = rasterCache.get(cssUrl);
  if (hit) return hit;
  const p = new Promise<string>((resolve) => {
    const src = cssUrl.slice(5, -2); // strip url(" … ")
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d')!.drawImage(img, 0, 0, w, h);
        c.toBlob((b) => resolve(b ? `url("${URL.createObjectURL(b)}")` : cssUrl), 'image/png');
      } catch {
        resolve(cssUrl); // fall back to the live SVG
      }
    };
    img.onerror = () => resolve(cssUrl);
    img.src = src;
  });
  rasterCache.set(cssUrl, p);
  return p;
}

/** Drop yesterday's bitmaps when the day turns over. */
function pruneRasterCache(keep: Set<string>) {
  for (const [k, v] of rasterCache) {
    if (!keep.has(k)) {
      v.then((u) => u.startsWith('url("blob:') && URL.revokeObjectURL(u.slice(5, -2)));
      rasterCache.delete(k);
    }
  }
}

function useRaster(uri: string | null, w: number, h: number) {
  const [out, setOut] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setOut(null);
    if (uri) rasterize(uri, w, h).then((u) => live && setOut(u));
    return () => {
      live = false;
    };
  }, [uri, w, h]);
  return out;
}

/* ------------------------------------------------------------------ */
/* stage + layers                                                      */
/* ------------------------------------------------------------------ */

function useCoverScale() {
  const calc = () => Math.max(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return s;
}

export const Stage: React.FC<{ z?: number; children: React.ReactNode }> = ({ z, children }) => {
  const scale = useCoverScale();
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: z }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 0,
          width: STAGE_W,
          height: STAGE_H,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: '50% 100%',
        }}
      >
        {children}
      </div>
    </div>
  );
};

const LayerDiv: React.FC<WorldLayer & { pan: number; i: number; wind?: number }> = ({ uri, depth, drift, pan, i, wind = 1 }) => {
  const viewport = depth === 0;
  const img = useRaster(uri, viewport ? STAGE_W : SW, SH);
  return (
    <motion.div
      animate={{ x: -pan * depth * PAN }}
      transition={{ type: 'spring', stiffness: 38, damping: 13, mass: 1.3 }}
      style={
        viewport
          ? { position: 'absolute', inset: 0, pointerEvents: 'none' }
          : { position: 'absolute', left: -160, top: 0, width: SW, height: SH, pointerEvents: 'none', willChange: 'transform' }
      }
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: img ?? undefined,
          backgroundSize: '100% 100%',
          opacity: img ? 1 : 0,
          transition: 'opacity 600ms ease',
          animation: drift ? `ek-drift ${20 + i * 6}s ease-in-out ${-i * 3}s infinite alternate` : undefined,
          ['--drift' as string]: `${drift * wind}px`,
          willChange: 'transform',
        }}
      />
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/* particles                                                           */
/* ------------------------------------------------------------------ */

const LEAF_COLORS = ['#E8893A', '#D9663A', '#F0B44C', '#B9533F'];

const Particles: React.FC<{ kind: ParticleKind; count: number; color: string; wind: number; seed: number }> = ({ kind, count, color, wind, seed }) => {
  const ps = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: count }, (_, i) => ({
      i,
      left: r() * 110 - 5,
      top: kind === 'mote' || kind === 'firefly' ? 15 + r() * 80 : -10 - r() * 10,
      size: r(),
      dur: kind === 'rain' ? 0.55 + r() * 0.35 : kind === 'snow' ? 9 + r() * 8 : kind === 'firefly' ? 6 + r() * 6 : 10 + r() * 12,
      delay: -r() * 20,
      sway: (r() - 0.5) * 120,
    }));
  }, [kind, count, seed]);
  return (
    <>
      {ps.map((p) => {
        const common: React.CSSProperties = { position: 'absolute', left: `${p.left}%`, top: `${p.top}%`, pointerEvents: 'none', ['--wind' as string]: `${wind * 40}px`, ['--sway' as string]: `${p.sway}px` };
        if (kind === 'rain')
          return <div key={p.i} style={{ ...common, width: 1.5, height: 26 + p.size * 30, background: `linear-gradient(180deg, transparent, ${color})`, opacity: 0.7, animation: `ek-fall-fast ${p.dur}s linear ${p.delay}s infinite` }} />;
        if (kind === 'snow')
          return <div key={p.i} style={{ ...common, width: 3 + p.size * 5, height: 3 + p.size * 5, borderRadius: '50%', background: color, boxShadow: '0 0 4px rgba(255,255,255,.9)', animation: `ek-fall-slow ${p.dur}s linear ${p.delay}s infinite` }} />;
        if (kind === 'petal' || kind === 'leaf')
          return (
            <div
              key={p.i}
              style={{
                ...common,
                width: kind === 'leaf' ? 12 + p.size * 8 : 8 + p.size * 6,
                height: kind === 'leaf' ? 8 + p.size * 5 : 6 + p.size * 4,
                borderRadius: '80% 0 80% 0',
                background: kind === 'leaf' ? LEAF_COLORS[p.i % 4] : color,
                animation: `ek-flutter ${p.dur}s linear ${p.delay}s infinite`,
              }}
            />
          );
        const sz = kind === 'firefly' ? 4 + p.size * 3 : p.size < 0.2 ? 7 + p.size * 10 : 2.5 + p.size * 3.5;
        return (
          <div
            key={p.i}
            style={{
              ...common,
              width: sz,
              height: sz,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: `0 0 ${sz * 2.5}px ${sz}px ${color}`,
              opacity: 0,
              animation: `${kind === 'firefly' ? 'ek-firefly' : 'ek-mote'} ${p.dur}s ease-in-out ${p.delay}s infinite`,
              ['--dx' as string]: `${p.sway}px`,
              ['--dy' as string]: `${-60 - p.size * 160}px`,
            }}
          />
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* the scene (behind the UI) + the overlay (above the UI)              */
/* ------------------------------------------------------------------ */

export const WorldBackdrop: React.FC<{ day: Day; pan: number }> = ({ day, pan }) => {
  const reduced = useCalmMotion();
  const atm = day.atmosphere;
  const seed = daySeed(day.date);
  const back = day.world.back;

  useEffect(() => {
    pruneRasterCache(new Set([...back.map((l) => l.uri), day.world.front.uri, ...(day.festiveUri ? [day.festiveUri] : [])]));
  }, [back, day.world.front.uri, day.festiveUri]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: day.sky, pointerEvents: 'none' }}>
      <style>{SCENE_CSS + CRITTER_CSS + FESTIVE_CSS + SPRITES_CSS}</style>
      <Stage>
        <div
          style={{
            position: 'absolute',
            left: day.sun.x,
            top: day.sun.y,
            width: 1100,
            height: 1100,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(255,255,255,0.95) 0%, ${day.palette.glow}66 30%, transparent 62%)`,
            opacity: 0.4 + atm.shafts * 0.6,
            animation: 'ek-breathe 9s ease-in-out infinite',
          }}
        />
        {back.slice(0, 1).map((l, i) => (
          <LayerDiv key={l.uri.length + i} {...l} pan={pan} i={i} wind={atm.wind} />
        ))}
        <PannedSlot layer="far" depth={back[0]?.depth ?? 0.1} pan={pan} />
        {back.slice(1, 2).map((l, i) => (
          <LayerDiv key={l.uri.length + i + 1} {...l} pan={pan} i={i + 1} wind={atm.wind} />
        ))}
        <PannedSlot layer="mid" depth={back[1]?.depth ?? 0.22} pan={pan} />
        {atm.fog > 0 && <div style={{ position: 'absolute', left: '-20%', right: '-20%', top: '35%', height: '45%', background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.85), transparent 70%)', animation: 'ek-drift 30s ease-in-out infinite alternate', ['--drift' as string]: '80px' }} />}
        {atm.shafts > 0 &&
          [-210, -120, -40, 60, 150].map((dx, k) => (
            <div
              key={k}
              style={{
                position: 'absolute',
                top: -60,
                left: `calc(${day.sun.x} + ${dx}px)`,
                width: [46, 90, 28, 64, 38][k],
                height: 1000,
                transformOrigin: 'top center',
                transform: `rotate(${-14 + k * 6}deg)`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.25) 50%, transparent 85%)',
                opacity: atm.shafts,
                animation: `ek-shaft ${9 + k * 2.5}s ease-in-out ${-k * 3}s infinite`,
              }}
            />
          ))}
        {back.slice(2, 3).map((l, i) => (
          <LayerDiv key={l.uri.length + i + 2} {...l} pan={pan} i={i + 2} wind={atm.wind} />
        ))}
        <PannedSlot layer="near" depth={back[2]?.depth ?? 0.38} pan={pan} />
        {atm.fog > 0 && <div style={{ position: 'absolute', left: '-20%', right: '-20%', top: '55%', height: '50%', background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.7), transparent 70%)', animation: 'ek-drift 24s ease-in-out -6s infinite alternate', ['--drift' as string]: '-90px' }} />}
        {back.slice(3).map((l, i) => (
          <LayerDiv key={l.uri.length + i + 3} {...l} pan={pan} i={i + 3} wind={atm.wind} />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: atm.overlay }} />
        {!reduced && atm.particles.map((p, k) => <Particles key={`${p.kind}-${k}`} {...p} wind={atm.wind} seed={seed + k} />)}
      </Stage>
      {atm.lightning && !reduced && <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0, animation: 'ek-lightning 9s linear infinite' }} />}
    </div>
  );
};

/** Everything that sits ABOVE the panels: critters (z 6), festive
 * decorations + balloons + fireworks (z 6), and the dark front framing
 * (z 7). pointer-events: none throughout — it never eats a tap. */
export const WorldOverlay: React.FC<{ day: Day; pan: number; hour: number }> = ({ day, pan, hour }) => {
  const reduced = useCalmMotion();
  const seed = daySeed(day.date) % 997;
  const sp = day.special;
  const props = { ink: day.ink, accent: day.critterAccent, seed };
  return (
    <>
      <Stage z={4}>
        <SpriteSlot layer="behind" />
      </Stage>
      <Stage z={6}>
        <SpriteSlot layer="front" />
        {!reduced &&
          day.critters.map((c) => {
            if (c === 'bird') return <Bird key={c} {...props} hat={sp?.kind === 'birthday' ? sp.colors : undefined} />;
            if (c === 'snail') return <Snail key={c} {...props} />;
            if (c === 'beetle') return <Beetle key={c} {...props} />;
            return <Butterflies key={c} {...props} night={c === 'moths' || c === 'bats'} bats={c === 'bats'} />;
          })}
        {day.festiveUri && <FestiveLayer uri={day.festiveUri} twinkle={sp?.kind === 'christmas' || sp?.kind === 'halloween'} />}
        {sp && !reduced && /birthday|new-year|july-4|mothers|fathers/.test(sp.kind) && <Balloons colors={sp.colors} ink={day.ink} many={sp.intensity === 'full'} seed={seed} />}
        {sp && !reduced && sp.intensity === 'full' && (/new-year|july-4/.test(sp.kind) || (sp.kind === 'birthday' && hour >= 17)) && <Fireworks colors={sp.colors} seed={seed} />}
      </Stage>
      <Stage z={7}>
        <LayerDiv {...day.world.front} pan={pan} i={4} />
        <SpriteSlot layer="fore" />
      </Stage>
    </>
  );
};

/** A sprites level inside the parallax backdrop — pans with its layer. */
const PannedSlot: React.FC<{ layer: Layer; depth: number; pan: number }> = ({ layer, depth, pan }) => (
  <motion.div
    animate={{ x: -pan * depth * PAN }}
    transition={{ type: 'spring', stiffness: 38, damping: 13, mass: 1.3 }}
    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
  >
    <SpriteSlot layer={layer} />
  </motion.div>
);

const FestiveLayer: React.FC<{ uri: string; twinkle: boolean }> = ({ uri, twinkle }) => {
  const img = useRaster(uri, STAGE_W, STAGE_H);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: img ?? undefined,
        backgroundSize: '100% 100%',
        opacity: img ? 1 : 0,
        transition: 'opacity 600ms ease',
        animation: twinkle ? 'ek-lights 2.4s ease-in-out infinite alternate' : undefined,
      }}
    />
  );
};

const SCENE_CSS = `
@keyframes ek-drift { from { transform: translateX(calc(var(--drift) * -1)); } to { transform: translateX(var(--drift)); } }
@keyframes ek-breathe { 0%,100% { opacity: .8; } 50% { opacity: 1; } }
@keyframes ek-shaft { 0%,100% { opacity: .3; } 50% { opacity: .85; } }
@keyframes ek-mote { 0% { opacity: 0; transform: translate(0,0); } 15% { opacity: .95; } 50% { transform: translate(calc(var(--dx) * .6), calc(var(--dy) * .5)); } 85% { opacity: .95; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)); } }
@keyframes ek-fall-fast { from { transform: translate(0, 0) rotate(8deg); } to { transform: translate(var(--wind), 900px) rotate(8deg); } }
@keyframes ek-fall-slow { 0% { transform: translate(0,0); } 50% { transform: translate(calc(var(--sway) * .5 + var(--wind)), 450px); } 100% { transform: translate(calc(var(--wind) * 2), 900px); } }
@keyframes ek-flutter { 0% { transform: translate(0,0) rotate(0) scaleX(1); } 25% { transform: translate(calc(var(--sway) * .6), 220px) rotate(160deg) scaleX(.4); } 50% { transform: translate(calc(var(--wind) * 1.5), 450px) rotate(320deg) scaleX(1); } 75% { transform: translate(calc(var(--sway) * .8 + var(--wind) * 2), 680px) rotate(480deg) scaleX(.5); } 100% { transform: translate(calc(var(--wind) * 3), 900px) rotate(640deg) scaleX(1); } }
@keyframes ek-firefly { 0%,100% { opacity: 0; transform: translate(0,0); } 30% { opacity: 1; } 50% { transform: translate(calc(var(--dx) * .5), -30px); opacity: .3; } 70% { opacity: 1; } }
@keyframes ek-lightning { 0%, 88%, 92%, 95%, 100% { opacity: 0; } 89% { opacity: .75; } 93.5% { opacity: .5; } }
@keyframes ek-lights { from { opacity: .85; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .ek-motion-auto, .ek-motion-auto * { animation: none !important; } }
`;
