# Sprite character files

A Sprite file describes one family member's character in the EarnKeep world:
looks, aids, closet and personality. It is plain JSON. The machine-readable
definition is [`sprite.schema.json`](sprite.schema.json) (JSON Schema
2020-12), generated from `frontend/src/world/sprites/traits.ts`.

To have an AI assistant make a file from photos or a description, point it
at [`character-guide.md`](character-guide.md).

Only `format` and `version` are required. Every other section and field is
optional and falls back to a default, so this is a complete file:

```json
{ "format": "earnkeep-sprite", "version": 1, "hair": { "color": "black", "texture": "coily", "styles": ["puffs"] }, "body": { "skin": "tone-6" } }
```

## A full example

```jsonc
{
  "format": "earnkeep-sprite",
  "version": 1,
  "label": "Juniper",                        // optional display name

  "body": { "height": 0.94, "skin": "tone-3" },

  "hair": {
    "color": "auburn",
    "dye": null,                             // or { "color": "#7B5CFF", "where": "all" | "tips" | "streak" }
    "length": "long",
    "texture": "wavy",
    "front": "side-swept",
    "cowlick": false,
    "styles": ["loose", "loose", "ponytail", "buns"]   // daily rotation; repeats add weight
  },

  "face": {
    "eyes": "green", "eyeSize": "big", "lashes": "full", "brows": "fine",
    "chin": "soft", "smile": "cat", "grin": "even", "blush": "rosy",
    "freckles": true, "missingTooth": false, "earrings": null
  },

  "aids": { "glasses": { "style": "round", "color": "#3B5BA8" }, "hearing": null, "headCovering": null, "mobility": null },

  "wardrobe": {
    "colors":       ["#3CC9C0", "#FF7F6E", "#FFFFFF"],
    "bottomColors": ["#33465E", "#7AA9E0"],
    "shoeColors":   ["#FFFFFF", "#FF7F6E"],
    "ribbons":      ["#3CC9C0"],
    "gearColors":   ["#3CC9C0", "#FFFFFF"],
    "tops":    ["tee", "hoodie", "overalls"],
    "bottoms": ["shorts", "pants"],
    "prints":  ["star", "none"],
    "hats":    ["cap", "none"],
    "shoes":   ["sneakers"],
    "extras":  ["backpack"],
    "wings":   ["dragonfly"],
    "costumes": ["knight", "elf"]
  },

  "personality": {
    "rest": ["smile", "grin"],
    "go":   ["determined", "laugh"],
    "joy":  ["laugh", "sparkle"],
    "likes": ["wheels", "building"],
    "props": ["net", "jar", "stick"]
  }
}
```

## Allowed values

### Body

- `height`: 0.85–1.15 (1 is the default size).
- `skin`: `tone-1` (lightest) to `tone-8` (deepest).

### Hair

- `color`: `black`, `dark-brown`, `brown`, `light-brown`, `auburn`, `red`,
  `strawberry-blond`, `dirty-blond`, `golden-blond`, `platinum-blond`, `grey`.
- `dye`: `null` or `{ color, where: all | tips | streak }`.
- `length`: `short`, `medium`, `long`. `texture`: `straight`, `wavy`, `curly`,
  `coily`. Length and texture shape every style.
- `front`: `bangs`, `pulled-back`, `side-swept`, `curls`. `cowlick`: boolean.
- `styles` (1–16): `loose`, `tucked`, `lowpony`, `windswept`, `dutch`,
  `pigtails`, `crown`, `sidebraid`, `buns`, `braidpony`, `waterfall`,
  `strands`, `ponytail`, `buzz`, `puffs`, `afro`, `twists`, `locs`,
  `cornrows`, `bob`.

### Face

- `eyes`: `brown`, `dark-brown`, `hazel`, `green`, `blue`, `grey`, `amber`.
- `eyeSize`: `medium` | `big`. `lashes`: `soft` | `full`. `brows`: `fine` |
  `bold`. `chin`: `soft` | `pointed`.
- `smile` (resting): `plain` | `cat`. `grin`: `even` | `toothy-lopsided`.
  `blush`: `light` | `rosy`.
