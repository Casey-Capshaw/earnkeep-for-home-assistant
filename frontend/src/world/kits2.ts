// EarnKeep — scene kit, part 2: daily landmarks + four more worlds
// (lakeside, crystal cave, garden ruins, canopy walkways). Original art.
//
// Visibility note: on the kiosk the desk cards cover the middle of the
// screen, so the world mostly reads in the top band (~0–100px), the bottom
// band (~710–800px), the side gutters, and faintly through the panels.
// Landmarks are therefore built TALL — they announce themselves in the top
// and bottom bands and loom through the glass in between.

import {
  rng, mix, fern, mushroom, moss, vine, blades, trunk, roots, cobbles, arch,
  lantern, leaf, spiral, blossom, accents, svgDoc, toDataUri, type Rand,
} from './scene';
import { SW, SH, frame, hi, R, type Palette, type World, type WorldLayer } from './worlds';

const f = (n: number) => n.toFixed(1);
const VIEW_X0 = 160; // scene x of the viewport's left edge on the Roles view

/* ------------------------------------------------------------------ */
/* extra primitives                                                    */
/* ------------------------------------------------------------------ */

function ridge(r: Rand, W: number, base: number, amp: number, n: number, fill: string) {
  let d = `M0 ${SH + 10} L0 ${f(base)}`;
  let px = 0, py = base;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * W;
    const y = base - amp * (0.3 + r() * 0.7);
    d += ` Q${f(px + (x - px) / 2)} ${f(Math.min(py, y) - r() * amp * 0.4)} ${f(x)} ${f(y)}`;
    px = x; py = y;
  }
  return `<path d="${d} L${W} ${SH + 10}Z" fill="${fill}"/>`;
}

export function reeds(r: Rand, x0: number, x1: number, base: number, count: number, hMin: number, hMax: number, fill: string) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = R(r, x0, x1), h = R(r, hMin, hMax), lean = R(r, -0.25, 0.25) * h;
    out += `<path d="M${f(x)} ${f(base)} Q${f(x + lean * 0.3)} ${f(base - h * 0.6)} ${f(x + lean)} ${f(base - h)}" fill="none" stroke="${fill}" stroke-width="${f(R(r, 2, 3.5))}" stroke-linecap="round"/>`;
    if (r() < 0.4) out += `<ellipse cx="${f(x + lean * 0.92)}" cy="${f(base - h * 0.92)}" rx="4" ry="${f(R(r, 10, 15))}" fill="${fill}" transform="rotate(${f(lean / h * 50)} ${f(x + lean * 0.92)} ${f(base - h * 0.92)})"/>`;
    else if (r() < 0.5) out += leaf(x, base - h * 0.3, -Math.PI / 2 + (r() < 0.5 ? -0.6 : 0.6), h * 0.5, 4, fill);
  }
  return out;
}

export function lilypads(r: Rand, x0: number, x1: number, y: number, count: number, fill: string, flower: string) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const cx = R(r, x0, x1), cy = y + R(r, 0, 40), rx = R(r, 16, 34), ry = rx * 0.32;
    out += `<path d="M${f(cx)} ${f(cy)} L${f(cx + rx)} ${f(cy - ry * 0.2)} A${f(rx)} ${f(ry)} 0 1 1 ${f(cx + rx * 0.7)} ${f(cy - ry * 0.75)}Z" fill="${fill}"/>`;
    if (r() < 0.25) out += blossom(cx - rx * 0.2, cy - ry * 0.6, 6, flower);
  }
  return out;
}

export function water(x0: number, x1: number, y: number, fill: string, line: string, r: Rand) {
  let out = `<rect x="${x0}" y="${f(y)}" width="${x1 - x0}" height="${SH}" fill="${fill}"/>`;
  for (let i = 0; i < 40; i++) {
    const lx = R(r, x0, x1), ly = R(r, y + 6, SH - 4), lw = R(r, 20, 90);
    out += `<path d="M${f(lx)} ${f(ly)} h${f(lw)}" stroke="${line}" stroke-width="2" stroke-linecap="round" opacity="${f(R(r, 0.3, 0.8))}"/>`;
  }
  return out;
}

