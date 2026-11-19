#!/usr/bin/env node
// verify-bundle.mjs — check the BUILT panel, the file Home Assistant loads.
//
// verify-visual.mjs runs the source through Vite's dev server; this loads
// custom_components/earn_keep/frontend/earn-keep-panel.js itself into the
// same mock harness at the tablet's size (1280x800 @1.5), then checks that
// it renders the Roles, Bank and Admin views and the Sprites without errors.
// Run it after a build, and before tagging a release.
//
// Usage: node scripts/verify-bundle.mjs   (manages its own vite server on
// :5198; writes frontend/dev/screenshots/bundle-*.png)

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');
const BUNDLE = join(ROOT, 'custom_components', 'earn_keep', 'frontend', 'earn-keep-panel.js');
const { chromium } = createRequire(join(FRONTEND, 'package.json'))('playwright');
const OUT = join(FRONTEND, 'dev', 'screenshots');
const PORT = 5198;
mkdirSync(OUT, { recursive: true });

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite dev server timed out')), 30000);
  vite.stdout.on('data', (d) => { if (String(d).includes('Local:')) { clearTimeout(t); resolve(); } });
  vite.on('exit', () => reject(new Error('vite exited early')));
});

const problems = [];
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, reducedMotion: 'no-preference' });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`); });
  await page.route('**/dev/built-panel.js*', (route) => route.fulfill({ contentType: 'text/javascript', body: readFileSync(BUNDLE, 'utf8') }));
  await page.goto(`http://localhost:${PORT}/dev/bundle.html?eksprites=together&ekspriteslayer=front`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // the panel lives in a shadow root, which body.innerText doesn't reach
  const panelText = () => page.evaluate(() => (document.querySelector('div')?.shadowRoot?.querySelector('earn-keep-panel')?.innerText ?? '').toLowerCase());
  const inPanel = (sel) => page.evaluate((s) => document.querySelector('div')?.shadowRoot?.querySelector('earn-keep-panel')?.querySelectorAll(s).length ?? -1, sel);
  if ((await inPanel('nav button')) < 3) problems.push('the dock did not render');
  const text = await panelText();
  for (const name of ['owen', 'hazel']) if (!text.includes(name)) problems.push(`Roles: ${name} is missing`);
  await page.waitForTimeout(3500);
  if ((await page.evaluate(() => (document.querySelector('div')?.shadowRoot ?? document).querySelectorAll('.ek-sprites svg').length)) === 0) problems.push('no Sprites drawn');
  await page.screenshot({ path: join(OUT, 'bundle-roles.png') });

  await page.locator('nav button', { hasText: 'Bank' }).click();
  await page.waitForTimeout(700);
  if (!(await panelText()).includes('recent transactions')) problems.push('Bank: no transactions');
  await page.screenshot({ path: join(OUT, 'bundle-bank.png') });

  await page.locator('nav button', { hasText: 'Admin' }).click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 4; i++) await page.locator('main button', { hasText: /^0$/ }).click();
  await page.locator('main button', { hasText: /^✓$/ }).click();
  await page.waitForTimeout(600);
  if (!(await panelText()).includes('deposit')) problems.push('Admin: the PIN did not open Pay & Bank');
  await page.screenshot({ path: join(OUT, 'bundle-admin.png') });
} finally {
  await browser?.close();
  vite.kill();
}

if (problems.length) {
  console.error(`✗ built bundle: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  ', p);
  process.exit(1);
}
console.log('✓ built bundle renders Roles, Bank, Admin and the Sprites with no errors');
console.log('  screenshots:', join(OUT, 'bundle-*.png'));
