#!/usr/bin/env node
// sprite-frames.mjs — film the sprites at real tablet resolution.
//
// The sprites are fairy-sized (~27 px), too small to judge in a scaled
// browser pane, so this forces an episode (?eksprites=<game>) in the dev
// harness at 1280x800 and saves a strip of frames cropped around the
// actors, plus one full frame. Needs a running dev server (default
// http://localhost:5188, override with BASE=…).
//
// Usage: [VIEW=Bank] node scripts/sprite-frames.mjs <game> [query] [frames] [interval-ms]
//   e.g. node scripts/sprite-frames.mjs grapple "ekhour=11" 10 600
// Writes frontend/dev/screenshots/sprites/<game>-NN.png

import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');
const { chromium } = createRequire(join(FRONTEND, 'package.json'))('playwright');
const OUT = join(FRONTEND, 'dev', 'screenshots', 'sprites');
mkdirSync(OUT, { recursive: true });

const [game = 'stroll', query = 'ekhour=11', frames = '10', every = '700'] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://localhost:5188';
const DPR = Number(process.env.DPR || 2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: DPR, reducedMotion: 'no-preference' });
await page.goto(`${BASE}/dev/?eksprites=${game}&${query}`);
if (process.env.VIEW) {
  // VIEW=Bank|Admin — switch the dock view first (the game restarts on it)
  await page.waitForTimeout(1200);
  await page.locator('nav').getByRole('button', { name: process.env.VIEW }).click();
}
await page.waitForTimeout(Number(process.env.WAIT || 3200)); // WAIT=ms before the first frame

const boxes = () =>
  page.evaluate(() => {
    const host = document.querySelector('div')?.shadowRoot;
    const root = host ?? document;
    const out = [];
    root.querySelectorAll('.ek-sprites > div:not(svg)').forEach((el) => {
      const svg = el.querySelector('svg');
      if (!svg) return;
      const r = el.getBoundingClientRect();
      const s = svg.getBoundingClientRect();
      out.push({ x: Math.min(r.x, s.x), y: Math.min(r.y, s.y), r: Math.max(r.right, s.right), b: Math.max(r.bottom, s.bottom) });
    });
    return out;
  });

for (let i = 0; i < Number(frames); i++) {
  const bs = (await boxes()).filter((b) => b.r > 0 && b.x < 1280 && b.b > 0 && b.y < 800);
  const name = join(OUT, `${game}-${String(i).padStart(2, '0')}.png`);
  if (bs.length) {
    const x0 = Math.max(0, Math.min(...bs.map((b) => b.x)) - 50);
    const y0 = Math.max(0, Math.min(...bs.map((b) => b.y)) - 40);
    const x1 = Math.min(1280, Math.max(...bs.map((b) => b.r)) + 50);
    const y1 = Math.min(800, Math.max(...bs.map((b) => b.b)) + 30);
    await page.screenshot({ path: name, clip: { x: x0, y: y0, width: Math.max(60, x1 - x0), height: Math.max(60, y1 - y0) } });
    console.log(name, bs.length, 'actors', `${Math.round(x0)},${Math.round(y0)} ${Math.round(x1 - x0)}x${Math.round(y1 - y0)}`);
  } else console.log(`frame ${i}: no actors on screen`);
  if (i === 1) await page.screenshot({ path: join(OUT, `${game}-full.png`) });
  await page.waitForTimeout(Number(every));
}
await browser.close();
