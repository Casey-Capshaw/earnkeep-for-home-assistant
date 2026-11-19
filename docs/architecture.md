# EarnKeep architecture

EarnKeep is a Home Assistant custom integration with two halves:

- a Python backend in `custom_components/earn_keep/`, which owns the data, the
  schedule, sensors and sounds, and
- a React/TypeScript panel in `frontend/`, built by Vite into one file,
  `custom_components/earn_keep/frontend/earn-keep-panel.js`. That file is
  committed, because Marketplace and HACS installs ship the repository as is.

The two talk over Home Assistant's websocket API. Nothing calls out to an
external service.

## Backend

| Module | Role |
|---|---|
| `__init__.py` | Sets up the config entry: loads the store, registers the panel (`/earn-keep`), the websocket commands, the sensors and the scheduler. |
| `config_flow.py` | First-run setup (PIN, family members, an optional import from the older entity-based Family Roles app). The options flow holds the optional Fully Kiosk tablet host and port. |
| `models.py` | Dataclasses: `FamilyMember`, `Accountability`, `HabitState`, `Transaction`, `Badge`, `AppSettings`, `AnnouncementEvent`. Each has `to_dict` / `from_dict`. |
| `store.py` | All reads and writes. Wraps HA's `Store` helper; the data lives in `.storage/earn_keep.data` as JSON. |
| `websocket_api.py` | The `earn_keep/*` commands the panel uses (`get_data`, `toggle_habit`, `add_transaction`, family, accountability, settings and announcement CRUD, `verify_pin`, `lock_admin`). |
| `admin_auth.py` | The admin PIN never leaves the server. A correct PIN earns a short-lived token that admin commands must carry; wrong guesses are throttled. HA admin users pass without a PIN. |
| `scheduler.py` | Daily reset and streaks, weekly compensation, monthly interest, scheduled announcements. Times follow the HA time zone. |
| `sensor.py` | Per-member `Bank Balance` and `Tasks Remaining Today` sensors, created and removed as members change. |
| `announcer.py`, `kiosk.py` | Spoken reminders through HA TTS, and audio/sound playback on an optional Fully Kiosk tablet. |
| `combo.py` | Picks the check-off sound: a five-step ladder for quick runs, plus finales for a finished board or a full week. |
| `sprite_check.py` | A shallow check of a member's Sprite file before it is saved (see below). |

### Data model

- **Family member:** id, name, color, emoji, birthday, bank balance, weekly
  compensation, streak and badges, and an optional `sprite`.
- **Accountability:** either a *habit* (`type: "daily"`, unpaid, morning or
  evening) or an *accountability* (`type: "compensated"`, tracked day by day
  through the week; all of them done earns the weekly compensation).
- **Habit state:** one record per accountability, member and date.
- **Transaction:** deposits, withdrawals, compensation and interest, each with
  a label and a date.
- **Settings:** schedule times, interest rate, the admin PIN, sounds,
  celebrations and announcements.

Python changes need a full HA restart; reloading the config entry does not
re-import modules.

## Frontend

- `src/ha-panel-entry.ts` mounts the app as an HA panel; `src/standalone-entry.tsx`
  and `frontend/dev/` run it outside HA against mock data.
- `src/api/` is the transport (`ha-websocket.ts` in HA, `standalone-http.ts`
  for the dev harness), behind one `EarnKeepAPI` interface.
- `src/store/` is one Zustand store: the data from `get_data`, the live
  weather state, and UI state. Writes are optimistic where it matters
  (habit check-offs) and roll back on error.
- `src/components/` holds the three views: **Roles** (each member's desk:
  the habits due now and the week's accountabilities), **Bank** and
  **Admin** (behind the PIN).

### The living world

`src/world/` draws the scene behind every view. All art is generated in code.

- `scene.ts`, `kits2.ts`, `worlds.ts`: each depth layer is built as an SVG
  string from a date-seeded random generator, rasterized once, and then only
  moved at runtime, so a low-end tablet keeps up.
- `daily.ts`, `useDay.ts`: pick the day's place, landmark, season palette and
  weather. `?ekdate=`, `?ekhour=` and `?ekweather=` override them for testing.
- `festive.ts`: birthdays and holidays.
- `critters.tsx`, `celebrate.tsx`: small animals and celebrations.

### Sprites

Small characters play in the world: one for each family member who has a
Sprite file. A member without one is simply not drawn.

- A Sprite file is JSON (`"format": "earnkeep-sprite"`, `"version": 1`) that
  describes looks, aids, closet and personality. The format is documented in
  [`docs/sprites/README.md`](sprites/README.md),
  [`docs/sprites/character-guide.md`](sprites/character-guide.md) tells a
  user's AI assistant how to write one, and
  [`docs/sprites/sprite.schema.json`](sprites/sprite.schema.json) is its JSON
  Schema.
- `sprites/traits.ts` is the single trait table. `validateSprite` (errors for
  unknown values, warnings for unknown keys) and `resolveSprite` (fills the
  defaults) are built from it, and `scripts/gen-sprite-schema.mjs` writes the
  schema from it; a test fails if the schema is stale.
- The backend stores the file as-is on the member and only checks it lightly
  (an object, the right `format`, `version` 1, at most 16 KB). The frontend
  does the full validation.
- `Sprite.tsx` draws one character, with its hair in `hair.tsx` and its
  glasses, hearing aids, head coverings and mobility aids in `aids.tsx`;
  `wardrobe.ts` dresses it from its own
  closet for the day, season, weather and holiday (holidays use the holiday's
  colors); `episodes.ts` runs the games (every kid with a Sprite plays in
  each group game, and a kid on their own plays the two-player ones with a
  critter friend); `mobility.ts` lets games ask what a
  character can do, so a beat that needs legs goes to a character who can.
- `sprites/intake.ts` turns pasted or uploaded text into a file plus the
  messages Admin → People shows; `components/admin/CharacterDialog.tsx` is
  that dialog (validate as you type, animated preview, save, export, remove).
- `sprites/presets/` holds the fictional preset characters that ship with
  the app. `scripts/sprite-parity.mjs` snapshots their renders so changes to
  the rig show up in review.

## Configuration and deploy

Setting up the wall tablet itself is in [tablet.md](tablet.md).

- Install through Marketplace (HA 2026.11+), HACS (older HA) or by copying
  `custom_components/earn_keep/`. See the README.
- Per-install settings live in the integration's options (Settings →
  Devices & services → EarnKeep → Configure), not in code. The Fully Kiosk
  remote-admin password stays on the HA host in `.earnkeep_fk_password`.
- The `scripts/` deploy helpers read a gitignored `.env` (copy
  `.env.example`). `scripts/deploy.sh` builds, ships to a staging folder,
  checks the bundle hash, swaps it in (keeping the previous copy for
  rollback), reloads the entry and confirms what HA serves.

## Tests and checks

- `cd frontend && npm test`: trait table, schema, wardrobe and episode tests.
- `python3 -m unittest discover tests`: backend helpers that run without HA.
- `node scripts/sprite-parity.mjs`: preset render snapshots.
- `node scripts/verify-visual.mjs`, `node scripts/verify-admin.mjs`: screenshots
  at the 1280×800 tablet size.
- `node scripts/verify-bundle.mjs` loads the built `earn-keep-panel.js` into
  the same harness and checks it renders; `scripts/release.sh` runs it before
  tagging.
- CI (`.github/workflows/validate.yml`) runs the tests, hassfest and the HACS
  check.
