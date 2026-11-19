// EarnKeep — the Sprites' runtime. One requestAnimationFrame loop drives every
// actor of the running episode: positions are computed per frame from the
// beat timeline and written straight to each actor's transform (no React
// render per frame). React only re-renders at beat boundaries (pose, prop
// or level changes), via a tiny external store the level slots subscribe to.

import type { Beat, Episode, Fx, Layer, Pt, Track } from './types';

/** Size of a kid at each level (rig units → px). Second pass: 33% bigger
 * than the first (front ≈ 36 px tall) — too hard to see on the tablet. */
export const LAYER_S: Record<Layer, number> = { far: 0.113, mid: 0.16, near: 0.213, behind: 0.28, front: 0.28, fore: 0.29 };
/** Ground line (stage px) of each level. */
// Deep levels play in the strip below the panels (glimpsed between the
// nearer layers' ferns and grass); far is sky-only (see episodes.ts).
export const GROUND: Record<Layer, number> = { far: 740, mid: 741, near: 749, behind: 788, front: 788, fore: 791 };

export interface Seg {
  t0: number;
  t1: number;
  from: Pt;
  to: Pt;
  beat: Beat;
  face: 1 | -1;
  layer: Layer;
  s: number;
  hidden: boolean;
  /** sticky kid state */
  held: Beat['held'];
  ride: Beat['ride'];
  wings: Beat['wings'];
  variant?: number;
  /** a kid travelling on foot: ease in and out of the move (no instant starts) */
  trot: boolean;
}

export interface Resolved {
  track: Track;
  segs: Seg[];
  end: number;
}

export interface Live {
  idx: number; // current segment, -1 = before start, segs.length = done
  x: number;
  y: number;
  rot: number;
  /* weight (kids): velocity, lean into acceleration, squash & stretch */
  vx: number;
  vy: number;
  lean: number;
  sy: number; // vertical scale (1 = rest); sx is its inverse
  land: number; // time of the last landing, for the squash-and-settle
  lastT: number;
}

export interface FxItem {
  id: number;
  kind: Fx;
  x: number;
  y: number;
  layer: Layer;
  scale: number;
  born: number;
}

function resolve(track: Track): Resolved {
  const segs: Seg[] = [];
  let t = 0;
  let pos: Pt = { x: -200, y: 794 };
  let face: 1 | -1 = 1;
  let layer: Layer = 'front';
  let s = 1;
  let held: Beat['held'] = null;
  let ride: Beat['ride'] = null;
  let wings: Beat['wings'] = null;
  let variant: number | undefined;
  for (const b of track.beats) {
    const from = b.at ?? pos;
    const to = b.to ?? from;
    if (b.face) face = b.face;
    else if (Math.abs(to.x - from.x) > 3) face = to.x > from.x ? 1 : -1;
    if (b.layer) layer = b.layer;
    if (b.s !== undefined) s = b.s;
    if (b.held !== undefined) held = b.held;
    if (b.ride !== undefined) ride = b.ride;
    if (b.wings !== undefined) wings = b.wings;
    if (b.variant !== undefined) variant = b.variant;
    const trot = !!track.who && !b.arc && !b.swing && !ride && b.hover === undefined && (b.ease === undefined || b.ease === 'linear') && Math.abs(to.x - from.x) > 6 && Math.abs(to.y - from.y) < 3;
    segs.push({ t0: t, t1: t + b.dur, from, to, beat: b, face, layer, s, hidden: !!b.hidden, held, ride, wings, variant, trot });
    t += b.dur;
    pos = to;
  }
  return { track, segs, end: t };
}

const ease = (k: Beat['ease'], p: number) => {
  switch (k) {
    case 'linear':
      return p;
    case 'out':
      return 1 - (1 - p) * (1 - p);
    case 'in':
      return p * p;
    default:
      return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  }
};

