#!/usr/bin/env python3
"""Build the EarnKeep brand SVGs: mark, small cut, wordmark, lockups, app icon.

Run:  uv run --with fonttools --with brotli brand/build.py
Then: node brand/export-png.mjs   (writes brand/png/)

The wordmark is outlined from the app's own display face (IM Fell English SC,
SIL OFL), read from frontend/src/styles/fonts.css, so the SVGs need no font.
"""
import base64, io, os, re

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# One green ramp, tuned from the app's greens; cream; the app's gold for the coin.
GREEN = {50: '#DDF4E4', 100: '#C6EBD3', 300: '#7DD694', 400: '#3FAE74', 500: '#2E9C78',
         700: '#1F7A5E', 800: '#17604B', 900: '#0F4536'}
CREAM, GOLD, GOLD_LIGHT, GOLD_DEEP = '#FBF6E9', '#C99A2E', '#E3BC5C', '#8F6A1F'

# The brand-family badge: pointy-top hexagon, softly rounded corners, on a 240 grid.
HEX = ('M109.6 14Q120 8 130.4 14L206.6 58Q217 64 217 76L217 164Q217 176 206.6 182L130.4 226Q120 232 109.6 226'
       'L33.4 182Q23 176 23 164L23 76Q23 64 33.4 58Z')


