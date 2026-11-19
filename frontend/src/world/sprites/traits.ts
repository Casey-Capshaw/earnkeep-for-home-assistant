// EarnKeep — Sprite character files: the one trait table. The validator,
// the defaults resolver, the published JSON Schema (schema.ts) and the
// types all come from FIELDS. Format reference: docs/sprites/README.md

export const FORMAT = 'earnkeep-sprite';
export const VERSION = 1;

export const SKIN_TONES = ['tone-1', 'tone-2', 'tone-3', 'tone-4', 'tone-5', 'tone-6', 'tone-7', 'tone-8'] as const;
export const HAIR_COLORS = ['black', 'dark-brown', 'brown', 'light-brown', 'auburn', 'red', 'strawberry-blond', 'dirty-blond', 'golden-blond', 'platinum-blond', 'grey'] as const;
export const HAIR_LENGTHS = ['short', 'medium', 'long'] as const;
export const HAIR_TEXTURES = ['straight', 'wavy', 'curly', 'coily'] as const;
export const HAIR_FRONTS = ['bangs', 'pulled-back', 'side-swept', 'curls'] as const;
export const HAIR_STYLES_TODAY = ['loose', 'tucked', 'lowpony', 'windswept', 'dutch', 'pigtails', 'crown', 'sidebraid', 'buns', 'braidpony', 'waterfall', 'strands'] as const;
export const HAIR_STYLES_GOLIVE = ['ponytail', 'buzz', 'puffs', 'afro', 'twists', 'locs', 'cornrows', 'bob'] as const;
export const HAIR_STYLES = [...HAIR_STYLES_TODAY, ...HAIR_STYLES_GOLIVE] as const;
export const DYE_WHERE = ['all', 'tips', 'streak'] as const;
export const EYE_COLORS = ['brown', 'dark-brown', 'hazel', 'green', 'blue', 'grey', 'amber'] as const;
export const GLASSES_STYLES = ['round', 'square', 'cat-eye'] as const;
export const HEARING_KINDS = ['behind-ear', 'cochlear'] as const;
export const SIDES = ['left', 'right', 'both'] as const;
export const HEAD_COVERINGS = ['hijab', 'turban', 'patka', 'kippah', 'headwrap'] as const;
export const MOBILITY_KINDS = ['wheelchair', 'crutches', 'walker', 'cane'] as const;
export const TOPS = ['tee', 'tank', 'ruffle', 'dress', 'hoodie', 'raincoat', 'puffer', 'sweater', 'overalls', 'wetsuit', 'jersey', 'flannel', 'rashguard', 'swim'] as const;
export const BOTTOMS = ['shorts', 'pants', 'leggings', 'skirt'] as const;
export const PRINTS = ['none', 'star', 'bolt', 'heart', 'flower', 'mountain', 'stripes', 'number', 'snowflake', 'pony', 'rainbow', 'pixel', 'saber'] as const;
export const HATS = ['none', 'cap', 'capback', 'beanie', 'sunhat', 'flowercrown', 'earmuffs', 'bandana', 'headband', 'bow', 'sweatband', 'cowboy', 'newsboy', 'clip'] as const;
export const SHOES = ['sneakers', 'sandals', 'lightup'] as const;
export const EXTRAS = ['necklace', 'backpack', 'scarf'] as const;
export const WINGS = ['fairy', 'butterfly', 'dragonfly', 'dragon', 'bat', 'feather'] as const;
export const COSTUMES_HALLOWEEN = ['knight', 'dragon', 'skeleton', 'cowboy', 'witch', 'princess', 'pumpkin', 'prairie'] as const;
export const COSTUMES_CHRISTMAS = ['santa', 'elf'] as const;
export const COSTUMES = [...COSTUMES_HALLOWEEN, ...COSTUMES_CHRISTMAS] as const;
export const EXPRS = ['smile', 'grin', 'laugh', 'o', 'blow', 'closed', 'wink', 'tongue', 'smirk', 'scrunch', 'sparkle', 'determined'] as const;
export const LIKES = ['flying', 'wheels', 'water', 'snow', 'sports', 'nature', 'animals', 'art', 'music', 'make-believe', 'building'] as const;
export const PROPS = ['wand', 'net', 'sword', 'dandelion', 'bubblewand', 'lantern', 'flashlight', 'jar', 'umbrella', 'balloon', 'teddy', 'bucket', 'stick', 'flower', 'leaf', 'popsicle', 'flag'] as const;

