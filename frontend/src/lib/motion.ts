// EarnKeep — one place that decides whether to calm the motion down.
// settings.motion: 'auto' (default) follows the device's reduce-motion
// preference; 'always' animates regardless. The Fire 10 kiosk has Android
// system animations off, which Chrome reports as prefers-reduced-motion —
// that froze the whole living world until this switch existed (2026-11-10).
//
// CSS side: the reduce-motion @media rules only apply under .ek-motion-auto
// (set on the app root and the dialog portal host by App).

import { useReducedMotion } from 'framer-motion';
import { useStore } from '../store';

export function useCalmMotion(): boolean {
  const mode = useStore((s) => s.settings?.motion ?? 'auto');
  const prefersReduced = useReducedMotion();
  return mode === 'always' ? false : !!prefersReduced;
}
