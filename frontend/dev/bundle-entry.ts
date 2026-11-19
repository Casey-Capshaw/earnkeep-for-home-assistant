// EarnKeep - built-bundle harness entry: mounts the panel from the BUILT
// earn-keep-panel.js (served by scripts/verify-bundle.mjs) with the same
// mock data and shadow-root mount as mock-entry.ts, so the shipped file is
// what gets tested, not the source.
import { createMockHass } from './mock-hass';

// a variable, so Vite leaves the import to the browser (the test serves it)
const built = '/dev/built-panel.js';
await import(/* @vite-ignore */ built);
const host = document.createElement('div');
host.style.cssText = 'display:block;width:100%;';
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'open' });
const panel = document.createElement('earn-keep-panel') as HTMLElement & { hass: unknown };
shadow.appendChild(panel);
panel.hass = createMockHass();
