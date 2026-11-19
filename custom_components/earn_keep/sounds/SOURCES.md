# Sound effects — sources and license

Every file in this folder is **original work, synthesized from scratch** by
`scripts/sfx/synth.py` in this repo (sine partials, short noise bursts and a
synthetic reverb in numpy). No samples, recordings, AI-generated audio or
third-party material are used, so there is nothing to attribute and the
files carry the same terms as the rest of the repo.

Installed set: **`harp`** ("Harp & chimes", chosen 2026-11-11). To switch sets or re-render after
editing the synth:

    python3 scripts/sfx/synth.py --install harp     # or: bells, musicbox

| File | Plays when |
|---|---|
| `sfx_habit_1.mp3` … `sfx_habit_5.mp3` | A daily habit is checked; the number is the kid's combo level |
| `sfx_task_1.mp3` … `sfx_task_5.mp3` | A paid (compensated) task is checked, same combo |
| `sfx_habits_finale.mp3` | The last habit on a kid's board is checked |
| `sfx_paycheck_finale.mp3` | The last paid task of the week is checked |
| `sfx_undo.mp3` | Anything is un-checked |
| `sfx_deposit.mp3` | A deposit is made in Admin |

The rules that pick a file live in `../combo.py`.

Loudness: each file is gained to a common EBU R128 level (−18 LUFS; finales
−17, undo −24) with peaks under −2 dBFS, because the tablet plays them on the
alarm stream at full volume. The targets are constants at the top of
`synth.py`.

All sounds share one key (G major pentatonic), so sounds that overlap or
follow each other closely stay in tune.
