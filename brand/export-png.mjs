#!/usr/bin/env node
// export-png.mjs — render the brand SVGs to PNG (transparent background).
// Usage: node brand/export-png.mjs   (uses playwright from frontend/node_modules)

import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(join(HERE, '..', 'frontend', 'package.json'))('playwright');
const OUT = join(HERE, 'png');
mkdirSync(OUT, { recursive: true });

// [source, output name, width in px]
const EXPORTS = [
  ['mark.svg', 'mark-1024', 1024],
  ['mark.svg', 'mark-512', 512],
  ['mark.svg', 'mark-256', 256],
  ['mark-small.svg', 'mark-small-64', 64],
  ['mark-small.svg', 'mark-small-32', 32],
  ['wordmark.svg', 'wordmark-2048', 2048],
  ['lockup.svg', 'lockup-2048', 2048],
  ['lockup-horizontal.svg', 'lockup-horizontal-2048', 2048],
  ['app-icon.svg', 'app-icon-512', 512],
];

const browser = await chromium.launch();
try {
  for (const [src, name, width] of EXPORTS) {
    const svg = readFileSync(join(HERE, src), 'utf8');
    const [, , , w, h] = svg.match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/).map(Number);
    const height = Math.round((width * h) / w);
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${width}px;height:${height}px}</style>${svg}`);
    await page.screenshot({ path: join(OUT, `${name}.png`), omitBackground: true });
    await page.close();
    console.log(`✓ png/${name}.png  ${width} × ${height}`);
  }
} finally {
  await browser.close();
}
