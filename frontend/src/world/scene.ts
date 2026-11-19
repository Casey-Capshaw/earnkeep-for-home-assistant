// EarnKeep — procedural "hand-drawn" scene kit (original art, no assets).
// Every generator returns an SVG fragment STRING. Each depth layer is
// assembled into one SVG and rasterized once by the browser as a CSS
// background image, so at runtime the tablet only moves bitmaps around.

export type Rand = () => number;

export function rng(seed: number): Rand {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);
const between = (r: Rand, a: number, b: number) => a + r() * (b - a);

/* ---------------- color ---------------- */

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return `#${((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0')}`;
}

/* ---------------- seasonal accents ---------------- */

/** Set by the world builder before generating: snow caps (winter) and
 * blossoms (spring) are painted onto the kit's silhouettes. */
export const accents: { snow?: string; bloom?: string; leafTint?: string } = {};

/** Five-petal blossom. */
export function blossom(cx: number, cy: number, rad: number, fill: string) {
  let out = '';
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    out += `<circle cx="${f(cx + Math.cos(a) * rad * 0.6)}" cy="${f(cy + Math.sin(a) * rad * 0.6)}" r="${f(rad * 0.5)}" fill="${fill}"/>`;
  }
  return out + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad * 0.3)}" fill="#FFF3B0"/>`;
}

/* ---------------- primitives ---------------- */

/** Teardrop leaf from base (bx,by) pointing along angle a. */
export function leaf(bx: number, by: number, a: number, len: number, wid: number, fill: string) {
  const tx = bx + Math.cos(a) * len;
  const ty = by + Math.sin(a) * len;
  const px = Math.cos(a + Math.PI / 2) * wid;
  const py = Math.sin(a + Math.PI / 2) * wid;
  const mx = bx + Math.cos(a) * len * 0.45;
  const my = by + Math.sin(a) * len * 0.45;
  return `<path d="M${f(bx)} ${f(by)} Q${f(mx + px)} ${f(my + py)} ${f(tx)} ${f(ty)} Q${f(mx - px)} ${f(my - py)} ${f(bx)} ${f(by)}Z" fill="${fill}"/>`;
}

