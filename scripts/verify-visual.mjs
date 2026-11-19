#!/usr/bin/env node
// verify-visual.mjs — screenshot the app at the REAL kiosk resolutions.
//
// The 2026-07-09 redesign shipped broken twice because every visual check
// happened in an arbitrary desktop browser window. This script renders the
// production panel code (via the dev/ mock harness) at the Fire HD 10's two
// possible CSS viewports and saves screenshots for eyeball review:
//   - 1920x1200 @ DPR 1   (Fully Kiosk desktop-viewport mode)
//   - 1280x800  @ DPR 1.5 (Android default density)
//
// Usage: node scripts/verify-visual.mjs   (from anywhere; manages its own
// vite dev server on :5199; writes to frontend/dev/screenshots/)

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');

// playwright lives in frontend/node_modules; this script lives in scripts/.
const { chromium } = createRequire(join(FRONTEND, 'package.json'))('playwright');
const OUT = join(FRONTEND, 'dev', 'screenshots');
const PORT = 5199;
const URL = `http://localhost:${PORT}/dev/`;

const VIEWPORTS = [
  { name: '1920x1200-dpr1', width: 1920, height: 1200, deviceScaleFactor: 1 },
  { name: '1280x800-dpr1.5', width: 1280, height: 800, deviceScaleFactor: 1.5 },
];

// Bottom-dock views to capture; selector text matches the dock labels.
const VIEWS = ['Roles', 'Bank'];

// Special worlds to spot-check (?ekdate / ?ekweather / ?ekhour → useDay).
const WORLD_DAYS = [
  ['kid-birthday-evening', 'ekdate=2026-03-14&ekhour=19'],
  ['christmas-snow', 'ekdate=2026-12-25&ekweather=snowy&ekhour=10'],
  ['spring-rain', 'ekdate=2026-04-22&ekweather=rainy&ekhour=10'],
  ['halloween', 'ekdate=2026-10-31&ekweather=cloudy&ekhour=17'],
];

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

try {
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor,
    });
    page.on('console', (m) => {
      if (m.type() === 'error') console.error(`[console.error @ ${vp.name}]`, m.text());
    });
    page.on('pageerror', (e) => console.error(`[pageerror @ ${vp.name}]`, e.message));
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200); // fonts + spring animations settle

    // Guard: Tailwind v4's @property defaults must reach the shadow root.
    // Without them every border-* / shadow-[…] / gradient utility silently
    // computes to nothing (2026-09-11 finding) — fail loudly, not quietly.
    const twDefaults = await page.evaluate(() => {
      const panel = document.body.querySelector('div')?.shadowRoot?.querySelector('earn-keep-panel');
      if (!panel) return null;
      const s = getComputedStyle(panel);
      return {
        borderStyle: s.getPropertyValue('--tw-border-style').trim(),
        shadow: s.getPropertyValue('--tw-shadow').trim(),
      };
    });
    if (!twDefaults || twDefaults.borderStyle !== 'solid') {
      throw new Error(
        `Tailwind @property defaults missing inside the shadow root (${JSON.stringify(twDefaults)}) — borders/shadows will not render on device`
      );
    }

    // Guard: the panel must fill the viewport on its own. HA's ha-panel-custom
    // gives it no height (2026.8+), so a content-sized panel leaves the bottom
    // of the tablet black (2026-09-11 "screen size looks off").
    const panelHeight = await page.evaluate(() => {
      const panel = document.body.querySelector('div')?.shadowRoot?.querySelector('earn-keep-panel');
      return panel ? Math.round(panel.getBoundingClientRect().height) : null;
    });
    if (panelHeight !== vp.height) {
      throw new Error(
        `earn-keep-panel is ${panelHeight}px tall in a ${vp.height}px viewport — the panel is not sizing itself to the screen`
      );
    }

    for (const view of VIEWS) {
      // Dock buttons render as "<emoji>Label", so match on substring.
      await page.locator('nav button', { hasText: view }).click();
      await page.waitForTimeout(700);
      const file = join(OUT, `${view.toLowerCase()}-${vp.name}.png`);
      await page.screenshot({ path: file });
      console.log(`✓ ${file}`);
    }
    // Layered-world spot checks (2026-11-10): the scene is generated per
    // day + weather, so pin a few memorable days via the useDay overrides.
    if (vp.name.startsWith('1280')) {
      for (const [name, q] of WORLD_DAYS) {
        await page.goto(`${URL}?${q}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1500); // layers rasterize + fade in
        const file = join(OUT, `world-${name}-${vp.name}.png`);
        await page.screenshot({ path: file });
        console.log(`✓ ${file}`);
      }
    }
    await page.close();
  }
  await browser.close();
} finally {
  vite.kill();
}
