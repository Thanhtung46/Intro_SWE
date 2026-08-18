"""Eligible venue (and, later, time-slot) candidates for a recommendation
request. Read-only against schema_venue.venues/fields and
schema_booking.bookings — see data-model.md's exclusion rule (FR-004/005).
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from app.config import connection
from services.sports import FIELD_SPORT_TYPE

# How many future slots to surface per field — keeps the per-venue slot list
# short and relevant rather than dumping the whole future calendar.
MAX_SLOTS_PER_FIELD = 5

# How many days ahead to look for open slots.
SLOT_LOOKAHEAD_DAYS = 14

# Booking statuses that occupy a slot (mirrors spot-backend's booking
# domain — everything except CANCELLED holds the time range).
OCCUPYING_BOOKING_STATUSES = ("PENDING_PAYMENT", "PAID", "CHECKED_IN", "COMPLETED")


@dataclass
class CandidateSlot:
    field_id: int
    starts_at: datetime
    ends_at: datetime


@dataclass
class CandidateVenue:
    venue_id: int
    venue_name: str
    address: str
    lat: float | None
    lng: float | None
    field_ids: list[int] = field(default_factory=list)
    slots: list[CandidateSlot] = field(default_factory=list)


def fetch_candidate_venues(sport: str) -> list[CandidateVenue]:
    """ACTIVE venues/fields offering `sport`, re-queried fresh every call
    (never cached) so a deleted venue or deactivated field never lingers —
    see data-model.md's exclusion rule and research.md decision 8."""
    field_sport_type = FIELD_SPORT_TYPE[sport]
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT v.venue_id, v.name, v.address,
                       ST_Y(v.location::geometry) AS lat,
                       ST_X(v.location::geometry) AS lng,
                       f.field_id
                FROM schema_venue.venues v
                JOIN schema_venue.fields f ON f.venue_id = v.venue_id
                WHERE f.status = 'ACTIVE' AND f.sport_type = %s
                ORDER BY v.venue_id
                """,
                (field_sport_type,),
            )
            rows = cur.fetchall()

    venues: dict[int, CandidateVenue] = {}
    for venue_id, name, address, lat, lng, field_id in rows:
        venue = venues.get(venue_id)
        if venue is None:
            venue = CandidateVenue(
                venue_id=venue_id, venue_name=name, address=address, lat=lat, lng=lng
            )
            venues[venue_id] = venue
        venue.field_ids.append(field_id)
    return list(venues.values())


def _next_full_hour(moment: datetime) -> datetime:
    rounded = moment.replace(minute=0, second=0, microsecond=0)
    return rounded + timedelta(hours=1) if rounded <= moment else rounded


def fetch_available_slots(field_id: int) -> list[CandidateSlot]:
    """Open hourly slots for one field over the next SLOT_LOOKAHEAD_DAYS,
    excluding any that overlap a non-cancelled booking or lie in the past
    (FR-005, data-model.md exclusion rule). No new locking/booking logic is
    introduced here — this only reads schema_booking.bookings.
    """
    now = datetime.now(timezone.utc)
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT lower(booking_time_range), upper(booking_time_range)
                FROM schema_booking.bookings
                WHERE field_id = %s
                  AND status = ANY(%s)
                  AND upper(booking_time_range) > %s
                """,
                (field_id, list(OCCUPYING_BOOKING_STATUSES), now),
            )
            occupied = cur.fetchall()

    slots: list[CandidateSlot] = []
    slot_start = _next_full_hour(now)
    horizon = now + timedelta(days=SLOT_LOOKAHEAD_DAYS)
    while slot_start < horizon and len(slots) < MAX_SLOTS_PER_FIELD:
        slot_end = slot_start + timedelta(hours=1)
        overlaps = any(
            slot_start < occ_end and slot_end > occ_start
            for occ_start, occ_end in occupied
        )
        if not overlaps:
            slots.append(
                CandidateSlot(field_id=field_id, starts_at=slot_start, ends_at=slot_end)
            )
        slot_start = slot_end
    return slots


def populate_available_slots(candidates: list[CandidateVenue]) -> list[CandidateVenue]:
    """Attach each candidate venue's open slots and drop venues left with
    none (a venue whose only field is fully booked out isn't a real option
    right now — User Story 3 acceptance scenario 2)."""
    kept: list[CandidateVenue] = []
    for candidate in candidates:
        slots: list[CandidateSlot] = []
        for field_id in candidate.field_ids:
            slots.extend(fetch_available_slots(field_id))
        if not slots:
            continue
        candidate.slots = slots[:MAX_SLOTS_PER_FIELD]
        kept.append(candidate)
    return kept
