import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveSprite } from '../src/world/sprites/traits.ts';
import { outfitFor } from '../src/world/sprites/wardrobe.ts';

const fx = (n: string) => resolveSprite(JSON.parse(readFileSync(new URL(`./fixtures/${n}.sprite.json`, import.meta.url), 'utf8')), n);
const mk = (s: number) => { let a = s >>> 0; return () => ((a = Math.imul(a ^ (a >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 4294967296; };
const SEASONS = ['winter', 'spring', 'summer', 'autumn'] as const;
const FORCED_TOPS = new Set(['raincoat', 'puffer', 'wetsuit', 'pjs', 'tunic', 'robe', 'bones', 'dragon', 'gown', 'sweater', 'flannel', 'tee', 'ruffle', 'dress']);
const FORCED_HATS = new Set(['hood', 'beanie', 'earmuffs', 'party', 'santa', 'elf', 'witch', 'crown', 'knight', 'pumpkin', 'cowboy', 'none', 'helmet', 'goggles', 'capback', 'headband', 'bow', 'flowercrown', 'bandana']);

for (const name of ['fern', 'rowan']) {
  test(`${name}: everyday outfits come from the closet`, () => {
    const c = fx(name);
    const seen = { tops: new Set<string>(), hats: new Set<string>(), styles: new Set<string>() };
    for (let d = 0; d < 365; d++) for (const hour of [9, 15]) {
      const ctx = { season: SEASONS[Math.floor(d / 91.25) % 4], weather: 'sunny', special: null, hour, kit: 'forest' } as const;
      const o = outfitFor(c, d, ctx as any, mk);
      assert.ok(c.wardrobe.tops.includes(o.top as any), `${name} day ${d}: top ${o.top}`);
      assert.ok(c.wardrobe.hats.includes(o.hat as any) || o.hat === 'beanie' || o.hat === 'earmuffs', `${name} day ${d}: hat ${o.hat}`);
      assert.ok(c.hair.styles.includes(o.hair as any), `${name} day ${d}: hair ${o.hair}`);
      assert.ok(c.wardrobe.colors.includes(o.top1), `${name}: top color ${o.top1}`);
      seen.tops.add(o.top); seen.hats.add(o.hat); seen.styles.add(o.hair);
    }
    for (const s of c.hair.styles) assert.ok(seen.styles.has(s), `${name}: style ${s} never worn`);
    for (const t of c.wardrobe.tops) assert.ok(seen.tops.has(t), `${name}: top ${t} never worn`);
  });

  test(`${name}: weather, holidays and bedtime still apply`, () => {
    const c = fx(name);
    const at = (weather: string, special: any, hour: number, season = 'autumn') => outfitFor(c, 7, { season, weather, special, hour, kit: 'forest' } as any, mk);
    assert.equal(at('rainy', null, 10).top, 'raincoat');
    assert.equal(at('snowy', null, 10, 'winter').top, 'puffer');
    assert.equal(at('sunny', null, 21).top, 'pjs');
    const h = at('sunny', { kind: 'halloween', intensity: 'full', colors: ['#E8732C'] }, 18);
    assert.ok(FORCED_TOPS.has(h.top));
    const x = at('sunny', { kind: 'christmas', colors: ['#C8333A'] }, 10, 'winter');
    assert.equal(x.hat, c.wardrobe.costumes.find((k) => k === 'santa' || k === 'elf') ?? 'santa');
    assert.ok(FORCED_HATS.has(h.hat));
  });
}
