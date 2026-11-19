#!/usr/bin/env python3
"""EarnKeep sound effects, synthesized from scratch.

Every sound here is original: built from sine partials, noise bursts and a
synthetic reverb in numpy. No samples, no third-party audio. That makes the
set reproducible and license-free (see custom_components/earn_keep/sounds/
SOURCES.md).

Usage:
    python3 scripts/sfx/synth.py                # all candidate sets -> scripts/sfx/out/<set>/
    python3 scripts/sfx/synth.py --install bells  # one set -> custom_components/earn_keep/sounds/

Needs numpy and ffmpeg (MP3 encode + EBU R128 loudness measurement).

The musical idea: everything lives in G major pentatonic (G A B D E), which
has no clashing intervals, so any two sounds overlapping or played back to
back still sound like one tune. Combo levels 1-5 climb the scale and add
layers; the finales land on the full chord.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
INSTALL_DIR = ROOT.parents[1] / "custom_components" / "earn_keep" / "sounds"

# Loudness targets (LUFS, EBU R128 integrated). The tablet plays these on the
# alarm stream at volume 100, so the whole set sits at one level and the
# celebration comes from the music, not from getting louder.
LUFS_MAIN = -18.0
LUFS_FINALE = -17.0
LUFS_SOFT = -24.0  # undo: clearly quieter
PEAK_CEILING_DB = -2.0

NOTE_INDEX = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hz(note: str) -> float:
    """'G5' / 'F#4' -> frequency."""
    m = re.fullmatch(r"([A-G])(#?)(\d)", note)
    semis = NOTE_INDEX[m.group(1)] + (1 if m.group(2) else 0) + 12 * (int(m.group(3)) + 1)
    return 440.0 * 2 ** ((semis - 69) / 12)


PENTA = ["G", "A", "B", "D", "E"]


def penta_run(start: str, count: int) -> list[str]:
    """`count` ascending pentatonic notes from `start` (e.g. 'G4')."""
    name, octv = start[:-1], int(start[-1])
    i = PENTA.index(name)
    out = []
    for _ in range(count):
        out.append(f"{PENTA[i]}{octv}")
        i += 1
        if i == len(PENTA):
            i = 0
        if PENTA[i] == "D":  # C sits between B and D: the octave number turns over
            octv += 1
    return out


# --------------------------------------------------------------------------
# Voices. Each returns a mono float array for one note.
# --------------------------------------------------------------------------

def _t(dur: float) -> np.ndarray:
    return np.arange(int(SR * dur)) / SR


def _partials(freq: float, dur: float, partials, attack: float = 0.002) -> np.ndarray:
    t = _t(dur)
    y = np.zeros_like(t)
    for ratio, amp, tau in partials:
        f = freq * ratio
        if f > 15000:
            continue
        y += amp * np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    y *= np.minimum(1.0, t / attack)
    return y


def bell(freq: float, dur: float = 0.9, bright: float = 1.0) -> np.ndarray:
    """Celesta / glockenspiel: a pure fundamental under quick inharmonic glints."""
    return _partials(freq, dur, [
        (1.0, 1.0, 0.38),
        (2.0, 0.22 * bright, 0.20),
        (2.76, 0.16 * bright, 0.09),
        (5.40, 0.07 * bright, 0.035),
    ])


def musicbox(freq: float, dur: float = 0.9, bright: float = 1.0) -> np.ndarray:
    """Music-box tine: round and woody, with a tiny metallic tick up top."""
    y = _partials(freq, dur, [
        (1.0, 1.0, 0.42),
        (2.0, 0.10, 0.22),
        (3.0, 0.05 * bright, 0.12),
        (6.27, 0.09 * bright, 0.018),
    ], attack=0.003)
    return y


def harp(freq: float, dur: float = 1.1, bright: float = 1.0) -> np.ndarray:
    """Plucked string: harmonic series whose upper partials die first."""
    parts = [(n, bright ** (n > 1) / n ** 1.35, 0.62 / n ** 0.75) for n in range(1, 9)]
    y = _partials(freq, dur, parts, attack=0.0015)
    # finger noise: a 4 ms breath of filtered noise at the pluck
    rng = np.random.default_rng(int(freq))
    n = int(SR * 0.004)
    pluck = np.convolve(rng.standard_normal(n), np.ones(8) / 8, mode="same") * np.hanning(n)
    y[:n] += 0.25 * pluck
    return y


def coin(seed: int, pitch: float = 1.0, dur: float = 0.35) -> np.ndarray:
    """One small coin clink: a few close inharmonic modes that ring briefly."""
    rng = np.random.default_rng(seed)
    base = 3100.0 * pitch * rng.uniform(0.94, 1.06)
    t = _t(dur)
    y = np.zeros_like(t)
    for ratio, amp, tau in [(1.0, 1.0, 0.075), (1.47, 0.6, 0.055), (2.09, 0.35, 0.035), (2.83, 0.15, 0.02)]:
        y += amp * np.sin(2 * np.pi * base * ratio * t + rng.uniform(0, 6.28)) * np.exp(-t / tau)
    n = int(SR * 0.002)
    y[:n] += 0.5 * rng.standard_normal(n) * np.hanning(n)
    return y * np.minimum(1.0, t / 0.0008)


def sparkle(dur: float, density: float, seed: int, lo: str = "D7", hi: str = "E8", ramp: str = "flat") -> np.ndarray:
    """Fairy dust: sparse, quiet glints on pentatonic pitches high above the tune.

    density = glints per second. ramp: 'flat', 'up' (builds) or 'down' (settles).
    """
    rng = np.random.default_rng(seed)
    pool = [hz(n) for n in penta_run("D7", 8) if hz(lo) <= hz(n) <= hz(hi)]
    y = np.zeros(int(SR * dur))
    count = max(1, int(dur * density))
    for _ in range(count):
        u = rng.uniform()
        pos = {"flat": u, "up": u ** 0.5, "down": 1 - u ** 0.5}[ramp] * (dur - 0.12)
        f = rng.choice(pool) * rng.uniform(0.995, 1.005)
        g = _t(0.11)
        grain = np.sin(2 * np.pi * f * g) * np.exp(-g / rng.uniform(0.015, 0.03)) * np.minimum(1, g / 0.001)
        i = int(pos * SR)
        y[i:i + len(grain)] += grain * rng.uniform(0.35, 1.0)
    return y


def pad(notes: list[str], dur: float, attack: float = 0.18) -> np.ndarray:
    """Soft warm swell under the finales (detuned sines, a breath of 2nd harmonic)."""
    t = _t(dur)
    y = np.zeros_like(t)
    for n in notes:
        f = hz(n)
        for det in (-0.004, 0.0, 0.004):
            y += np.sin(2 * np.pi * f * (1 + det) * t) + 0.2 * np.sin(2 * np.pi * 2 * f * (1 + det) * t)
    env = np.minimum(1.0, t / attack) * np.minimum(1.0, (dur - t) / 0.35)
    return y * env / (3 * len(notes))


VOICES = {"bell": bell, "musicbox": musicbox, "harp": harp}


# --------------------------------------------------------------------------
# Mixing helpers
# --------------------------------------------------------------------------

class Mix:
    def __init__(self, dur: float):
        self.y = np.zeros(int(SR * dur))

    def add(self, sig: np.ndarray, at: float = 0.0, gain: float = 1.0) -> "Mix":
        i = int(at * SR)
        sig = sig[: max(0, len(self.y) - i)]
        self.y[i:i + len(sig)] += gain * sig
        return self

    def notes(self, voice: str, names: list[str], at: float, step: float, gain: float = 1.0,
              dur: float = 0.9, accent_last: float = 1.0, bright: float = 1.0) -> "Mix":
        """A run of notes, `step` seconds apart; the last one can be accented."""
        for k, n in enumerate(names):
            g = gain * (accent_last if k == len(names) - 1 else 1.0)
            self.add(VOICES[voice](hz(n), dur, bright), at + k * step, g)
        return self

    def render(self) -> np.ndarray:
        return finish(self.y)


_REVERB_IR = None


def _reverb(y: np.ndarray, wet: float = 0.16) -> np.ndarray:
    """A small bright room: decaying filtered noise, FFT-convolved."""
    global _REVERB_IR
    if _REVERB_IR is None:
        rng = np.random.default_rng(7)
        t = _t(0.55)
        ir = rng.standard_normal(len(t)) * np.exp(-t / 0.13)
        ir = np.convolve(ir, np.ones(6) / 6, mode="same")  # take the fizz off
        ir[: int(SR * 0.012)] = 0  # pre-delay keeps attacks crisp
        _REVERB_IR = ir / np.sqrt(np.sum(ir ** 2))
    n = len(y) + len(_REVERB_IR) - 1
    size = 1 << (n - 1).bit_length()
    wet_sig = np.fft.irfft(np.fft.rfft(y, size) * np.fft.rfft(_REVERB_IR, size), size)[: len(y)]
    return y + wet * wet_sig


def _lowpass(y: np.ndarray, cutoff: float) -> np.ndarray:
    """Gentle one-pole low-pass, run forward and back (no phase smear)."""
    a = np.exp(-2 * np.pi * cutoff / SR)
    out = np.empty_like(y)
    for arr in (y, None):
        src = y if arr is not None else out[::-1].copy()
        acc = 0.0
        res = np.empty_like(src)
        for i, v in enumerate(src):
            acc = (1 - a) * v + a * acc
            res[i] = acc
        out = res if arr is not None else res[::-1]
    return out


def finish(y: np.ndarray, soften: float | None = None) -> np.ndarray:
    y = _reverb(y)
    if soften:
        y = _lowpass(y, soften)
    fade = int(SR * 0.08)
    y[-fade:] *= np.linspace(1, 0, fade) ** 2
    y = y / (np.max(np.abs(y)) + 1e-9)
    return np.tanh(1.4 * y) / np.tanh(1.4)  # round off the loudest transients


# --------------------------------------------------------------------------
# The sound set. `lead` is the tune voice; `under` plays the warm layer.
# --------------------------------------------------------------------------

SETS = {
    # name: (lead voice, under voice, sparkle amount, lead octave shift, title, blurb)
    "bells": dict(lead="bell", under="harp", glint=1.0, title="Fairy bells",
                  blurb="Celesta-like bells over a soft harp, with fairy-dust glints. The brightest set."),
    "harp": dict(lead="harp", under="harp", glint=0.7, title="Harp & chimes",
                 blurb="Plucked harp runs with a few wind-chime glints. Warm and storybook."),
    "musicbox": dict(lead="musicbox", under="harp", glint=0.45, title="Music box",
                     blurb="Round music-box tines, the gentlest on the ears at full volume."),
}

# Habit ladder: each level ends one step higher than the last, so five quick
# taps play one rising tune: G - B - D - G' - B'.
HABIT_LADDER = [
    (["D5", "G5"], 0.085),
    (["D5", "G5", "B5"], 0.080),
    (["G5", "B5", "D6"], 0.075),
    (["G5", "B5", "D6", "G6"], 0.070),
    (["D5", "G5", "B5", "D6", "G6", "B6"], 0.058),
]

# Paid-task ladder: a strummed chord (the "reward") whose top note climbs.
TASK_CHORDS = [
    ["G4", "B4", "D5", "G5"],
    ["G4", "D5", "G5", "B5"],
    ["B4", "D5", "G5", "D6"],
    ["G4", "D5", "B5", "G6"],
    ["G4", "D5", "G5", "B5", "D6", "G6"],
]


def habit(cfg: dict, level: int) -> np.ndarray:
    names, step = HABIT_LADDER[level - 1]
    lead, glint = cfg["lead"], cfg["glint"]
    run_end = (len(names) - 1) * step
    m = Mix(0.62 + run_end + 0.1 * level)
    m.notes(lead, names, 0.0, step, accent_last=1.25, dur=0.7 + 0.06 * level)
    if level >= 3:  # fairy dust arrives
        m.add(sparkle(0.45 + 0.1 * level, 10 + 6 * level, seed=level, ramp="down"), run_end, 0.16 * glint * (level - 1) / 2)
    if level >= 4:  # a warm note underneath
        m.notes(cfg["under"], ["G4", "D5"], 0.0, 0.03, gain=0.45, dur=1.0)
    if level >= 5:  # the chord rings out and the top note answers itself
        m.notes(cfg["under"], ["B4", "G5"], 0.05, 0.03, gain=0.35, dur=1.0)
        m.add(VOICES[lead](hz("B6"), 0.6), run_end + 0.16, 0.55)
        m.add(VOICES[lead](hz("D7"), 0.6), run_end + 0.30, 0.42)
    return m.render()


def task(cfg: dict, level: int) -> np.ndarray:
    chord = TASK_CHORDS[level - 1]
    lead, glint = cfg["lead"], cfg["glint"]
    strum = 0.032
    top_at = len(chord) * strum
    m = Mix(1.0 + 0.09 * level)
    m.notes("harp", chord, 0.0, strum, gain=0.7, dur=1.2)  # the strum
    m.add(VOICES[lead](hz(chord[-1]), 0.9), top_at - strum, 0.9)  # lead doubles the top note
    m.add(VOICES[lead](hz(chord[-2]), 0.7), top_at - 2 * strum, 0.45)
    # coins: one clink at level 1, a small handful by level 5
    for k in range(level + 1):
        m.add(coin(seed=10 * level + k, pitch=1.0 + 0.035 * k), top_at + 0.10 + 0.075 * k * (1 - 0.06 * k), 0.24)
    if level >= 3:
        m.add(sparkle(0.6, 8 + 5 * level, seed=40 + level, ramp="down"), top_at + 0.05, 0.13 * glint * (level - 1) / 2)
    if level >= 5:
        m.add(VOICES[lead](hz("B6"), 0.6), top_at + 0.22, 0.5)
    return m.render()


def habits_finale(cfg: dict) -> np.ndarray:
    """Every habit on the board done: a full run up two octaves into the big chord."""
    lead, glint = cfg["lead"], cfg["glint"]
    run = penta_run("G4", 11)  # G4 ... G6
    step = 0.042
    land = len(run) * step
    m = Mix(1.95)
    m.notes("harp", run, 0.0, step, gain=0.55, dur=0.9)
    m.notes(lead, run[5:], 5 * step, step, gain=0.5, dur=0.6)
    m.notes(lead, ["G5", "B5", "D6", "G6"], land, 0.012, gain=0.8, dur=1.3)  # the chord
    m.notes("harp", ["G4", "D5", "G5"], land, 0.012, gain=0.6, dur=1.4)
    m.add(VOICES[lead](hz("B6"), 0.8), land + 0.20, 0.5)  # two answering notes on top
    m.add(VOICES[lead](hz("D7"), 0.8), land + 0.36, 0.45)
    m.add(pad(["G4", "B4", "D5"], 1.95 - land + 0.1), land - 0.1, 0.35)
    m.add(sparkle(1.3, 42, seed=91, ramp="down"), land, 0.24 * glint)
    return m.render()


def paycheck_finale(cfg: dict) -> np.ndarray:
    """The week's paycheck is full: two rising strums, the chord, and a shower of coins."""
    lead, glint = cfg["lead"], cfg["glint"]
    m = Mix(2.2)
    m.notes("harp", ["G4", "B4", "D5", "G5"], 0.0, 0.03, gain=0.6, dur=1.0)
    m.notes("harp", ["B4", "D5", "G5", "B5"], 0.24, 0.03, gain=0.65, dur=1.0)
    m.notes(lead, ["G5", "B5"], 0.09, 0.24, gain=0.6, dur=0.6)
    land = 0.50
    m.notes("harp", ["G4", "D5", "G5", "B5", "D6", "G6"], land, 0.022, gain=0.7, dur=1.5)
    m.notes(lead, ["D6", "G6"], land + 0.09, 0.03, gain=0.9, dur=1.3)
    m.add(VOICES[lead](hz("B6"), 0.8), land + 0.36, 0.5)
    m.add(pad(["G4", "B4", "D5"], 1.7), land - 0.05, 0.35)
    rng = np.random.default_rng(5)
    at = land + 0.16
    for k in range(13):  # coins pour, then thin out
        m.add(coin(seed=200 + k, pitch=rng.uniform(0.9, 1.25)), at, 0.22 * (1 - k / 22))
        at += 0.045 + 0.011 * k
    m.add(sparkle(1.3, 34, seed=92, ramp="down"), land + 0.1, 0.21 * glint)
    return m.render()


