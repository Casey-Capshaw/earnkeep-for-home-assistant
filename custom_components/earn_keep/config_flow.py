# EarnKeep - Config Flow
# Handles initial setup: PIN -> family count -> family names -> optional migration.
# The options flow holds per-install settings (the optional Fully Kiosk tablet).

from __future__ import annotations

import logging

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

from .const import (
    CONF_FULLY_KIOSK_HOST,
    CONF_FULLY_KIOSK_PORT,
    DEFAULT_FULLY_KIOSK_PORT,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

# Rotating defaults for new family members
DEFAULT_COLORS = [
    "#2196F3",  # blue
    "#FF9800",  # orange
    "#4CAF50",  # green
    "#E91E63",  # pink
    "#9C27B0",  # purple
    "#00BCD4",  # cyan
]
DEFAULT_EMOJIS = [
    "\U0001f409",  # dragon
    "\U0001f525",  # fire
    "\U0001f31f",  # star
    "\U0001f308",  # rainbow
    "\U0001f680",  # rocket
    "\U0001f3b5",  # music note
]


class EarnKeepConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Config flow for EarnKeep."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Return the options flow handler."""
        return EarnKeepOptionsFlow(config_entry)

    def __init__(self) -> None:
        """Initialize config flow state."""
        self._admin_pin: str = "1234"
        self._num_kids: int = 2
        self._initial_family: list[dict] = []

    async def async_step_user(self, user_input=None):
        """Step 1: Ask for admin PIN."""
        if user_input is not None:
            self._admin_pin = user_input["admin_pin"]
            return await self.async_step_family_count()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {vol.Required("admin_pin", default="1234"): str}
            ),
        )

    async def async_step_family_count(self, user_input=None):
        """Step 2: How many kids?"""
        if user_input is not None:
            self._num_kids = user_input["num_kids"]
            return await self.async_step_family_names()

        return self.async_show_form(
            step_id="family_count",
            data_schema=vol.Schema(
                {
                    vol.Required("num_kids", default=2): vol.In(
                        {1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6"}
                    )
                }
            ),
        )

    async def async_step_family_names(self, user_input=None):
        """Step 3: Name each kid."""
        if user_input is not None:
            self._initial_family = []
            for i in range(self._num_kids):
                key = f"child_{i + 1}_name"
                name = user_input.get(key, f"Child {i + 1}")
                self._initial_family.append(
                    {
                        "name": name,
                        "color": DEFAULT_COLORS[i % len(DEFAULT_COLORS)],
                        "emoji": DEFAULT_EMOJIS[i % len(DEFAULT_EMOJIS)],
                    }
                )

            # Check if old entities exist for migration
            has_old_entities = self._check_old_entities()
            if has_old_entities:
                return await self.async_step_migrate()

            return self.async_create_entry(
                title="EarnKeep",
                data={
                    "admin_pin": self._admin_pin,
                    "initial_family": self._initial_family,
                },
            )

        # Build dynamic schema with N name fields
        schema_dict: dict = {}
        for i in range(self._num_kids):
            key = f"child_{i + 1}_name"
            schema_dict[vol.Required(key, default="")] = str

        return self.async_show_form(
            step_id="family_names",
            data_schema=vol.Schema(schema_dict),
        )

    async def async_step_migrate(self, user_input=None):
        """Step 4 (optional): Offer migration from old entities."""
        if user_input is not None:
            return self.async_create_entry(
                title="EarnKeep",
                data={
                    "admin_pin": self._admin_pin,
                    "initial_family": self._initial_family,
                    "migrate": user_input.get("migrate", False),
                },
            )

        return self.async_show_form(
            step_id="migrate",
            data_schema=vol.Schema(
                {vol.Required("migrate", default=True): bool}
            ),
        )

    def _check_old_entities(self) -> bool:
        """Check if old Family Roles entities exist in Home Assistant."""
        check_entities = [
            "sensor.family_roles_accountabilities",
            "sensor.family_roles_transactions",
        ]
        for entity_id in check_entities:
            if self.hass.states.get(entity_id) is not None:
                return True
        return False


class EarnKeepOptionsFlow(config_entries.OptionsFlow):
    """Options: the optional Fully Kiosk tablet used for announcements/SFX.

    An empty host disables tablet playback. The remote-admin password is
    not an option — it stays in .earnkeep_fk_password in HA's config dir.
    """

    def __init__(self, config_entry) -> None:
        # Stored under a private name: newer HA provides self.config_entry
        # itself and warns if a flow assigns it; 2024.1 (our HACS minimum)
        # does not, so keep our own reference.
        self._entry = config_entry

    async def async_step_init(self, user_input=None):
        """Single step: Fully Kiosk host and port."""
        if user_input is not None:
            return self.async_create_entry(
                title="",
                data={
                    CONF_FULLY_KIOSK_HOST: (
                        user_input.get(CONF_FULLY_KIOSK_HOST) or ""
                    ).strip(),
                    CONF_FULLY_KIOSK_PORT: user_input.get(
                        CONF_FULLY_KIOSK_PORT, DEFAULT_FULLY_KIOSK_PORT
                    ),
                },
            )

        options = self._entry.options
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        CONF_FULLY_KIOSK_HOST,
                        description={
                            "suggested_value": options.get(
                                CONF_FULLY_KIOSK_HOST, ""
                            )
                        },
                    ): str,
                    vol.Required(
                        CONF_FULLY_KIOSK_PORT,
                        default=options.get(
                            CONF_FULLY_KIOSK_PORT, DEFAULT_FULLY_KIOSK_PORT
                        ),
                    ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
                }
            ),
        )
