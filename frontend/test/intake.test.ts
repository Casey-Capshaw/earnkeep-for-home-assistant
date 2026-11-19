import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCharacter, exportName, formatCharacter, MAX_BYTES } from '../src/world/sprites/intake.ts';

const fern = readFileSync(new URL('./fixtures/fern.sprite.json', import.meta.url), 'utf8');

test('empty text is neither valid nor an error', () => {
  assert.deepEqual(readCharacter('   \n'), { sprite: null, errors: [], warnings: [] });
});

test('a valid file comes back ready to save', () => {
  const r = readCharacter(fern);
  assert.deepEqual(r.errors, []);
  assert.equal(r.sprite?.label, 'Fern');
});

test('broken JSON names the line and column', () => {
  const r = readCharacter('{\n  "format": "earnkeep-sprite",\n  "version": 1,,\n}');
  assert.equal(r.sprite, null);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /isn't valid JSON \(line 3, column \d+\)/);
});

test('trait errors and warnings come from the validator', () => {
  const r = readCharacter(JSON.stringify({ format: 'earnkeep-sprite', version: 1, hair: { color: 'teal' }, sparkles: true }));
  assert.equal(r.sprite, null);
  assert.match(r.errors[0], /^hair\.color: "teal"/);
  assert.deepEqual(r.warnings, ['sparkles: unknown field, kept as is']);
});

test('a warning alone still saves, keeping the unknown key', () => {
  const r = readCharacter(JSON.stringify({ format: 'earnkeep-sprite', version: 1, futureTrait: 1 }));
  assert.deepEqual(r.errors, []);
  assert.equal((r.sprite as Record<string, unknown>).futureTrait, 1);
});

test('files over the server limit are refused before saving', () => {
  const big = { format: 'earnkeep-sprite', version: 1, notes: 'x'.repeat(MAX_BYTES) };
  const r = readCharacter(JSON.stringify(big));
  assert.equal(r.sprite, null);
  assert.deepEqual(r.errors, ['A character file must be under 16 KB.']);
});

test('export name comes from the label, else the member name', () => {
  const f = readCharacter(fern).sprite!;
  assert.equal(exportName(f, 'Sam'), 'fern.sprite.json');
  assert.equal(exportName({ format: 'earnkeep-sprite', version: 1 }, 'Mary Jo'), 'mary-jo.sprite.json');
  assert.equal(exportName({ format: 'earnkeep-sprite', version: 1, label: '  ' }, ''), 'character.sprite.json');
});

test('formatted export reads back to the same file', () => {
  const f = readCharacter(fern).sprite!;
  assert.deepEqual(readCharacter(formatCharacter(f)).sprite, f);
});
