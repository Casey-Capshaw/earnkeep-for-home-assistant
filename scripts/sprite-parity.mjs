#!/usr/bin/env node
// Preset snapshots: renders each preset sprite in every pose to static SVG
// markup and compares it to frontend/test/snapshots/<name>.svg.txt.
// Exits 1 if any drawing changed; --update rewrites the snapshots.
// Then checks that every trait value a character file accepts is drawn:
// each must change the picture.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend');
// vite is installed under frontend/, not next to this script.
const req = createRequire(join(root, 'package.json'));
const native = (m) => import(pathToFileURL(req.resolve(m)).href);
// vite's ESM entry: require.resolve finds the CommonJS shim, which has no createServer.
const { createServer } = await import(pathToFileURL(join(root, 'node_modules/vite/dist/node/index.js')).href);
const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (p) => vite.ssrLoadModule(p);

// React loads natively (ssrLoadModule would try to inline its CommonJS);
// the rig modules get the same instance as vite externalizes it.
const React = (await native('react')).default;
const { renderToStaticMarkup } = await native('react-dom/server');
const traits = await load('/src/world/sprites/traits.ts');

const POSES = ['idle', 'walk', 'run', 'wave', 'cheer', 'jump', 'fly', 'sit', 'ride', 'climb', 'sleep', 'hang'];
async function snapshots() {
  const { Sprite } = await load('/src/world/sprites/Sprite.tsx');
  const dir = join(root, 'test/snapshots');
  mkdirSync(dir, { recursive: true });
  const write = process.argv.includes('--update');
  const presets = await load('/src/world/sprites/presets/index.ts');
  if (Object.keys(presets.PRESETS).length === 0) {
    console.log('snapshots: 0 presets — nothing checked');
    return 1;
  }
  let bad = 0;
  for (const [name, file] of Object.entries(presets.PRESETS)) {
    const character = traits.resolveSprite(file, name);
    const out = POSES.map((pose) => renderToStaticMarkup(React.createElement(Sprite, {
      character, outfit: { top: 'tee', top1: character.wardrobe.colors[0], top2: character.wardrobe.colors[1], print: character.wardrobe.prints[0], bottom: character.wardrobe.bottoms[0], bottom1: character.wardrobe.bottomColors[0], shoes: character.wardrobe.shoes[0], shoe1: character.wardrobe.shoeColors[0], hat: 'none', hat1: character.wardrobe.colors[0], hat2: '#FFFFFF', hair: character.hair.styles[0], ribbon: character.wardrobe.ribbons[0], extras: [], extra1: character.wardrobe.colors[0], wings: character.wardrobe.wings[0] },
      pose, expr: character.personality.rest[0], wind: false,
    }))).join('\n');
    const path = join(dir, `${name}.svg.txt`);
    if (write) writeFileSync(path, out);
    else if (!existsSync(path)) { console.log('  ✗ snapshot missing:', name); bad++; }
    else if (readFileSync(path, 'utf8') !== out) { console.log('  ✗ snapshot changed:', name); bad++; }
  }
  console.log(`snapshots: ${Object.keys(presets.PRESETS).length} presets, ${bad} changed${write ? ' (updated)' : ''}`);
  return bad ? 1 : 0;
}

/** Every accepted trait value must be drawn: setting it has to change the markup. */
async function coverage() {
  const { Sprite } = await load('/src/world/sprites/Sprite.tsx');
  const T = traits;
  const base = { format: 'earnkeep-sprite', version: 1, hair: { front: 'pulled-back', styles: ['loose'] } };
  const draw = (file, { hair = 'loose', pose = 'idle', expr = 'smile', seated = false, also } = {}) => {
    if (also) return draw(file, { hair, pose, expr, seated }) + draw(also, { hair, pose, expr, seated });
    const character = T.resolveSprite(file, 'x');
    return renderToStaticMarkup(React.createElement(Sprite, {
      character, pose, expr, wind: false, seated,
      outfit: { top: 'tee', top1: '#3D7DD8', top2: '#FFFFFF', print: 'none', bottom: 'pants', bottom1: '#3A4A63', shoes: 'sneakers', shoe1: '#2A2E35', hat: 'none', hat1: '#000000', hat2: '#000000', hair, ribbon: '#E68AA8', extras: [], extra1: '#000000', wings: null },
    }));
  };
  const withHair = (h) => ({ ...base, hair: { ...base.hair, ...h } });
  const cases = [];
  const add = (name, file, opts, against) => cases.push({ name, file, opts, against });
  for (const v of T.SKIN_TONES) add(`skin ${v}`, { ...base, body: { skin: v } });
  for (const v of T.HAIR_COLORS) add(`hair color ${v}`, withHair({ color: v }));
  for (const v of T.HAIR_LENGTHS) add(`hair length ${v}`, withHair({ length: v }));
  for (const v of T.HAIR_TEXTURES) add(`hair texture ${v}`, withHair({ texture: v }));
  for (const v of T.HAIR_FRONTS) add(`hair front ${v}`, withHair({ front: v }));
  // a style counts as drawn if it differs from the others under bangs or under a pulled-back hairline
  for (const v of T.HAIR_STYLES) add(`hairstyle ${v}`, base, { hair: v, also: withHair({ front: 'bangs' }) });
  for (const v of T.DYE_WHERE) add(`dye ${v}`, withHair({ dye: { color: '#7B5CFF', where: v } }), {}, base);
  for (const v of T.EYE_COLORS) add(`eyes ${v}`, { ...base, face: { eyes: v } });
  add('freckles', { ...base, face: { freckles: true } }, {}, base);
  add('missing tooth', { ...base, face: { missingTooth: true } }, { expr: 'grin' }, base);
  add('missing tooth (lopsided grin)', { ...base, face: { missingTooth: true, grin: 'toothy-lopsided' } }, { expr: 'grin' }, { ...base, face: { grin: 'toothy-lopsided' } });
  add('missing tooth (laugh)', { ...base, face: { missingTooth: true } }, { expr: 'laugh' }, base);
  for (const v of T.GLASSES_STYLES) add(`glasses ${v}`, { ...base, aids: { glasses: { style: v, color: '#3B2A22' } } });
  for (const k of T.HEARING_KINDS) for (const side of T.SIDES) add(`hearing ${k} ${side}`, { ...base, aids: { hearing: { kind: k, side, color: '#2F6FD0' } } });
  for (const v of T.HEAD_COVERINGS) add(`head covering ${v}`, { ...base, aids: { headCovering: { kind: v, color: '#3C5A99' } } });
  for (const v of T.MOBILITY_KINDS) add(`mobility ${v}`, { ...base, aids: { mobility: { kind: v, color: '#C94F6D' } } }, v === 'wheelchair' ? { seated: true } : {}, base);

  // Within a set, every value must differ from every other; a lone case must differ from its baseline.
  const seen = new Map();
  let bad = 0;
  for (const c of cases) {
    const out = draw(c.file, c.opts);
    if (c.against) {
      if (out === draw(c.against, { ...c.opts, seated: false })) { console.log('  ✗ not drawn:', c.name); bad++; }
      continue;
    }
    const group = c.name.replace(/ \S+$/, '');
    const key = `${group}\n${out}`;
    if (seen.has(key)) { console.log(`  ✗ drawn the same: ${c.name} and ${seen.get(key)}`); bad++; }
    else seen.set(key, c.name);
  }
  console.log(`coverage: ${cases.length} trait values, ${bad} not drawn`);
  return bad ? 1 : 0;
}

let code = 1;
try {
  code = (await snapshots()) | (await coverage());
} finally {
  await vite.close();
}
process.exit(code);
