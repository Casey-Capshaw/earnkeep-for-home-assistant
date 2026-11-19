# EarnKeep - Custom Integration for Home Assistant
# Kid accountability tracker and banking system with daily habits,
# compensated tasks, bank balances, compensation, and monthly interest.

from __future__ import annotations

import hashlib
import logging

from homeassistant.components.frontend import (
    async_register_built_in_panel,
    async_remove_panel,
)
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .scheduler import EarnKeepScheduler
from .store import EarnKeepStore
from .websocket_api import async_register_websocket_api

PLATFORMS = [Platform.SENSOR]

_LOGGER = logging.getLogger(__name__)

PANEL_URL_PATH = "earn-keep"


def _bundle_cache_buster(path: str) -> str:
    """Content hash of the frontend bundle, used as the js_url ?v= param.

    Derived from the file itself so the URL changes exactly when the bundle
    changes — a hand-maintained version constant here once went stale and the
    tablet served a cached bundle through several redeploys.
    """
    digest = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()[:8]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up EarnKeep from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Initialize the data store
    store = EarnKeepStore(hass)
    had_existing_data = await store.async_load()

    # Auto-set timezone from HA config if still at the default
    data = store.get_data()
    if data["settings"]["timezone"] == "UTC" and hass.config.time_zone:
        await store.update_settings({"timezone": hass.config.time_zone})

    # If initial family was provided during setup, initialize then clear the flag.
    # Skip if existing data was loaded (e.g. migrated from family_roles.data).
    if entry.data.get("initial_family"):
        if not had_existing_data:
            try:
                await store.initialize_family(entry.data["initial_family"])
                _LOGGER.info("Family initialized from config flow")
            except Exception:
                _LOGGER.exception(
                    "Family initialization failed, continuing with defaults"
                )
        else:
            _LOGGER.info(
                "Skipping family initialization — existing data loaded from storage"
            )

        new_data = dict(entry.data)
        new_data.pop("initial_family", None)
        hass.config_entries.async_update_entry(entry, data=new_data)

    # Initialize the scheduler
    scheduler = EarnKeepScheduler()
    await scheduler.async_setup(hass, store)

    # Store references for cleanup and websocket access
    hass.data[DOMAIN]["store"] = store
    hass.data[DOMAIN]["scheduler"] = scheduler

    # Forward sensor platform setup
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Register WebSocket API
    async_register_websocket_api(hass)

    # Register static paths for frontend assets and sound effects
    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                "/earn_keep_frontend",
                hass.config.path("custom_components/earn_keep/frontend"),
                cache_headers=False,
            ),
            StaticPathConfig(
                "/earn_keep_sounds",
                hass.config.path("custom_components/earn_keep/sounds"),
                cache_headers=True,
            ),
        ]
    )

    # Register the sidebar panel. The unload hook removes it, so a config-entry
    # reload re-registers with a fresh bundle hash — frontend deploys only need
    # a reload of this entry, never a full core restart.
    bundle_version = await hass.async_add_executor_job(
        _bundle_cache_buster,
        hass.config.path("custom_components/earn_keep/frontend/earn-keep-panel.js"),
    )
    try:
        async_register_built_in_panel(
            hass,
            component_name="custom",
            sidebar_title="EarnKeep",
            sidebar_icon="mdi:account-group",
            frontend_url_path=PANEL_URL_PATH,
            config={
                "_panel_custom": {
                    "name": "earn-keep-panel",
                    "embed_iframe": False,
                    "trust_external": False,
                    "js_url": f"/earn_keep_frontend/earn-keep-panel.js?v={bundle_version}",
                }
            },
            require_admin=False,
        )
    except ValueError:
        _LOGGER.debug("Panel earn-keep already registered")

    _LOGGER.info("EarnKeep integration loaded")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload EarnKeep config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    scheduler = hass.data[DOMAIN].get("scheduler")
    if scheduler:
        scheduler.async_shutdown()

    # Remove the panel so a reload re-registers it with the current bundle
    # hash; without this the ValueError guard in setup would silently keep
    # the stale js_url.
    async_remove_panel(hass, PANEL_URL_PATH)

    hass.data.pop(DOMAIN, None)
    _LOGGER.info("EarnKeep integration unloaded")
    return unload_ok