export function crystals(r: Rand, cx: number, base: number, n: number, size: number, fill: string, facet: string, down = false) {
  let out = '';
  const dir = down ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = (r() - 0.5) * 1.1;
    const h = size * R(r, 0.45, 1);
    const w = h * R(r, 0.18, 0.28);
    const bx = cx + (r() - 0.5) * size * 0.7;
    const tx = bx + Math.sin(a) * h, ty = base + dir * Math.cos(a) * h;
    const px = Math.cos(a) * w, py = Math.sin(a) * w * -dir;
    const sx = bx + Math.sin(a) * h * 0.78, sy = base + dir * Math.cos(a) * h * 0.78;
    out += `<path d="M${f(bx - px)} ${f(base - py)} L${f(sx - px)} ${f(sy - py)} L${f(tx)} ${f(ty)} L${f(sx + px)} ${f(sy + py)} L${f(bx + px)} ${f(base + py)}Z" fill="${fill}"/>`;
    out += `<path d="M${f(bx)} ${f(base)} L${f(sx)} ${f(sy)} L${f(tx)} ${f(ty)} L${f(sx + px)} ${f(sy + py)} L${f(bx + px)} ${f(base + py)}Z" fill="${facet}" opacity=".55"/>`;
  }
  return out;
}

export function brokenColumn(r: Rand, x: number, base: number, h: number, w: number, fill: string) {
  let top = '';
  const steps = 5;
  for (let i = 0; i <= steps; i++) top += ` L${f(x + (w * i) / steps)} ${f(base - h + R(r, -18, 18))}`;
  let out = `<path d="M${f(x)} ${f(base + 10)}${top.replace(' L', ' L')} L${f(x + w)} ${f(base + 10)}Z" fill="${fill}"/>`;
  out += `<rect x="${f(x - w * 0.15)}" y="${f(base - 18)}" width="${f(w * 1.3)}" height="22" rx="3" fill="${fill}"/>`;
  for (let k = 1; k < 3; k++) out += `<path d="M${f(x + (w * k) / 3)} ${f(base - 20)} L${f(x + (w * k) / 3)} ${f(base - h + 24)}" stroke="${mix(fill, '#ffffff', 0.18)}" stroke-width="3" opacity=".6"/>`;
  return out;
}

/** Plank bridge hung on a catenary between two points. */
export function bridge(r: Rand, x0: number, x1: number, y: number, sag: number, fill: string) {
  const pts = (off: number) => {
    let d = '';
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, x = x0 + (x1 - x0) * t, yy = y + off + sag * 4 * t * (1 - t);
      d += `${i ? 'L' : 'M'}${f(x)} ${f(yy)}`;
    }
    return d;
  };
  let out = `<path d="${pts(-34)}" fill="none" stroke="${fill}" stroke-width="3"/>`;
  out += `<path d="${pts(0)}" fill="none" stroke="${fill}" stroke-width="3"/>`;
  const n = Math.round((x1 - x0) / 15);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, yy = y + sag * 4 * t * (1 - t);
    out += `<rect x="${f(x - 5)}" y="${f(yy - 2)}" width="10" height="${f(R(r, 8, 11))}" rx="2" fill="${fill}" transform="rotate(${f(R(r, -6, 6))} ${f(x)} ${f(yy)})"/>`;
    if (i % 3 === 0) out += `<path d="M${f(x)} ${f(yy)} L${f(x)} ${f(yy - 34)}" stroke="${fill}" stroke-width="2"/>`;
  }
  for (const x of [x0, x1]) out += `<rect x="${f(x - 7)}" y="${f(y - 60)}" width="14" height="80" rx="3" fill="${fill}"/>`;
  return out;
}