/* ------------------------------------------------------------------ */
/* field table                                                         */
/* ------------------------------------------------------------------ */

export type Spec =
  | { kind: 'enum'; values: readonly string[]; default: string; doc: string }
  | { kind: 'bool'; default: boolean; doc: string }
  | { kind: 'number'; min: number; max: number; default: number; doc: string }
  | { kind: 'string'; maxLength: number; default: string; doc: string }
  | { kind: 'color'; default: string | null; nullable: boolean; doc: string }
  | { kind: 'list'; of: Spec; min: number; max: number; default: readonly string[]; doc: string }
  | ObjSpec;
export interface ObjSpec { kind: 'object'; fields: Record<string, Spec>; nullable: boolean; doc: string }

const en = (values: readonly string[], d: string, doc: string): Spec => ({ kind: 'enum', values, default: d, doc });
const bool = (d: boolean, doc: string): Spec => ({ kind: 'bool', default: d, doc });
const color = (d: string | null, doc: string, nullable = false): Spec => ({ kind: 'color', default: d, nullable, doc });
const list = (of: Spec, min: number, max: number, d: readonly string[], doc: string): Spec => ({ kind: 'list', of, min, max, default: d, doc });
const obj = (fields: Record<string, Spec>, doc: string, nullable = false): ObjSpec => ({ kind: 'object', fields, nullable, doc });
const item = (values: readonly string[]) => en(values, values[0], '');
const hex = color('#000000', '');

export const FIELDS: ObjSpec = obj({
  label: { kind: 'string', maxLength: 40, default: '', doc: 'Optional name shown in the preview and used for the export filename.' },
  body: obj({
    height: { kind: 'number', min: 0.85, max: 1.15, default: 1, doc: 'Relative size; 1 is the default.' },
    skin: en(SKIN_TONES, 'tone-3', 'Skin tone, tone-1 (lightest) to tone-8 (deepest).'),
  }, 'Body.'),
  hair: obj({
    color: en(HAIR_COLORS, 'brown', 'Natural hair color.'),
    dye: obj({ color: color('#7B5CFF', 'Dye color.'), where: en(DYE_WHERE, 'all', 'Where the dye shows.') }, 'Dyed hair, or null.', true),
    length: en(HAIR_LENGTHS, 'medium', 'Hair length.'),
    texture: en(HAIR_TEXTURES, 'straight', 'Hair texture.'),
    front: en(HAIR_FRONTS, 'pulled-back', 'How the hair sits at the forehead.'),
    cowlick: bool(false, 'A tuft on top, shown when no hat is worn.'),
    styles: list(item(HAIR_STYLES), 1, 16, ['loose'], 'Daily hairstyle rotation; repeats add weight.'),
  }, 'Hair.'),
  face: obj({
    eyes: en(EYE_COLORS, 'brown', 'Eye color.'),
    eyeSize: en(['medium', 'big'], 'medium', 'Eye size.'),
    lashes: en(['soft', 'full'], 'soft', 'Lash line.'),
    brows: en(['fine', 'bold'], 'fine', 'Brows: fine, or bold (heavier, angled up and out).'),
    chin: en(['soft', 'pointed'], 'soft', 'Chin shape.'),
    smile: en(['plain', 'cat'], 'plain', 'Resting smile.'),
    grin: en(['even', 'toothy-lopsided'], 'even', 'Big grin.'),
    blush: en(['light', 'rosy'], 'light', 'Cheek blush.'),
    freckles: bool(false, 'Freckles across the nose.'),
    missingTooth: bool(false, 'A missing front tooth in grins.'),
    earrings: color(null, 'Earring stud color, or null for none.', true),
  }, 'Face.'),
  aids: obj({
    glasses: obj({ style: en(GLASSES_STYLES, 'round', 'Frame shape.'), color: color('#3B2A22', 'Frame color.') }, 'Glasses, or null.', true),
    hearing: obj({ kind: en(HEARING_KINDS, 'behind-ear', 'Type.'), side: en(SIDES, 'both', 'Which ear.'), color: color('#C9B6A4', 'Color.') }, 'Hearing aids, or null.', true),
    headCovering: obj({ kind: en(HEAD_COVERINGS, 'hijab', 'Type.'), color: color('#3C5A99', 'Color.') }, 'Head covering, or null.', true),
    mobility: obj({ kind: en(MOBILITY_KINDS, 'wheelchair', 'Type.'), color: color('#3D7DD8', 'Color.') }, 'Mobility aid, or null.', true),
  }, 'Aids.'),
  wardrobe: obj({
    colors: list(hex, 3, 12, ['#3D7DD8', '#5BAA62', '#E5803A', '#C94F6D', '#FFFFFF'], 'Favorite colors for tops, hats and extras.'),
    bottomColors: list(hex, 1, 12, ['#3A4A63', '#7A6650', '#6A86A3'], 'Colors for shorts, pants, leggings and skirts.'),
    shoeColors: list(hex, 1, 12, ['#2A2E35', '#D8563F', '#FFFFFF'], 'Shoe colors.'),
    ribbons: list(hex, 1, 12, ['#E68AA8', '#FFFFFF', '#4DB6AC'], 'Hair ties and bows.'),
    gearColors: list(hex, 2, 4, [], 'Ride body, ride trim and helmet colors. Defaults to the first favorite colors.'),
    tops: list(item(TOPS), 1, 12, ['tee', 'hoodie', 'sweater', 'tank'], 'Everyday tops; the season picks among them.'),
    bottoms: list(item(BOTTOMS), 1, 12, ['pants', 'shorts'], 'Everyday bottoms.'),
    prints: list(item(PRINTS), 1, 12, ['none', 'star', 'stripes'], 'Prints on tops.'),
    hats: list(item(HATS), 1, 12, ['none', 'cap', 'beanie'], 'Everyday hats.'),
    shoes: list(item(SHOES), 1, 12, ['sneakers'], 'Everyday shoes.'),
    extras: list(item(EXTRAS), 0, 12, [], 'Everyday extras.'),
    wings: list(item(WINGS), 1, 12, ['fairy'], 'Wings for flying games.'),
    costumes: list(item(COSTUMES), 1, 12, ['knight', 'santa'], 'Halloween and Christmas costumes.'),
  }, 'The closet.'),
  personality: obj({
    rest: list(item(EXPRS), 1, 8, ['smile'], 'Faces at rest.'),
    go: list(item(EXPRS), 1, 8, ['smile', 'determined'], 'Faces in action.'),
    joy: list(item(EXPRS), 1, 8, ['laugh'], 'Faces when celebrating.'),
    likes: list(item(LIKES), 0, 6, [], 'Activities they lead.'),
    props: list(item(PROPS), 1, 12, ['stick', 'flower', 'leaf'], 'Things they carry.'),
  }, 'Personality.'),
}, 'An EarnKeep Sprite character.');

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

