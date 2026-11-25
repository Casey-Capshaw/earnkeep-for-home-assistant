import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSprite, resolveSprite, HAIR_STYLES, FIELDS, type Spec } from '../src/world/sprites/traits.ts';
import { readdirSync } from 'node:fs';

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.sprite.json`, import.meta.url), 'utf8'));

test('minimal file is valid', () => {
  const r = validateSprite({ format: 'earnkeep-sprite', version: 1, hair: { color: 'black', texture: 'coily', styles: ['puffs'] }, body: { skin: 'tone-6' } });
  assert.deepEqual(r.errors, []);
  assert.ok(r.sprite);
});

test('fixtures are valid', () => {
  for (const n of ['fern', 'rowan']) assert.deepEqual(validateSprite(fx(n)).errors, [], n);
});

test('presets are valid and carry no unknown keys', () => {
  const dir = new URL('../src/world/sprites/presets/', import.meta.url);
  const files = readdirSync(dir).filter((n) => n.endsWith('.sprite.json'));
  assert.ok(files.length >= 2);
  for (const n of files) {
    const r = validateSprite(JSON.parse(readFileSync(new URL(n, dir), 'utf8')));
    assert.deepEqual([r.errors, r.warnings], [[], []], n);
  }
});

test('unknown key warns and is kept', () => {
  const r = validateSprite(fx('rowan'));
  assert.deepEqual(r.warnings, ['futureTrait: unknown field, kept as is']);
  assert.deepEqual((r.sprite as Record<string, unknown>).futureTrait, { anything: 1 });
});

test('wrong values are errors with path and allowed values', () => {
  const f = fx('fern');
  f.hair.styles[1] = 'fishtail';
  f.body.height = 2;
  f.wardrobe.colors[0] = 'teal';
  f.face.freckles = 'yes';
  const r = validateSprite(f);
  assert.equal(r.sprite, null);
  assert.equal(r.errors.length, 4);
  assert.match(r.errors.find((e) => e.startsWith('hair.styles[1]'))!, /"fishtail" is not allowed\. Allowed: loose, tucked/);
  assert.ok(r.errors.includes('body.height: 2 is out of range (0.85–1.15)'));
  assert.ok(r.errors.includes('wardrobe.colors[0]: "teal" is not a #RRGGBB color'));
  assert.ok(r.errors.includes('face.freckles: expected true or false'));
});

test('format, version and shape', () => {
  assert.deepEqual(validateSprite(null).errors, ['(file): expected a JSON object']);
  assert.deepEqual(validateSprite({ format: 'x', version: 1 }).errors, ['format: expected "earnkeep-sprite"']);
  assert.deepEqual(validateSprite({ format: 'earnkeep-sprite', version: 2 }).errors, ['version: this EarnKeep reads version 1; update EarnKeep to load this file']);
});

test('list limits', () => {
  const r = validateSprite({ format: 'earnkeep-sprite', version: 1, hair: { styles: [] } });
  assert.deepEqual(r.errors, ['hair.styles: needs 1–16 entries, has 0']);
});

test('nullable aid objects validate their fields', () => {
  const ok = validateSprite({ format: 'earnkeep-sprite', version: 1, aids: { mobility: { kind: 'wheelchair', color: '#2F6FD0' }, glasses: null } });
  assert.deepEqual(ok.errors, []);
  const bad = validateSprite({ format: 'earnkeep-sprite', version: 1, aids: { mobility: { kind: 'skates', color: '#2F6FD0' } } });
  assert.match(bad.errors[0], /^aids\.mobility\.kind: "skates" is not allowed/);
});

test('resolveSprite fills every default and keeps id', () => {
  const c = resolveSprite({ format: 'earnkeep-sprite', version: 1 }, 'm1');
  assert.equal(c.id, 'm1');
  assert.equal(c.body.height, 1);
  assert.equal(c.hair.styles.length > 0, true);
  assert.equal(c.aids.mobility, null);
  assert.ok(c.wardrobe.gearColors.length >= 3); // derived from colors when missing
  assert.deepEqual(c.wardrobe.gearColors, [c.wardrobe.colors[0], c.wardrobe.colors[1], c.wardrobe.colors[0]]);
  for (const s of c.hair.styles) assert.ok((HAIR_STYLES as readonly string[]).includes(s));
});

test('resolveSprite keeps given values', () => {
  const c = resolveSprite(fx('rowan'), 'm2');
  assert.equal(c.hair.color, 'dark-brown');
  assert.equal(c.face.eyes, 'hazel');
  assert.deepEqual(c.wardrobe.gearColors, ['#FACC15', '#1F2937', '#0F766E']);
  assert.equal(c.label, 'Rowan');
});

test('keys inherited from Object.prototype are unknown fields, not silently accepted', () => {
  const base = { format: 'earnkeep-sprite', version: 1 };
  const top = validateSprite({ ...base, constructor: 1 });
  assert.deepEqual(top.errors, []);
  assert.deepEqual(top.warnings, ['constructor: unknown field, kept as is']);
  const nested = validateSprite({ ...base, face: { toString: 1 } });
  assert.deepEqual(nested.errors, []);
  assert.deepEqual(nested.warnings, ['face.toString: unknown field, kept as is']);
  const proto = validateSprite(JSON.parse('{"format":"earnkeep-sprite","version":1,"__proto__":{"x":1}}'));
  assert.deepEqual(proto.errors, []);
  assert.deepEqual(proto.warnings, ['__proto__: unknown field, kept as is']);
});

// Drift guard: Character is hand-written, so walk FIELDS and check the
// resolved defaults match every leaf kind and are accepted by the validator.
function walk(spec: Spec, v: unknown, path: string): void {
  switch (spec.kind) {
    case 'object':
      if (v === null) { assert.ok(spec.nullable, `${path} null but not nullable`); return; }
      assert.equal(typeof v, 'object', path);
      assert.deepEqual(Object.keys(v as object).sort(), Object.keys(spec.fields).sort(), `${path} keys`);
      for (const [k, s] of Object.entries(spec.fields)) walk(s, (v as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
      return;
    case 'enum': assert.ok(typeof v === 'string' && spec.values.includes(v), `${path} enum`); return;
    case 'bool': assert.equal(typeof v, 'boolean', path); return;
    case 'number': assert.ok(typeof v === 'number' && v >= spec.min && v <= spec.max, `${path} number`); return;
    case 'string': assert.ok(typeof v === 'string' && v.length <= spec.maxLength, `${path} string`); return;
    case 'color': assert.ok(v === null ? spec.nullable : typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v), `${path} color`); return;
    case 'list':
      assert.ok(Array.isArray(v), `${path} list`);
      (v as unknown[]).forEach((x, i) => walk(spec.of, x, `${path}[${i}]`));
      return;
  }
}

test('resolved defaults match FIELDS leaf kinds and pass the validator', () => {
  const { id: _id, ...c } = resolveSprite({ format: 'earnkeep-sprite', version: 1 }, 'm1') as unknown as { id: string; wardrobe: Record<string, unknown> };
  walk(FIELDS, c, '');
  // gearColors is the one deliberate derivation: its table default is [] (below
  // the list minimum of 2), so resolveSprite derives it from colors. The resolved
  // value (3 entries) is what is fed back here, not the raw table default.
  const r = validateSprite({ format: 'earnkeep-sprite', version: 1, ...c });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});
