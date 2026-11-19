"""Shallow check for a Sprite character file before it is stored.

The panel validates every trait against the trait table before saving
(frontend/src/world/sprites/traits.ts). The backend only guards the store:
right shape, a version it can read, and a sane size. No HA imports, so it
is unit-testable without Home Assistant.
"""

from __future__ import annotations

import json

FORMAT = "earnkeep-sprite"
VERSION = 1
MAX_BYTES = 16 * 1024


def check_sprite(value) -> str | None:
    """Return None if `value` may be stored as a member's sprite, else why not."""
    if value is None:
        return None
    if not isinstance(value, dict):
        return "a character must be a JSON object"
    if value.get("format") != FORMAT:
        return f'format must be "{FORMAT}"'
    version = value.get("version")
    if not isinstance(version, int) or isinstance(version, bool):
        return "version must be a whole number"
    if version > VERSION:
        return f"version {version} is newer than this EarnKeep reads ({VERSION})"
    if version != VERSION:
        return f"version must be {VERSION}"
    if len(json.dumps(value, separators=(",", ":")).encode()) > MAX_BYTES:
        return "a character file must be under 16 KB"
    return None