export function spiral(cx: number, cy: number, r0: number, turns: number, a0: number, dir: 1 | -1, stroke: string, w: number) {
  let d = '';
  const steps = Math.ceil(turns * 18);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + dir * t * turns * Math.PI * 2;
    const rr = r0 * (1 - t * 0.85);
    d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`;
  }
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;
}

/** Point + tangent on a quadratic bezier. */
function qpt(p0: number[], p1: number[], p2: number[], t: number) {
  const u = 1 - t;
  const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
  const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
  const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return { x, y, a: Math.atan2(dy, dx) };
}

/* ---------------- flora ---------------- */

/** Fern frond: curved stem, tapering leaflets both sides, curled tip. */
export function fern(r: Rand, x: number, y: number, len: number, ang: number, fill: string, bendDir = r() < 0.5 ? 1 : -1) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const px = -dy, py = dx;
  const bend = len * between(r, 0.15, 0.35) * bendDir;
  const p0 = [x, y];
  const p1 = [x + dx * len * 0.55 + px * bend, y + dy * len * 0.55 + py * bend];
  const p2 = [x + dx * len + px * bend * 1.9, y + dy * len + py * bend * 1.9];
  let out = `<path d="M${f(p0[0])} ${f(p0[1])} Q${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])}" fill="none" stroke="${fill}" stroke-width="${f(Math.max(2, len / 70))}" stroke-linecap="round"/>`;
  const n = Math.round(len / 11);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const q = qpt(p0, p1, p2, t);
    const L = len * 0.2 * Math.pow(1 - t, 0.7) + 3;
    out += leaf(q.x, q.y, q.a - 1.0, L, L * 0.28, fill);
    out += leaf(q.x, q.y, q.a + 1.0, L, L * 0.28, fill);
  }
  const end = qpt(p0, p1, p2, 1);
  out += spiral(end.x + Math.cos(end.a + bendDir * 1.57) * 6, end.y + Math.sin(end.a + bendDir * 1.57) * 6, 7, 1.2, end.a - bendDir * 1.57, bendDir as 1 | -1, fill, Math.max(2, len / 80));
  return out;
}

/** Umbrella mushroom: thin curving stem, domed cap with scalloped underside. */
export function mushroom(r: Rand, x: number, y: number, h: number, capW: number, fill: string, gill?: string, leanPx?: number) {
  const lean = leanPx ?? between(r, -0.25, 0.25) * h;
  const cx = x + lean, cy = y - h;
  const sw = Math.max(3, capW * 0.07);
  let out = `<path d="M${f(x - sw)} ${f(y)} Q${f(x + lean * 0.3 - sw)} ${f(y - h * 0.6)} ${f(cx - sw * 0.6)} ${f(cy)} L${f(cx + sw * 0.6)} ${f(cy)} Q${f(x + lean * 0.3 + sw)} ${f(y - h * 0.6)} ${f(x + sw)} ${f(y)}Z" fill="${fill}"/>`;
  const capH = capW * between(r, 0.3, 0.45);
  const L = cx - capW / 2, R = cx + capW / 2;
  out += `<path d="M${f(L)} ${f(cy + capH * 0.15)} C${f(L)} ${f(cy - capH * 1.25)} ${f(R)} ${f(cy - capH * 1.25)} ${f(R)} ${f(cy + capH * 0.15)} Q${f(cx)} ${f(cy - capH * 0.25)} ${f(L)} ${f(cy + capH * 0.15)}Z" fill="${fill}"/>`;
  if (accents.snow) {
    out += `<path d="M${f(L + capW * 0.08)} ${f(cy - capH * 0.35)} C${f(L + capW * 0.1)} ${f(cy - capH * 1.2)} ${f(R - capW * 0.1)} ${f(cy - capH * 1.2)} ${f(R - capW * 0.08)} ${f(cy - capH * 0.35)} Q${f(cx + capW * 0.2)} ${f(cy - capH * 0.6)} ${f(cx)} ${f(cy - capH * 0.45)} Q${f(cx - capW * 0.2)} ${f(cy - capH * 0.6)} ${f(L + capW * 0.08)} ${f(cy - capH * 0.35)}Z" fill="${accents.snow}"/>`;
  }
  if (gill) {
    for (let i = 1; i < 6; i++) {
      const gx = L + (capW * i) / 6;
      out += `<path d="M${f(cx)} ${f(cy - capH * 0.1)} L${f(gx)} ${f(cy + capH * 0.05)}" stroke="${gill}" stroke-width="1.5" opacity=".6"/>`;
    }
    out += `<circle cx="${f(cx - capW * 0.18)}" cy="${f(cy - capH * 0.55)}" r="${f(capW * 0.06)}" fill="${gill}" opacity=".55"/>`;
    out += `<circle cx="${f(cx + capW * 0.12)}" cy="${f(cy - capH * 0.7)}" r="${f(capW * 0.04)}" fill="${gill}" opacity=".55"/>`;
  }
  return out;
}

/** Bubbly moss clump: a heap of circles, optional light dapples on top. */
export function moss(r: Rand, cx: number, base: number, w: number, h: number, fill: string, hi?: string) {
  let out = `<rect x="${f(cx - w / 2)}" y="${f(base - h * 0.35)}" width="${f(w)}" height="${f(h * 0.35 + 400)}" rx="${f(h * 0.2)}" fill="${fill}"/>`;
  const n = Math.round(w / 14) + 4;
  const dots: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = r();
    const x = cx + (t - 0.5) * w;
    const arch = Math.sin(t * Math.PI);
    const rad = between(r, 0.18, 0.32) * h * (0.6 + arch * 0.5);
    const y = base - h * 0.35 - arch * h * 0.45 + between(r, -0.1, 0.15) * h;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${fill}"/>`;
    if (accents.snow && arch > 0.35) dots.push(`<ellipse cx="${f(x)}" cy="${f(y - rad * 0.55)}" rx="${f(rad * 0.75)}" ry="${f(rad * 0.4)}" fill="${accents.snow}"/>`);
    else if (accents.bloom && r() < 0.18) dots.push(blossom(x, y - rad * 0.4, Math.max(4, rad * 0.35), accents.bloom));
    else if (hi && r() < 0.7) dots.push(`<circle cx="${f(x - rad * 0.3)}" cy="${f(y - rad * 0.35)}" r="${f(rad * between(r, 0.25, 0.45))}" fill="${hi}"/>`);
  }
  return out + dots.join('');
}