export function sample(seg: Seg, t: number): { x: number; y: number; rot: number } {
  const b = seg.beat;
  const d = seg.t1 - seg.t0;
  const raw = d > 0 ? Math.min(1, Math.max(0, (t - seg.t0) / d)) : 1;
  let x: number, y: number;
  if (b.swing) {
    // circular arc around the pivot from `from` to `to`
    const P = b.swing;
    const a0 = Math.atan2(seg.from.x - P.x, seg.from.y - P.y);
    const a1 = Math.atan2(seg.to.x - P.x, seg.to.y - P.y);
    const r0 = Math.hypot(seg.from.x - P.x, seg.from.y - P.y);
    const r1 = Math.hypot(seg.to.x - P.x, seg.to.y - P.y);
    const p = ease('inout', raw);
    const a = a0 + (a1 - a0) * p;
    const r = r0 + (r1 - r0) * p;
    x = P.x + Math.sin(a) * r;
    y = P.y + Math.cos(a) * r;
  } else {
    let p: number;
    if (b.arc) p = raw;
    else if (seg.trot && d > 0) {
      // constant pace with a short push-off and a short settle (smoothstep ramps)
      const r = Math.min(0.28, d * 0.3) / d;
      const area = 1 - r;
      const ramp = (u: number) => u * u * 0.5 * r; // ∫ of a linear 0→1 speed ramp
      p = raw < r ? ramp(raw / r) / area : raw > 1 - r ? 1 - ramp((1 - raw) / r) / area : (r * 0.5 + (raw - r)) / area;
    } else p = ease(b.ease ?? (b.to ? 'inout' : 'linear'), raw);
    x = seg.from.x + (seg.to.x - seg.from.x) * p;
    y = seg.from.y + (seg.to.y - seg.from.y) * p;
    if (b.arc) y -= b.arc * 4 * raw * (1 - raw);
  }
  if (b.hover) y += Math.sin(t * 5.2) * b.hover;
  const rot = (b.rot ?? 0) + (b.spin ? b.spin * ease('inout', raw) : 0);
  return { x, y, rot };
}

type Listener = () => void;

