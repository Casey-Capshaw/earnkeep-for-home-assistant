// Dev-only: the Sprite rig at large size — every pose and a spread of
// outfits, drawn with the fictional fixture characters — for checking the
// drawing. http://localhost:5188/dev/sprites/
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Sprite, SPRITE_CSS } from '../../src/world/sprites/Sprite';
import { PROPS_CSS, RIDES, RideItem, ThingItem } from '../../src/world/sprites/props';
import { resolveSprite, type Character, type SpriteFile } from '../../src/world/sprites/traits';
import fernFile from '../../test/fixtures/fern.sprite.json';
import rowanFile from '../../test/fixtures/rowan.sprite.json';
import { outfitFor } from '../../src/world/sprites/wardrobe';
import { rng } from '../../src/world/scene';
import type { Pose } from '../../src/world/sprites/types';
import { CHAIR_SEAT_Y, Wheelchair, usesChair } from '../../src/world/sprites/aids';
import { HAIR_STYLES_GOLIVE } from '../../src/world/sprites/traits';

const q = new URLSearchParams(location.search);
const S = Number(q.get('s') || 0.9);
const POSES: Pose[] = ['idle', 'walk', 'run', 'wave', 'cheer', 'jump', 'fly', 'sit', 'dangle', 'peek', 'cover', 'look', 'dance', 'blow', 'throw', 'kick', 'hang', 'crouch', 'balance', 'point', 'sword', 'holdup', 'catch', 'lie'];
const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
const CHARS = { fern: resolveSprite(fernFile as SpriteFile, 'fern'), rowan: resolveSprite(rowanFile as SpriteFile, 'rowan') } satisfies Record<string, Character>;
type Who = keyof typeof CHARS;
/** A fixture with some traits changed: `with_('rowan', { face: { freckles: true } })`. */
const with_ = (who: Who, over: Record<string, any>): Character => {
  const file: any = structuredClone(who === 'fern' ? fernFile : rowanFile);
  for (const [k, v] of Object.entries(over)) file[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(file[k] ?? {}), ...v } : v;
  return resolveSprite(file as SpriteFile, `${who}-${JSON.stringify(over)}`);
};

const ride = (r: any) => (
  <svg width={140} height={200} viewBox="-70 -180 140 200" style={{ position: 'absolute', left: -70, top: -180, overflow: 'visible' }}>
    <RideItem id={r} moving color="#E2483D" color2="#2B2F36" />
  </svg>
);

const Cell: React.FC<{ ch?: Character; hair?: string; hat?: string; expr?: any; who: Who; pose: Pose; seed: number; season: (typeof seasons)[number]; hour?: number; weather?: string; special?: any; label?: string; held?: any; wings?: any; ride?: any }> = (p) => {
  const ch = p.ch ?? CHARS[p.who];
  const pose = p.ride ? RIDES[p.ride as keyof typeof RIDES].pose : p.pose;
  const chair = usesChair(ch, pose, !!p.ride);
  const chairEl = (layer: 'back' | 'front') => chair && (
    <svg width={140} height={200} viewBox="-70 -180 140 200" style={{ position: 'absolute', left: -70, top: -180, overflow: 'visible' }}>
      <Wheelchair color={ch.aids.mobility!.color} moving={pose === 'walk' || pose === 'run'} layer={layer} />
    </svg>
  );
  const o0 = outfitFor(ch, p.seed, { season: p.season, weather: (p.weather ?? 'sunny') as any, special: p.special ?? null, hour: p.hour ?? 10, kit: 'forest' }, rng);
  const o = { ...o0, ...(p.hair ? { hair: p.hair as any } : {}), ...(p.hat ? { hat: p.hat as any } : {}) };
  return (
    <div style={{ display: 'inline-block', width: 150 * S, height: 210 * S, position: 'relative', margin: 4, background: '#fff', borderRadius: 8 }}>
      <div style={{ position: 'absolute', left: '50%', top: 180 * S, transform: `scale(${S})`, transformOrigin: '0 0' }}>
        {p.ride && !RIDES[p.ride as keyof typeof RIDES].over && ride(p.ride)}
        {chairEl('back')}
        <div style={{ position: 'absolute', transform: `translateY(${chair ? CHAIR_SEAT_Y : p.ride ? RIDES[p.ride as keyof typeof RIDES].riderY : 0}px)` }}>
          <Sprite character={ch} outfit={o} pose={pose} held={p.held} wings={p.wings} expr={p.expr} seated={chair} />
        </div>
        {chairEl('front')}
        {p.ride && RIDES[p.ride as keyof typeof RIDES].over && ride(p.ride)}
      </div>
      <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: 10, color: '#555' }}>{p.label ?? `${p.who} ${p.pose}`}</div>
    </div>
  );
};