def wave(y, fill, step=20, amp=12, off=0):
    d = f'M{off} {y}q{step}-{amp} {2 * step} 0' + f't{2 * step} 0' * (240 // (2 * step) + 1) + f'V240H{off}Z'
    return f'<path d="{d}" fill="{fill}"/>'


def cloud(x, y, s=1.0):
    return (f'<rect x="{x}" y="{y}" width="{46 * s:.0f}" height="{13 * s:.0f}" rx="{6.5 * s:.1f}" fill="{CREAM}"/>'
            f'<rect x="{x + 10 * s:.0f}" y="{y - 8 * s:.0f}" width="{24 * s:.0f}" height="{14 * s:.0f}" rx="{7 * s:.1f}" fill="{CREAM}"/>')


def pine(x, top, base, w, lit, shade):
    """A pine as three stacked boughs on a trunk, lit on the left."""
    h = (base - top - 10) / 3
    full = right = ''
    for i in range(3):
        y0, y1, ww = top + i * h * 0.82, top + (i + 1) * h + 4 * i, w * (0.55 + 0.225 * i)
        full += f'M{x} {y0:.1f}L{x + ww:.1f} {y1:.1f}Q{x} {y1 + 7:.1f} {x - ww:.1f} {y1:.1f}Z'
        right += f'M{x} {y0:.1f}L{x + ww:.1f} {y1:.1f}Q{x + ww / 2:.1f} {y1 + 3.5:.1f} {x} {y1 + 3.5:.1f}Z'
    return (f'<rect x="{x - 3}" y="{base - 16}" width="6" height="22" fill="{GREEN[800]}"/>'
            f'<path d="{full}" fill="{lit}"/><path d="{right}" fill="{shade}"/>')


def coin(cy, r):
    k = r / 61
    pts = ' '.join(f'{120 + x * k:.1f},{cy - 4 * k + y * k:.1f}'
                   for x, y in [(-32, 2), (-20, -10), (-7, 3), (22, -28), (34, -16), (-7, 28)])
    return (f'<circle cx="120" cy="{cy}" r="{r}" fill="{GOLD}"/><circle cx="120" cy="{cy}" r="{r * 0.78:.1f}" fill="{GOLD_LIGHT}"/>'
            f'<polygon points="{pts}" fill="{GREEN[900]}"/>')


def mark_body():
    """The full mark: the checked coin rising over a meadow. 48 px and up."""
    return '\n'.join([
        f'<rect width="240" height="240" fill="{GREEN[100]}"/>',
        f'<path d="M0 0H240V60Q180 80 120 66T0 74Z" fill="{GREEN[50]}"/>',
        cloud(40, 62), cloud(160, 44, .8), coin(108, 56),
        pine(52, 112, 190, 30, GREEN[400], GREEN[500]), pine(190, 104, 190, 32, GREEN[500], GREEN[700]),
        wave(170, GREEN[300], 30, 16), wave(190, GREEN[400], off=-20), wave(210, GREEN[800])])


def small_body():
    """The small cut: coin, check and one hill. 32 px and below."""
    return '\n'.join([f'<rect width="240" height="240" fill="{GREEN[100]}"/>', coin(112, 78),
                      wave(196, GREEN[400], 30, 14), wave(216, GREEN[800], 30, 14, off=-30)])


def badge(body, x=0, y=0, scale=1.0, clip='h'):
    t = f' transform="translate({x} {y}) scale({scale})"' if (x, y, scale) != (0, 0, 1.0) else ''
    return f'<g{t}><clipPath id="{clip}"><path d="{HEX}"/></clipPath>\n<g clip-path="url(#{clip})">\n{body}\n</g></g>'


def display_font():
    css = open(os.path.join(ROOT, 'frontend', 'src', 'styles', 'fonts.css')).read()
    block = css[css.index("font-family: 'IM Fell English SC'"):]
    data = re.search(r'base64,([A-Za-z0-9+/=]+)', block).group(1)
    return TTFont(io.BytesIO(base64.b64decode(data)))


def wordmark_paths(height, earn=GREEN[800], keep=GOLD_DEEP):
    """'EarnKeep' as outlines, cap height scaled to `height`. Returns (svg paths, width)."""
    font = display_font()
    glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font['hmtx']
    cap = getattr(font['OS/2'], 'sCapHeight', 0) or glyphs[cmap[ord('E')]].height or font['head'].unitsPerEm * 0.7
    if not cap:
        cap = font['head'].unitsPerEm * 0.7
    k = height / cap
    out, x = [], 0.0
    for word, fill in (('Earn', earn), ('Keep', keep)):
        d = ''
        for ch in word:
            name = cmap[ord(ch)]
            pen = SVGPathPen(glyphs, lambda v: f'{v:.1f}')
            glyphs[name].draw(TransformPen(pen, (k, 0, 0, -k, x, height)))
            d += pen.getCommands()
            x += hmtx[name][0] * k
        out.append(f'<path d="{d}" fill="{fill}"/>')
    return '\n'.join(out), x


def write(name, w, h, label, inner):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" role="img" aria-label="{label}">\n{inner}\n</svg>\n'
    open(os.path.join(HERE, name), 'w').write(svg)
    print('wrote', name)


write('mark.svg', 240, 240, 'EarnKeep', badge(mark_body()))
write('mark-small.svg', 240, 240, 'EarnKeep', badge(small_body()))

CAP = 96
word, ww = wordmark_paths(CAP)
# The small caps sit on the baseline; leave room below it for the tail of the K.
write('wordmark.svg', ww + 8, CAP + 28, 'EarnKeep', f'<g transform="translate(4 8)">\n{word}\n</g>')
write('lockup-horizontal.svg', 240 + 28 + ww + 20, 240, 'EarnKeep',
      badge(mark_body()) + f'\n<g transform="translate(268 {(240 - CAP) / 2 + 2:.0f})">\n{word}\n</g>')
# For dark backgrounds: the same badge, with the name in light green and light gold.
light, _ = wordmark_paths(CAP, earn=GREEN[100], keep=GOLD_LIGHT)
write('wordmark-dark.svg', ww + 8, CAP + 28, 'EarnKeep', f'<g transform="translate(4 8)">\n{light}\n</g>')
write('lockup-horizontal-dark.svg', 240 + 28 + ww + 20, 240, 'EarnKeep',
      badge(mark_body()) + f'\n<g transform="translate(268 {(240 - CAP) / 2 + 2:.0f})">\n{light}\n</g>')
lw = max(ww + 40, 280)
write('lockup.svg', lw, 240 + 24 + CAP + 28, 'EarnKeep',
      badge(mark_body(), x=(lw - 240) / 2) + f'\n<g transform="translate({(lw - ww) / 2:.1f} 268)">\n{word}\n</g>')
# App icon: the badge on a cream tile (rounded square, badge at 76% of the tile).
write('app-icon.svg', 512, 512, 'EarnKeep',
      f'<rect width="512" height="512" rx="112" fill="{CREAM}"/>\n' + badge(mark_body(), x=61, y=61, scale=1.625))
