# EarnKeep - Announcer
# Builds announcement text from incomplete tasks and plays via HA TTS.

from __future__ import annotations

import asyncio
import logging
import os

from urllib.parse import quote

import aiohttp

from homeassistant.core import HomeAssistant
from homeassistant.helpers.network import NoURLAvailableError, get_url

from .const import (
    CONF_FULLY_KIOSK_HOST,
    CONF_FULLY_KIOSK_PORT,
    DEFAULT_FULLY_KIOSK_PORT,
    DOMAIN,
    FULLY_KIOSK_PASSWORD_FILE,
)
from .kiosk import fully_kiosk_base_url
from .models import AnnouncementEvent

_LOGGER = logging.getLogger(__name__)

# ElevenLabs config entry domain — API key and voice pulled from HA config entry
ELEVENLABS_DOMAIN = "elevenlabs"

# Fully Kiosk audio stream constants (Android AudioManager)
STREAM_ALARM = 4


def build_announcement_text(store, event: AnnouncementEvent) -> str:
    """Build natural-language announcement text from incomplete tasks."""
    result = store.get_incomplete_tasks(event.time_of_day_filter)
    shared = result["shared"]
    per_child = result["per_child"]

    parts = [event.opening]

    has_incomplete = bool(shared) or bool(per_child)

    if not has_incomplete:
        parts.append(event.all_done)
    else:
        if shared:
            task_list = _join_list(shared)
            parts.append(f"You both still need to {task_list}.")

        for child_id, info in per_child.items():
            child_name = info["name"]
            task_list = _join_list(info["tasks"])
            parts.append(f"{child_name}, you still need to {task_list}.")

    parts.append(event.closing)

    return " ".join(parts)


def _join_list(items: list[str]) -> str:
    """Join a list of items with commas and 'and'."""
    if not items:
        return ""
    if len(items) == 1:
        return items[0].lower()
    if len(items) == 2:
        return f"{items[0].lower()} and {items[1].lower()}"
    return ", ".join(item.lower() for item in items[:-1]) + f", and {items[-1].lower()}"


async def async_run_announcement(
    hass: HomeAssistant, store, event: AnnouncementEvent
) -> str:
    """Build text, generate TTS via ElevenLabs, play on ALARM stream.

    1. Calls ElevenLabs API directly to generate MP3 (no media player)
    2. Saves to HA tts cache dir and serves via /api/tts_proxy/
    3. Plays the MP3 via Fully Kiosk playSound on STREAM_ALARM

    Returns the announcement text that was spoken.
    """
    text = build_announcement_text(store, event)
    _LOGGER.info("Announcement '%s': %s", event.name, text)

    if _fully_kiosk_base(hass) is None:
        # Nothing to play it on — skip the ElevenLabs call entirely.
        _LOGGER.debug(
            "Announcement '%s' not played: no Fully Kiosk host configured "
            "in the EarnKeep options", event.name,
        )
        return text

    tts_url: str | None = None
    last_exc: Exception | None = None
    for attempt in range(1, 4):
        try:
            if tts_url is None:
                tts_url = await _async_generate_tts(hass, text, event.voice)
            await _fully_kiosk_play(hass, tts_url)
            _LOGGER.info(
                "Announcement '%s' played via STREAM_ALARM (attempt %d)",
                event.name, attempt,
            )
            break
        except Exception as exc:
            last_exc = exc
            _LOGGER.warning(
                "Announcement '%s' attempt %d/3 failed: %s",
                event.name, attempt, exc,
            )
            if attempt < 3:
                await asyncio.sleep(30)
    else:
        _LOGGER.error(
            "Announcement '%s' failed after 3 attempts", event.name,
            exc_info=last_exc,
        )

    return text


def _get_elevenlabs_config(hass: HomeAssistant) -> tuple[str, str, str]:
    """Get ElevenLabs API key, voice ID, and model from HA config entry."""
    from homeassistant.config_entries import ConfigEntry

    entries = hass.config_entries.async_entries(ELEVENLABS_DOMAIN)
    if not entries:
        raise RuntimeError("No ElevenLabs integration configured in HA")
    entry = entries[0]
    api_key = entry.data.get("api_key", "")
    voice = entry.options.get("voice", "")
    model = entry.options.get("model", "eleven_turbo_v2_5")
    return api_key, voice, model


async def _async_generate_tts(
    hass: HomeAssistant, text: str, voice: str = ""
) -> str:
    """Call ElevenLabs API directly to generate MP3, with text-based caching.

    Bypasses HA's tts.speak service entirely so no audio is sent to
    media_player.fire_tablet (which causes Fully Kiosk error toasts).
    Caches by text hash — identical text reuses the existing MP3.
    """
    import hashlib

    api_key, default_voice, model = _get_elevenlabs_config(hass)
    voice_id = voice or default_voice
    if not api_key or not voice_id:
        raise RuntimeError("ElevenLabs API key or voice ID not configured")

    # Cache key based on text + voice + model
    cache_key = hashlib.md5(f"{text}|{voice_id}|{model}".encode()).hexdigest()
    www_dir = hass.config.path("www")
    filename = f"earnkeep_tts_{cache_key}.mp3"
    filepath = os.path.join(www_dir, filename)

    # Check if cached file already exists
    file_exists = await hass.async_add_executor_job(os.path.exists, filepath)
    if file_exists:
        _LOGGER.debug("TTS cache hit: %s", filename)
    else:
        _LOGGER.debug("TTS cache miss — calling ElevenLabs API")
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }
        payload = {
            "text": text,
            "model_id": model,
        }

        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers, timeout=timeout) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    raise RuntimeError(f"ElevenLabs API returned {resp.status}: {body[:200]}")
                audio_data = await resp.read()

        def _write_file():
            with open(filepath, "wb") as f:
                f.write(audio_data)

        await hass.async_add_executor_job(_write_file)
        _LOGGER.debug("TTS saved to: %s (%d bytes)", filepath, len(audio_data))

    base_url = _ha_base_url(hass)
    if base_url is None:
        raise RuntimeError(
            "No Home Assistant URL available for the tablet to fetch audio "
            "from (set one in Settings -> System -> Network)"
        )
    return f"{base_url}/local/{filename}"


