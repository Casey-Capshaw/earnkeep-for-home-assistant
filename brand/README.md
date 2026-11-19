# EarnKeep brand kit

A checked gold coin rising like a sun over a green meadow, in a hexagon badge: earn it, keep it, watch it grow.

The logo is for the repository, the README, HACS and anything written about EarnKeep. It is not used inside the app's dashboard.

## Files

| File | Use |
| --- | --- |
| `mark.svg` | The badge. Use at 48 px and up. |
| `mark-small.svg` | A simpler cut for 16 to 32 px (favicons, lists, avatars): the coin, the check and one hill. |
| `wordmark.svg` | "EarnKeep" as outlines, so no font is needed. |
| `lockup.svg` | Badge above the wordmark. |
| `lockup-horizontal.svg` | Badge beside the wordmark. |
| `wordmark-dark.svg`, `lockup-horizontal-dark.svg` | The same, with the name in light green and light gold, for dark backgrounds. The repository README uses the horizontal pair. |
| `app-icon.svg` | The badge on a cream tile. |

PNG exports, on a transparent background, are in `png/`:

| File | Size |
| --- | --- |
| `mark-1024.png`, `mark-512.png`, `mark-256.png` | The badge |
| `mark-small-64.png`, `mark-small-32.png` | The small cut |
| `wordmark-2048.png` | 2048 × 425 |
| `lockup-2048.png` | 2048 × 1263 |
| `lockup-horizontal-2048.png` | 2048 × 560 |
| `app-icon-512.png` | The app icon on its cream tile |

## Rebuilding

The SVGs are generated, so change the script, not the files:

```bash
uv run --with fonttools --with brotli brand/build.py   # writes the SVGs
node brand/export-png.mjs                              # writes png/
```

`build.py` outlines the wordmark from the app's display font, which it reads from `frontend/src/styles/fonts.css`. `export-png.mjs` uses the Playwright that the frontend already installs.

## Using the logo

- Keep clear space around the badge of at least a quarter of its width.
- Use `mark-small.svg` below 48 px; the trees and clouds are lost there.
- Put it on white, cream or a dark green. Avoid pale greens, where the badge's edge disappears.
- On a dark background use the `-dark` files; the standard wordmark's dark green is too close to black there.
- Don't recolour it, stretch it, or set the wordmark in another typeface.

## Colours

One green, as a ramp from light to dark, plus cream and the app's gold. Gold is only ever the coin.

| Name | Hex | Use |
| --- | --- | --- |
| Cream | `#FBF6E9` | Clouds, the app icon tile. Used in place of white. |
| Green 50 | `#DDF4E4` | Upper sky |
| Green 100 | `#C6EBD3` | Sky |
| Green 300 | `#7DD694` | Near hill |
| Green 400 | `#3FAE74` | Middle hill, lit side of the left pine |
| Green 500 | `#2E9C78` | Pines |
| Green 700 | `#1F7A5E` | Shaded side of the right pine |
| Green 800 | `#17604B` | Far hill, trunks, "Earn" in the wordmark |
| Green 900 | `#0F4536` | The check |
| Gold | `#C99A2E` | Coin rim |
| Gold light | `#E3BC5C` | Coin face |
| Gold deep | `#8F6A1F` | "Keep" in the wordmark |

The 500, 700 and 800 greens and the gold are the app's own (`--color-done`, `--color-money`, `--color-vault-deep`, `--color-gold` in `frontend/src/styles/tokens.css`).

## Type

| Role | Face | Licence |
| --- | --- | --- |
| Display and wordmark | IM Fell English SC | SIL OFL |
| UI | Alegreya Sans | SIL OFL |

Both are the faces the app already uses.

## Shape

The badge is a pointy-top regular hexagon with softly rounded corners, on a 240 grid. Everything inside is flat: no gradients, shadows or outlines. Depth comes from a lit side and a shaded side, one step apart on the ramp.