- `freckles`, `missingTooth`: booleans. `earrings`: `null` or a color.

### Aids

- `glasses`: `{ style: round | square | cat-eye, color }`.
- `hearing`: `{ kind: behind-ear | cochlear, side: left | right | both, color }`.
- `headCovering`: `{ kind: hijab | turban | patka | kippah | headwrap, color }`.
  A hijab, turban, patka or headwrap covers the hair and is worn in place of
  hats (a helmet still goes on for rides); a kippah sits on the hair and
  shows whenever no other hat is worn.
- `mobility`: `{ kind: wheelchair | crutches | walker | cane, color }`. Games
  ask what a character can do, so a beat that needs legs is swapped for one
  that suits the aid or goes to another character. A wheelchair user plays from
  their chair on the ground and leaves it to fly, climb or ride; a cane,
  crutches or a walker stand beside the character while they are on foot.

### Wardrobe

Lists hold 1–12 entries, and repeats add weight. Colors are `#RRGGBB`.

- `tops`: `tee`, `tank`, `ruffle`, `dress`, `hoodie`, `raincoat`, `puffer`,
  `sweater`, `overalls`, `wetsuit`, `jersey`, `flannel`, `rashguard`, `swim`.
- `bottoms`: `shorts`, `pants`, `leggings`, `skirt`.
- `prints`: `none`, `star`, `bolt`, `heart`, `flower`, `mountain`, `stripes`,
  `number`, `snowflake`, `pony`, `rainbow`, `pixel`, `saber`.
- `hats`: `none`, `cap`, `capback`, `beanie`, `sunhat`, `flowercrown`,
  `earmuffs`, `bandana`, `headband`, `bow`, `sweatband`, `cowboy`, `newsboy`,
  `clip`.
- `shoes`: `sneakers`, `sandals`, `lightup`.
- `extras`: `necklace`, `backpack`, `scarf`.
- `wings`: `fairy`, `butterfly`, `dragonfly`, `dragon`, `bat`, `feather`.
- `costumes`: Halloween `knight`, `dragon`, `skeleton`, `cowboy`, `witch`,
  `princess`, `pumpkin`, `prairie`; Christmas `santa`, `elf`.
- `gearColors` (2–4): ride body, ride trim and helmet. Defaults to the first
  two `colors`.

The rig dresses each character from its own lists. The weather, pajamas and
some scenes add what they need (raincoats, snow gear, wetsuits, rain boots)
in the character's colors. Holidays use the holiday's colors.

### Personality

- `rest`, `go`, `joy` (1–8): `smile`, `grin`, `laugh`, `o`, `blow`, `closed`,
  `wink`, `tongue`, `smirk`, `scrunch`, `sparkle`, `determined`. Used at rest,
  in action and in celebrations.
- `likes` (0–6): `flying`, `wheels`, `water`, `snow`, `sports`, `nature`,
  `animals`, `art`, `music`, `make-believe`, `building`. These decide who
  leads a game.
- `props` (1–12): `wand`, `net`, `sword`, `dandelion`, `bubblewand`,
  `lantern`, `flashlight`, `jar`, `umbrella`, `balloon`, `teddy`, `bucket`,
  `stick`, `flower`, `leaf`, `popsicle`, `flag`.

Some values are accepted before the rig can draw them. Until then it draws
the nearest value it has.

## Validation and storage

- In the app: Admin → People → **Character** on a member's card. Paste a
  file, upload or drop one, or start from a preset. The dialog validates it
  as you type, shows it animated, and saves, exports or removes it.
- The frontend validates a file fully: an unknown value is an error that
  names the path and the allowed values; an unknown key is a warning and is
  kept.
- The file is saved on the family member through the
  `earn_keep/update_family_member` websocket command
  (`updates: { sprite: {...} | null }`). The server accepts an object with
  `format: "earnkeep-sprite"`, `version: 1` and a size up to 16 KB, and
  replies `invalid_sprite` otherwise.
- Characters are matched to members by member id, never by name.
