# EarnKeep - WebSocket API
# Registers WebSocket commands for the frontend to interact with the store.

from __future__ import annotations

import logging

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .admin_auth import AdminSessions
from .const import DOMAIN
from .sprite_check import check_sprite

_LOGGER = logging.getLogger(__name__)


def _sessions(hass: HomeAssistant) -> AdminSessions:
    return hass.data[DOMAIN].setdefault("admin_sessions", AdminSessions())


def _admin_ok(hass: HomeAssistant, connection, msg) -> bool:
    """Admin commands need a live PIN session token, or an HA admin user.

    Sends an `unauthorized` error and returns False otherwise. HA admins
    pass without a token: they can already edit EarnKeep's storage file.
    """
    user = getattr(connection, "user", None)
    if (user is not None and user.is_admin) or _sessions(hass).check(msg.get("admin_token")):
        return True
    connection.send_error(msg["id"], "unauthorized", "Admin PIN required")
    return False


@callback
def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register all WebSocket commands."""
    websocket_api.async_register_command(hass, ws_get_data)
    websocket_api.async_register_command(hass, ws_toggle_habit)
    websocket_api.async_register_command(hass, ws_add_transaction)
    websocket_api.async_register_command(hass, ws_update_transaction)
    websocket_api.async_register_command(hass, ws_update_settings)
    websocket_api.async_register_command(hass, ws_update_family_member)
    websocket_api.async_register_command(hass, ws_add_family_member)
    websocket_api.async_register_command(hass, ws_delete_family_member)
    websocket_api.async_register_command(hass, ws_add_accountability)
    websocket_api.async_register_command(hass, ws_update_accountability)
    websocket_api.async_register_command(hass, ws_delete_accountability)
    websocket_api.async_register_command(hass, ws_verify_pin)
    websocket_api.async_register_command(hass, ws_lock_admin)
    websocket_api.async_register_command(hass, ws_add_announcement)
    websocket_api.async_register_command(hass, ws_update_announcement)
    websocket_api.async_register_command(hass, ws_delete_announcement)
    websocket_api.async_register_command(hass, ws_test_announcement)


@websocket_api.websocket_command(
    {vol.Required("type"): "earn_keep/get_data"}
)
@websocket_api.async_response
async def ws_get_data(hass, connection, msg):
    """Return all stored data."""
    store = hass.data[DOMAIN]["store"]
    connection.send_result(msg["id"], store.get_data())


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/toggle_habit",
        vol.Required("accountability_id"): str,
        vol.Required("child_id"): str,
        vol.Required("completed"): bool,
        vol.Optional("date"): str,
    }
)
@websocket_api.async_response
async def ws_toggle_habit(hass, connection, msg):
    """Toggle a habit completion state."""
    store = hass.data[DOMAIN]["store"]
    result = await store.toggle_habit(
        msg["accountability_id"],
        msg["child_id"],
        msg["completed"],
        date=msg.get("date"),
    )
    connection.send_result(msg["id"], {"daily_habits": result})

    _play_toggle_sfx(hass, store, msg)


def _play_toggle_sfx(hass: HomeAssistant, store, msg: dict) -> None:
    """Fire-and-forget sound for a check or un-check (rules in combo.py)."""
    from .announcer import async_play_sfx
    from .combo import SFX_UNDO, ComboTracker, pick_sfx

    combo: ComboTracker = hass.data[DOMAIN].setdefault("combo", ComboTracker())
    child_id = msg["child_id"]
    # A paid task recurs through the week, so the day is part of its identity.
    item = (msg["accountability_id"], msg.get("date"))

    if not msg["completed"]:
        combo.undo(child_id, item)
        sfx = SFX_UNDO
    else:
        paid = store.is_compensated(msg["accountability_id"])
        level = combo.complete(child_id, item)
        finale = (
            store.paycheck_full(child_id) if paid else store.habit_board_complete(child_id)
        )
        sfx = pick_sfx(paid=paid, level=level, finale=finale)
    hass.async_create_task(async_play_sfx(hass, sfx))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/add_transaction",
        vol.Optional("admin_token"): str,
        vol.Required("child_id"): str,
        vol.Required("label"): str,
        vol.Required("amount"): vol.Coerce(float),
        vol.Optional("date"): str,
        vol.Optional("date_user_entered", default=False): bool,
    }
)
@websocket_api.async_response
async def ws_add_transaction(hass, connection, msg):
    """Add a new banking transaction."""
    if not _admin_ok(hass, connection, msg):
        return
    store = hass.data[DOMAIN]["store"]
    result = await store.add_transaction(
        child_id=msg["child_id"],
        label=msg["label"],
        amount=msg["amount"],
        date=msg.get("date"),
        date_user_entered=msg.get("date_user_entered", False),
    )
    connection.send_result(msg["id"], result)

    # Coins-in-the-jar for a deposit made at the tablet. Withdrawals stay
    # silent, and the scheduler's paycheck/interest never come through here.
    if msg["amount"] > 0:
        from .announcer import async_play_sfx
        from .combo import SFX_DEPOSIT

        hass.async_create_task(async_play_sfx(hass, SFX_DEPOSIT))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/update_transaction",
        vol.Optional("admin_token"): str,
        vol.Required("transaction_id"): str,
        vol.Required("updates"): dict,
    }
)
@websocket_api.async_response
async def ws_update_transaction(hass, connection, msg):
    """Update an existing transaction."""
    if not _admin_ok(hass, connection, msg):
        return
    store = hass.data[DOMAIN]["store"]
    try:
        result = await store.update_transaction(
            msg["transaction_id"], msg["updates"]
        )
        connection.send_result(msg["id"], result)
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_request", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/update_settings",
        vol.Optional("admin_token"): str,
        vol.Required("settings"): dict,
    }
)
@websocket_api.async_response
async def ws_update_settings(hass, connection, msg):
    """Update application settings."""
    if not _admin_ok(hass, connection, msg):
        return
    store = hass.data[DOMAIN]["store"]
    pin = msg["settings"].get("admin_pin")
    if pin is not None and (not isinstance(pin, str) or not pin.strip()):
        connection.send_error(msg["id"], "invalid_request", "PIN can't be empty")
        return
    result = await store.update_settings(msg["settings"])
    if pin is not None:
        _sessions(hass).revoke_others(msg.get("admin_token"))

    # Re-register scheduled jobs if timing settings changed
    scheduler = hass.data[DOMAIN].get("scheduler")
    if scheduler:
        await scheduler.async_update_schedule(store)

    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/update_family_member",
        vol.Optional("admin_token"): str,
        vol.Required("member_id"): str,
        vol.Required("updates"): dict,
    }
)
@websocket_api.async_response
async def ws_update_family_member(hass, connection, msg):
    """Update a family member's properties."""
    if not _admin_ok(hass, connection, msg):
        return
    if "sprite" in msg["updates"]:
        problem = check_sprite(msg["updates"]["sprite"])
        if problem:
            connection.send_error(msg["id"], "invalid_sprite", problem)
            return
    store = hass.data[DOMAIN]["store"]
    try:
        result = await store.update_family_member(msg["member_id"], msg["updates"])
        connection.send_result(msg["id"], result)
    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/add_family_member",
        vol.Optional("admin_token"): str,
        vol.Required("name"): str,
        vol.Optional("color", default="#2196F3"): str,
        vol.Optional("emoji", default="\U0001f9d2"): str,
        vol.Optional("compensation", default=5.0): vol.Coerce(float),
        vol.Optional("birthday", default=""): str,
        vol.Optional("sprite"): vol.Any(dict, None),
    }
)
@websocket_api.async_response
async def ws_add_family_member(hass, connection, msg):
    """Add a new family member."""
    if not _admin_ok(hass, connection, msg):
        return
    problem = check_sprite(msg.get("sprite"))
    if problem:
        connection.send_error(msg["id"], "invalid_sprite", problem)
        return
    store = hass.data[DOMAIN]["store"]
    data = {
        "name": msg["name"],
        "color": msg.get("color", "#2196F3"),
        "emoji": msg.get("emoji", "\U0001f9d2"),
        "compensation": msg.get("compensation", 5.0),
        "birthday": msg.get("birthday", ""),
        "sprite": msg.get("sprite"),
    }
    try:
        result = await store.add_family_member(data)
        connection.send_result(msg["id"], result)
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_request", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/delete_family_member",
        vol.Optional("admin_token"): str,
        vol.Required("member_id"): str,
    }
)
@websocket_api.async_response
async def ws_delete_family_member(hass, connection, msg):
    """Delete a family member and cascade cleanup."""
    if not _admin_ok(hass, connection, msg):
        return
    store = hass.data[DOMAIN]["store"]
    try:
        await store.delete_family_member(msg["member_id"])
        connection.send_result(msg["id"], {"success": True})
    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/add_accountability",
        vol.Optional("admin_token"): str,
        vol.Required("name"): str,
        vol.Optional("entity_slug"): str,
        vol.Optional("emoji", default="check"): str,
        vol.Optional("acct_type", default="daily"): str,
        vol.Optional("time_of_day", default="morning"): str,
        vol.Optional("assigned_to", default=[]): list,
        vol.Optional("recurrence_days", default=[0, 1, 2, 3, 4, 5, 6]): list,
    }
)
@websocket_api.async_response
async def ws_add_accountability(hass, connection, msg):
    """Add a new accountability."""
    if not _admin_ok(hass, connection, msg):
        return
    store = hass.data[DOMAIN]["store"]
    data = {
        "name": msg["name"],
        "emoji": msg.get("emoji", "check"),
        "type": msg.get("acct_type", "daily"),
        "time_of_day": msg.get("time_of_day", "morning"),
        "assigned_to": msg.get("assigned_to", []),
        "recurrence_days": msg.get("recurrence_days", [0, 1, 2, 3, 4, 5, 6]),
    }
    if "entity_slug" in msg:
        data["entity_slug"] = msg["entity_slug"]

    result = await store.add_accountability(data)
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/update_accountability",
        vol.Optional("admin_token"): str,
        vol.Required("accountability_id"): str,
        vol.Required("updates"): dict,
    }
)
@websocket_api.async_response
async def ws_update_accountability(hass, connection, msg):
    """Update an existing accountability."""
    if not _admin_ok(hass, connection, msg):
        return
    store = hass.data[DOMAIN]["store"]
    updates = dict(msg["updates"])
    # Map acct_type back to type (renamed on wire to avoid WS type collision)
    if "acct_type" in updates:
        updates["type"] = updates.pop("acct_type")
    try:
        result = await store.update_accountability(
            msg["accountability_id"], updates
        )
        connection.send_result(msg["id"], result)
    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/delete_accountability",
        vol.Optional("admin_token"): str,
        vol.Required("accountability_id"): str,
    }
)
@websocket_api.async_response
async def ws_delete_accountability(hass, connection, msg):
    """Delete an accountability."""
    if not _admin_ok(hass, connection, msg):
        return
    store = hass.data[DOMAIN]["store"]
    await store.delete_accountability(msg["accountability_id"])
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/verify_pin",
        vol.Required("pin"): str,
    }
)
@websocket_api.async_response
async def ws_verify_pin(hass, connection, msg):
    """Check the admin PIN; a correct one returns an admin session token."""
    store = hass.data[DOMAIN]["store"]
    sessions = _sessions(hass)
    token = sessions.attempt(msg["pin"], store.admin_pin)
    connection.send_result(
        msg["id"],
        {"valid": token is not None, "token": token, "retry_after": round(sessions.retry_after())},
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/lock_admin",
        vol.Optional("admin_token"): str,
    }
)
@callback
def ws_lock_admin(hass, connection, msg):
    """End an admin session."""
    _sessions(hass).revoke(msg.get("admin_token"))
    connection.send_result(msg["id"], {"success": True})