def undo(cfg: dict) -> np.ndarray:
    """Un-check: a small, soft step back down. Not a scolding."""
    m = Mix(0.6)
    m.notes(cfg["lead"], ["B4", "G4"], 0.0, 0.10, gain=1.0, dur=0.45, bright=0.3)
    return finish(m.y, soften=2600)


def deposit(cfg: dict) -> np.ndarray:
    """Money into the bank: coins drop in, then two bright notes say it landed."""
    m = Mix(1.25)
    at = 0.0
    for k in range(6):
        m.add(coin(seed=300 + k, pitch=0.92 + 0.05 * k), at, 0.26)
        at += 0.085 - 0.007 * k
    m.notes("harp", ["G4", "D5", "G5"], at, 0.025, gain=0.6, dur=0.9)
    m.notes(cfg["lead"], ["D6", "G6"], at + 0.02, 0.10, gain=0.85, dur=0.7, accent_last=1.2)
    m.add(sparkle(0.5, 18, seed=93, ramp="down"), at + 0.12, 0.13 * cfg["glint"])
    return m.render()


def build_set(name: str) -> dict[str, tuple[np.ndarray, float]]:
    cfg = SETS[name]
    sounds: dict[str, tuple[np.ndarray, float]] = {}
    for lvl in range(1, 6):
        sounds[f"sfx_habit_{lvl}"] = (habit(cfg, lvl), LUFS_MAIN)
        sounds[f"sfx_task_{lvl}"] = (task(cfg, lvl), LUFS_MAIN)
    sounds["sfx_habits_finale"] = (habits_finale(cfg), LUFS_FINALE)
    sounds["sfx_paycheck_finale"] = (paycheck_finale(cfg), LUFS_FINALE)
    sounds["sfx_undo"] = (undo(cfg), LUFS_SOFT)
    sounds["sfx_deposit"] = (deposit(cfg), LUFS_MAIN)
    return sounds


