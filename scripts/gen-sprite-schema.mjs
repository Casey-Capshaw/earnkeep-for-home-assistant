#!/usr/bin/env node
// Writes docs/sprites/sprite.schema.json from the Sprite trait table.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toJsonSchema } from '../frontend/src/world/sprites/schema.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs/sprites/sprite.schema.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(toJsonSchema(), null, 2) + '\n');
console.log('wrote', out);
