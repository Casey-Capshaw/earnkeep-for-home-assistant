#!/usr/bin/env node
// verify-admin.mjs — drive the PIN gate and every Admin tab at the Fire10's
// real CSS viewport (1280x800 @1.5), screenshotting each stage. Companion to
// verify-visual.mjs, which only covers the un-gated Roles/Bank views.
// Usage: node scripts/verify-admin.mjs  (manages its own vite server on :5199)

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');
const { chromium } = createRequire(join(FRONTEND, 'package.json'))('playwright');
const OUT = join(FRONTEND, 'dev', 'screenshots');
const PORT = 5199;
const URL = `http://localhost:${PORT}/dev/`;

mkdirSync(OUT, { recursive: true });

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: FRONTEND,
  stdio: 'ignore',
});

try {
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  await page.goto(URL, { waitUntil: 'networkidle' });

  await page.locator('nav button', { hasText: 'Admin' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, 'admin-pingate.png') });

  // A wrong PIN is refused by the server (the PIN never reaches the panel).
  for (let i = 0; i < 4; i++) {
    await page.locator('main button', { hasText: /^1$/ }).click();
  }
  await page.locator('main button', { hasText: /^✓$/ }).click();
  await page.getByText('Incorrect PIN').waitFor({ timeout: 2000 });

  for (let i = 0; i < 4; i++) {
    await page.locator('main button', { hasText: /^0$/ }).click();
  }
  await page.locator('main button', { hasText: /^✓$/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'admin-pay.png') });

  for (const tab of ['Tasks', 'People', 'Settings']) {
    await page.locator('main button', { hasText: tab }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `admin-${tab.toLowerCase()}.png`) });
  }

  // An admin save must carry the PIN session token (the mock backend, like
  // the real one, rejects admin commands without it).
  await page.locator('main button', { hasText: 'Settings' }).click();
  const rate = page.locator('main', { hasText: 'Monthly interest rate' }).getByText(/^\d+(\.\d+)?%$/).first();
  const before = await rate.textContent();
  await page.locator('main button', { hasText: /^\+$/ }).first().click();
  await page.waitForTimeout(500);
  const after = await rate.textContent();
  const body = await page.locator('body').innerText();
  if (before === after || /Failed|timed out/i.test(body)) {
    throw new Error(`admin save failed: interest ${before} -> ${after}`);
  }
  console.log(`✓ admin save with session token: interest ${before} -> ${after}`);

  // Character intake: open the first member's character, break the file,
  // then start from a preset and save it.
  await page.locator('main button', { hasText: 'People' }).click();
  await page.locator('main button', { hasText: /Character$/ }).first().click();
  await page.waitForTimeout(2800); // let the preview change pose once
  await page.screenshot({ path: join(OUT, 'admin-character.png') });
  const dialog = page.getByRole('dialog');
  await dialog.locator('textarea').fill('{ "format": "earnkeep-sprite", "version": 1, "hair": { "color": "teal" } }');
  await dialog.getByText(/hair\.color: "teal"/).waitFor({ timeout: 2000 });
  if (await dialog.getByRole('button', { name: 'Save' }).isEnabled()) throw new Error('Save is enabled for an invalid file');
  await page.screenshot({ path: join(OUT, 'admin-character-errors.png') });
  await dialog.getByRole('button', { name: 'Start from Wren' }).click();
  await dialog.getByText('Looks good').waitFor({ timeout: 2000 });
  await dialog.getByRole('button', { name: 'Save' }).click();
  await page.getByText(/character saved/).waitFor({ timeout: 3000 });
  console.log('✓ character intake: invalid file refused, preset saved');

  // Open the New task dialog too — first real use of the restyled modal.
  await page.locator('main button', { hasText: 'Tasks' }).click();
  await page.locator('main button', { hasText: '+ New task' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, 'admin-newtask.png') });

  await browser.close();
  console.log('✓ admin screenshots written to', OUT);
} finally {
  vite.kill();
}