async def async_play_sfx(hass: HomeAssistant, sfx_file: str) -> None:
    """Play a sound effect on the tablet via Fully Kiosk STREAM_ALARM."""
    if _fully_kiosk_base(hass) is None:
        _LOGGER.debug("SFX %s skipped: no Fully Kiosk host configured", sfx_file)
        return
    base_url = _ha_base_url(hass)
    if base_url is None:
        _LOGGER.debug("SFX %s skipped: no Home Assistant URL available", sfx_file)
        return
    audio_url = f"{base_url}/earn_keep_sounds/{sfx_file}"
    _LOGGER.debug("SFX playing: %s (url: %s)", sfx_file, audio_url)
    try:
        await _fully_kiosk_play(hass, audio_url)
        _LOGGER.debug("SFX played: %s", sfx_file)
    except Exception:
        _LOGGER.debug("SFX playback failed for %s (non-critical)", sfx_file)


def _ha_base_url(hass: HomeAssistant) -> str | None:
    """URL the tablet uses to fetch audio from HA (internal URL preferred)."""
    try:
        return get_url(hass, prefer_external=False).rstrip("/")
    except NoURLAvailableError:
        return None


def _fully_kiosk_base(hass: HomeAssistant) -> str | None:
    """Fully Kiosk remote-admin base URL from the entry options, or None.

    None (no host configured) disables tablet playback; existing entries
    without options land here too.
    """
    entries = hass.config_entries.async_entries(DOMAIN)
    options = entries[0].options if entries else {}
    return fully_kiosk_base_url(
        options.get(CONF_FULLY_KIOSK_HOST),
        options.get(CONF_FULLY_KIOSK_PORT, DEFAULT_FULLY_KIOSK_PORT),
    )


async def _async_fk_password(hass: HomeAssistant) -> str:
    """Read the Fully Kiosk remote-admin password from HA's config dir.

    Kept out of the repo on purpose (rotated 2026-09-28 after the old value
    leaked via git). The file is /config/.earnkeep_fk_password (chmod 600).
    """
    path = hass.config.path(FULLY_KIOSK_PASSWORD_FILE)

    def _read() -> str:
        with open(path, encoding="utf-8") as f:
            return f.read().strip()

    pw = await hass.async_add_executor_job(_read)
    if not pw:
        raise RuntimeError(f"{FULLY_KIOSK_PASSWORD_FILE} is empty")
    return pw


async def _fully_kiosk_stop_sound(hass: HomeAssistant) -> None:
    """Stop any currently playing sound on Fully Kiosk."""
    base = _fully_kiosk_base(hass)
    if base is None:
        _LOGGER.debug("stopSound skipped: no Fully Kiosk host configured")
        return
    password = await _async_fk_password(hass)
    url = f"{base}/?cmd=stopSound&password={password}&type=json"
    timeout = aiohttp.ClientTimeout(total=5)
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=timeout) as resp:
                _LOGGER.debug("stopSound response: %d", resp.status)
    except Exception:
        _LOGGER.debug("stopSound failed (non-critical)")


async def _fully_kiosk_play(hass: HomeAssistant, audio_url: str) -> None:
    """Set alarm volume and play audio via Fully Kiosk on STREAM_ALARM."""
    base = _fully_kiosk_base(hass)
    if base is None:
        _LOGGER.debug("Fully Kiosk playback skipped: no host configured")
        return
    pw = await _async_fk_password(hass)
    timeout = aiohttp.ClientTimeout(total=15)

    async with aiohttp.ClientSession() as session:
        # Set ALARM stream volume
        vol_url = (
            f"{base}/?cmd=setAudioVolume&level=100"
            f"&stream={STREAM_ALARM}&password={pw}&type=json"
        )
        async with session.get(vol_url, timeout=timeout) as resp:
            _LOGGER.debug("Alarm volume set: %d", resp.status)


        # Play the cached MP3 on ALARM stream
        play_url = (
            f"{base}/?cmd=playSound"
            f"&url={quote(audio_url)}"
            f"&stream={STREAM_ALARM}"
            f"&password={pw}&type=json"
        )
        async with session.get(play_url, timeout=timeout) as resp:
            if resp.status == 200:
                _LOGGER.info("Fully Kiosk playSound (ALARM) sent")
            else:
                body = await resp.text()
                _LOGGER.error("playSound returned %d: %s", resp.status, body[:200])