type V<T extends readonly string[]> = T[number];
export type HairStyle = V<typeof HAIR_STYLES>;
export interface Character {
  id: string;
  label: string;
  body: { height: number; skin: V<typeof SKIN_TONES> };
  hair: {
    color: V<typeof HAIR_COLORS>; dye: { color: string; where: V<typeof DYE_WHERE> } | null;
    length: V<typeof HAIR_LENGTHS>; texture: V<typeof HAIR_TEXTURES>; front: V<typeof HAIR_FRONTS>;
    cowlick: boolean; styles: V<typeof HAIR_STYLES>[];
  };
  face: {
    eyes: V<typeof EYE_COLORS>; eyeSize: 'medium' | 'big'; lashes: 'soft' | 'full'; brows: 'fine' | 'bold';
    chin: 'soft' | 'pointed'; smile: 'plain' | 'cat'; grin: 'even' | 'toothy-lopsided'; blush: 'light' | 'rosy';
    freckles: boolean; missingTooth: boolean; earrings: string | null;
  };
  aids: {
    glasses: { style: V<typeof GLASSES_STYLES>; color: string } | null;
    hearing: { kind: V<typeof HEARING_KINDS>; side: V<typeof SIDES>; color: string } | null;
    headCovering: { kind: V<typeof HEAD_COVERINGS>; color: string } | null;
    mobility: { kind: V<typeof MOBILITY_KINDS>; color: string } | null;
  };
  wardrobe: {
    colors: string[]; bottomColors: string[]; shoeColors: string[]; ribbons: string[]; gearColors: string[];
    tops: V<typeof TOPS>[]; bottoms: V<typeof BOTTOMS>[]; prints: V<typeof PRINTS>[]; hats: V<typeof HATS>[];
    shoes: V<typeof SHOES>[]; extras: V<typeof EXTRAS>[]; wings: V<typeof WINGS>[]; costumes: V<typeof COSTUMES>[];
  };
  personality: {
    rest: V<typeof EXPRS>[]; go: V<typeof EXPRS>[]; joy: V<typeof EXPRS>[];
    likes: V<typeof LIKES>[]; props: V<typeof PROPS>[];
  };
}
/** A character file as stored: every section optional, unknown keys allowed. */
export type SpriteFile = { format: typeof FORMAT; version: number } & Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* validation                                                          */
/* ------------------------------------------------------------------ */

