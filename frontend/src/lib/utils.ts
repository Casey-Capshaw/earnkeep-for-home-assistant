import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Darkened shade of a kid's identity color, for the solid offset shadow
 * under avatars and press states (the design's `-deep` companions, e.g.
 * #FFB627 → #C97F00). Computed so any admin-picked color works. */
export function deepen(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const scale = (v: number) => Math.round(v * 0.72);
  const r = scale((n >> 16) & 0xff);
  const g = scale((n >> 8) & 0xff);
  const b = scale(n & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Python weekday index (0=Mon..6=Sun) → short day name. */
export const DOW_SHORT_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "20:00" → "8:00 PM" (the spec's schedule-card format). Unknown input
 * passes through untouched so a malformed setting is still visible. */
export function formatClock12(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!m) return hhmm;
  const h24 = Number(m[1]);
  if (h24 > 23) return hhmm;
  const h = h24 % 12 || 12;
  return `${h}:${m[2]} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/** 1 → "1st", 22 → "22nd". */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
