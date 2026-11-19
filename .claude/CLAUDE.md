# EarnKeep — Claude Code project context

EarnKeep is a Home Assistant custom integration for kid accountability and
banking: daily habits, weekly compensated accountabilities, bank balances,
monthly interest, and a living, procedurally drawn world with each kid's
animated Sprite. This repo is the whole thing: the Python backend and the
React/Vite frontend.

If a `CLAUDE.local.md` exists at the repo root (gitignored), read it too. It
holds one household's deploy targets and notes, which never belong in this file.

## Terminology

- **Habit** = `type: "daily"`: a routine task, no pay.
- **Accountability** = `type: "compensated"`: tied to weekly compensation,
  all-or-nothing.
- **Sprite**: a family member's animated character in the world, described by
  a Sprite character file (see `docs/sprites/`).

## Repo layout

- `custom_components/earn_keep/`: the deployable HA component (Python and the
  bundled JS).
- `frontend/`: React/Vite TypeScript source. It builds to
  `custom_components/earn_keep/frontend/earn-keep-panel.js`.
- `frontend/src/world/`: the living world (date-seeded layered scene, weather,
  holidays, Sprites).
- `scripts/build.sh`: builds the React app.
- `scripts/deploy.sh`: builds, copies to a Home Assistant host over SSH
  (hash-verified, and the previous deploy is kept), reloads the config entry
  and checks the served bundle. Hosts and tokens come from a gitignored `.env`
  (see `.env.example`). **Python changes need a Home Assistant core restart**,
  because an entry reload doesn't re-import modules.
- `scripts/release.sh`: tags and creates a GitHub release from the
  `manifest.json` version.
- `scripts/sfx/synth.py`: synthesizes every sound effect
  (`--install <set>` writes `custom_components/earn_keep/sounds/`).
  `scripts/sfx/audition.html` auditions the sets.
- `custom_components/earn_keep/combo.py`: the combo rules.
- `tests/`: Python unit tests (`python3 -m unittest discover tests`).
- `docs/architecture.md`: how the pieces fit together. Keep it current when
  a change alters the design.

## Working agreements

- **Commit the rebuilt `earn-keep-panel.js`** with frontend changes. The
  bundle is tracked, and HACS installs ship it as is.
- **Deploy only from an up-to-date `main`** (`git fetch` first). A stale local
  `main` can silently revert fixes that are already live.
- Verify visuals at the tablet size with `node scripts/verify-visual.mjs` and
  `node scripts/verify-admin.mjs` (1280×800). Use `scripts/verify-device.sh`
  for a real kiosk tablet.
- **No personal data in the repo:** no real names, birthdays, photos or
  likenesses of children, and no home-network addresses. Mock data,
  screenshots and tests use a fictional family. Household characters are data
  in Home Assistant's storage, never code.
- Don't commit secrets, tokens, `.env`, `CLAUDE.local.md` or `frontend/dist/`.
