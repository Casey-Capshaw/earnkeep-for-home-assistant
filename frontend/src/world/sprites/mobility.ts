import type { Character } from './traits';

/** What a beat needs from the kid doing it (more needs arrive with go-live aids). */
export type Need = 'legs';

interface KidsCtx { kids: string[]; chars: Record<string, Character | undefined> }

/** Can this kid do a beat that needs legs? A wheelchair user can't (their
 * chair is their ride); assisted aids are go-live work and count as yes. */
export const can = (c: KidsCtx, id: string, need: Need): boolean => {
  void need;
  return c.chars[id]?.aids.mobility?.kind !== 'wheelchair';
};

/** A kid who can do a `need` beat: `prefer` if they can, else the first kid after
 * `prefer` in `c.kids` order (wrapping, like `other`) who can, else null. With no
 * `prefer`, the search starts at the first kid. */
export const ableKid = (c: KidsCtx, need: Need, prefer?: string): string | null => {
  const n = c.kids.length;
  const at = prefer === undefined ? 0 : c.kids.indexOf(prefer);
  for (let i = 0; i < n; i++) {
    const id = c.kids[(at + i + n) % n];
    if (can(c, id, need)) return id;
  }
  return null;
};
