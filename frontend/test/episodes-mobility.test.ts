import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveSprite } from '../src/world/sprites/traits.ts';
import { ableKid, can } from '../src/world/sprites/mobility.ts';

const fern = JSON.parse(readFileSync(new URL('./fixtures/fern.sprite.json', import.meta.url), 'utf8'));
const kidOf = (id: string, wheelchair: boolean) => {
  const f = structuredClone(fern);
  f.aids = { ...(f.aids ?? {}), mobility: wheelchair ? { kind: 'wheelchair', color: '#2F6FD0' } : null };
  return resolveSprite(f, id);
};
const ctx = (spec: Record<string, boolean>) => ({
  kids: Object.keys(spec),
  chars: Object.fromEntries(Object.entries(spec).map(([id, w]) => [id, kidOf(id, w)])),
});

test('wheelchair kid cannot do leg beats', () => {
  const c = ctx({ a: true, b: false });
  assert.equal(can(c, 'a', 'legs'), false);
  assert.equal(can(c, 'b', 'legs'), true);
});

test('one wheelchair kid: nobody can, so null', () => {
  assert.equal(ableKid(ctx({ a: true }), 'legs', 'a'), null);
});

test('two wheelchair kids: null', () => {
  assert.equal(ableKid(ctx({ a: true, b: true }), 'legs', 'a'), null);
});

test('wheelchair kid plus walking kid: the walking kid', () => {
  assert.equal(ableKid(ctx({ a: true, b: false }), 'legs', 'a'), 'b');
});

test('walking prefer is kept', () => {
  assert.equal(ableKid(ctx({ a: false, b: false }), 'legs', 'a'), 'a');
});

test('skips kids who cannot and wraps past the end of the list', () => {
  // a walks; b and c use wheelchairs
  assert.equal(ableKid(ctx({ a: false, b: true, c: true }), 'legs', 'b'), 'a');
  assert.equal(ableKid(ctx({ a: true, b: false, c: true }), 'legs', 'c'), 'b');
});
