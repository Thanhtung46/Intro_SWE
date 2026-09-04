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


def _compute_open_slots(
    field_id: int, occupied: list[tuple[datetime, datetime]], now: datetime
) -> list[CandidateSlot]:
    """Pure slot-generation loop (no DB) — shared by fetch_available_slots()
    and fetch_available_slots_bulk() so the overlap/exclusion arithmetic
    only lives in one place (FR-005, data-model.md exclusion rule)."""
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


def fetch_available_slots(field_id: int) -> list[CandidateSlot]:
    """Open hourly slots for one field — thin wrapper over the bulk query
    below, kept for single-field callers."""
    return fetch_available_slots_bulk([field_id]).get(field_id, [])


def fetch_available_slots_bulk(
    field_ids: list[int],
) -> dict[int, list[CandidateSlot]]:
    """Same as fetch_available_slots(), but for many fields in ONE query.

    populate_available_slots() used to call fetch_available_slots() once
    per field — with N candidate venues each contributing one field, that
    was N sequential round trips to Supabase (~0.4-1.2s each here), pushing
    a full recommendation request past 10s and blowing spot-backend's 3s
    proxy timeout (always 503, never actually slow-but-working). Fetching
    every field's occupied bookings in a single `field_id = ANY(...)` query
    and grouping in Python keeps this to one round trip regardless of
    catalog size, restoring the SC-003 <2s budget.
    """
    if not field_ids:
        return {}

    now = datetime.now(timezone.utc)
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT field_id, lower(booking_time_range), upper(booking_time_range)
                FROM schema_booking.bookings
                WHERE field_id = ANY(%s)
                  AND status = ANY(%s)
                  AND upper(booking_time_range) > %s
                """,
                (field_ids, list(OCCUPYING_BOOKING_STATUSES), now),
            )
            rows = cur.fetchall()

    occupied_by_field: dict[int, list[tuple[datetime, datetime]]] = {
        field_id: [] for field_id in field_ids
    }
    for field_id, occ_start, occ_end in rows:
        occupied_by_field[field_id].append((occ_start, occ_end))

    return {
        field_id: _compute_open_slots(field_id, occupied, now)
        for field_id, occupied in occupied_by_field.items()
    }


def populate_available_slots(candidates: list[CandidateVenue]) -> list[CandidateVenue]:
    """Attach each candidate venue's open slots and drop venues left with
    none (a venue whose only field is fully booked out isn't a real option
    right now — User Story 3 acceptance scenario 2)."""
    all_field_ids = [field_id for candidate in candidates for field_id in candidate.field_ids]
    slots_by_field = fetch_available_slots_bulk(all_field_ids)

    kept: list[CandidateVenue] = []
    for candidate in candidates:
        slots: list[CandidateSlot] = [
            slot
            for field_id in candidate.field_ids
            for slot in slots_by_field.get(field_id, [])
        ]
        if not slots:
            continue
        candidate.slots = slots[:MAX_SLOTS_PER_FIELD]
        kept.append(candidate)
    return kept
