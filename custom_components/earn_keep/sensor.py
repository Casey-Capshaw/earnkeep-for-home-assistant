# EarnKeep - Sensor Platform
# Dynamic bank balance sensor entities that auto-create/remove as kids are
# added or deleted in the EarnKeep integration.

from __future__ import annotations

import logging

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .store import EarnKeepStore

_LOGGER = logging.getLogger(__name__)

SIGNAL_DATA_UPDATED = f"{DOMAIN}_data_updated"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up EarnKeep balance sensors from a config entry."""
    store: EarnKeepStore = hass.data[DOMAIN]["store"]

    # Track which member IDs have active sensor entities
    tracked: dict[str, list[SensorEntity]] = {}

    def _sync_sensors() -> None:
        """Add/remove sensors to match current store members."""
        current_ids = {m.id for m in store._family}
        tracked_ids = set(tracked)

        # New members: create sensors
        new_ids = current_ids - tracked_ids
        if new_ids:
            new_entities = []
            for member in store._family:
                if member.id in new_ids:
                    sensors = [
                        FamilyBalanceSensor(store, member.id),
                        FamilyTasksSensor(store, member.id),
                    ]
                    tracked[member.id] = sensors
                    new_entities.extend(sensors)
            async_add_entities(new_entities)

        # Deleted members: remove sensors
        removed_ids = tracked_ids - current_ids
        for member_id in removed_ids:
            for sensor in tracked.pop(member_id):
                hass.async_create_task(sensor.async_remove())

    # Create initial sensors
    _sync_sensors()

    @callback
    def _on_data_updated() -> None:
        """Handle store data updates — sync sensors and refresh state."""
        _sync_sensors()
        for sensors in tracked.values():
            for sensor in sensors:
                sensor.async_write_ha_state()

    # Listen for store changes
    entry.async_on_unload(
        async_dispatcher_connect(hass, SIGNAL_DATA_UPDATED, _on_data_updated)
    )


class FamilyBalanceSensor(SensorEntity):
    """Sensor showing a family member's bank balance."""

    _attr_has_entity_name = False
    _attr_native_unit_of_measurement = "$"
    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_state_class = SensorStateClass.TOTAL
    _attr_icon = "mdi:piggy-bank"

    def __init__(self, store: EarnKeepStore, member_id: str) -> None:
        self._store = store
        self._member_id = member_id
        member = self._get_member()
        self._attr_unique_id = f"earn_keep_balance_{member_id}"
        self._attr_name = f"{member.name} Bank Balance" if member else member_id

    def _get_member(self):
        """Look up the member in the store."""
        for m in self._store._family:
            if m.id == self._member_id:
                return m
        return None

    @property
    def native_value(self) -> float | None:
        member = self._get_member()
        return member.bank_balance if member else None

    @property
    def extra_state_attributes(self) -> dict | None:
        member = self._get_member()
        if not member:
            return None
        return {
            "emoji": member.emoji,
            "color": member.color,
            "compensation": member.compensation,
        }


class FamilyTasksSensor(SensorEntity):
    """Sensor showing a family member's task status for today.

    State = number of tasks (daily habits + accountabilities due today) still
    remaining; attributes carry the full done/remaining breakdown, weekly
    accountability progress, and streaks. Read-only, intended for exposure to
    the voice assistant.
    """

    _attr_has_entity_name = False
    _attr_native_unit_of_measurement = "tasks"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:clipboard-check-outline"

    def __init__(self, store: EarnKeepStore, member_id: str) -> None:
        self._store = store
        self._member_id = member_id
        member = None
        for m in store._family:
            if m.id == member_id:
                member = m
                break
        self._attr_unique_id = f"earn_keep_tasks_{member_id}"
        self._attr_name = (
            f"{member.name} Tasks Remaining Today" if member else member_id
        )

    @property
    def native_value(self) -> int | None:
        status = self._store.get_child_task_status(self._member_id)
        return status["tasks_remaining_today"] if status else None

    @property
    def extra_state_attributes(self) -> dict | None:
        status = self._store.get_child_task_status(self._member_id)
        if not status:
            return None
        return {
            "habits_done_today": status["habits_done_today"],
            "habits_remaining_today": status["habits_remaining_today"],
            "accountabilities_done_today": status["accountabilities_done_today"],
            "accountabilities_remaining_today": status[
                "accountabilities_remaining_today"
            ],
            "weekly_accountability_progress": status[
                "weekly_accountability_progress"
            ],
            "all_done_today": status["all_done_today"],
            "current_streak": status["current_streak"],
            "best_streak": status["best_streak"],
        }
