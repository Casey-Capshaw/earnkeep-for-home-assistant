# EarnKeep - Data Store
# Persistent JSON storage using Home Assistant's Store helper.

from __future__ import annotations

import logging
import re
import uuid
import zoneinfo
from datetime import datetime, timedelta, timezone

from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_KEY, STORAGE_VERSION
from .models import (
    Accountability,
    AnnouncementEvent,
    AppSettings,
    Badge,
    FamilyMember,
    HabitState,
    Transaction,
)

_LOGGER = logging.getLogger(__name__)

# Streak milestones that earn a permanent badge — see the HQ Ledger
# dashboard redesign's finalized streak/badge rules (Initiatives/earnkeep.md).
BADGE_MILESTONES = [7, 21, 30, 90]

DEFAULT_FAMILY = [
    FamilyMember(
        id="child_1",
        name="Child 1",
        color="#2196F3",
        emoji="\U0001f409",
        compensation=5.0,
        bank_balance=0.0,
    ),
    FamilyMember(
        id="child_2",
        name="Child 2",
        color="#FF9800",
        emoji="\U0001f525",
        compensation=5.0,
        bank_balance=0.0,
    ),
]

DEFAULT_ACCOUNTABILITIES = [
    Accountability(
        id="brush_teeth_am",
        name="Brush Teeth (Morning)",
        entity_slug="brush_teeth_morning",
        emoji="\U0001faa5",
        type="daily",
        time_of_day="morning",
        assigned_to=["child_1", "child_2"],
    ),
    Accountability(
        id="brush_teeth_pm",
        name="Brush Teeth (Night)",
        entity_slug="brush_teeth_night",
        emoji="\U0001faa5",
        type="daily",
        time_of_day="evening",
        assigned_to=["child_1", "child_2"],
    ),
    Accountability(
        id="make_bed",
        name="Make Bed",
        entity_slug="make_bed",
        emoji="\U0001f6cf\ufe0f",
        type="compensated",
        time_of_day="morning",
        assigned_to=["child_1", "child_2"],
    ),
    Accountability(
        id="clean_room",
        name="Clean Room",
        entity_slug="clean_room",
        emoji="\U0001f9f9",
        type="compensated",
        time_of_day="morning",
        assigned_to=["child_1", "child_2"],
    ),
    Accountability(
        id="homework",
        name="Homework",
        entity_slug="homework",
        emoji="\U0001f4da",
        type="compensated",
        time_of_day="evening",
        assigned_to=["child_1", "child_2"],
    ),
]