const HEX = /^#[0-9A-Fa-f]{6}$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const show = (v: unknown) => JSON.stringify(v);

function check(spec: Spec, v: unknown, path: string, errors: string[], warnings: string[]): void {
  switch (spec.kind) {
    case 'enum':
      if (typeof v !== 'string' || !spec.values.includes(v)) errors.push(`${path}: ${show(v)} is not allowed. Allowed: ${spec.values.join(', ')}`);
      return;
    case 'bool':
      if (typeof v !== 'boolean') errors.push(`${path}: expected true or false`);
      return;
    case 'number':
      if (typeof v !== 'number' || Number.isNaN(v)) errors.push(`${path}: expected a number`);
      else if (v < spec.min || v > spec.max) errors.push(`${path}: ${v} is out of range (${spec.min}–${spec.max})`);
      return;
    case 'string':
      if (typeof v !== 'string') errors.push(`${path}: expected text`);
      else if (v.length > spec.maxLength) errors.push(`${path}: longer than ${spec.maxLength} characters`);
      return;
    case 'color':
      if (v === null && spec.nullable) return;
      if (typeof v !== 'string' || !HEX.test(v)) errors.push(`${path}: ${show(v)} is not a #RRGGBB color`);
      return;
    case 'list':
      if (!Array.isArray(v)) { errors.push(`${path}: expected a list`); return; }
      if (v.length < spec.min || v.length > spec.max) errors.push(`${path}: needs ${spec.min}–${spec.max} entries, has ${v.length}`);
      v.forEach((x, i) => check(spec.of, x, `${path}[${i}]`, errors, warnings));
      return;
    case 'object':
      if (v === null && spec.nullable) return;
      if (!isObj(v)) { errors.push(`${path}: expected an object${spec.nullable ? ' or null' : ''}`); return; }
      for (const [k, x] of Object.entries(v)) {
        const p = path ? `${path}.${k}` : k;
        if (Object.prototype.hasOwnProperty.call(spec.fields, k)) check(spec.fields[k], x, p, errors, warnings);
        else warnings.push(`${p}: unknown field, kept as is`);
      }
  }
}

export function validateSprite(input: unknown): { sprite: SpriteFile | null; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(input)) return { sprite: null, errors: ['(file): expected a JSON object'], warnings };
  if (input.format !== FORMAT) return { sprite: null, errors: [`format: expected "${FORMAT}"`], warnings };
  if (input.version !== VERSION) {
    const msg = typeof input.version === 'number' && input.version > VERSION
      ? `version: this EarnKeep reads version ${VERSION}; update EarnKeep to load this file`
      : `version: expected ${VERSION}`;
    return { sprite: null, errors: [msg], warnings };
  }
  const { format: _f, version: _v, ...rest } = input;
  check(FIELDS, rest, '', errors, warnings);
  return { sprite: errors.length ? null : (input as SpriteFile), errors, warnings };
}

/* ------------------------------------------------------------------ */
/* defaults                                                            */
/* ------------------------------------------------------------------ */

function fill(spec: Spec, v: unknown): unknown {
  if (spec.kind === 'object') {
    if (v === null && spec.nullable) return null;
    if (v === undefined && spec.nullable) return null; // absent aid = none
    const src = isObj(v) ? v : {};
    const out: Record<string, unknown> = {};
    for (const [k, s] of Object.entries(spec.fields)) out[k] = fill(s, src[k]);
    return out;
  }
  if (v === undefined) return spec.kind === 'list' ? [...spec.default] : spec.default;
  return Array.isArray(v) ? [...v] : v;
}

/** A validated file → a fully specified Character the rig can draw. */
export function resolveSprite(file: SpriteFile, id: string): Character {
  const c = fill(FIELDS, file) as Omit<Character, 'id'>;
  const w = c.wardrobe;
  if (w.gearColors.length === 0) w.gearColors = [w.colors[0], w.colors[1], w.colors[0]];
  else if (w.gearColors.length === 2) w.gearColors = [w.gearColors[0], w.gearColors[1], w.gearColors[0]];
  return { id, ...c };
}