export function platform(_r: Rand, x: number, y: number, w: number, fill: string) {
  let out = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="12" rx="3" fill="${fill}"/>`;
  out += `<path d="M${f(x + 10)} ${f(y + 10)} L${f(x + w / 2)} ${f(y + 60)} L${f(x + w - 10)} ${f(y + 10)}" fill="none" stroke="${fill}" stroke-width="5"/>`;
  out += `<path d="M${f(x)} ${f(y - 28)} Q${f(x + w / 2)} ${f(y - 18)} ${f(x + w)} ${f(y - 28)}" fill="none" stroke="${fill}" stroke-width="2.5"/>`;
  for (let i = 0; i <= 4; i++) out += `<path d="M${f(x + (w * i) / 4)} ${f(y)} L${f(x + (w * i) / 4)} ${f(y - 26)}" stroke="${fill}" stroke-width="2.5"/>`;
  return out;
}

/* ------------------------------------------------------------------ */
/* landmarks                                                           */
/* ------------------------------------------------------------------ */

export type LandmarkKind = 'giant-tree' | 'waterfall' | 'rope-bridge' | 'stone-lantern' | 'crystal-arch' | 'lily-pond';
export const LANDMARKS: LandmarkKind[] = ['giant-tree', 'waterfall', 'rope-bridge', 'stone-lantern', 'crystal-arch', 'lily-pond'];

export function landmarkLayer(kind: LandmarkKind, p: Palette, seed: number): WorldLayer {
  const r = rng(seed * 7 + 13);
  const c = mix(p.stops[2], p.stops[3], 0.45);
  const lite = hi(c, p, 0.35);
  const H = SH;
  // pick a home inside the Roles-view viewport, favoring the side gutters
  const side = r() < 0.5;
  const x = VIEW_X0 + (side ? R(r, 40, 300) : R(r, 980, 1240));
  let s = '';
  switch (kind) {
    case 'giant-tree': {
      const w = R(r, 170, 230);
      s += trunk(r, x, w, H, c);
      for (let k = 0; k < 5; k++) {
        const dir = k % 2 ? 1 : -1;
        s += `<path d="M${f(x)} ${f(H * 0.82)} Q${f(x + dir * w * 0.9)} ${f(H * 0.9)} ${f(x + dir * w * R(r, 1.2, 1.9))} ${f(H + 10)} L${f(x + dir * w * 0.3)} ${f(H + 10)}Z" fill="${c}"/>`;
      }
      for (let k = 0; k < 4; k++) {
        const dir = k % 2 ? 1 : -1;
        const bx = x + dir * R(r, 220, 420);
        s += `<path d="M${f(x - 18)} ${f(R(r, 150, 260))} Q${f(x + dir * 120)} ${f(R(r, 60, 120))} ${f(bx)} ${f(R(r, 20, 70))}" fill="none" stroke="${c}" stroke-width="${f(R(r, 16, 26))}" stroke-linecap="round"/>`;
      }
      for (let k = 0; k < 16; k++) s += moss(r, x + R(r, -480, 480), R(r, 30, 90), R(r, 80, 160), R(r, 50, 90), c, lite);
      // a door-like hollow with a warm glow (someone lives here)
      s += `<circle cx="${f(x)}" cy="${f(H * 0.74)}" r="80" fill="url(#halo-${p.glow.slice(1)})"/>`;
      s += `<path d="M${f(x - 22)} ${f(H * 0.8)} L${f(x - 22)} ${f(H * 0.72)} Q${f(x)} ${f(H * 0.66)} ${f(x + 22)} ${f(H * 0.72)} L${f(x + 22)} ${f(H * 0.8)}Z" fill="${p.glow}"/>`;
      break;
    }
    case 'waterfall': {
      const w = R(r, 200, 280);
      s += `<path d="M${f(x - w / 2)} -10 L${f(x - w / 2 - 30)} ${f(H * 0.4)} L${f(x - w / 2 + 10)} ${f(H * 0.85)} L${f(x + w / 2 + 20)} ${f(H * 0.85)} L${f(x + w / 2 + 40)} ${f(H * 0.35)} L${f(x + w / 2)} -10Z" fill="${c}"/>`;
      for (let k = 0; k < 8; k++) s += moss(r, x + R(r, -w * 0.7, w * 0.7), R(r, 40, H * 0.8), R(r, 50, 110), R(r, 30, 60), c, lite);
      s += `<rect x="${f(x - 34)}" y="-10" width="68" height="${f(H * 0.88)}" fill="#FFFFFF" opacity=".85"/>`;
      for (let k = 0; k < 9; k++) s += `<path d="M${f(x - 30 + k * 7.5)} -10 L${f(x - 30 + k * 7.5)} ${f(H * 0.87)}" stroke="${mix(p.glow, '#A8D8F0', 0.5)}" stroke-width="2" opacity=".5"/>`;
      s += `<ellipse cx="${f(x)}" cy="${f(H * 0.9)}" rx="${f(w * 0.9)}" ry="34" fill="${mix('#BFE6F2', p.haze, 0.35)}"/>`;
      for (let k = 0; k < 10; k++) s += `<circle cx="${f(x + R(r, -90, 90))}" cy="${f(H * 0.86 + R(r, -20, 10))}" r="${f(R(r, 18, 40))}" fill="#FFFFFF" opacity=".6"/>`;
      break;
    }
    case 'rope-bridge': {
      const y = R(r, 70, 96);
      s += trunk(r, VIEW_X0 + 70, 120, H, c) + trunk(r, VIEW_X0 + 1210, 130, H, c);
      s += bridge(r, VIEW_X0 + 70, VIEW_X0 + 1210, y, R(r, 18, 36), c);
      for (let k = 0; k < 4; k++) s += lantern(VIEW_X0 + R(r, 200, 1100), y + 20, R(r, 20, 60), c, p.glow);
      break;
    }
    case 'stone-lantern': {
      const b = H * 0.95;
      s += `<rect x="${f(x - 70)}" y="${f(b - 40)}" width="140" height="60" rx="6" fill="${c}"/>`;
      s += `<rect x="${f(x - 26)}" y="${f(b - 300)}" width="52" height="270" fill="${c}"/>`;
      s += `<rect x="${f(x - 60)}" y="${f(b - 320)}" width="120" height="26" rx="5" fill="${c}"/>`;
      s += `<circle cx="${f(x)}" cy="${f(b - 380)}" r="120" fill="url(#halo-${p.glow.slice(1)})"/>`;
      s += `<rect x="${f(x - 50)}" y="${f(b - 430)}" width="100" height="110" rx="8" fill="${c}"/>`;
      s += `<path d="M${f(x - 28)} ${f(b - 330)} L${f(x - 28)} ${f(b - 400)} Q${f(x)} ${f(b - 425)} ${f(x + 28)} ${f(b - 400)} L${f(x + 28)} ${f(b - 330)}Z" fill="${p.glow}"/>`;
      s += `<path d="M${f(x - 120)} ${f(b - 420)} Q${f(x)} ${f(b - 470)} ${f(x + 120)} ${f(b - 420)} Q${f(x + 70)} ${f(b - 520)} ${f(x)} ${f(b - 540)} Q${f(x - 70)} ${f(b - 520)} ${f(x - 120)} ${f(b - 420)}Z" fill="${c}"/>`;
      s += spiral(x - 118, b - 428, 10, 1.1, 0, -1, c, 4) + spiral(x + 118, b - 428, 10, 1.1, Math.PI, 1, c, 4);
      s += `<circle cx="${f(x)}" cy="${f(b - 556)}" r="14" fill="${c}"/>`;
      for (let k = 0; k < 4; k++) s += moss(r, x + R(r, -80, 80), b + 10, R(r, 60, 110), R(r, 40, 70), c, lite);
      break;
    }
    case 'crystal-arch': {
      const cx = VIEW_X0 + 640, rad = R(r, 560, 640), cy = H + 80;
      for (let k = 0; k <= 22; k++) {
        const a = Math.PI + (k / 22) * Math.PI;
        const bx = cx + Math.cos(a) * rad, by = cy + Math.sin(a) * rad * 0.95;
        s += crystals(r, bx, by, 3, R(r, 70, 130), mix(c, p.glow, 0.25), '#FFFFFF');
      }
      s += `<circle cx="${f(cx)}" cy="${f(cy - rad * 0.95)}" r="160" fill="url(#halo-${p.glow.slice(1)})"/>`;
      break;
    }
    case 'lily-pond': {
      s += water(VIEW_X0 - 160, VIEW_X0 + 1440, H * 0.9, mix('#BFE6F2', p.haze, 0.3), '#FFFFFF', r);
      s += lilypads(r, VIEW_X0 - 100, VIEW_X0 + 1400, H * 0.9, 26, c, accents.bloom ?? '#FFFFFF');
      s += reeds(r, VIEW_X0 - 100, VIEW_X0 + 200, H * 0.92, 24, 60, 170, c) + reeds(r, VIEW_X0 + 1080, VIEW_X0 + 1400, H * 0.92, 24, 60, 170, c);
      break;
    }
  }
  return { uri: toDataUri(svgDoc(SW, SH, s, [p.glow])), depth: 0.3, drift: 0 };
}

/* ------------------------------------------------------------------ */
/* four more worlds                                                    */
/* ------------------------------------------------------------------ */

function pack(p: Palette, layers: string[], front: string, drifts = [4, 6, 9, 12]): World {
  const depths = [0.1, 0.22, 0.38, 0.6];
  return {
    back: layers.map((s, i) => ({ uri: toDataUri(svgDoc(SW, SH, s, [p.glow])), depth: depths[i], drift: drifts[i] })),
    front: { uri: toDataUri(svgDoc(1280, SH, front, [p.glow])), depth: 0, drift: 4 },
  };
}

export function lakeWorld(p: Palette, seed: number): World {
  const [c1, c2, c3, c4] = p.stops;
  const W = SW, H = SH;
  const waterC = mix('#BFE3F0', p.haze, 0.35);
  let a = '', b = '', c = '', d = '';
  { const r = rng(seed + 1); a += ridge(r, W, H * 0.6, 120, 7, c1); for (let i = 0; i < 40; i++) a += trunk(r, R(r, 0, W), R(r, 8, 18), H * 0.66, c1); a += water(0, W, H * 0.68, mix(waterC, p.haze, 0.4), '#FFFFFF', r); }
  { const r = rng(seed + 2); b += ridge(r, W, H * 0.72, 90, 6, c2); for (let i = 0; i < 12; i++) b += vine(r, R(r, 0, W), -10, R(r, 140, 320), c2); b += water(0, W, H * 0.78, waterC, '#FFFFFF', r); }
  { const r = rng(seed + 3); c += reeds(r, 0, W, H * 0.9, 120, 50, 180, c3); c += lilypads(r, 0, W, H * 0.84, 30, c3, accents.bloom ?? '#FFFFFF'); for (let i = 0; i < 8; i++) c += moss(r, R(r, 0, W), H * 0.97, R(r, 80, 180), R(r, 40, 70), c3, hi(c3, p, 0.3)); c += roots(r, 0, W, 40, 20, 90, c3); }
  { const r = rng(seed + 4); d += reeds(r, 0, W, H + 4, 90, 30, 110, c4); d += blades(r, 0, W, H, 100, 14, 50, c4); for (let i = 0; i < 10; i++) d += vine(r, R(r, 0, W), -10, R(r, 50, 160), c4); }
  return pack(p, [a, b, c, d], frame(rng(seed + 5), p, 'forest'), [3, 4, 7, 10]);
}

export function caveWorld(p: Palette, seed: number): World {
  const [c1, c2, c3, c4] = p.stops;
  const W = SW, H = SH;
  let a = '', b = '', c = '', d = '';
  { const r = rng(seed + 1); a += roots(r, 0, W, 50, 60, 220, c1); a += ridge(r, W, H * 0.75, 120, 9, c1); for (let i = 0; i < 10; i++) a += crystals(r, R(r, 0, W), H * R(r, 0.62, 0.75), 4, R(r, 90, 160), c1, '#FFFFFF'); }
  { const r = rng(seed + 2); b += roots(r, 0, W, 40, 50, 180, c2); for (let i = 0; i < 10; i++) b += crystals(r, R(r, 0, W), R(r, 10, 60), 3, R(r, 60, 120), mix(c2, p.glow, 0.2), '#FFFFFF', true); b += ridge(r, W, H * 0.86, 90, 8, c2); for (let i = 0; i < 10; i++) b += crystals(r, R(r, 0, W), H * 0.84, 5, R(r, 80, 150), mix(c2, p.glow, 0.25), '#FFFFFF'); }
  { const r = rng(seed + 3); c += roots(r, 0, W, 50, 20, 110, c3); c += cobbles(r, 0, W, H * 0.94, c3); for (let i = 0; i < 12; i++) c += crystals(r, R(r, 0, W), H * 0.95, 4, R(r, 50, 110), mix(c3, p.glow, 0.3), '#FFFFFF'); for (let i = 0; i < 6; i++) c += mushroom(r, R(r, 0, W), H * 0.95, R(r, 40, 90), R(r, 34, 60), c3, hi(c3, p, 0.4)); }
  { const r = rng(seed + 4); for (let x = 0; x < W; x += 640) { d += `<path d="M${x + 120} -10 Q${x + 200} ${H * 0.5} ${x + 110} ${H + 10} L${x + 40} ${H + 10} L${x + 40} -10Z" fill="${c4}"/>`; } d += blades(r, 0, W, H, 80, 10, 40, c4); for (let i = 0; i < 8; i++) d += crystals(r, R(r, 0, W), H + 4, 4, R(r, 40, 90), mix(c4, p.glow, 0.2), '#FFFFFF'); }
  return pack(p, [a, b, c, d], frame(rng(seed + 5), p, 'hall'));
}

export function ruinsWorld(p: Palette, seed: number): World {
  const [c1, c2, c3, c4] = p.stops;
  const W = SW, H = SH;
  const flower = accents.bloom ?? mix(p.glow, '#F4A8C0', 0.5);
  let a = '', b = '', c = '', d = '';
  { const r = rng(seed + 1); for (let x = 0; x < W; x += 300) { if (r() < 0.6) a += arch(r, x, 260, R(r, 180, 260), H, c1); else a += brokenColumn(r, x + 80, H * 0.85, R(r, 200, 380), 50, c1); } for (let i = 0; i < 8; i++) a += moss(r, R(r, 0, W), H * 0.85, R(r, 200, 360), R(r, 90, 140), c1, hi(c1, p, 0.35)); }
  { const r = rng(seed + 2); for (let i = 0; i < 7; i++) b += brokenColumn(r, R(r, 0, W), H * 0.9, R(r, 160, 420), R(r, 44, 70), c2); for (let i = 0; i < 12; i++) b += vine(r, R(r, 0, W), -10, R(r, 120, 300), c2); for (let i = 0; i < 10; i++) b += moss(r, R(r, 0, W), H * 0.92, R(r, 160, 300), R(r, 80, 130), c2, hi(c2, p, 0.3)); }
  { const r = rng(seed + 3); c += cobbles(r, 0, W, H * 0.93, c3); for (let i = 0; i < 14; i++) { const x = R(r, 0, W); c += moss(r, x, H * 0.95, R(r, 80, 160), R(r, 50, 90), c3); for (let k = 0; k < 5; k++) c += blossom(x + R(r, -60, 60), H * 0.95 - R(r, 30, 80), R(r, 5, 9), flower); } for (let i = 0; i < 10; i++) c += fern(r, R(r, 0, W), H * 0.95, R(r, 70, 140), -Math.PI / 2 + R(r, -0.6, 0.6), c3); c += roots(r, 0, W, 40, 20, 90, c3); }
  { const r = rng(seed + 4); for (let i = 0; i < 10; i++) d += moss(r, R(r, 0, W), H + 10, R(r, 120, 240), R(r, 60, 100), c4, hi(c4, p, 0.18)); for (let i = 0; i < 6; i++) { const bx = R(r, 0, W), by = H - R(r, 20, 40); d += `<rect x="${f(bx)}" y="${f(by)}" width="${f(R(r, 40, 80))}" height="60" rx="6" fill="${c4}" transform="rotate(${f(R(r, -20, 20))} ${f(bx)} ${f(by)})"/>`; } d += blades(r, 0, W, H, 90, 12, 50, c4); }
  return pack(p, [a, b, c, d], frame(rng(seed + 5), p, 'forest'));
}

export function canopyWorld(p: Palette, seed: number): World {
  const [c1, c2, c3, c4] = p.stops;
  const W = SW, H = SH;
  let a = '', b = '', c = '', d = '';
  { const r = rng(seed + 1); for (let i = 0; i < 14; i++) a += trunk(r, R(r, 0, W), R(r, 50, 110), H, c1); for (let i = 0; i < 6; i++) a += platform(r, R(r, 0, W), R(r, 200, 500), R(r, 90, 160), c1); for (let i = 0; i < 20; i++) a += moss(r, R(r, 0, W), R(r, 20, 120), R(r, 120, 260), R(r, 60, 120), c1, hi(c1, p, 0.35)); }
  { const r = rng(seed + 2); const xs = Array.from({ length: 6 }, () => R(r, 0, W)).sort((m, n) => m - n); for (const x of xs) b += trunk(r, x, R(r, 90, 150), H, c2); for (let i = 0; i < xs.length - 1; i++) b += bridge(r, xs[i], xs[i + 1], R(r, 260, 480), R(r, 20, 50), c2); for (let i = 0; i < 6; i++) b += lantern(R(r, 0, W), -10, R(r, 140, 300), c2, p.glow); }
  { const r = rng(seed + 3); for (let i = 0; i < 16; i++) c += vine(r, R(r, 0, W), -10, R(r, 100, 280), c3, r() < 0.4 ? { core: '#FFFFFF', halo: p.glow } : undefined); for (let i = 0; i < 4; i++) c += platform(r, R(r, 0, W), R(r, 600, 700), R(r, 120, 200), c3); for (let i = 0; i < 12; i++) c += moss(r, R(r, 0, W), H * 0.98, R(r, 100, 220), R(r, 50, 90), c3, hi(c3, p, 0.3)); }
  { const r = rng(seed + 4); for (let x = 0; x < W; x += 640) d += trunk(r, x + 60, 120, H, c4); for (let i = 0; i < 12; i++) d += vine(r, R(r, 0, W), -10, R(r, 60, 180), c4); d += blades(r, 0, W, H, 100, 14, 50, c4); }
  return pack(p, [a, b, c, d], frame(rng(seed + 5), p, 'forest'));
}
