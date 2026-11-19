# Contributing to EarnKeep

Thanks for helping. EarnKeep is a small, family-run project, so issues and PRs
are reviewed when time allows.

## Ways to help

- **Bugs:** open an issue with your Home Assistant version, the EarnKeep
  version (`manifest.json`), the browser or tablet, and steps to reproduce.
- **Sprite traits:** if a child's look isn't covered by the Sprite character
  options (a hairstyle, an aid, a head covering), open an issue describing it.
  These requests are welcome.
- **Code:** for anything bigger than a small fix, open an issue first so we can
  agree on the approach.

## Development

- Backend: Python, in `custom_components/earn_keep/`. Run the tests with
  `python3 -m unittest discover tests`.
- Frontend: React + Vite + TypeScript, in `frontend/`. `scripts/build.sh`
  builds it into `custom_components/earn_keep/frontend/earn-keep-panel.js`.
- **Commit the rebuilt bundle** with any frontend change. It is tracked
  because HACS installs ship it as is. Never commit `frontend/dist/`.
- Check visuals at the tablet size (1280×800) with
  `node scripts/verify-visual.mjs` and `node scripts/verify-admin.mjs`.
- For a larger change, describe the design in the pull request, and update
  [`docs/architecture.md`](docs/architecture.md) if it changes how the pieces fit together.

## Ground rules

- No personal data in code, mock data, tests or screenshots. Use a fictional
  family.
- No secrets in the repo. Hosts and tokens for your own deploy belong in a
  gitignored `.env`.
- By contributing, you agree your contribution is licensed under the MIT
  License (see `LICENSE`).
