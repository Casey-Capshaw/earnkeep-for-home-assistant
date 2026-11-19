import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toJsonSchema } from '../src/world/sprites/schema.ts';

test('committed schema is up to date (run: node scripts/gen-sprite-schema.mjs)', () => {
  const committed = JSON.parse(readFileSync(new URL('../../docs/sprites/sprite.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(committed, toJsonSchema());
});

test('schema shape', () => {
  const s = toJsonSchema() as any;
  assert.equal(s.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.deepEqual(s.required, ['format', 'version']);
  assert.equal(s.properties.format.const, 'earnkeep-sprite');
  assert.ok(s.properties.hair.properties.styles.items.enum.includes('dutch'));
  assert.deepEqual(s.properties.aids.properties.mobility.type, ['object', 'null']);
  assert.equal(s.properties.body.properties.height.maximum, 1.15);
});
