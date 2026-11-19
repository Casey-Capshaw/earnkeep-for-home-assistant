// EarnKeep - Dev harness entry: mounts the REAL panel element with mock data.
// Importing ha-panel-entry registers <earn-keep-panel> and runs the same
// style/font injection the production panel does.
//
// The panel is mounted INSIDE a shadow root, exactly like HA's
// ha-panel-custom does in production. This is load-bearing for fidelity:
// without it, the panel's injected stylesheets apply document-wide and
// anything portaled to document.body (Radix dialogs) still looks styled —
// which is how the invisible-delete-dialog bug shipped unnoticed.

import '../src/ha-panel-entry';
import { createMockHass } from './mock-hass';

// Sizing mirrors HA 2026.8+ (frontend #53127): ha-panel-custom is a
// display:block light-DOM host with NO height of its own, and the panel
// element gets no inline sizing at all. The panel must size itself to the
// viewport (as HA's own iframe custom panels do with 100vh) — giving it a
// height here would hide exactly the bug that shipped on 2026-09-11.
const host = document.createElement('div');
host.style.cssText = 'display:block;width:100%;';
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'open' });

const panel = document.createElement('earn-keep-panel') as HTMLElement & {
  hass: unknown;
};
shadow.appendChild(panel);
panel.hass = createMockHass();