/** Hanging vine with alternating leaves and an occasional glow pod. */
export function vine(r: Rand, x: number, top: number, len: number, fill: string, pod?: { core: string; halo: string }) {
  let d = `M${f(x)} ${f(top)}`;
  const seg = 28;
  const n = Math.ceil(len / seg);
  const amp = between(r, 6, 16);
  const ph = r() * 6;
  const pts: number[][] = [[x, top]];
  for (let i = 1; i <= n; i++) {
    const yy = top + i * seg;
    const xx = x + Math.sin(i * 0.7 + ph) * amp * (i / n + 0.3);
    pts.push([xx, yy]);
    const prev = pts[i - 1];
    d += ` Q${f(prev[0] + (xx - prev[0]) * 0.5 + amp * 0.3)} ${f(yy - seg / 2)} ${f(xx)} ${f(yy)}`;
  }
  let out = `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${f(between(r, 2.5, 4))}" stroke-linecap="round"/>`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i];
    const side = i % 2 ? 1 : -1;
    const L = between(r, 10, 20) * (1 - i / pts.length * 0.5);
    out += leaf(px, py, Math.PI / 2 + side * 1.1, L, L * 0.38, accents.leafTint && i % 3 === 0 ? accents.leafTint : fill);
    if (accents.bloom && i % 3 === 1) out += blossom(px + side * 8, py + 4, 7, accents.bloom);
  }
  const last = pts[pts.length - 1];
  out += spiral(last[0] + 5, last[1] + 6, 7, 1.1, Math.PI, 1, fill, 2.5);
  if (pod) {
    out += `<circle cx="${f(last[0])}" cy="${f(last[1] + 16)}" r="22" fill="url(#halo-${pod.halo.slice(1)})"/>`;
    out += `<ellipse cx="${f(last[0])}" cy="${f(last[1] + 16)}" rx="5" ry="7" fill="${pod.core}"/>`;
  }
  return out;
}

/** Tall paddle leaf with a lighter midrib. */
export function bigLeaf(r: Rand, x: number, y: number, len: number, ang: number, fill: string, rib?: string) {
  let out = leaf(x, y, ang, len, len * between(r, 0.22, 0.3), fill);
  if (rib) {
    const tx = x + Math.cos(ang) * len * 0.85, ty = y + Math.sin(ang) * len * 0.85;
    out += `<path d="M${f(x)} ${f(y)} L${f(tx)} ${f(ty)}" stroke="${rib}" stroke-width="2" opacity=".55"/>`;
  }
  return out;
}

/** Grass/thorn blades. */
export function blades(r: Rand, x0: number, x1: number, base: number, count: number, hMin: number, hMax: number, fill: string) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const cx = between(r, x0, x1);
    const hw = between(r, 2, 6);
    const h = between(r, hMin, hMax);
    const tip = cx + between(r, -0.5, 0.5) * h * 0.6;
    d += `M${f(cx - hw)} ${f(base + 4)} Q${f(cx - hw * 0.2)} ${f(base - h * 0.5)} ${f(tip)} ${f(base - h)} Q${f(cx + hw * 0.4)} ${f(base - h * 0.5)} ${f(cx + hw)} ${f(base + 4)}Z `;
  }
  return `<path d="${d}" fill="${fill}"/>`;
}