export class Engine {
  ep: Episode | null = null;
  tracks: Resolved[] = [];
  live = new Map<string, Live>();
  els = new Map<string, HTMLElement>();
  /** per-actor body half-height (px) — squash pivots at the feet */
  heights = new Map<string, number>();
  tethers = new Map<string, SVGLineElement>();
  fx: FxItem[] = [];
  version = 0;
  t0 = 0;
  end = 0;
  private raf = 0;
  private listeners = new Set<Listener>();
  private fxSeq = 0;
  onDone: (() => void) | null = null;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = () => this.version;
  private bump() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  play(ep: Episode) {
    this.ep = ep;
    this.tracks = ep.tracks.map(resolve);
    this.end = Math.max(...this.tracks.map((r) => r.end));
    this.live = new Map(this.tracks.map((r) => [r.track.id, { idx: -1, x: -999, y: -999, rot: 0, vx: 0, vy: 0, lean: 0, sy: 1, land: -9, lastT: 0 }]));
    this.t0 = performance.now();
    this.bump();
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  clear() {
    this.ep = null;
    this.tracks = [];
    this.live.clear();
    this.fx = [];
    this.bump();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.clear();
  }

  seg(id: string): Seg | null {
    const r = this.tracks.find((t) => t.track.id === id);
    const l = this.live.get(id);
    if (!r || !l || l.idx < 0 || l.idx >= r.segs.length) return null;
    return r.segs[l.idx];
  }

  /** Write the actor's current transform (also used on mount). */
  apply(id: string) {
    const el = this.els.get(id);
    const l = this.live.get(id);
    if (!el || !l) return;
    const h = this.heights.get(id) ?? 0;
    const sy = l.sy;
    const sq = Math.abs(sy - 1) > 0.004 ? ` translateY(${(h * (1 - sy)).toFixed(2)}px) scale(${(1 / sy).toFixed(3)}, ${sy.toFixed(3)})` : '';
    el.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0) rotate(${(l.rot + l.lean).toFixed(1)}deg)${sq}`;
  }

  /** Weight: lean into acceleration, stretch in the air, squash on landing,
   * and a little crouch of anticipation before a jump. */
  private weigh(l: Live, r: Resolved, idx: number, sg: Seg, p: { x: number; y: number }, t: number) {
    const dt = Math.max(0.001, Math.min(0.1, t - l.lastT));
    l.lastT = t;
    if (l.x < -900) return; // first frame
    const vx = (p.x - l.x) / dt;
    const vy = (p.y - l.y) / dt;
    const sc = LAYER_S[sg.layer] * sg.s;
    const grounded = !sg.beat.arc && !sg.beat.swing && sg.beat.hover === undefined && !sg.ride && !sg.beat.spin;
    // lean: forward while speeding up, back while braking (smoothed)
    const ax = (vx - l.vx) / dt;
    const want = grounded ? Math.max(-9, Math.min(9, (ax / (sc * 2600)) * 9)) : 0;
    l.lean += (want - l.lean) * Math.min(1, dt * 9);
    l.vx = vx;
    // squash & stretch
    let sy = 1;
    if (sg.beat.arc && !sg.beat.spin) sy = 1 + Math.min(0.2, Math.abs(vy) / (sc * 2400));
    if (l.vy !== 0 && sg.beat.arc === undefined && r.segs[idx - 1]?.beat.arc && t - sg.t0 < dt * 1.5 && !sg.ride) {
      l.land = t; // just touched down
      if (!sg.beat.fx && !sg.hidden && (sg.layer === 'front' || sg.layer === 'near' || sg.layer === 'mid')) this.spawn('dust', p.x, p.y - 1, sg.layer, sc);
    }
    const since = t - l.land;
    if (since >= 0 && since < 0.34) sy = 1 - 0.26 * Math.exp(-since * 9) * Math.cos(since * 24);
    const next = r.segs[idx + 1];
    if (grounded && next?.beat.arc && sg.t1 - t < 0.13 && sg.t1 - t > 0) sy = Math.min(sy, 1 - 0.2 * (1 - (sg.t1 - t) / 0.13));
    l.sy += (sy - l.sy) * Math.min(1, dt * 30);
    l.vy = vy;
  }

  private spawn(kind: Fx, x: number, y: number, layer: Layer, scale: number) {
    this.fx.push({ id: ++this.fxSeq, kind, x, y, layer, scale, born: performance.now() });
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    if (!this.ep) return;
    const t = (now - this.t0) / 1000;
    let changed = false;
    for (const r of this.tracks) {
      const l = this.live.get(r.track.id)!;
      let idx = l.idx < 0 ? 0 : l.idx;
      while (idx < r.segs.length && t >= r.segs[idx].t1) idx++;
      if (idx !== l.idx) {
        // fire one-shot effects for every segment entered since last frame
        for (let k = l.idx < 0 ? 0 : l.idx + 1; k <= Math.min(idx, r.segs.length - 1); k++) {
          const sg = r.segs[k];
          if (sg.beat.fx && !sg.hidden) {
            const p = sample(sg, sg.t0);
            this.spawn(sg.beat.fx, p.x, p.y - 4, sg.layer, LAYER_S[sg.layer] * sg.s);
          }
        }
        l.idx = idx;
        changed = true;
      }
      if (idx < r.segs.length) {
        const sg = r.segs[idx];
        const p = sample(sg, t);
        if (r.track.who) this.weigh(l, r, idx, sg, p, t);
        l.x = p.x;
        l.y = p.y;
        l.rot = p.rot;
        if (sg.beat.fxEvery && !sg.hidden) {
          const per = sg.beat.fxEvery === 'bubbles' || sg.beat.fxEvery === 'seeds' ? 0.9 : sg.beat.fxEvery === 'sparkle' ? 0.35 : 0.6;
          const last = (l as Live & { lastFx?: number }).lastFx ?? -1;
          if (t - last >= per) {
            (l as Live & { lastFx?: number }).lastFx = t;
            const sc = LAYER_S[sg.layer] * sg.s;
            this.spawn(sg.beat.fxEvery, p.x + sg.face * 20 * sc, p.y - 100 * sc, sg.layer, sc);
            changed = true;
          }
        }
        this.apply(r.track.id);
      }
    }
    // tethers (kite strings, grappling ropes)
    for (const r of this.tracks) {
      const line = this.tethers.get(r.track.id);
      if (!line || !r.track.tether) continue;
      const a = this.live.get(r.track.id);
      const kid = this.live.get(r.track.tether);
      const ks = this.seg(r.track.tether);
      if (!a || !kid || !ks) continue;
      const sc = LAYER_S[ks.layer] * ks.s;
      const up = /hang|cheer|climb|holdup|catch|wave|fly/.test(ks.beat.pose ?? '');
      const hx = kid.x + ks.face * (up ? 9 : 14) * sc;
      const hy = kid.y + (up ? -78 : -30) * sc;
      line.setAttribute('x1', hx.toFixed(1));
      line.setAttribute('y1', hy.toFixed(1));
      line.setAttribute('x2', a.x.toFixed(1));
      line.setAttribute('y2', a.y.toFixed(1));
    }
    // retire old bursts
    const before = this.fx.length;
    this.fx = this.fx.filter((f) => now - f.born < 3600);
    if (this.fx.length !== before) changed = true;
    if (changed) this.bump();
    if (t > this.end + 0.05) {
      const done = this.onDone;
      this.clear();
      done?.();
    }
  };
}
