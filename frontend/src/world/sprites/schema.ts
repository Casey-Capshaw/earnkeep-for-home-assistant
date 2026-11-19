// EarnKeep — the published JSON Schema for Sprite character files, built
// from the trait table. scripts/gen-sprite-schema.mjs writes it to
// docs/sprites/sprite.schema.json; a test fails if that file is stale.
import { FIELDS, FORMAT, VERSION, type Spec } from './traits.ts';

function node(s: Spec): Record<string, unknown> {
  const doc = s.doc ? { description: s.doc } : {};
  switch (s.kind) {
    case 'enum': return { ...doc, type: 'string', enum: [...s.values], default: s.default };
    case 'bool': return { ...doc, type: 'boolean', default: s.default };
    case 'number': return { ...doc, type: 'number', minimum: s.min, maximum: s.max, default: s.default };
    case 'string': return { ...doc, type: 'string', maxLength: s.maxLength };
    case 'color': return { ...doc, type: s.nullable ? ['string', 'null'] : 'string', pattern: '^#[0-9A-Fa-f]{6}$', ...(s.default !== '#000000' ? { default: s.default } : {}) };
    case 'list': return { ...doc, type: 'array', items: node(s.of), minItems: s.min, maxItems: s.max, ...(s.default.length ? { default: [...s.default] } : {}) };
    case 'object': return {
      ...doc,
      type: s.nullable ? ['object', 'null'] : 'object',
      properties: Object.fromEntries(Object.entries(s.fields).map(([k, f]) => [k, node(f)])),
    };
  }
}

export function toJsonSchema(): Record<string, unknown> {
  const root = node(FIELDS) as { properties: Record<string, unknown> };
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://github.com/Casey-Capshaw/earnkeep-for-home-assistant/blob/main/docs/sprites/sprite.schema.json',
    title: 'EarnKeep Sprite character',
    description: FIELDS.doc + ' Unknown fields are allowed (kept, with a warning). Never put photos in this file.',
    type: 'object',
    required: ['format', 'version'],
    properties: {
      format: { const: FORMAT },
      version: { const: VERSION },
      ...root.properties,
    },
  };
}
