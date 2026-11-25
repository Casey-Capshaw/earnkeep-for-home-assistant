// EarnKeep - Home Assistant custom panel entry point
// Registers a custom element that HA's panel infrastructure instantiates.
// Uses Shadow DOM to encapsulate styles since HA's ha-panel-custom uses shadow DOM.

import { createRoot, Root } from 'react-dom/client';
import { createElement } from 'react';
import App from './App';
import { HAWebSocketClient } from './api/ha-websocket';
import { useStore } from './store';
import { setPortalContainer } from './lib/portal';
import tokenStyles from './styles/tokens.css?inline';
import globalStyles from './styles/global.css?inline';
import fontStyles from './styles/fonts.css?inline';

// @font-face inside a shadow tree is ignored by Chromium (crbug.com/336876),
// so the brand fonts must be registered at document scope. Idempotent: HA
// keeps the panel element alive across navigations, but guard anyway.
function ensureFontsInDocumentHead(): void {
  if (document.getElementById('earn-keep-fonts')) return;
  const el = document.createElement('style');
  el.id = 'earn-keep-fonts';
  el.textContent = fontStyles;
  document.head.appendChild(el);
}

// Same story for @property. Tailwind v4 gives every border/shadow/gradient/
// translate utility its defaults through registered custom properties
// (`@property --tw-border-style { initial-value: solid }` etc.), and
// Chromium only honours @property rules in document-scope stylesheets — in
// a shadow tree they're silently dropped, `--tw-border-style` is unset, and
// `border-style: var(--tw-border-style)` computes to `none`. That is why no
// `border-*` utility (habit-tile rings, PIN keys, steppers), no `shadow-[…]`
// utility, and no gradient fill ever rendered on the real tablet. Lift just
// the @property blocks into <head>; registrations are global, so the shadow
// stylesheet's utilities then resolve. (2026-09-11)
function ensurePropertiesInDocumentHead(css: string): void {
  if (document.getElementById('earn-keep-properties')) return;
  const blocks = css.match(/@property\s+--[\w-]+\s*\{[^}]*\}/g);
  if (!blocks || blocks.length === 0) {
    console.warn('[earn-keep] no @property rules found in the stylesheet — Tailwind defaults will be missing inside the shadow root');
    return;
  }
  const el = document.createElement('style');
  el.id = 'earn-keep-properties';
  el.textContent = blocks.join('\n');
  document.head.appendChild(el);
}

interface HassObject {
  callWS(msg: Record<string, unknown>): Promise<unknown>;
  states?: Record<string, { state: string } | undefined>;
}

class EarnKeepPanel extends HTMLElement {
  private _root: Root | null = null;
  private _client: HAWebSocketClient | null = null;

  set hass(hass: HassObject) {
    if (!this._root) {
      ensureFontsInDocumentHead();
      ensurePropertiesInDocumentHead(tokenStyles);

      // Inject styles directly into our element (inside HA's shadow DOM
      // boundary). Both sheets keep every rule inside @layer — an un-layered
      // rule here would beat ALL Tailwind utilities regardless of specificity
      // (that cascade rule is how the redesign shipped with zero padding).
      const styleEl = document.createElement('style');
      styleEl.textContent = tokenStyles + '\n' + globalStyles;
      this.appendChild(styleEl);

      const container = document.createElement('div');
      container.style.height = '100%';
      this.appendChild(container);

      // Portaled UI (Radix dialogs) must stay inside HA's shadow boundary
      // or it renders unstyled — see lib/portal.ts.
      setPortalContainer(container);

      this._client = new HAWebSocketClient(hass);
      useStore.getState().setApi(this._client);
      useStore.getState().loadData();

      this._root = createRoot(container);
      this._root.render(createElement(App));
    }

    // Update the hass reference on subsequent calls
    if (this._client) {
      this._client.hass = hass;
    }

    // Live weather for the world's atmosphere (rain, snow, fog…). HA pushes
    // a fresh hass on every state change, so this stays current for free.
    const entity = useStore.getState().settings?.weather_entity || 'weather.home';
    const w = hass.states?.[entity]?.state;
    if (w && w !== 'unavailable' && w !== 'unknown') useStore.getState().setWeather(w);
  }
}

// A config-entry reload re-registers the panel under a new ?v= URL, so a tab that
// is already open runs this bundle a second time. Defining the element twice
// throws; the tab keeps the class it has until it is reloaded.
if (!customElements.get('earn-keep-panel')) {
  customElements.define('earn-keep-panel', EarnKeepPanel);
}