const App = () => (
  <div style={{ padding: 8 }} className="ek-sprites">
    <style>{SPRITE_CSS + PROPS_CSS}</style>
    {q.get('only') !== 'traits' ? null : <style>{'h3 ~ h3.rest, h3.rest ~ * { display: none; }'}</style>}
    <h3>Hair length × texture (loose)</h3>
    {(['short', 'medium', 'long'] as const).flatMap((length) => (['straight', 'wavy', 'curly', 'coily'] as const).map((texture) => (
      <Cell key={length + texture} who="rowan" ch={with_('rowan', { hair: { length, texture, front: 'pulled-back' } })} hair="loose" hat="none" pose="idle" seed={3} season="summer" label={`${length} ${texture}`} />
    )))}
    <h3>New hairstyles</h3>
    {HAIR_STYLES_GOLIVE.map((st, i) => <Cell key={st} who="fern" ch={with_(i % 2 ? 'fern' : 'rowan', { hair: { length: 'medium', texture: i % 2 ? 'coily' : 'straight', front: 'pulled-back' } })} hair={st} hat="none" pose="idle" seed={3} season="summer" label={st} />)}
    {(['ponytail', 'bob', 'locs', 'twists'] as const).map((st) => <Cell key={st + 'w'} who="fern" ch={with_('fern', { hair: { length: 'long', front: 'bangs', texture: 'straight' } })} hair={st} hat="none" pose="walk" seed={3} season="summer" label={`${st}, long, bangs, walking`} />)}
    <h3>Hairline, dye, and the old styles at each length</h3>
    {(['bangs', 'pulled-back', 'side-swept', 'curls'] as const).map((front) => <Cell key={front} who="rowan" ch={with_('rowan', { hair: { front, length: 'short', texture: 'straight' } })} hair="loose" hat="none" pose="idle" seed={3} season="summer" label={`front: ${front}`} />)}
    {(['all', 'tips', 'streak'] as const).map((where) => <Cell key={where} who="fern" ch={with_('fern', { hair: { length: 'long', texture: 'straight', front: 'pulled-back', dye: { color: '#7B5CFF', where } } })} hair="loose" hat="none" pose="idle" seed={3} season="summer" label={`dye: ${where}`} />)}
    {(['short', 'medium', 'long'] as const).flatMap((length) => (['pigtails', 'dutch', 'braidpony'] as const).map((st) => <Cell key={length + st} who="fern" ch={with_('fern', { hair: { length, texture: 'straight', front: 'pulled-back' } })} hair={st} hat="none" pose="idle" seed={3} season="summer" label={`${st} ${length}`} />))}
    <h3>Face: freckles, missing tooth, glasses</h3>
    <Cell who="rowan" ch={with_('rowan', { face: { freckles: true } })} hat="none" pose="idle" seed={3} season="summer" label="freckles" />
    <Cell who="fern" ch={with_('fern', { face: { freckles: true } })} hat="none" pose="idle" seed={3} season="summer" label="freckles, deeper skin" />
    {(['grin', 'laugh'] as const).map((e) => <Cell key={e} who="rowan" ch={with_('rowan', { face: { missingTooth: true } })} hat="none" pose="idle" seed={3} season="summer" expr={e} label={`missing tooth, ${e}`} />)}
    <Cell who="rowan" ch={with_('rowan', { face: { missingTooth: true, grin: 'toothy-lopsided' } })} hat="none" pose="idle" seed={3} season="summer" expr="grin" label="missing tooth, lopsided" />
    {(['round', 'square', 'cat-eye'] as const).map((style, i) => <Cell key={style} who="fern" ch={with_(i % 2 ? 'rowan' : 'fern', { aids: { glasses: { style, color: ['#3B2A22', '#B03A48', '#2F6FD0'][i] } } })} hat="none" pose={i === 2 ? 'walk' : 'idle'} seed={3} season="summer" label={`glasses: ${style}`} />)}
    <h3>Hearing aids and head coverings</h3>
    <Cell who="rowan" ch={with_('rowan', { aids: { hearing: { kind: 'behind-ear', side: 'both', color: '#2F6FD0' } }, hair: { front: 'pulled-back', length: 'short' } })} hair="loose" hat="none" pose="idle" seed={3} season="summer" label="behind-ear, both" />
    <Cell who="fern" ch={with_('fern', { aids: { hearing: { kind: 'cochlear', side: 'right', color: '#E9A23B' } } })} hat="none" pose="idle" seed={3} season="summer" label="cochlear, right" />
    {(['hijab', 'turban', 'patka', 'kippah', 'headwrap'] as const).map((kind, i) => <Cell key={kind} who="fern" ch={with_(i % 2 ? 'rowan' : 'fern', { aids: { headCovering: { kind, color: ['#3C5A99', '#C9772C', '#2E8B7A', '#22304F', '#B03A6C'][i] } } })} hat="none" pose={i === 0 ? 'wave' : 'idle'} seed={3} season="summer" label={kind} />)}
    <Cell who="fern" ch={with_('fern', { aids: { headCovering: { kind: 'hijab', color: '#7A4FA3' } } })} pose="walk" seed={6} season="winter" weather="snowy" label="hijab, winter, walking" />
    <h3>Mobility aids</h3>
    {(['idle', 'walk', 'wave', 'cheer', 'throw'] as const).map((pose) => <Cell key={pose} who="rowan" ch={with_('rowan', { aids: { mobility: { kind: 'wheelchair', color: '#2F6FD0' } } })} hat="none" pose={pose} seed={3} season="summer" label={`wheelchair ${pose}`} />)}
    {(['cane', 'crutches', 'walker'] as const).flatMap((kind) => (['idle', 'walk'] as const).map((pose) => <Cell key={kind + pose} who="fern" ch={with_('fern', { aids: { mobility: { kind, color: '#C94F6D' } } })} hat="none" pose={pose} seed={3} season="summer" label={`${kind} ${pose}`} />))}
    <h3 className="rest">Faces — Rowan</h3>
    {(['grin', 'smirk', 'determined', 'laugh', 'o', 'smile', 'wink', 'tongue'] as const).map((e) => <Cell key={e} who="rowan" pose="idle" seed={20261110} season="summer" expr={e} label={e} />)}
    <h3>Faces — Fern</h3>
    {(['smile', 'sparkle', 'scrunch', 'laugh', 'o', 'wink', 'tongue', 'blow'] as const).map((e, i) => <Cell key={e} who="fern" pose="idle" seed={20260000 + i * 37 + 37} season="summer" expr={e} label={e} />)}
    <h3>Poses</h3>
    {POSES.map((pose, i) => <Cell key={pose} who={i % 2 ? 'fern' : 'rowan'} pose={pose} seed={20261110} season="summer" wings={pose === 'fly' ? (i % 2 ? 'fairy' : 'dragon') : undefined} held={pose === 'blow' ? 'dandelion' : pose === 'holdup' ? 'balloons' : pose === 'sword' ? 'sword' : undefined} />)}
    <h3>Wardrobe across days</h3>
    {Array.from({ length: 16 }, (_, i) => <Cell key={i} who={i % 2 ? 'fern' : 'rowan'} pose="idle" seed={20260000 + i * 37} season={seasons[(i >> 1) % 4]} label={`${seasons[(i >> 1) % 4]} #${i}`} />)}
    <h3>Weather + holidays</h3>
    <Cell who="rowan" pose="walk" seed={5} season="spring" weather="rainy" label="rain" held="umbrella" />
    <Cell who="fern" pose="walk" seed={5} season="spring" weather="rainy" label="rain" />
    <Cell who="rowan" pose="idle" seed={6} season="winter" weather="snowy" label="snow" />
    <Cell who="fern" pose="idle" seed={6} season="winter" weather="snowy" label="snow" />
    <Cell who="rowan" pose="idle" seed={7} season="summer" label="wetsuit" />
    <Cell who="rowan" pose="cheer" seed={8} season="autumn" special={{ kind: 'halloween', intensity: 'full', colors: [] }} label="halloween" />
    <Cell who="fern" pose="cheer" seed={8} season="autumn" special={{ kind: 'halloween', intensity: 'full', colors: [] }} label="halloween" />
    <Cell who="rowan" pose="wave" seed={9} season="winter" special={{ kind: 'christmas', intensity: 'full', colors: [] }} label="christmas" />
    <Cell who="fern" pose="wave" seed={9} season="winter" special={{ kind: 'christmas', intensity: 'full', colors: [] }} label="christmas" />
    <Cell who="fern" pose="cheer" seed={10} season="autumn" special={{ kind: 'birthday', intensity: 'full', colors: ['#FF6B8A', '#FFD166', '#6EC6FF'] }} label="birthday" />
    <Cell who="rowan" pose="idle" seed={11} season="autumn" hour={20} label="pjs" />
    <h3>More autumn days</h3>
    {[3, 14, 29, 41, 57, 63, 77, 88].map((sd, i) => <Cell key={sd} who={i % 2 ? 'fern' : 'rowan'} pose="idle" seed={sd} season="autumn" label={`day #${sd}`} />)}
    <Cell who="rowan" pose="wave" seed={8} season="autumn" special={{ kind: 'halloween', intensity: 'full', colors: [] }} label="halloween 2" />
    <Cell who="fern" pose="wave" seed={4} season="winter" weather="snowy" label="puffer" />
    <h3>Rides + things</h3>
    {(['bike', 'kart', 'scooter', 'skateboard', 'sled', 'box', 'leafpile', 'cloud', 'broom', 'board', 'tube'] as const).map((r, i) => <Cell key={r} who={i % 2 ? 'fern' : 'rowan'} pose="idle" seed={3} season="summer" ride={r} label={r} />)}
    <div>
      {(['ball', 'beachball', 'frisbee', 'plane', 'rocket', 'kite', 'hook', 'present', 'snowman', 'puddle', 'butterfly', 'pumpkin', 'star'] as const).map((t) => (
        <svg key={t} width={110} height={130} viewBox="-55 -100 110 130" style={{ background: '#fff', margin: 4, borderRadius: 8 }}>
          <ThingItem id={t} variant={t === 'snowman' ? 3 : 1} moving={false} />
        </svg>
      ))}
      {[0, 1].flatMap((v) => [false, true].map((moving) => (
        <svg key={`pal${v}${moving}`} width={110} height={130} viewBox="-55 -100 110 130" style={{ background: '#fff', margin: 4, borderRadius: 8 }}>
          <ThingItem id="pal" variant={v} moving={moving} />
        </svg>
      )))}
    </div>
  </div>
);
createRoot(document.getElementById('root')!).render(<App />);
