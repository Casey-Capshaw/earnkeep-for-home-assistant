// EarnKeep — world compositions built from the scene kit. Each world is a
// stack of depth layers (back → front) with atmospheric perspective: the
// further back, the closer the fill sits to the haze color.

import {
  rng, mix, fern, mushroom, moss, vine, bigLeaf, blades, trunk, roots,
  cobbles, arch, railing, shell, lantern, svgDoc, toDataUri, type Rand,
} from './scene';

export const SW = 1900; // scene width (room for parallax pans)
export const SH = 800;

export const FW = 1280; // front frame width = the viewport

/** Edge framing for the front layer: a thin root fringe along the top,
 * heavy silhouettes only in the four corners, short blades along the
 * bottom. Everything stays outside the content's 44px side gutters except
 * the soft tips. */
export function frame(r: Rand, p: Palette, kit: 'forest' | 'mushroom' | 'hall'): string {
  const cf = p.stops[4];
  const H = SH;
  let s = '';
  s += roots(r, 0, FW, 60, 4, 22, cf);
  s += roots(r, -20, 70, 10, 40, 150, cf);
  s += roots(r, FW - 70, FW + 20, 10, 40, 140, cf);
  if (kit !== 'hall') {
    // Corner mushrooms lean OUTWARD so their caps stay in the 48px gutters
    // and never cover desk content.
    s += mushroom(r, 18, H + 4, R(r, 200, 250), 64, cf, undefined, -16);
    s += mushroom(r, FW - 18, H + 4, R(r, 150, 200), 58, cf, undefined, 16);
    if (kit === 'mushroom') s += mushroom(r, 4, H + 4, 110, 44, cf, undefined, -10);
  } else {
    s += shell(r, 20, H + 6, 52, cf, hi(cf, p, 0.25));
    s += shell(r, FW - 18, H + 6, 60, cf, hi(cf, p, 0.25));
  }
  s += fern(r, -14, H + 5, 120, -Math.PI / 2 + 0.05, cf, -1);
  s += fern(r, FW + 14, H + 5, 120, -Math.PI / 2 - 0.05, cf, 1);
  s += moss(r, 10, H + 34, 110, 70, cf);
  s += moss(r, FW - 10, H + 34, 120, 76, cf);
  s += blades(r, 0, 300, H, 60, 6, 24, cf);
  s += blades(r, FW - 300, FW, H, 60, 6, 24, cf);
  return s;
}

export interface Palette {
  haze: string;
  stops: [string, string, string, string, string]; // l1..l4, front
  glow: string; // light-source color (lanterns, pods)
}

export interface WorldLayer {
  uri: string;
  depth: number; // 0 = infinitely far, 1 = at the glass
  drift: number; // px of idle sway
}

export interface World {
  back: WorldLayer[];
  front: WorldLayer;
}

export const hi = (c: string, p: Palette, t = 0.3) => mix(c, p.haze, t);
export const R = (r: Rand, a: number, b: number) => a + r() * (b - a);

/* ------------------------------------------------------------------ */

export function forestWorld(p: Palette, seed: number, mushroomy = false): World {
  const [c1, c2, c3, c4] = p.stops;
  const W = SW, H = SH;
  const L: string[] = [];

  // L1 — hazy giants: trunks, colossal mushrooms, mounds
  {
    const r = rng(seed + 1);
    let s = '';
    for (let i = 0; i < 9; i++) s += trunk(r, R(r, 0, W), R(r, 40, 120), H, c1);
    for (let i = 0; i < (mushroomy ? 5 : 3); i++) s += mushroom(r, R(r, 100, W - 100), H * 0.86, R(r, 260, 420), R(r, 160, 260), c1);
    for (let i = 0; i < 6; i++) s += moss(r, R(r, 0, W), H * 0.82, R(r, 300, 520), R(r, 120, 190), c1, hi(c1, p, 0.35));
    L.push(s);
  }
  // L2 — leaf fans, ferns, vines, mid mushrooms
  {
    const r = rng(seed + 2);
    let s = '';
    for (let i = 0; i < 4; i++) s += trunk(r, R(r, 0, W), R(r, 60, 140), H, c2);
    for (let i = 0; i < 14; i++) s += vine(r, R(r, 0, W), -10, R(r, 120, 340), c2);
    for (let i = 0; i < 7; i++) {
      const x = R(r, 0, W), y = H * R(r, 0.8, 0.9);
      for (let k = 0; k < 5; k++) s += bigLeaf(r, x, y, R(r, 90, 170), -Math.PI / 2 + (k - 2) * 0.38 + R(r, -0.1, 0.1), c2, hi(c2, p, 0.4));
    }
    for (let i = 0; i < (mushroomy ? 7 : 4); i++) s += mushroom(r, R(r, 0, W), H * 0.88, R(r, 140, 240), R(r, 90, 150), c2, hi(c2, p, 0.45));
    for (let i = 0; i < 10; i++) s += fern(r, R(r, 0, W), H * 0.9, R(r, 120, 220), -Math.PI / 2 + R(r, -0.5, 0.5), c2);
    for (let i = 0; i < 8; i++) s += moss(r, R(r, 0, W), H * 0.92, R(r, 200, 380), R(r, 90, 150), c2, hi(c2, p, 0.3));
    L.push(s);
  }
  // L3 — the "ground plane": cobbled path, moss, ferns, glowing pods
  {
    const r = rng(seed + 3);
    let s = '';
    s += roots(r, 0, W, 50, 30, 120, c3);
    for (let i = 0; i < 16; i++) s += vine(r, R(r, 0, W), 20, R(r, 80, 260), c3, r() < 0.5 ? { core: '#FFFFFF', halo: p.glow } : undefined);
    for (let i = 0; i < (mushroomy ? 10 : 6); i++) s += mushroom(r, R(r, 0, W), H * 0.93, R(r, 60, 150), R(r, 50, 100), c3, hi(c3, p, 0.4));
    for (let i = 0; i < 16; i++) s += fern(r, R(r, 0, W), H * 0.95, R(r, 70, 150), -Math.PI / 2 + R(r, -0.7, 0.7), c3);
    s += cobbles(r, 0, W, H * 0.93, c3);
    for (let i = 0; i < 12; i++) s += moss(r, R(r, 0, W), H * 0.95, R(r, 90, 220), R(r, 50, 90), c3, hi(c3, p, 0.28));
    L.push(s);
  }
  // L4 — near: dark vines, side mounds
  {
    const r = rng(seed + 4);
    let s = '';
    for (let i = 0; i < 12; i++) s += vine(r, R(r, 0, W), -10, R(r, 60, 200), c4);
    for (let i = 0; i < 10; i++) s += moss(r, R(r, 0, W), H + 10, R(r, 120, 260), R(r, 60, 110), c4, hi(c4, p, 0.18));
    s += blades(r, 0, W, H, 140, 20, 70, c4);
    L.push(s);
  }
  // FRONT — darkest framing silhouettes, viewport-sized and pinned to the
  // screen edges (it does not pan), so no control is ever covered.
  const fr = frame(rng(seed + 5), p, mushroomy ? 'mushroom' : 'forest');
  const depths = [0.1, 0.22, 0.38, 0.6];
  const drifts = [4, 6, 9, 12];
  const halos = [p.glow];
  return {
    back: L.map((s, i) => ({ uri: toDataUri(svgDoc(W, H, s, halos)), depth: depths[i], drift: drifts[i] })),
    front: { uri: toDataUri(svgDoc(FW, H, fr, halos)), depth: 0, drift: 4 },
  };
}

