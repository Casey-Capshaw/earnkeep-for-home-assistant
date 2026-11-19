// EarnKeep — character intake: turn pasted or uploaded text into a Sprite
// file, with the messages the Admin → People dialog shows. Pure, so it is
// unit-tested; the dialog only renders what this returns.

import { validateSprite, type SpriteFile } from './traits.ts';

/** The server's limit (sprite_check.MAX_BYTES), checked on compact JSON. */
export const MAX_BYTES = 16 * 1024;

export interface Intake {
  /** The file to save, or null while there are errors (or nothing typed). */
  sprite: SpriteFile | null;
  errors: string[];
  warnings: string[];
}

const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;

/** Where in the text a JSON.parse error points, as "line L, column C". */
function where(text: string, message: string): string {
  const pos = /position (\d+)/.exec(message);
  const lc = /line (\d+) column (\d+)/.exec(message);
  if (lc) return `line ${lc[1]}, column ${lc[2]}`;
  if (!pos) return '';
  const before = text.slice(0, Number(pos[1]));
  const line = before.split('\n').length;
  const col = before.length - before.lastIndexOf('\n');
  return `line ${line}, column ${col}`;
}

export function readCharacter(text: string): Intake {
  if (!text.trim()) return { sprite: null, errors: [], warnings: [] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    const at = where(text, (e as Error).message);
    return { sprite: null, errors: [`This isn't valid JSON${at ? ` (${at})` : ''}.`], warnings: [] };
  }
  const v = validateSprite(data);
  if (v.errors.length) return { sprite: null, errors: v.errors, warnings: v.warnings };
  if (bytes(v.sprite) > MAX_BYTES) {
    return { sprite: null, errors: ['A character file must be under 16 KB.'], warnings: v.warnings };
  }
  return v;
}

/** Pretty JSON for the editor and for export. */
export const formatCharacter = (file: SpriteFile) => `${JSON.stringify(file, null, 2)}\n`;

/** Export filename: the file's label, else the member's name. */
export function exportName(file: SpriteFile, memberName: string): string {
  const base = (typeof file.label === 'string' && file.label.trim()) || memberName || 'character';
  const slug = base.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').toLowerCase();
  return `${slug || 'character'}.sprite.json`;
}
