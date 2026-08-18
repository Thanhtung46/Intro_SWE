"""Builds a User Signal Profile (data-model.md) from existing SPOT data.

Read-only: reads schema_booking.bookings, schema_venue.fields/venues, and
schema_matchmaking.matches/match_join_requests. This service owns none of
these tables (research.md decision 3) and writes to none of them.

"Favorited venues" is intentionally NOT a signal here — no venue-favorite
table exists yet (research.md decision 4); only booking history and
matchmaking participation are used.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.config import connection

# Half-life (days) for recency weighting: an event this many days old counts
# for half the weight of a fresh one. Simple exponential decay, not a
# trained/fit parameter (research.md decision 2).
RECENCY_HALF_LIFE_DAYS = 30.0

# How many recent events to pull per source — bounds query cost; this
# service's target scale is "low hundreds of venues" (spec Clarifications),
# not a high-volume history table.
HISTORY_LIMIT = 50


@dataclass
class SignalEvent:
    """One piece of history evidence: a booking, a hosted kèo, or a joined kèo."""

    sport: str  # upper-case, e.g. "FOOTBALL" — matches request.sport
    venue_id: int | None  # set only for bookings (tied to schema_venue.venues)
    venue_name: str | None
    lat: float | None
    lng: float | None
    weight: float  # recency-weighted, > 0


@dataclass
class UserSignalProfile:
    events: list[SignalEvent] = field(default_factory=list)

    @property
    def has_history(self) -> bool:
        return len(self.events) > 0

    def events_for_sport(self, sport: str) -> list[SignalEvent]:
        return [e for e in self.events if e.sport == sport]


def _recency_weight(occurred_at: datetime) -> float:
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    days_ago = max((datetime.now(timezone.utc) - occurred_at).days, 0)
    return 0.5 ** (days_ago / RECENCY_HALF_LIFE_DAYS)


def _booking_events(cur, user_id: int) -> list[SignalEvent]:
    cur.execute(
        """
        SELECT f.sport_type, v.venue_id, v.name,
               ST_Y(v.location::geometry) AS lat,
               ST_X(v.location::geometry) AS lng,
               b.created_at
        FROM schema_booking.bookings b
        JOIN schema_venue.fields f ON f.field_id = b.field_id
        JOIN schema_venue.venues v ON v.venue_id = f.venue_id
        WHERE b.player_id = %s AND b.status <> 'CANCELLED'
        ORDER BY b.created_at DESC
        LIMIT %s
        """,
        (user_id, HISTORY_LIMIT),
    )
    events = []
    for sport_type, venue_id, venue_name, lat, lng, created_at in cur.fetchall():
        sport = sport_type.upper()
        events.append(
            SignalEvent(
                sport=sport,
                venue_id=venue_id,
                venue_name=venue_name,
                lat=lat,
                lng=lng,
                weight=_recency_weight(created_at),
            )
        )
    return events


def _hosted_match_events(cur, user_id: int) -> list[SignalEvent]:
    cur.execute(
        """
        SELECT sport, venue_name, venue_lat, venue_lng, created_at
        FROM schema_matchmaking.matches
        WHERE host_user_id = %s AND status <> 'CANCELLED'
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (user_id, HISTORY_LIMIT),
    )
    return [
        SignalEvent(
            sport=sport,
            venue_id=None,
            venue_name=venue_name,
            lat=lat,
            lng=lng,
            weight=_recency_weight(created_at),
        )
        for sport, venue_name, lat, lng, created_at in cur.fetchall()
    ]


def _joined_match_events(cur, user_id: int) -> list[SignalEvent]:
    cur.execute(
        """
        SELECT m.sport, m.venue_name, m.venue_lat, m.venue_lng, r.created_at
        FROM schema_matchmaking.match_join_requests r
        JOIN schema_matchmaking.matches m ON m.match_id = r.match_id
        WHERE r.user_id = %s AND r.status = 'ACCEPTED'
        ORDER BY r.created_at DESC
        LIMIT %s
        """,
        (user_id, HISTORY_LIMIT),
    )
    return [
        SignalEvent(
            sport=sport,
            venue_id=None,
            venue_name=venue_name,
            lat=lat,
            lng=lng,
            weight=_recency_weight(created_at),
        )
        for sport, venue_name, lat, lng, created_at in cur.fetchall()
    ]


def build_user_signal_profile(user_id: int) -> UserSignalProfile:
    """Read-only aggregation of a user's booking + matchmaking history.

    Cold-start users (no rows in any source) get an empty profile — callers
    (services/scoring.py) are responsible for the popularity/proximity
    fallback (FR-003), not this function.
    """
    events: list[SignalEvent] = []
    with connection() as conn:
        with conn.cursor() as cur:
            events.extend(_booking_events(cur, user_id))
            events.extend(_hosted_match_events(cur, user_id))
            events.extend(_joined_match_events(cur, user_id))
    return UserSignalProfile(events=events)