/** Twisting trunk / column from top to bottom. */
export function trunk(r: Rand, x: number, w: number, H: number, fill: string) {
  const wob = between(r, 10, 40);
  return `<path d="M${f(x - w / 2)} -10 C${f(x - w / 2 + wob)} ${f(H * 0.3)} ${f(x - w / 2 - wob)} ${f(H * 0.65)} ${f(x - w * 0.8)} ${f(H + 10)} L${f(x + w * 0.8)} ${f(H + 10)} C${f(x + w / 2 - wob)} ${f(H * 0.65)} ${f(x + w / 2 + wob)} ${f(H * 0.3)} ${f(x + w / 2)} -10Z" fill="${fill}"/>`;
}

/** Hanging roots/drips from the top edge. */
export function roots(r: Rand, x0: number, x1: number, count: number, hMin: number, hMax: number, fill: string) {
  let out = `<rect x="${f(x0)}" y="-20" width="${f(x1 - x0)}" height="${f(hMin * 0.5 + 20)}" fill="${fill}"/>`;
  for (let i = 0; i < count; i++) {
    const cx = between(r, x0, x1);
    const hw = between(r, 6, 22);
    const h = between(r, hMin, hMax);
    const tip = cx + between(r, -0.15, 0.15) * h;
    out += `<path d="M${f(cx - hw)} 0 Q${f(cx - hw * 0.4)} ${f(h * 0.6)} ${f(tip)} ${f(h)} Q${f(cx + hw * 0.5)} ${f(h * 0.55)} ${f(cx + hw)} 0Z" fill="${fill}"/>`;
    if (r() < 0.35) out += `<circle cx="${f(tip)}" cy="${f(h + 6)}" r="${f(between(r, 2.5, 5))}" fill="${fill}"/>`;
    if (r() < 0.25) out += `<path d="M${f(tip)} ${f(h * 0.7)} q12 10 6 26" fill="none" stroke="${fill}" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  return out;
}

/** Row of rounded cobbles (a path / ledge). */
export function cobbles(r: Rand, x0: number, x1: number, y: number, fill: string, rows = 2) {
  let out = `<rect x="${f(x0)}" y="${f(y + rows * 16)}" width="${f(x1 - x0)}" height="400" fill="${fill}"/>`;
  for (let row = 0; row < rows; row++) {
    let x = x0 + (row % 2) * 14;
    while (x < x1) {
      const w = between(r, 22, 46);
      const h = between(r, 12, 17);
      out += `<rect x="${f(x)}" y="${f(y + row * 16 + (16 - h) / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2.2)}" fill="${fill}"/>`;
      x += w + between(r, 3, 6);
    }
  }
  return out;
}

/* ---------------- architecture ---------------- */

/** Arch bay: two columns, capitals, a round arch with keystone (evenodd). */
export function arch(_r: Rand, x: number, w: number, top: number, base: number, fill: string) {
  const cw = w * 0.13;
  const span = w - cw * 2;
  const springY = top + span / 2;
  const R = span / 2;
  let out = '';
  out += `<rect x="${f(x)}" y="${f(top)}" width="${f(cw)}" height="${f(base - top + 400)}" fill="${fill}"/>`;
  out += `<rect x="${f(x + w - cw)}" y="${f(top)}" width="${f(cw)}" height="${f(base - top + 400)}" fill="${fill}"/>`;
  out += `<rect x="${f(x - cw * 0.25)}" y="${f(springY - 10)}" width="${f(cw * 1.5)}" height="14" rx="3" fill="${fill}"/>`;
  out += `<rect x="${f(x + w - cw * 1.25)}" y="${f(springY - 10)}" width="${f(cw * 1.5)}" height="14" rx="3" fill="${fill}"/>`;
  out += `<path d="M${f(x)} ${f(top - 40)} H${f(x + w)} V${f(springY)} H${f(x + w - cw)} A${f(R)} ${f(R)} 0 0 0 ${f(x + cw)} ${f(springY)} H${f(x)}Z" fill="${fill}"/>`;
  out += `<path d="M${f(x + w / 2 - 9)} ${f(springY - R - 4)} L${f(x + w / 2 + 9)} ${f(springY - R - 4)} L${f(x + w / 2 + 6)} ${f(springY - R + 16)} L${f(x + w / 2 - 6)} ${f(springY - R + 16)}Z" fill="${fill}"/>`;
  // inner moulding ring
  out += `<path d="M${f(x + cw + 8)} ${f(springY)} A${f(R - 8)} ${f(R - 8)} 0 0 1 ${f(x + w - cw - 8)} ${f(springY)}" fill="none" stroke="${fill}" stroke-width="4"/>`;
  return out;
}

/** Iron railing with curled finials. */
export function railing(_r: Rand, x0: number, x1: number, base: number, h: number, stroke: string) {
  let out = `<path d="M${f(x0)} ${f(base - h)} L${f(x1)} ${f(base - h)} M${f(x0)} ${f(base - 8)} L${f(x1)} ${f(base - 8)}" stroke="${stroke}" stroke-width="4"/>`;
  let i = 0;
  for (let x = x0 + 8; x < x1; x += 20, i++) {
    out += `<path d="M${f(x)} ${f(base)} L${f(x)} ${f(base - h - (i % 3 === 0 ? 18 : 6))}" stroke="${stroke}" stroke-width="3"/>`;
    if (i % 3 === 0) out += spiral(x + 5, base - h - 20, 6, 1, Math.PI, 1, stroke, 2.5);
    if (i % 2 === 1) out += spiral(x - 10, base - h * 0.5, 7, 1.3, 0, i % 4 === 1 ? 1 : -1, stroke, 2);
  }
  return out;
}

/** Ribbed shell / fossil fan. */
export function shell(r: Rand, cx: number, cy: number, R: number, fill: string, rib: string) {
  let out = `<path d="M${f(cx - R)} ${f(cy)} A${f(R)} ${f(R)} 0 0 1 ${f(cx + R)} ${f(cy)} L${f(cx + R)} ${f(cy + 400)} L${f(cx - R)} ${f(cy + 400)}Z" fill="${fill}"/>`;
  const n = 6 + Math.floor(r() * 4);
  for (let i = 1; i < n; i++) {
    const rr = R * (1 - i / n);
    out += `<path d="M${f(cx - rr)} ${f(cy + R * 0.05 * i)} A${f(rr)} ${f(rr * 0.92)} 0 0 1 ${f(cx + rr)} ${f(cy + R * 0.05 * i)}" fill="none" stroke="${rib}" stroke-width="${f(Math.max(2, R / 22))}" opacity=".7"/>`;
  }
  return out;
}

/** Chain + hanging lantern (a real light source). */
export function lantern(x: number, top: number, len: number, body: string, core: string) {
  let out = `<path d="M${f(x)} ${f(top)} L${f(x)} ${f(top + len)}" stroke="${body}" stroke-width="2.5" stroke-dasharray="6 3"/>`;
  out += `<circle cx="${f(x)}" cy="${f(top + len + 18)}" r="60" fill="url(#halo-${core.slice(1)})"/>`;
  out += `<path d="M${f(x - 10)} ${f(top + len + 4)} L${f(x + 10)} ${f(top + len + 4)} L${f(x + 13)} ${f(top + len + 30)} L${f(x - 13)} ${f(top + len + 30)}Z" fill="${body}"/>`;
  out += `<ellipse cx="${f(x)}" cy="${f(top + len + 18)}" rx="6" ry="9" fill="${core}"/>`;
  out += `<path d="M${f(x - 6)} ${f(top + len + 4)} Q${f(x)} ${f(top + len - 8)} ${f(x + 6)} ${f(top + len + 4)}" fill="${body}"/>`;
  return out;
}

/* ---------------- layer assembly ---------------- */

export function svgDoc(W: number, H: number, body: string, halos: string[] = []) {
  const defs = halos
    .map(
      (c) =>
        `<radialGradient id="halo-${c.slice(1)}"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset=".35" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
}

export function toDataUri(svg: string) {
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}
