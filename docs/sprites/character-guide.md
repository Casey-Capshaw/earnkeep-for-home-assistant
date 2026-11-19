# Making a character file: a guide for AI assistants

This page is for an AI assistant (Claude or another) that a parent asks to
make an EarnKeep character for their child. The parent gives you photos or a
description; you give back one JSON file they can paste into EarnKeep
(Admin → People → **Character**).

EarnKeep draws each child as a tiny animated character, about the size of a
snail on a 10-inch tablet, playing in a storybook world. The file only picks
from fixed lists of traits. It is a cartoon, not a portrait: aim for "you can
tell who that is", not a likeness.

The format reference is [`README.md`](README.md) in this folder, and
[`sprite.schema.json`](sprite.schema.json) is the JSON Schema. Two complete
examples ship as presets:
[`fern.sprite.json`](../../frontend/test/fixtures/fern.sprite.json) and
[`rowan.sprite.json`](../../frontend/test/fixtures/rowan.sprite.json).

## Ground rules

- **Never put a photo, a link to a photo, or a description of a photo in the
  file.** The file holds trait values only. Use photos to choose values, then
  stop using them.
- Don't keep or repeat details you don't need: no full names, birthdays,
  schools or places. `label` is optional; a first name or nickname is enough,
  and it only names the export file.
- Use only values from the lists below. For every trait, pick the **nearest
  allowed value**. Don't invent one; EarnKeep will refuse it.
- When something important to the child has no close value (a hair style, an
  aid, a head covering), use the nearest one, tell the parent what you
  substituted, and suggest they open an issue on the EarnKeep repository
  asking for it.
- Ask the parent about what photos can't show: favorite colors, clothes they
  love or refuse, what they like to do, what they carry around.

## Steps

1. **Gather.** Photos (a couple of everyday ones are best) or a description.
   Then ask the parent:
   - favorite colors, and colors they never wear;
   - everyday clothes (dresses? hoodies? jerseys? overalls?), hats, shoes;
   - what they love doing (flying, wheels, water, snow, sports, nature,
     animals, art, music, make-believe, building);
   - things they like to hold (a wand, a net, a teddy…);
   - Halloween costume ideas, and Santa or elf for Christmas;
   - glasses, hearing aids, a head covering or a mobility aid, if any.
2. **Map** each trait using the notes below.
3. **Write** one JSON object with `"format": "earnkeep-sprite"` and
   `"version": 1`. Leave out anything you're unsure about; it falls back to
   a sensible default.
4. **Check** it (see the end of this page), fix any errors, and give the
   parent the file with a one-line note on any substitutions.

## Mapping notes

### Body

- `height`: 0.85–1.15 around 1. Use it only for clear differences between
  siblings (a younger child 0.9, an older one 1.08). Don't guess real heights.
- `skin`: pick the closest tone by the base color. Compare cheeks and
  forehead in daylight, not shadows.

  | tone | base | | tone | base |
  |---|---|---|---|---|
  | `tone-1` | `#FBE3D2` | | `tone-5` | `#C08A5E` |
  | `tone-2` | `#F7D5BC` | | `tone-6` | `#A06A44` |
  | `tone-3` | `#EDC09C` | | `tone-7` | `#7D4E30` |
  | `tone-4` | `#D9A57A` | | `tone-8` | `#5A3722` |

### Hair

- `color`, by base color: `black` `#2B2522`, `dark-brown` `#4A3020`,
  `brown` `#6E4A2E`, `light-brown` `#9A7048`, `auburn` `#8E3F24`, `red`
  `#B8502C`, `strawberry-blond` `#D9935E`, `dirty-blond` `#D6AE62`,
  `golden-blond` `#EDD08A`, `platinum-blond` `#F2E6C4`, `grey` `#A8A6A2`.
  Judge the overall color, not highlights. Dyed hair: set the natural
  `color` and add `dye` with the dye color and `all`, `tips` or `streak`.
- `length`: `short` (above the ears or jaw), `medium` (to the shoulders),
  `long` (past the shoulders). `texture`: `straight`, `wavy`, `curly` or
  `coily`.
- `front`: `bangs` (a fringe), `pulled-back` (forehead clear, centre part),
  `side-swept`, `curls`. `cowlick`: a tuft that sticks up on top.
- `styles`: how the hair is worn on different days, 1–16 entries. Repeat a
  style to make it more common: `["loose", "loose", "loose", "ponytail"]` is
  mostly loose. Skip styles that don't suit the length (no pigtails on short
  hair). Values: `loose`, `tucked` (behind the ears), `lowpony`, `ponytail`,
  `windswept`, `dutch` (two Dutch braids), `pigtails`, `crown` (a crown
  braid), `sidebraid`, `buns`, `braidpony`, `waterfall`, `strands`, `buzz`,
  `puffs`, `afro`, `twists`, `locs`, `cornrows`, `bob`.

### Face

All of these are small cartoon choices; pick what reads closest.

- `eyes`: `brown`, `dark-brown`, `hazel`, `green`, `blue`, `grey`, `amber`.
- `eyeSize`: `medium` or `big` (round, wide eyes). `lashes`: `soft` or
  `full`. `brows`: `fine` or `bold` (heavier, angled up and out). `chin`:
  `soft` (round face) or `pointed`.