class EarnKeepStore:
    """Manages persistent storage for EarnKeep."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._family: list[FamilyMember] = []
        self._accountabilities: list[Accountability] = []
        self._transactions: list[Transaction] = []
        self._daily_habits: list[HabitState] = []
        self._announcements: list[AnnouncementEvent] = []
        self._settings: AppSettings = AppSettings()

    async def async_load(self) -> bool:
        """Load data from storage, initializing defaults if empty.

        Includes auto-migration from the old 'family_roles.data' storage key
        if this is the first load after the rebrand.

        Returns True if existing data was loaded (from new key or migration),
        False if defaults were used (fresh install).
        """
        data = await self._store.async_load()

        if data is None:
            # Check for legacy family_roles.data storage
            data = await self._migrate_from_legacy()

        if data is None:
            _LOGGER.info("No existing data found, initializing defaults")
            self._family = list(DEFAULT_FAMILY)
            self._accountabilities = list(DEFAULT_ACCOUNTABILITIES)
            self._transactions = []
            self._daily_habits = []
            self._settings = AppSettings()
            await self.async_save()
            return False

        self._family = [
            FamilyMember.from_dict(m) for m in data.get("family", [])
        ]
        self._accountabilities = [
            Accountability.from_dict(a) for a in data.get("accountabilities", [])
        ]
        self._transactions = [
            Transaction.from_dict(t) for t in data.get("transactions", [])
        ]
        self._daily_habits = [
            HabitState.from_dict(h) for h in data.get("daily_habits", [])
        ]
        self._announcements = [
            AnnouncementEvent.from_dict(a) for a in data.get("announcements", [])
        ]
        self._settings = AppSettings.from_dict(data.get("settings", {}))

        # Fallback to defaults if no family loaded
        if not self._family:
            self._family = list(DEFAULT_FAMILY)
        if not self._accountabilities:
            self._accountabilities = list(DEFAULT_ACCOUNTABILITIES)

        return True

    async def async_save(self) -> None:
        """Persist current data to storage."""
        data = {
            "family": [m.to_dict() for m in self._family],
            "accountabilities": [a.to_dict() for a in self._accountabilities],
            "transactions": [t.to_dict() for t in self._transactions],
            "daily_habits": [h.to_dict() for h in self._daily_habits],
            "announcements": [a.to_dict() for a in self._announcements],
            "settings": self.public_settings(),
        }
        await self._store.async_save(data)
        async_dispatcher_send(self._hass, f"{DOMAIN}_data_updated")

    def get_data(self) -> dict:
        """Return all data as a dictionary."""
        return {
            "family": [m.to_dict() for m in self._family],
            "accountabilities": [a.to_dict() for a in self._accountabilities],
            "transactions": [t.to_dict() for t in self._transactions],
            "daily_habits": [h.to_dict() for h in self._daily_habits],
            "announcements": [a.to_dict() for a in self._announcements],
            "settings": self.public_settings(),
            "week_info": self._get_current_week_info(),
        }

    def _get_current_week_info(self) -> dict:
        """Return date info for the current compensation week."""
        tz = zoneinfo.ZoneInfo(self._settings.timezone)
        today = datetime.now(tz).date()
        compensation_day = self._settings.compensation_day  # 0=Mon..6=Sun
        week_start_weekday = (compensation_day + 1) % 7
        days_since_start = (today.weekday() - week_start_weekday) % 7
        week_start = today - timedelta(days=days_since_start)

        week_dates = []
        for i in range(7):
            d = week_start + timedelta(days=i)
            week_dates.append(d.isoformat())

        return {
            "today": today.isoformat(),
            "week_start": week_start.isoformat(),
            "week_dates": week_dates,
        }

    def _get_week_dates(self, recurrence_days: list[int]) -> list[str]:
        """Return YYYY-MM-DD strings for each recurrence_day in the current compensation week."""
        tz = zoneinfo.ZoneInfo(self._settings.timezone)
        today = datetime.now(tz).date()
        compensation_day = self._settings.compensation_day
        week_start_weekday = (compensation_day + 1) % 7
        days_since_start = (today.weekday() - week_start_weekday) % 7
        week_start = today - timedelta(days=days_since_start)

        result = []
        for day_num in recurrence_days:
            offset = (day_num - week_start_weekday) % 7
            d = week_start + timedelta(days=offset)
            result.append(d.isoformat())
        return result

    async def toggle_habit(
        self,
        accountability_id: str,
        child_id: str,
        completed: bool,
        date: str | None = None,
    ) -> list[dict]:
        """Toggle a habit state and return updated daily habits."""
        now = datetime.now(timezone.utc).isoformat()

        # Find existing habit state (match on date too for compensated tasks)
        for habit in self._daily_habits:
            if (
                habit.accountability_id == accountability_id
                and habit.child_id == child_id
                and habit.date == date
            ):
                habit.completed = completed
                habit.completed_at = now if completed else None
                await self.async_save()
                return [h.to_dict() for h in self._daily_habits]

        # Create new habit state if not found
        new_habit = HabitState(
            accountability_id=accountability_id,
            child_id=child_id,
            completed=completed,
            completed_at=now if completed else None,
            date=date,
        )
        self._daily_habits.append(new_habit)
        await self.async_save()
        return [h.to_dict() for h in self._daily_habits]

    async def add_transaction(
        self,
        child_id: str,
        label: str,
        amount: float,
        date: str | None = None,
        date_user_entered: bool = False,
        source: str = "manual",
    ) -> dict:
        """Create a transaction, update the child's balance, and return the transaction."""
        now = datetime.now(timezone.utc)
        transaction_date = date if date else now.strftime("%Y-%m-%d")

        transaction = Transaction(
            id=str(uuid.uuid4()),
            child_id=child_id,
            label=label,
            amount=amount,
            date=transaction_date,
            date_user_entered=date_user_entered,
            created_at=now.isoformat(),
            source=source,
        )

        self._transactions.append(transaction)

        # Update the child's bank balance
        for member in self._family:
            if member.id == child_id:
                member.bank_balance = round(member.bank_balance + amount, 2)
                break

        await self.async_save()
        return transaction.to_dict()

    async def update_transaction(self, transaction_id: str, updates: dict) -> dict:
        """Update a transaction. Rejects date changes on user-entered dates."""
        for transaction in self._transactions:
            if transaction.id == transaction_id:
                # Enforce date immutability for user-entered dates
                if transaction.date_user_entered and "date" in updates:
                    raise ValueError(
                        "Cannot modify the date of a user-entered transaction"
                    )

                # If the amount is changing, adjust the balance
                if "amount" in updates:
                    old_amount = transaction.amount
                    new_amount = updates["amount"]
                    diff = new_amount - old_amount
                    for member in self._family:
                        if member.id == transaction.child_id:
                            member.bank_balance = round(
                                member.bank_balance + diff, 2
                            )
                            break

                # Apply updates
                if "label" in updates:
                    transaction.label = updates["label"]
                if "amount" in updates:
                    transaction.amount = updates["amount"]
                if "date" in updates:
                    transaction.date = updates["date"]
                if "date_user_entered" in updates:
                    transaction.date_user_entered = updates["date_user_entered"]

                await self.async_save()
                return transaction.to_dict()

        raise ValueError(f"Transaction {transaction_id} not found")

    async def update_settings(self, updates: dict) -> dict:
        """Update application settings."""
        if "admin_pin" in updates:
            self._settings.admin_pin = updates["admin_pin"]
        if "interest_rate" in updates:
            self._settings.interest_rate = updates["interest_rate"]
        if "daily_reset_time" in updates:
            self._settings.daily_reset_time = updates["daily_reset_time"]
        if "compensation_day" in updates:
            self._settings.compensation_day = updates["compensation_day"]
        if "compensation_time" in updates:
            self._settings.compensation_time = updates["compensation_time"]
        if "monthly_interest_day" in updates:
            self._settings.monthly_interest_day = updates["monthly_interest_day"]
        if "monthly_interest_time" in updates:
            self._settings.monthly_interest_time = updates["monthly_interest_time"]
        if "timezone" in updates:
            self._settings.timezone = updates["timezone"]
        if "home_url" in updates:
            self._settings.home_url = updates["home_url"]
        if "celebrations" in updates:
            self._settings.celebrations = _clean_celebrations(updates["celebrations"])
        if "motion" in updates and updates["motion"] in ("auto", "always"):
            self._settings.motion = updates["motion"]
        if "weather_entity" in updates:
            self._settings.weather_entity = str(updates["weather_entity"]).strip() or "weather.home"

        await self.async_save()
        return self.public_settings()

    async def update_family_member(self, member_id: str, updates: dict) -> dict:
        """Update a family member's properties."""
        for member in self._family:
            if member.id == member_id:
                if "name" in updates:
                    member.name = updates["name"]
                if "color" in updates:
                    member.color = updates["color"]
                if "emoji" in updates:
                    member.emoji = updates["emoji"]
                if "compensation" in updates:
                    member.compensation = updates["compensation"]
                if "bank_balance" in updates:
                    member.bank_balance = updates["bank_balance"]
                if "birthday" in updates:
                    member.birthday = _clean_date(updates["birthday"])
                if "sprite" in updates:
                    member.sprite = updates["sprite"]

                await self.async_save()
                return member.to_dict()

        raise ValueError(f"Family member {member_id} not found")

    async def add_family_member(self, data: dict) -> dict:
        """Add a new family member and return it."""
        # Slugify name for ID
        slug = re.sub(r"[^a-z0-9]+", "_", data["name"].lower()).strip("_")
        if not slug:
            raise ValueError("Name produces an empty ID")

        # Check for duplicate IDs
        if any(m.id == slug for m in self._family):
            raise ValueError(f"Family member '{slug}' already exists")

        member = FamilyMember(
            id=slug,
            name=data["name"],
            color=data.get("color", "#2196F3"),
            emoji=data.get("emoji", "\U0001f9d2"),
            compensation=data.get("compensation", 5.0),
            bank_balance=0.0,
            birthday=_clean_date(data.get("birthday", "")),
            sprite=data.get("sprite"),
        )
        self._family.append(member)
        await self.async_save()
        return member.to_dict()

    async def delete_family_member(self, member_id: str) -> None:
        """Delete a family member and cascade cleanup."""
        if not any(m.id == member_id for m in self._family):
            raise ValueError(f"Family member {member_id} not found")

        self._family = [m for m in self._family if m.id != member_id]

        # Remove from all accountability assigned_to lists
        for acct in self._accountabilities:
            if member_id in acct.assigned_to:
                acct.assigned_to = [
                    aid for aid in acct.assigned_to if aid != member_id
                ]

        # Remove their habit states
        self._daily_habits = [
            h for h in self._daily_habits if h.child_id != member_id
        ]

        # Remove their transactions
        self._transactions = [
            t for t in self._transactions if t.child_id != member_id
        ]

        await self.async_save()

    async def initialize_family(self, family_data: list[dict]) -> None:
        """Initialize family from config flow data (first setup only)."""
        self._family = [
            FamilyMember(
                id=re.sub(r"[^a-z0-9]+", "_", m["name"].lower()).strip("_"),
                name=m["name"],
                color=m.get("color", "#2196F3"),
                emoji=m.get("emoji", "\U0001f9d2"),
                compensation=m.get("compensation", 5.0),
                bank_balance=0.0,
            )
            for m in family_data
        ]

        # Update default accountabilities to reference all new member IDs
        member_ids = [m.id for m in self._family]
        for acct in self._accountabilities:
            acct.assigned_to = list(member_ids)

        await self.async_save()
        _LOGGER.info(
            "Family initialized with %d members: %s",
            len(self._family),
            ", ".join(m.name for m in self._family),
        )

    async def add_accountability(self, data: dict) -> dict:
        """Add a new accountability and return it."""
        accountability = Accountability(
            id=data.get("id", str(uuid.uuid4())),
            name=data["name"],
            entity_slug=data.get("entity_slug", data["name"].lower().replace(" ", "_")),
            emoji=data.get("emoji", "check"),
            type=data.get("type", "daily"),
            time_of_day=data.get("time_of_day", "morning"),
            assigned_to=data.get("assigned_to", []),
            recurrence_days=data.get("recurrence_days", [0, 1, 2, 3, 4, 5, 6]),
        )
        self._accountabilities.append(accountability)
        await self.async_save()
        return accountability.to_dict()

    async def update_accountability(self, acct_id: str, updates: dict) -> dict:
        """Update an accountability."""
        for acct in self._accountabilities:
            if acct.id == acct_id:
                if "name" in updates:
                    acct.name = updates["name"]
                if "entity_slug" in updates:
                    acct.entity_slug = updates["entity_slug"]
                if "emoji" in updates:
                    acct.emoji = updates["emoji"]
                if "type" in updates:
                    acct.type = updates["type"]
                if "time_of_day" in updates:
                    acct.time_of_day = updates["time_of_day"]
                if "assigned_to" in updates:
                    acct.assigned_to = updates["assigned_to"]
                if "recurrence_days" in updates:
                    acct.recurrence_days = updates["recurrence_days"]

                await self.async_save()
                return acct.to_dict()

        raise ValueError(f"Accountability {acct_id} not found")

    async def delete_accountability(self, acct_id: str) -> None:
        """Delete an accountability and its associated habit states."""
        self._accountabilities = [
            a for a in self._accountabilities if a.id != acct_id
        ]
        self._daily_habits = [
            h for h in self._daily_habits if h.accountability_id != acct_id
        ]
        await self.async_save()

    @property
    def admin_pin(self) -> str:
        """The stored PIN. Server-side only: never sent to the panel."""
        return self._settings.admin_pin

    def public_settings(self) -> dict:
        """Settings as the panel sees them: everything except the PIN."""
        data = self._settings.to_dict()
        data.pop("admin_pin", None)
        return data

    def _evaluate_streaks(self) -> None:
        """Update each child's streak/badges for the day that's about to end.

        Runs synchronously, immediately before reset_daily_habits() wipes
        today's HabitState rows — this is the sole place streaks are ever
        written. There is deliberately no live increment on toggle_habit:
        a dropped live event could wrongly zero a legitimate streak with
        no way to reconcile it, whereas this nightly check is a single,
        reliable, authoritative code path. See the finalized streak/badge
        rules in Initiatives/earnkeep.md for the full reasoning.

        Scope is daily Habits only — compensated Accountabilities keep
        their own separate weekly all-or-nothing compensation mechanic
        and don't factor into streaks.
        """
        daily_accountabilities = [
            a for a in self._accountabilities if a.type == "daily"
        ]

        for member in self._family:
            assigned = [
                a for a in daily_accountabilities
                if member.id in a.assigned_to
            ]
            if not assigned:
                # Nothing assigned to gauge — leave the streak untouched
                # rather than treat an empty day as a pass or a fail.
                continue

            all_done = all(
                any(
                    h.accountability_id == a.id
                    and h.child_id == member.id
                    and h.completed
                    for h in self._daily_habits
                )
                for a in assigned
            )

            if not all_done:
                member.current_streak = 0
                continue

            member.current_streak += 1
            member.best_streak = max(member.best_streak, member.current_streak)

            already_earned = {b.streak_days for b in member.badges}
            if member.current_streak in BADGE_MILESTONES and (
                member.current_streak not in already_earned
            ):
                member.badges.append(
                    Badge(
                        id=str(uuid.uuid4()),
                        streak_days=member.current_streak,
                        earned_at=datetime.now(timezone.utc).isoformat(),
                    )
                )
                _LOGGER.info(
                    "%s earned a %d-day streak badge",
                    member.name,
                    member.current_streak,
                )

    async def reset_daily_habits(self) -> None:
        """Evaluate streaks/badges for the ending day, then reset all daily
        habit states to incomplete."""
        self._evaluate_streaks()
        self._daily_habits = [
            h for h in self._daily_habits
            if not any(
                a.id == h.accountability_id and a.type == "daily"
                for a in self._accountabilities
            )
        ]
        await self.async_save()
        _LOGGER.info("Daily habits reset")

    async def reset_weekly_habits(self) -> None:
        """Reset all compensated habit states to incomplete."""
        self._daily_habits = [
            h for h in self._daily_habits
            if not any(
                a.id == h.accountability_id and a.type == "compensated"
                for a in self._accountabilities
            )
        ]
        await self.async_save()
        _LOGGER.info("Weekly (compensated) habits reset")

    async def process_compensation(self) -> None:
        """Process compensation for children who completed all compensated tasks on all assigned days."""
        compensated_accts = [
            a for a in self._accountabilities if a.type == "compensated"
        ]

        for member in self._family:
            if member.compensation <= 0:
                continue

            assigned = [
                a for a in compensated_accts if member.id in a.assigned_to
            ]

            if not assigned:
                continue

            # Check every required date for every assigned compensated task
            all_done = True
            for acct in assigned:
                required_dates = self._get_week_dates(acct.recurrence_days)
                for req_date in required_dates:
                    if not any(
                        h.accountability_id == acct.id
                        and h.child_id == member.id
                        and h.date == req_date
                        and h.completed
                        for h in self._daily_habits
                    ):
                        all_done = False
                        break
                if not all_done:
                    break

            if all_done:
                await self.add_transaction(
                    child_id=member.id,
                    label="Compensation",
                    amount=member.compensation,
                    source="compensation",
                )
                _LOGGER.info(
                    "Compensation of $%.2f deposited for %s",
                    member.compensation,
                    member.name,
                )

    async def _migrate_from_legacy(self) -> dict | None:
        """Migrate data from old 'family_roles.data' storage key if it exists.

        Renames fields: weekly_pay → compensation, weekly_pay_day → compensation_day,
        weekly_pay_time → compensation_time. Also migrates transaction sources and
        the daily_state storage key.
        """
        old_store = Store(self._hass, STORAGE_VERSION, "family_roles.data")
        old_data = await old_store.async_load()

        if old_data is None:
            return None

        _LOGGER.info("Found legacy family_roles.data — migrating to earn_keep.data")

        # Migrate family members: weekly_pay → compensation
        for member in old_data.get("family", []):
            if "weekly_pay" in member:
                member["compensation"] = member.pop("weekly_pay")

        # Migrate transaction sources: "weekly_pay" → "compensation"
        for txn in old_data.get("transactions", []):
            if txn.get("source") == "weekly_pay":
                txn["source"] = "compensation"

        # Migrate settings keys
        settings = old_data.get("settings", {})
        if "weekly_pay_day" in settings:
            settings["compensation_day"] = settings.pop("weekly_pay_day")
        if "weekly_pay_time" in settings:
            settings["compensation_time"] = settings.pop("weekly_pay_time")

        # Save migrated data under the new key
        await self._store.async_save(old_data)

        # Migrate daily_state if it exists
        old_daily_store = Store(self._hass, STORAGE_VERSION, "family_roles.daily_state")
        old_daily_data = await old_daily_store.async_load()
        if old_daily_data is not None:
            new_daily_store = Store(self._hass, STORAGE_VERSION, "earn_keep.daily_state")
            await new_daily_store.async_save(old_daily_data)
            _LOGGER.info("Migrated family_roles.daily_state → earn_keep.daily_state")

        _LOGGER.info("Storage migration complete")
        return old_data

    # --- Announcement Events CRUD ---

    async def add_announcement(self, data: dict) -> dict:
        """Add a new announcement event."""
        event = AnnouncementEvent(
            id=data.get("id", str(uuid.uuid4())),
            name=data["name"],
            enabled=data.get("enabled", True),
            time=data.get("time", "20:30"),
            time_of_day_filter=data.get("time_of_day_filter", "evening"),
            opening=data.get("opening", "It's bedtime."),
            closing=data.get("closing", "Off to bed."),
            all_done=data.get("all_done", "Everything's done tonight — well played."),
            voice=data.get("voice", ""),
            days_of_week=data.get("days_of_week", [0, 1, 2, 3, 4, 5, 6]),
        )
        self._announcements.append(event)
        await self.async_save()
        return event.to_dict()

    async def update_announcement(self, event_id: str, updates: dict) -> dict:
        """Update an announcement event."""
        for event in self._announcements:
            if event.id == event_id:
                for key in ("name", "enabled", "time", "time_of_day_filter",
                            "opening", "closing", "all_done", "voice",
                            "days_of_week"):
                    if key in updates:
                        setattr(event, key, updates[key])
                await self.async_save()
                return event.to_dict()
        raise ValueError(f"Announcement {event_id} not found")

    async def delete_announcement(self, event_id: str) -> None:
        """Delete an announcement event."""
        self._announcements = [a for a in self._announcements if a.id != event_id]
        await self.async_save()

    def get_announcements(self) -> list[dict]:
        """Return all announcement events."""
        return [a.to_dict() for a in self._announcements]

    def get_announcement(self, event_id: str) -> AnnouncementEvent | None:
        """Return a single announcement event by ID."""
        for event in self._announcements:
            if event.id == event_id:
                return event
        return None

    def get_child_task_status(self, child_id: str) -> dict | None:
        """Return today's habit/accountability status for one child.

        Powers the per-kid task-status sensors (read-only, voice-assistant
        facing). Daily habits carry no date on their HabitState; compensated
        accountabilities are tracked per due-date within the week.
        """
        member = None
        for m in self._family:
            if m.id == child_id:
                member = m
                break
        if member is None:
            return None

        tz = zoneinfo.ZoneInfo(self._settings.timezone)
        today = datetime.now(tz).date()
        today_weekday = today.weekday()  # 0=Mon..6=Sun
        today_str = today.isoformat()

        def _completed(acct: Accountability, date: str | None) -> bool:
            return any(
                h.accountability_id == acct.id
                and h.child_id == child_id
                and h.completed
                and h.date == date
                for h in self._daily_habits
            )

        habits_done: list[str] = []
        habits_remaining: list[str] = []
        acct_done_today: list[str] = []
        acct_remaining_today: list[str] = []
        weekly_progress: dict[str, str] = {}

        for acct in self._accountabilities:
            if child_id not in acct.assigned_to:
                continue
            if acct.type == "daily":
                label = f"{acct.name} ({acct.time_of_day})"
                if _completed(acct, None):
                    habits_done.append(label)
                else:
                    habits_remaining.append(label)
            else:
                due_dates = self._get_week_dates(acct.recurrence_days)
                done_count = sum(1 for d in due_dates if _completed(acct, d))
                weekly_progress[acct.name] = f"{done_count}/{len(due_dates)} days this week"
                if today_weekday in acct.recurrence_days:
                    if _completed(acct, today_str):
                        acct_done_today.append(acct.name)
                    else:
                        acct_remaining_today.append(acct.name)

        return {
            "name": member.name,
            "habits_done_today": habits_done,
            "habits_remaining_today": habits_remaining,
            "accountabilities_done_today": acct_done_today,
            "accountabilities_remaining_today": acct_remaining_today,
            "weekly_accountability_progress": weekly_progress,
            "tasks_remaining_today": len(habits_remaining) + len(acct_remaining_today),
            "all_done_today": not habits_remaining and not acct_remaining_today,
            "current_streak": member.current_streak,
            "best_streak": member.best_streak,
        }

    # --- Sound-effect finales (see combo.py) ---------------------------------

    def is_compensated(self, accountability_id: str) -> bool:
        return any(
            a.id == accountability_id and a.type == "compensated"
            for a in self._accountabilities
        )

    def _is_completed(self, acct_id: str, child_id: str, date: str | None) -> bool:
        return any(
            h.accountability_id == acct_id
            and h.child_id == child_id
            and h.completed
            and h.date == date
            for h in self._daily_habits
        )

    def habit_board_complete(self, child_id: str) -> bool:
        """True when every habit tile on the kid's board is checked.

        Mirrors the frontend's confetti moment (ChildColumn/HabitSection):
        the board holds only the habits due right now — morning ones
        before noon, evening ones from noon on.
        """
        tz = zoneinfo.ZoneInfo(self._settings.timezone)
        period = "morning" if datetime.now(tz).hour < 12 else "evening"
        board = [
            a
            for a in self._accountabilities
            if a.type == "daily"
            and child_id in a.assigned_to
            and a.time_of_day == period
        ]
        return bool(board) and all(
            self._is_completed(a.id, child_id, None) for a in board
        )

    def paycheck_full(self, child_id: str) -> bool:
        """True when every paid task due this week is checked (CompensationCard's
        "Compensation earned!" moment)."""
        due = [
            (a.id, d)
            for a in self._accountabilities
            if a.type == "compensated" and child_id in a.assigned_to
            for d in self._get_week_dates(a.recurrence_days)
        ]
        return bool(due) and all(
            self._is_completed(acct_id, child_id, d) for acct_id, d in due
        )

    def get_incomplete_tasks(self, time_of_day_filter: str = "evening") -> dict:
        """Return incomplete tasks grouped by child for the given time-of-day filter.

        Returns:
            {
                "shared": ["task name", ...],          # incomplete for ALL children
                "per_child": {
                    "child_id": {
                        "name": "Child Name",
                        "tasks": ["task name", ...]    # incomplete only for this child
                    }
                }
            }
        """
        tz = zoneinfo.ZoneInfo(self._settings.timezone)
        today = datetime.now(tz).date()
        today_weekday = today.weekday()  # 0=Mon..6=Sun
        today_str = today.isoformat()

        # Filter accountabilities by time_of_day and recurrence
        applicable = []
        for acct in self._accountabilities:
            if time_of_day_filter != "all" and acct.time_of_day != time_of_day_filter:
                continue
            if today_weekday not in acct.recurrence_days:
                continue
            applicable.append(acct)

        # For each child, find which applicable tasks are incomplete
        child_incomplete: dict[str, list[str]] = {}
        for member in self._family:
            incomplete = []
            for acct in applicable:
                if member.id not in acct.assigned_to:
                    continue
                # Check completion — daily tasks have no date, compensated use today's date
                if acct.type == "daily":
                    is_done = any(
                        h.accountability_id == acct.id
                        and h.child_id == member.id
                        and h.completed
                        and h.date is None
                        for h in self._daily_habits
                    )
                else:
                    is_done = any(
                        h.accountability_id == acct.id
                        and h.child_id == member.id
                        and h.completed
                        and h.date == today_str
                        for h in self._daily_habits
                    )
                if not is_done:
                    incomplete.append(acct.name)
            child_incomplete[member.id] = incomplete

        # Separate shared (incomplete for all) vs per-child
        all_child_ids = [m.id for m in self._family]
        shared = []
        per_child: dict[str, dict] = {}

        if all_child_ids:
            # Tasks incomplete for every child
            all_task_names = set()
            for tasks in child_incomplete.values():
                all_task_names.update(tasks)

            for task_name in all_task_names:
                if all(task_name in child_incomplete.get(cid, []) for cid in all_child_ids):
                    shared.append(task_name)

            # Per-child: tasks incomplete only for this child (not in shared)
            for member in self._family:
                child_only = [t for t in child_incomplete.get(member.id, []) if t not in shared]
                if child_only:
                    per_child[member.id] = {"name": member.name, "tasks": child_only}

        return {"shared": shared, "per_child": per_child}

    async def process_monthly_interest(self) -> None:
        """Apply compound interest to all positive balances."""
        monthly_rate = self._settings.interest_rate / 100

        for member in self._family:
            if member.bank_balance <= 0:
                continue

            interest = round(member.bank_balance * monthly_rate, 2)
            if interest > 0:
                await self.add_transaction(
                    child_id=member.id,
                    label="Monthly Interest",
                    amount=interest,
                    source="interest",
                )
                _LOGGER.info(
                    "Interest of $%.2f applied for %s",
                    interest,
                    member.name,
                )


_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _clean_date(value) -> str:
    """A YYYY-MM-DD string, or "" (cleared / invalid)."""
    value = str(value or "").strip()
    return value if _DATE_RE.match(value) else ""


def _clean_celebrations(items) -> list[dict]:
    """Keep only well-formed {name, date} entries."""
    out: list[dict] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        date = _clean_date(item.get("date", ""))
        if name and date:
            out.append({"name": name[:40], "date": date})
    return out