/* ------------------------------------------------------------------ */

export function hallWorld(p: Palette, seed: number): World {
  const [c1, c2, c3, c4] = p.stops;
  const W = SW, H = SH;
  const L: string[] = [];

  // L1 — far arcade, very hazy
  {
    const r = rng(seed + 1);
    let s = '';
    for (let x = -40; x < W; x += 230) s += arch(r, x, 230, 150, H, c1);
    for (let i = 0; i < 8; i++) s += shell(r, R(r, 0, W), H * 0.8, R(r, 70, 140), c1, hi(c1, p, 0.4));
    L.push(s);
  }
  // L2 — nearer arcade, lanterns, balustrade
  {
    const r = rng(seed + 2);
    let s = '';
    for (let x = -120; x < W; x += 420) s += arch(r, x, 330, 70, H, c2);
    s += railing(r, 0, W, H * 0.8, 60, c2);
    for (let i = 0; i < 6; i++) s += lantern(R(r, 60, W - 60), -10, R(r, 120, 260), c2, p.glow);
    for (let i = 0; i < 10; i++) s += fern(r, R(r, 0, W), H * 0.86, R(r, 100, 170), -Math.PI / 2 + R(r, -0.6, 0.6), hi(c2, p, 0.25));
    L.push(s);
  }
  // L3 — floor: shells, white ferns, cobbles, more lanterns
  {
    const r = rng(seed + 3);
    let s = '';
    s += roots(r, 0, W, 40, 20, 90, c3);
    for (let i = 0; i < 5; i++) s += lantern(R(r, 40, W - 40), 10, R(r, 60, 150), c3, p.glow);
    for (let i = 0; i < 9; i++) s += shell(r, R(r, 0, W), H * 0.9, R(r, 50, 100), c3, hi(c3, p, 0.35));
    for (let i = 0; i < 18; i++) s += fern(r, R(r, 0, W), H * 0.94, R(r, 70, 140), -Math.PI / 2 + R(r, -0.7, 0.7), hi(c3, p, 0.2));
    s += cobbles(r, 0, W, H * 0.93, c3);
    L.push(s);
  }
  // L4 — near columns and chains
  {
    const r = rng(seed + 4);
    let s = '';
    for (let x = 60; x < W; x += 640) {
      s += `<rect x="${x}" y="-10" width="46" height="${H + 20}" fill="${c4}"/>`;
      s += `<rect x="${x - 8}" y="${H * 0.36}" width="62" height="14" rx="4" fill="${c4}"/>`;
    }
    for (let i = 0; i < 8; i++) s += vine(r, R(r, 0, W), -10, R(r, 60, 180), c4);
    s += railing(r, 0, W, H + 4, 44, c4);
    L.push(s);
  }
  const fr = frame(rng(seed + 5), p, 'hall');
  const depths = [0.1, 0.22, 0.38, 0.6];
  const drifts = [3, 5, 8, 11];
  const halos = [p.glow];
  return {
    back: L.map((s, i) => ({ uri: toDataUri(svgDoc(W, H, s, halos)), depth: depths[i], drift: drifts[i] })),
    front: { uri: toDataUri(svgDoc(FW, H, fr, halos)), depth: 0, drift: 4 },
  };
}
