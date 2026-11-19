# EarnKeep - Data Models
# Dataclasses for family members, accountabilities, transactions, habit states, and settings.

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Badge:
    """A permanent, cumulative streak-milestone badge. Never revoked once
    earned, even if the streak that earned it later breaks to 0."""

    id: str  # UUID
    streak_days: int  # the milestone reached (7, 21, 30, 90, ...)
    earned_at: str  # ISO timestamp

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "streak_days": self.streak_days,
            "earned_at": self.earned_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Badge:
        return cls(
            id=data["id"],
            streak_days=data["streak_days"],
            earned_at=data["earned_at"],
        )


@dataclass
class FamilyMember:
    """A child in the EarnKeep system."""

    id: str
    name: str
    color: str
    emoji: str
    compensation: float = 0.0
    bank_balance: float = 0.0
    current_streak: int = 0
    best_streak: int = 0
    badges: list[Badge] = field(default_factory=list)
    birthday: str = ""  # YYYY-MM-DD or "" — drives the frontend's birthday world
    sprite: dict | None = None  # Sprite character file; None = no character yet

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "emoji": self.emoji,
            "compensation": self.compensation,
            "bank_balance": self.bank_balance,
            "current_streak": self.current_streak,
            "best_streak": self.best_streak,
            "badges": [b.to_dict() for b in self.badges],
            "birthday": self.birthday,
            "sprite": self.sprite,
        }

    @classmethod
    def from_dict(cls, data: dict) -> FamilyMember:
        return cls(
            id=data["id"],
            name=data["name"],
            color=data["color"],
            emoji=data["emoji"],
            compensation=data.get("compensation", 0.0),
            bank_balance=data.get("bank_balance", 0.0),
            current_streak=data.get("current_streak", 0),
            best_streak=data.get("best_streak", 0),
            badges=[Badge.from_dict(b) for b in data.get("badges", [])],
            birthday=data.get("birthday", "") or "",
            sprite=data.get("sprite") if isinstance(data.get("sprite"), dict) else None,
        )


@dataclass
class Accountability:
    """A habit or task that can be assigned to children."""

    id: str
    name: str
    entity_slug: str
    emoji: str
    type: str  # "daily" or "compensated"
    time_of_day: str  # "morning" or "evening"
    assigned_to: list[str] = field(default_factory=list)  # child IDs
    recurrence_days: list[int] = field(
        default_factory=lambda: [0, 1, 2, 3, 4, 5, 6]
    )  # 0=Mon..6=Sun; which days compensated tasks recur

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "entity_slug": self.entity_slug,
            "emoji": self.emoji,
            "type": self.type,
            "time_of_day": self.time_of_day,
            "assigned_to": list(self.assigned_to),
            "recurrence_days": list(self.recurrence_days),
        }

    @classmethod
    def from_dict(cls, data: dict) -> Accountability:
        return cls(
            id=data["id"],
            name=data["name"],
            entity_slug=data["entity_slug"],
            emoji=data["emoji"],
            type=data["type"],
            time_of_day=data["time_of_day"],
            assigned_to=data.get("assigned_to", []),
            recurrence_days=data.get("recurrence_days", [0, 1, 2, 3, 4, 5, 6]),
        )


@dataclass
class Transaction:
    """A banking transaction for a child."""

    id: str  # UUID
    child_id: str
    label: str
    amount: float
    date: str  # ISO date (YYYY-MM-DD)
    date_user_entered: bool = False
    created_at: str = ""  # ISO timestamp
    source: str = "manual"  # "manual", "compensation", "interest", "migration"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "child_id": self.child_id,
            "label": self.label,
            "amount": self.amount,
            "date": self.date,
            "date_user_entered": self.date_user_entered,
            "created_at": self.created_at,
            "source": self.source,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Transaction:
        return cls(
            id=data["id"],
            child_id=data["child_id"],
            label=data["label"],
            amount=data["amount"],
            date=data["date"],
            date_user_entered=data.get("date_user_entered", False),
            created_at=data.get("created_at", ""),
            source=data.get("source", "manual"),
        )


