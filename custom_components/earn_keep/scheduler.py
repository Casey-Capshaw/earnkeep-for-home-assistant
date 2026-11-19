# EarnKeep - Scheduler
# Manages timed events for daily resets, compensation, and monthly interest.

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_change

from .announcer import async_run_announcement
from .store import EarnKeepStore

_LOGGER = logging.getLogger(__name__)


def _parse_time(time_str: str) -> tuple[int, int]:
    """Parse a time string like '08:30' into (hour, minute)."""
    parts = time_str.split(":")
    return int(parts[0]), int(parts[1])


class EarnKeepScheduler:
    """Schedules daily resets, compensation, and monthly interest."""

    def __init__(self) -> None:
        self._unsub_daily: callback | None = None
        self._unsub_weekly: callback | None = None
        self._unsub_monthly: callback | None = None
        self._unsub_announcements: dict[str, callback] = {}
        self._hass: HomeAssistant | None = None
        self._store: EarnKeepStore | None = None

    async def async_setup(self, hass: HomeAssistant, store: EarnKeepStore) -> None:
        """Register all time-based listeners."""
        self._hass = hass
        self._store = store
        await self._async_register_listeners()

    async def async_update_schedule(self, store: EarnKeepStore) -> None:
        """Re-register listeners when settings change."""
        self._store = store
        self._async_unsubscribe()
        await self._async_register_listeners()

    async def _async_register_listeners(self) -> None:
        """Set up all scheduled listeners based on current settings."""
        if self._hass is None or self._store is None:
            return

        settings = self._store.get_data()["settings"]

        # Daily reset
        daily_hour, daily_minute = _parse_time(settings["daily_reset_time"])
        self._unsub_daily = async_track_time_change(
            self._hass,
            self._async_daily_reset,
            hour=daily_hour,
            minute=daily_minute,
            second=0,
        )
        _LOGGER.debug(
            "Daily reset scheduled at %02d:%02d", daily_hour, daily_minute
        )

        # Compensation
        compensation_hour, compensation_minute = _parse_time(settings["compensation_time"])
        self._unsub_weekly = async_track_time_change(
            self._hass,
            self._async_compensation,
            hour=compensation_hour,
            minute=compensation_minute,
            second=0,
        )
        _LOGGER.debug(
            "Compensation scheduled at %02d:%02d on day %d",
            compensation_hour,
            compensation_minute,
            settings["compensation_day"],
        )

        # Monthly interest
        monthly_hour, monthly_minute = _parse_time(settings["monthly_interest_time"])
        self._unsub_monthly = async_track_time_change(
            self._hass,
            self._async_monthly_interest,
            hour=monthly_hour,
            minute=monthly_minute,
            second=0,
        )
        _LOGGER.debug(
            "Monthly interest scheduled at %02d:%02d on day %d",
            monthly_hour,
            monthly_minute,
            settings["monthly_interest_day"],
        )

        # Announcement events
        self._unsubscribe_announcements()
        announcements = self._store.get_announcements()
        _LOGGER.info("Registering %d announcement(s): %s", len(announcements), announcements)
        for event_dict in announcements:
            if not event_dict.get("enabled", False):
                continue
            event_id = event_dict["id"]
            event_hour, event_minute = _parse_time(event_dict["time"])

            def _make_callback(eid: str):
                async def _cb(now):
                    await self._async_announcement(eid)
                return _cb

            self._unsub_announcements[event_id] = async_track_time_change(
                self._hass,
                _make_callback(event_id),
                hour=event_hour,
                minute=event_minute,
                second=0,
            )
            _LOGGER.info(
                "Announcement '%s' scheduled at %02d:%02d",
                event_dict["name"],
                event_hour,
                event_minute,
            )

    async def _async_daily_reset(self, now) -> None:
        """Handle daily habit reset."""
        _LOGGER.info("Running daily habit reset")
        await self._store.reset_daily_habits()

    async def _async_compensation(self, now) -> None:
        """Handle compensation - only on the configured day of week."""
        settings = self._store.get_data()["settings"]
        # now.weekday(): Monday=0, Sunday=6
        if now.weekday() != settings["compensation_day"]:
            return

        _LOGGER.info("Running compensation processing")
        await self._store.process_compensation()
        await self._store.reset_weekly_habits()

    async def _async_announcement(self, event_id: str) -> None:
        """Fire an announcement event."""
        from datetime import datetime

        _LOGGER.info("Scheduler callback triggered for event_id: %s", event_id)
        event = self._store.get_announcement(event_id)
        if event is None or not event.enabled:
            _LOGGER.info("Event %s is None or disabled, skipping", event_id)
            return

        today_weekday = datetime.now().weekday()  # 0=Mon..6=Sun
        if today_weekday not in event.days_of_week:
            _LOGGER.info(
                "Announcement '%s' skipped — today (%d) not in days_of_week %s",
                event.name, today_weekday, event.days_of_week,
            )
            return

        _LOGGER.info("Firing announcement: %s", event.name)
        await async_run_announcement(self._hass, self._store, event)

    async def _async_monthly_interest(self, now) -> None:
        """Handle monthly interest - only on the configured day of month."""
        settings = self._store.get_data()["settings"]
        if now.day != settings["monthly_interest_day"]:
            return

        _LOGGER.info("Running monthly interest processing")
        await self._store.process_monthly_interest()

    def _unsubscribe_announcements(self) -> None:
        """Remove all announcement listeners."""
        for unsub in self._unsub_announcements.values():
            unsub()
        self._unsub_announcements.clear()

    @callback
    def _async_unsubscribe(self) -> None:
        """Remove all scheduled listeners."""
        if self._unsub_daily:
            self._unsub_daily()
            self._unsub_daily = None
        if self._unsub_weekly:
            self._unsub_weekly()
            self._unsub_weekly = None
        if self._unsub_monthly:
            self._unsub_monthly()
            self._unsub_monthly = None
        self._unsubscribe_announcements()

    @callback
    def async_shutdown(self) -> None:
        """Clean up on integration unload."""
        self._async_unsubscribe()
