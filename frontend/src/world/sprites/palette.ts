// EarnKeep — Sprite palette: the colors each trait name maps to.
// Skin tones are the spec's table.
// Hair triples follow one recipe (light ≈ 45% toward white,
// dark ≈ 25% toward black), to be tuned visually.

import type { Character, EYE_COLORS, HAIR_COLORS, SKIN_TONES } from './traits';

type SkinTone = (typeof SKIN_TONES)[number];
type HairColor = (typeof HAIR_COLORS)[number];
type EyeColor = (typeof EYE_COLORS)[number];

export interface SkinColors { base: string; shade: string; blush: string }
export interface HairTriple { base: string; light: string; dark: string }

export const SKIN: Record<SkinTone, SkinColors> = {
  'tone-1': { base: '#FBE3D2', shade: '#EFC6AC', blush: '#F2978F' },
  'tone-2': { base: '#F7D5BC', shade: '#E8B99A', blush: '#F2978F' },
  'tone-3': { base: '#EDC09C', shade: '#D9A47E', blush: '#EA8A7E' },
  'tone-4': { base: '#D9A57A', shade: '#C08A60', blush: '#E07A6E' },
  'tone-5': { base: '#C08A5E', shade: '#A47048', blush: '#D06A5E' },
  'tone-6': { base: '#A06A44', shade: '#855434', blush: '#B8584E' },
  'tone-7': { base: '#7D4E30', shade: '#643C24', blush: '#A44C44' },
  'tone-8': { base: '#5A3722', shade: '#46291A', blush: '#8E4038' },
};

export const HAIR: Record<HairColor, HairTriple> = {
  black: { base: '#2B2522', light: '#8A8785', dark: '#201C1A' },
  'dark-brown': { base: '#4A3020', light: '#9B8D84', dark: '#382418' },
  brown: { base: '#6E4A2E', light: '#AF9B8C', dark: '#533823' },
  'light-brown': { base: '#9A7048', light: '#C7B09A', dark: '#745436' },
  auburn: { base: '#8E3F24', light: '#C19587', dark: '#6B2F1B' },
  red: { base: '#B8502C', light: '#D89F8B', dark: '#8A3C21' },
  'strawberry-blond': { base: '#D9935E', light: '#EAC4A6', dark: '#A36E47' },
  'dirty-blond': { base: '#D6AE62', light: '#EDD694', dark: '#A98443' },
  'golden-blond': { base: '#EDD08A', light: '#FAEBBB', dark: '#C7A35C' },
  'platinum-blond': { base: '#F2E6C4', light: '#F8F1DF', dark: '#B6AD93' },
  grey: { base: '#A8A6A2', light: '#CFCECC', dark: '#7E7D7A' },
};

/** Iris gradient stops, top → middle → bottom. */
export const IRIS: Record<EyeColor, [string, string, string]> = {
  brown: ['#4A2C17', '#7A4A26', '#C08A55'],
  'dark-brown': ['#2A180D', '#4E2E19', '#8A5A36'],
  hazel: ['#4F4422', '#8A7436', '#C8B36A'],
  green: ['#2C5E34', '#4E9A58', '#A6E0A0'],
  blue: ['#2A5FAE', '#4E8FD8', '#9EDCFF'],
  grey: ['#4C5866', '#7E8C9A', '#C6D2DC'],
  amber: ['#7A4A12', '#C4801E', '#F2C46A'],
};

const mix = (hex: string, to: number, t: number) =>
  '#' + [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (to - v) * t).toString(16).padStart(2, '0').toUpperCase();
  }).join('');

const triple = (hex: string): HairTriple => ({ base: hex, light: mix(hex, 255, 0.45), dark: mix(hex, 0, 0.25) });

/** The hair colors to draw with. A dye over `all` replaces the natural
 * color; `tips` and `streak` keep it and add the dye on top (hair.tsx). */
export function hairColors(c: Character): HairTriple {
  const d = c.hair.dye;
  return d && d.where === 'all' ? triple(d.color) : HAIR[c.hair.color];
}

/** The dye as a color triple, or null when the hair isn't dyed. */
export function dyeTriple(c: Character): HairTriple | null {
  return c.hair.dye ? triple(c.hair.dye.color) : null;
}

/** A per-sprite blink interval, so two sprites never blink in step. */
export function blinkSeconds(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return 4 + ((h >>> 0) % 15) / 10; // 4.0–5.4 s
}

/** A per-sprite integer seed (FNV-1a of the member id), so each sprite
 * gets its own daily outfit. */
export function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) % 100003;
}
