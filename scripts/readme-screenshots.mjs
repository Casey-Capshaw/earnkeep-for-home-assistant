#!/usr/bin/env node
// readme-screenshots.mjs — retake the README images from the dev harness.
//
// Every image comes from the mock (fictional) family in frontend/dev/, at the
// tablet's CSS viewport (1280x800 @1.5), with the browser clock pinned so a
// retake gives the same day, weather and time.
//
// Usage: node scripts/readme-screenshots.mjs   (manages its own vite dev
// server on :5199; writes docs/screenshots/readme/*.jpg)

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');
const { chromium } = createRequire(join(FRONTEND, 'package.json'))('playwright');
const OUT = join(ROOT, 'docs', 'screenshots', 'readme');
const PORT = 5199;
const URL = `http://localhost:${PORT}/dev/`;
const VIEWPORT = { width: 1280, height: 800 };

mkdirSync(OUT, { recursive: true });

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: FRONTEND,
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite dev server timed out')), 30000);
  vite.stdout.on('data', (d) => {
    if (String(d).includes('Local:')) { clearTimeout(t); resolve(); }
  });
  vite.on('exit', () => reject(new Error('vite exited early')));
});

let browser;
try {
  browser = await chromium.launch();

  /** Open the harness at a pinned local time; `query` takes the ek* overrides. */
  const open = async (when, query = '') => {
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1.5, reducedMotion: 'no-preference' });
    page.on('pageerror', (e) => console.error('[pageerror]', e.message));
    await page.clock.install({ time: new Date(when) });
    await page.goto(`${URL}?${query}`, { waitUntil: 'networkidle' });
    return page;
  };
  const dock = (page, view) => page.locator('nav button', { hasText: view }).click();
  const jpeg = (page) => page.screenshot({ type: 'jpeg', quality: 88 });
  const save = (name, buf) => {
    writeFileSync(join(OUT, name), buf);
    console.log(`✓ docs/screenshots/readme/${name}`);
  };

  /** Lay captioned shots out in a grid and return one JPEG. */
  const montage = async (tiles, columns, tileWidth) => {
    const page = await browser.newPage({ viewport: { width: columns * (tileWidth + 20) + 20, height: 600 }, deviceScaleFactor: 1 });
    const figures = tiles
      .map(([caption, buf]) => `<figure><img src="data:image/jpeg;base64,${buf.toString('base64')}"><figcaption>${caption}</figcaption></figure>`)
      .join('');
    await page.setContent(`<style>
      body { margin: 0; background: #1b2a27; }
      main { display: grid; grid-template-columns: repeat(${columns}, ${tileWidth}px); gap: 10px 20px; padding: 10px; width: max-content; }
      figure { margin: 0; }
      img { display: block; width: ${tileWidth}px; border-radius: 10px; }
      figcaption { padding: 8px 0 6px; text-align: center; color: #f3ead7; font: 18px Georgia, 'Times New Roman', serif; }
    </style><main>${figures}</main>`);
    const buf = await page.locator('main').screenshot({ type: 'jpeg', quality: 88 });
    await page.close();
    return buf;
  };

  // Roles and Bank: an autumn evening, with the Sprites out playing.
  {
    const page = await open('2026-10-14T19:41:00', 'ekweather=partlycloudy&eksprites=kite&ekspriteslayer=front');
    // Wait until both Sprites stand clear of the dock, with the kite up.
    await page.waitForFunction(() => {
      const root = document.querySelector('div')?.shadowRoot ?? document;
      const boxes = [...root.querySelectorAll('.ek-sprites > div:not(svg) svg')].map((el) => el.getBoundingClientRect());
      const kids = boxes.filter((b) => b.width > 0 && b.y > 600 && b.x > 30 && b.right < 385);
      return kids.length >= 2 && boxes.some((b) => b.width > 0 && b.y < 400 && b.x > 10);
    }, null, { timeout: 180000, polling: 250 });
    save('roles.jpg', await jpeg(page));
    await dock(page, 'Bank');
    await page.waitForTimeout(4000);
    save('bank.jpg', await jpeg(page));
    await page.close();
  }

  // Special days.
  {
    const days = [
      ['A birthday: cake, bunting, balloons and a party hat', '2026-03-14T18:41:00', 'ekweather=sunny'],
      ['Christmas, with live snow', '2026-12-25T09:41:00', 'ekweather=snowy'],
      ['A rainy spring day (live Home Assistant weather)', '2026-04-22T09:41:00', 'ekweather=rainy'],
      ['Halloween', '2026-10-31T17:41:00', 'ekweather=cloudy'],
    ];
    const tiles = [];
    for (const [caption, when, query] of days) {
      const page = await open(when, query);
      await page.waitForTimeout(5000);
      tiles.push([caption, await jpeg(page)]);
      await page.close();
    }
    save('special.jpg', await montage(tiles, 2, 760));
  }

  // Admin: the PIN gate, Pay & Bank, and Settings.
  {
    const page = await open('2026-10-14T19:41:00', 'ekweather=partlycloudy');
    await dock(page, 'Admin');
    await page.waitForTimeout(1500);
    const tiles = [['PIN gate', await jpeg(page)]];
    for (let i = 0; i < 4; i++) await page.locator('main button', { hasText: /^0$/ }).click();
    await page.locator('main button', { hasText: /^✓$/ }).click();
    await page.waitForTimeout(800);
    tiles.push(['Pay &amp; Bank', await jpeg(page)]);
    await page.locator('main button', { hasText: 'Settings' }).click();
    await page.waitForTimeout(600);
    tiles.push(['Settings: motion, weather, birthdays', await jpeg(page)]);
    await page.close();
    save('admin.jpg', await montage(tiles, 3, 520));
  }
} finally {
  await browser?.close();
  vite.kill();
}