# --------------------------------------------------------------------------
# Output: loudness-match, then encode
# --------------------------------------------------------------------------

def _write_wav(path: Path, y: np.ndarray) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())


def measure_lufs(path: Path) -> float:
    """Integrated loudness via ffmpeg's EBU R128 meter.

    The clip is looped to ~4 s first: R128 needs 400 ms blocks and misreads
    sub-second sounds played once.
    """
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-stream_loop", "5", "-i", str(path),
         "-af", "ebur128", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    ).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1])


def export(y: np.ndarray, target_lufs: float, dest: Path) -> dict:
    """Gain `y` to `target_lufs` (never above the peak ceiling) and write an MP3."""
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        y = y * 0.5  # headroom for the measurement pass
        _write_wav(wav, y)
        gain_db = target_lufs - measure_lufs(wav)
        peak_db = 20 * np.log10(np.max(np.abs(y)) + 1e-9) + gain_db
        if peak_db > PEAK_CEILING_DB:
            gain_db -= peak_db - PEAK_CEILING_DB
        _write_wav(wav, y * 10 ** (gain_db / 20))
        dest.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
             "-codec:a", "libmp3lame", "-b:a", "128k", "-ac", "1", "-ar", str(SR),
             "-map_metadata", "-1", str(dest)],
            check=True,
        )
        return {"lufs": round(measure_lufs(dest), 1), "seconds": round(len(y) / SR, 2)}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--install", metavar="SET", choices=sorted(SETS),
                    help="render one set straight into the integration's sounds/ folder")
    args = ap.parse_args()

    if args.install:
        for name, (y, lufs) in build_set(args.install).items():
            info = export(y, lufs, INSTALL_DIR / f"{name}.mp3")
            print(f"{name}.mp3  {info['seconds']}s  {info['lufs']} LUFS")
        return

    manifest = {}
    for set_name, cfg in SETS.items():
        files = {}
        for name, (y, lufs) in build_set(set_name).items():
            files[name] = export(y, lufs, OUT / set_name / f"{name}.mp3")
        manifest[set_name] = {"title": cfg["title"], "blurb": cfg["blurb"], "files": files}
        print(f"{set_name}: {len(files)} sounds")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    sys.exit(main())