@dataclass
class HabitState:
    """Tracks completion state of a habit for a specific child on the current day."""

    accountability_id: str
    child_id: str
    completed: bool = False
    completed_at: str | None = None
    date: str | None = None  # YYYY-MM-DD for compensated day-of-week tracking

    def to_dict(self) -> dict:
        return {
            "accountability_id": self.accountability_id,
            "child_id": self.child_id,
            "completed": self.completed,
            "completed_at": self.completed_at,
            "date": self.date,
        }

    @classmethod
    def from_dict(cls, data: dict) -> HabitState:
        return cls(
            accountability_id=data["accountability_id"],
            child_id=data["child_id"],
            completed=data.get("completed", False),
            completed_at=data.get("completed_at"),
            date=data.get("date"),
        )


@dataclass
class AppSettings:
    """Application-level settings."""

    admin_pin: str = "1234"
    interest_rate: float = 10.0
    daily_reset_time: str = "00:00"
    compensation_day: int = 6  # Sunday (0=Monday in Python, but we use isoweekday: 7=Sunday; this uses HA convention: 6=Sunday)
    compensation_time: str = "20:00"
    monthly_interest_day: int = 1
    monthly_interest_time: str = "12:00"
    timezone: str = "UTC"
    home_url: str = "/"
    # Other birthdays the world celebrates: [{"name": "Mom", "date": "YYYY-MM-DD"}]
    celebrations: list[dict] = field(default_factory=list)
    weather_entity: str = "weather.home"
    # "auto" = follow the device's reduce-motion setting; "always" = animate
    # regardless (the Fire 10 kiosk has system animations off).
    motion: str = "auto"

    def to_dict(self) -> dict:
        return {
            "admin_pin": self.admin_pin,
            "interest_rate": self.interest_rate,
            "daily_reset_time": self.daily_reset_time,
            "compensation_day": self.compensation_day,
            "compensation_time": self.compensation_time,
            "monthly_interest_day": self.monthly_interest_day,
            "monthly_interest_time": self.monthly_interest_time,
            "timezone": self.timezone,
            "home_url": self.home_url,
            "celebrations": [dict(c) for c in self.celebrations],
            "weather_entity": self.weather_entity,
            "motion": self.motion,
        }

    @classmethod
    def from_dict(cls, data: dict) -> AppSettings:
        return cls(
            admin_pin=data.get("admin_pin", "1234"),
            interest_rate=data.get("interest_rate", 10.0),
            daily_reset_time=data.get("daily_reset_time", "00:00"),
            compensation_day=data.get("compensation_day", 6),
            compensation_time=data.get("compensation_time", "20:00"),
            monthly_interest_day=data.get("monthly_interest_day", 1),
            monthly_interest_time=data.get("monthly_interest_time", "12:00"),
            timezone=data.get("timezone", "UTC"),
            home_url=data.get("home_url", "/"),
            celebrations=list(data.get("celebrations", []) or []),
            weather_entity=data.get("weather_entity", "weather.home") or "weather.home",
            motion=data.get("motion", "auto") if data.get("motion") in ("auto", "always") else "auto",
        )


@dataclass
class AnnouncementEvent:
    """A scheduled voice announcement event."""

    id: str
    name: str
    enabled: bool = True
    time: str = "20:30"
    time_of_day_filter: str = "evening"  # "morning", "evening", or "all"
    opening: str = "It's bedtime."
    closing: str = "Off to bed."
    all_done: str = "Everything's done tonight — well played."
    voice: str = ""  # per-event override; empty = HA TTS default
    days_of_week: list[int] = field(
        default_factory=lambda: [0, 1, 2, 3, 4, 5, 6]
    )  # 0=Mon..6=Sun; which days announcement fires

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "enabled": self.enabled,
            "time": self.time,
            "time_of_day_filter": self.time_of_day_filter,
            "opening": self.opening,
            "closing": self.closing,
            "all_done": self.all_done,
            "voice": self.voice,
            "days_of_week": list(self.days_of_week),
        }

    @classmethod
    def from_dict(cls, data: dict) -> AnnouncementEvent:
        return cls(
            id=data["id"],
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
