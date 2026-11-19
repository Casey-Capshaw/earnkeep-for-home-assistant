// EarnKeep - Portal container registry
// HA's ha-panel-custom wraps this panel in a shadow root, and the app's
// stylesheets are injected INSIDE that boundary. Anything portaled to
// document.body (Radix Dialog's default) escapes the shadow root and
// renders with zero styles — on the real tablet the delete-confirm dialog
// was simply invisible. Every portal must target a node inside the panel.
// Null (dev harness / standalone, no shadow boundary) falls back to body.

let portalContainer: HTMLElement | null = null;

export function setPortalContainer(el: HTMLElement | null): void {
  portalContainer = el;
}

export function getPortalContainer(): HTMLElement | undefined {
  return portalContainer ?? undefined;
}
