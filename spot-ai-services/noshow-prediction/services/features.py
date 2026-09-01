"""Builds the feature vector + applicability check for one booking
(data-model.md "Prediction Request" / "Player Booking History").

Read-only: reads schema_booking.bookings and schema_venue.fields. This
service owns neither table (research.md decision 7) and writes to neither.

Cold-start handling (research.md decision 5, User Story 3): when a player
has fewer than MIN_HISTORY_THRESHOLD prior resolved bookings, history-based
features are imputed to population-average values and low_confidence is
set on the returned BookingFeatures instead of raising.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from app.config import connection
from app.schemas.response import NotApplicableReason

# Statuses where a future no-show/complete outcome is still undetermined —
# the only ones a prediction is meaningful for (research.md decision 6).
SCORABLE_STATUSES = {"PAID", "CHECKED_IN"}
ALREADY_RESOLVED_STATUSES = {"COMPLETED", "CANCELLED", "NO_SHOW"}
NOT_YET_COMMITTED_STATUSES = {"PENDING_PAYMENT"}

# Minimum prior resolved bookings before a player's own history is trusted
# rather than imputed to population averages (research.md decision 5).
MIN_HISTORY_THRESHOLD = 3

# Platform-wide fallback no-show rate used to impute missing history-based
# features for cold-start players/venues, so a first booking doesn't need a
# separate scoring path (research.md decisions 3 and 5).
DEFAULT_NO_SHOW_RATE = 0.1


@dataclass
class BookingFeatures:
    booking_id: int
    applicable: bool
    reason: Optional[NotApplicableReason] = None
    low_confidence: bool = False

    # Model inputs — only meaningful when applicable is True.
    prior_booking_count: int = 0
    prior_no_show_rate: float = DEFAULT_NO_SHOW_RATE
    lead_time_hours: float = 0.0
    day_of_week: int = 0
    hour_of_day: int = 0
    deposit_ratio: float = 1.0
    venue_no_show_rate: float = DEFAULT_NO_SHOW_RATE

    def as_vector(self) -> list[float]:
        """Fixed-order numeric feature vector consumed by the model."""
        return [
            float(self.prior_booking_count),
            self.prior_no_show_rate,
            self.lead_time_hours,
            float(self.day_of_week),
            float(self.hour_of_day),
            self.deposit_ratio,
            self.venue_no_show_rate,
        ]


FEATURE_NAMES = [
    "prior_booking_count",
    "prior_no_show_rate",
    "lead_time_hours",
    "day_of_week",
    "hour_of_day",
    "deposit_ratio",
    "venue_no_show_rate",
]


def _classify_status(status: str) -> tuple[bool, Optional[NotApplicableReason]]:
    if status in SCORABLE_STATUSES:
        return True, None
    if status in ALREADY_RESOLVED_STATUSES:
        return False, NotApplicableReason.ALREADY_RESOLVED
    if status in NOT_YET_COMMITTED_STATUSES:
        return False, NotApplicableReason.NOT_YET_COMMITTED
    # Unknown/future status values: treat conservatively as not applicable
    # rather than guessing an outcome.
    return False, NotApplicableReason.ALREADY_RESOLVED


def _player_history(cur, player_id: int, exclude_booking_id: int) -> tuple[int, float]:
    cur.execute(
        """
        SELECT COUNT(*) FILTER (WHERE status IN ('COMPLETED', 'NO_SHOW')),
               COUNT(*) FILTER (WHERE status = 'NO_SHOW')
        FROM schema_booking.bookings
        WHERE player_id = %s AND booking_id <> %s
        """,
        (player_id, exclude_booking_id),
    )
    prior_count, no_show_count = cur.fetchone()
    prior_count = prior_count or 0
    no_show_count = no_show_count or 0
    if prior_count < MIN_HISTORY_THRESHOLD:
        return prior_count, DEFAULT_NO_SHOW_RATE
    return prior_count, no_show_count / prior_count


def _venue_no_show_rate(cur, field_id: int) -> float:
    cur.execute(
        """
        SELECT COUNT(*) FILTER (WHERE b.status IN ('COMPLETED', 'NO_SHOW')),
               COUNT(*) FILTER (WHERE b.status = 'NO_SHOW')
        FROM schema_booking.bookings b
        JOIN schema_venue.fields f ON f.field_id = b.field_id
        WHERE f.venue_id = (SELECT venue_id FROM schema_venue.fields WHERE field_id = %s)
        """,
        (field_id,),
    )
    row = cur.fetchone()
    total, no_shows = (row[0] or 0, row[1] or 0) if row else (0, 0)
    if total < MIN_HISTORY_THRESHOLD:
        return DEFAULT_NO_SHOW_RATE
    return no_shows / total


def _compute_feature_values(
    cur, booking_id: int, player_id: int, field_id: int
) -> tuple[list[float], int]:
    """Shared by build_booking_features() (serving) and models/train.py
    (training against already-resolved bookings) — same feature logic
    either way, only the status-applicability check differs by caller."""
    cur.execute(
        """
        SELECT created_at, lower(booking_time_range), total_amount, deposit_amount
        FROM schema_booking.bookings
        WHERE booking_id = %s
        """,
        (booking_id,),
    )
    created_at, slot_starts_at, total_amount, deposit_amount = cur.fetchone()

    prior_count, prior_no_show_rate = _player_history(cur, player_id, booking_id)
    venue_no_show_rate = _venue_no_show_rate(cur, field_id)

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    if slot_starts_at.tzinfo is None:
        slot_starts_at = slot_starts_at.replace(tzinfo=timezone.utc)
    lead_time_hours = max((slot_starts_at - created_at).total_seconds() / 3600.0, 0.0)
    deposit_ratio = float(deposit_amount) / float(total_amount) if total_amount else 1.0

    vector = [
        float(prior_count),
        prior_no_show_rate,
        lead_time_hours,
        float(slot_starts_at.weekday()),
        float(slot_starts_at.hour),
        deposit_ratio,
        venue_no_show_rate,
    ]
    return vector, prior_count


def build_booking_features(booking_id: int) -> BookingFeatures:
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT player_id, field_id, status FROM schema_booking.bookings WHERE booking_id = %s",
                (booking_id,),
            )
            row = cur.fetchone()
            if row is None:
                return BookingFeatures(
                    booking_id=booking_id,
                    applicable=False,
                    reason=NotApplicableReason.NOT_FOUND,
                )

            player_id, field_id, status = row
            applicable, reason = _classify_status(status)
            if not applicable:
                return BookingFeatures(
                    booking_id=booking_id, applicable=False, reason=reason
                )

            vector, prior_count = _compute_feature_values(
                cur, booking_id, player_id, field_id
            )

    (
        prior_booking_count,
        prior_no_show_rate,
        lead_time_hours,
        day_of_week,
        hour_of_day,
        deposit_ratio,
        venue_no_show_rate,
    ) = vector

    return BookingFeatures(
        booking_id=booking_id,
        applicable=True,
        low_confidence=prior_count < MIN_HISTORY_THRESHOLD,
        prior_booking_count=int(prior_booking_count),
        prior_no_show_rate=prior_no_show_rate,
        lead_time_hours=lead_time_hours,
        day_of_week=int(day_of_week),
        hour_of_day=int(hour_of_day),
        deposit_ratio=deposit_ratio,
        venue_no_show_rate=venue_no_show_rate,
    )


def feature_vector_for_resolved_booking(booking_id: int) -> Optional[list[float]]:
    """Training-only entrypoint (models/train.py): computes the same
    feature vector as build_booking_features(), but for a booking whose
    status is already COMPLETED/NO_SHOW — which build_booking_features()
    would reject as not-applicable, since that check exists for the
    *serving* path only."""
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT player_id, field_id FROM schema_booking.bookings WHERE booking_id = %s",
                (booking_id,),
            )
            row = cur.fetchone()
            if row is None:
                return None
            player_id, field_id = row
            vector, _ = _compute_feature_values(cur, booking_id, player_id, field_id)
            return vector
