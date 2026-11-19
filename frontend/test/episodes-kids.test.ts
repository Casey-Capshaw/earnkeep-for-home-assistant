import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveSprite } from '../src/world/sprites/traits.ts';
import { EPISODE_NAMES, cheerEpisode, makeEpisode, type Ctx } from '../src/world/sprites/episodes.ts';

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.sprite.json`, import.meta.url), 'utf8'));
const mk = (s: number) => { let a = s >>> 0; return () => ((a = Math.imul(a ^ (a >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 4294967296; };

/** Games built for two or more: with several kids they cast all of them. */
const GROUP = ['together', 'tag', 'kickball', 'overthrow', 'hideseek', 'gapleap', 'wingchase', 'karts', 'boxboo', 'duel', 'snowballs', 'waterballoons', 'leafpile', 'lanterns', 'stargaze', 'lakeboard', 'tubing', 'present', 'trickortreat', 'docksit', 'dance'];
/** Games for two that one kid plays with a critter friend. */
const WITH_PAL = ['together', 'tag', 'kickball', 'hideseek', 'boxboo'];

function ctx(n: number, seed: number, over: Partial<Ctx> = {}, wheelchair: string[] = []): Ctx {
  const ids = ['ash', 'bea', 'cy', 'dot'].slice(0, n);
  const chars = Object.fromEntries(ids.map((id, i) => {
    const f = fx(i % 2 ? 'fern' : 'rowan');
    if (wheelchair.includes(id)) f.aids = { ...(f.aids ?? {}), mobility: { kind: 'wheelchair', color: '#2F6FD0' } };
    return [id, resolveSprite(f, id)];
  }));
  return {
    r: mk(seed), today: mk(7), kids: ids, chars, season: 'autumn', weather: 'sunny', hour: 14, night: false, wet: false, snowy: false, windy: false,
    special: null, kit: 'forest', kit2: undefined, dock: { left: 440, top: 700, right: 840, bottom: 780 },
    cards: [{ left: 40, top: 90, right: 620, bottom: 720 }, { left: 660, top: 90, right: 1240, bottom: 720 }],
    outfits: {}, ...over,
  } as Ctx;
}
const cast = (e: { tracks: { who?: string; hidden?: boolean }[] }) => e.tracks.filter((t) => t.who).map((t) => t.who!);
// days that switch on the seasonal and holiday games
const DAYS: Partial<Ctx>[] = [
  {}, { season: 'winter', snowy: true }, { season: 'summer', kit: 'lake' }, { night: true, hour: 21 },
  { special: { kind: 'halloween', intensity: 'full', colors: [] } as any }, { special: { kind: 'birthday', intensity: 'full', colors: [] } as any },
];

for (const n of [1, 2, 3, 4]) {
  test(`${n} kid(s): every game builds, and no kid is cast twice`, () => {
    for (const name of EPISODE_NAMES) for (const day of DAYS) for (let seed = 1; seed <= 12; seed++) {
      const e = makeEpisode(name, ctx(n, seed, day));
      if (!e) continue;
      const who = cast(e).filter((w) => w !== undefined);
      // the broom rider in trick-or-treat is a second track for a flyer
      const counted = name === 'trickortreat' ? e.tracks.filter((t) => t.who && t.id !== 'broom').map((t) => t.who) : who;
      assert.equal(new Set(counted).size, counted.length, `${name} with ${n} cast a kid twice: ${counted}`);
      for (const t of e.tracks) for (const b of t.beats) assert.ok(Number.isFinite(b.dur) && b.dur >= 0, `${name}: bad beat`);
    }
  });
}

for (const n of [3, 4]) {
  test(`${n} kids: group games bring everyone in`, () => {
    for (const name of GROUP) for (const day of DAYS) for (let seed = 1; seed <= 6; seed++) {
      const c = ctx(n, seed, day);
      const e = makeEpisode(name, c);
      if (!e) continue;
      assert.deepEqual(new Set(cast(e)), new Set(c.kids), `${name} left someone out`);
    }
  });
}

test('one kid: two-player games cast a critter friend as the partner', () => {
  for (const name of WITH_PAL) {
    let seen = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const e = makeEpisode(name, ctx(1, seed));
      if (!e) continue;
      seen++;
      assert.ok(e.tracks.some((t) => t.thing === 'pal'), `${name} has no critter`);
      assert.deepEqual(cast(e), ['ash'], `${name} cast someone else`);
    }
    assert.ok(seen > 0, `${name} never played with one kid`);
  }
});

test('a kid in a wheelchair watches the leg games instead of sitting out', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const c = ctx(3, seed, {}, ['cy']);
    const e = makeEpisode('leafpile', c);
    if (e) assert.ok(cast(e).includes('cy'), 'leafpile left the wheelchair user out');
  }
});

test('the cheer spreads everyone out', () => {
  const e = cheerEpisode(ctx(4, 3));
  const stops = e.tracks.map((t) => t.beats[1].to!.x);
  for (let i = 0; i < stops.length; i++) for (let j = i + 1; j < stops.length; j++) assert.ok(Math.abs(stops[i] - stops[j]) > 20, `cheer: kids ${i} and ${j} stop together`);
});