- `smile` (at rest): `plain` (a simple upturned line) or `cat` (a small
  w-shaped smile). `grin`: `even` or `toothy-lopsided`.
- `blush`: `light` or `rosy`. `freckles`, `missingTooth`: true or false.
  `earrings`: `null`, or a color for small studs.

### Aids

Include an aid only when the child has it; leave the field out (or `null`)
otherwise.

- `glasses`: `{ "style": "round" | "square" | "cat-eye", "color": "#…" }`.
- `hearing`: `{ "kind": "behind-ear" | "cochlear", "side": "left" | "right" | "both", "color": "#…" }`.
- `headCovering`: `{ "kind": "hijab" | "turban" | "patka" | "kippah" | "headwrap", "color": "#…" }`.
- `mobility`: `{ "kind": "wheelchair" | "crutches" | "walker" | "cane", "color": "#…" }`.
  A character with a wheelchair rides it wherever others walk or run, and
  still flies, sleds and races karts. Games swap leg-only moves for ones
  that suit.

### Wardrobe

The character only ever wears what is listed here (plus raincoats, snow gear,
pajamas and holiday outfits, which EarnKeep adds itself). Lists hold 1–12
entries, and repeats add weight.

- Colors are `#RRGGBB`. Turn the parent's color words into clear, bright
  hexes; the world is a soft storybook palette, so muddy colors look dull.
  - `colors` (3+): tops, hats, extras. `bottomColors`, `shoeColors`.
  - `ribbons`: hair ties and bows. `gearColors` (2–4): bike or kart body,
    trim, helmet.
- `tops`: `tee`, `tank`, `ruffle`, `dress`, `hoodie`, `sweater`, `overalls`,
  `jersey`, `flannel`, `rashguard`, `swim`. Include at least one warm top
  (`hoodie`, `sweater`, `flannel`) and one for hot days (`tank`,
  `rashguard`, `swim`), or the character wears the same thing year round.
  `raincoat`, `puffer` and `wetsuit` are added by the weather; you can leave
  them out.
- `bottoms`: `shorts`, `pants`, `leggings`, `skirt`.
- `prints` on tops: `none`, `star`, `bolt`, `heart`, `flower`, `mountain`,
  `stripes`, `number`, `snowflake`, `pony`, `rainbow`, `pixel`, `saber`.
- `hats`: `none`, `cap`, `capback`, `beanie`, `sunhat`, `flowercrown`,
  `earmuffs`, `bandana`, `headband`, `bow`, `sweatband`, `cowboy`,
  `newsboy`, `clip`. Add `none` to have bare-headed days.
- `shoes`: `sneakers`, `sandals`, `lightup`. `extras`: `necklace`,
  `backpack`, `scarf`.
- `wings` for flying games: `fairy`, `butterfly`, `dragonfly`, `dragon`,
  `bat`, `feather`.
- `costumes`: for Halloween, `knight`, `dragon`, `skeleton`, `cowboy`,
  `witch`, `princess`, `pumpkin`, `prairie`; for Christmas, `santa` or `elf`
  (the first one listed is used).

### Personality

- `rest`, `go`, `joy`: the expressions used at rest, in action and when
  celebrating. Values: `smile`, `grin`, `laugh`, `o` (surprised), `blow`,
  `closed` (eyes shut), `wink`, `tongue`, `smirk`, `scrunch`, `sparkle`,
  `determined`. A shy child might rest on `smile`; a cheeky one on `smirk`
  and `tongue`.
- `likes` (up to 6) decides who leads which games: `flying`, `wheels`,
  `water`, `snow`, `sports`, `nature`, `animals`, `art`, `music`,
  `make-believe`, `building`.
- `props`, things they carry around: `wand`, `net`, `sword`, `dandelion`,
  `bubblewand`, `lantern`, `flashlight`, `jar`, `umbrella`, `balloon`,
  `teddy`, `bucket`, `stick`, `flower`, `leaf`, `popsicle`, `flag`.

Some values are accepted before EarnKeep can draw them. It then draws the
nearest one it has, so a file written today keeps working as the drawings
improve.

## Checking the file

- Validate it against [`sprite.schema.json`](sprite.schema.json) if you can
  run a JSON Schema (2020-12) validator. An unknown key is allowed but
  ignored, so check spelling.
- Or have the parent paste it into Admin → People → **Character**. The dialog
  checks it as they type, lists any problem with the allowed values, and
  shows the character animated before they save.
- Keep it under 16 KB. A normal file is about 2 KB.

## A short example

```json
{
  "format": "earnkeep-sprite",
  "version": 1,
  "label": "Sam",
  "body": { "skin": "tone-5" },
  "hair": { "color": "dark-brown", "length": "short", "texture": "curly", "front": "curls", "styles": ["loose"] },
  "face": { "eyes": "brown", "grin": "toothy-lopsided", "missingTooth": true },
  "wardrobe": {
    "colors": ["#2E86DE", "#27AE60", "#F39C12"],
    "tops": ["tee", "jersey", "hoodie", "tank"],
    "bottoms": ["shorts", "pants"],
    "hats": ["cap", "none"],
    "wings": ["dragon"],
    "costumes": ["knight", "elf"]
  },
  "personality": { "rest": ["grin"], "likes": ["wheels", "sports"], "props": ["stick", "flag"] }
}
```