# --- Announcement Events ---


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/add_announcement",
        vol.Required("name"): str,
        vol.Optional("enabled", default=True): bool,
        vol.Optional("time", default="20:30"): str,
        vol.Optional("time_of_day_filter", default="evening"): str,
        vol.Optional("opening", default="It's bedtime."): str,
        vol.Optional("closing", default="Off to bed."): str,
        vol.Optional("all_done", default="Everything's done tonight — well played."): str,
        vol.Optional("voice", default=""): str,
        vol.Optional("days_of_week", default=[0, 1, 2, 3, 4, 5, 6]): list,
    }
)
@websocket_api.async_response
async def ws_add_announcement(hass, connection, msg):
    """Add a new announcement event."""
    store = hass.data[DOMAIN]["store"]
    data = {k: msg[k] for k in ("name", "enabled", "time", "time_of_day_filter",
                                  "opening", "closing", "all_done", "voice",
                                  "days_of_week") if k in msg}
    result = await store.add_announcement(data)

    # Re-register scheduled listeners
    scheduler = hass.data[DOMAIN].get("scheduler")
    if scheduler:
        await scheduler.async_update_schedule(store)

    connection.send_result(msg["id"], result)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/update_announcement",
        vol.Required("announcement_id"): str,
        vol.Required("updates"): dict,
    }
)
@websocket_api.async_response
async def ws_update_announcement(hass, connection, msg):
    """Update an existing announcement event."""
    store = hass.data[DOMAIN]["store"]
    try:
        result = await store.update_announcement(msg["announcement_id"], msg["updates"])

        # Re-register scheduled listeners
        scheduler = hass.data[DOMAIN].get("scheduler")
        if scheduler:
            await scheduler.async_update_schedule(store)

        connection.send_result(msg["id"], result)
    except ValueError as err:
        connection.send_error(msg["id"], "not_found", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/delete_announcement",
        vol.Required("announcement_id"): str,
    }
)
@websocket_api.async_response
async def ws_delete_announcement(hass, connection, msg):
    """Delete an announcement event."""
    store = hass.data[DOMAIN]["store"]
    await store.delete_announcement(msg["announcement_id"])

    # Re-register scheduled listeners
    scheduler = hass.data[DOMAIN].get("scheduler")
    if scheduler:
        await scheduler.async_update_schedule(store)

    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "earn_keep/test_announcement",
        vol.Required("announcement_id"): str,
    }
)
@websocket_api.async_response
async def ws_test_announcement(hass, connection, msg):
    """Test an announcement event immediately."""
    from .announcer import async_run_announcement

    store = hass.data[DOMAIN]["store"]

    event = store.get_announcement(msg["announcement_id"])
    if event is None:
        connection.send_error(msg["id"], "not_found", "Announcement not found")
        return

    text = await async_run_announcement(hass, store, event)
    connection.send_result(msg["id"], {"success": True, "text": text})
