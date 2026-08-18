"""Weighted-signal ranking — the core of FR-001/002/003.

Deliberately NOT a trained/fit ML model (research.md decision 2): there is
no labeled outcome data yet to train against. `scikit-learn` is used
narrowly for cosine similarity between each candidate's weighted feature
vector and an "ideal" target vector — a simple, explainable scalarization
of three signals (history affinity, proximity, popularity), not a
collaborative-filtering or supervised model.

`score_candidates()` is a pure function (no DB I/O) so it can be unit
tested with synthetic data (tests/unit/test_scoring.py) — data access lives
in services/signals.py and services/candidates.py.
"""

import math

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.config import connection
from app.schemas.request import RecommendationRequest
from services.candidates import CandidateVenue
from services.signals import UserSignalProfile
from services.sports import FIELD_SPORT_TYPE

# [history affinity, proximity to request location, popularity] importance
# weights. Not trained — a documented, explainable default (research.md
# decision 2). Rebalance here if product feedback says otherwise; no
# service redesign needed.
WEIGHTS_WITH_HISTORY = np.array([0.5, 0.3, 0.2])
WEIGHTS_COLD_START = np.array([0.0, 0.4, 0.6])

# Spatial decay: history events more than this many km from a candidate
# contribute ~nothing to that candidate's history-affinity score.
HISTORY_DECAY_KM = 10.0

# Below this raw affinity, treat a user's history as "didn't match any
# current candidate" (spec Edge Cases) rather than a genuine — if faint —
# match; exp() decay never hits exactly zero, so a real threshold is needed.
HISTORY_MATCH_THRESHOLD = 0.01


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(a))


def compute_popularity_scores(sport: str) -> dict[int, float]:
    """Platform-wide booking counts per venue for this sport.

    Only counts bookings (schema_booking.bookings, venue_id-linked) —
    matchmaking kèo are free listings not tied to schema_venue.venues by id
    (same reasoning as research.md decision 4), so they can't be aggregated
    per-venue-id without an unreliable fuzzy text join. This is a
    documented scope choice, not an oversight.
    """
    field_sport_type = FIELD_SPORT_TYPE[sport]
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT f.venue_id, COUNT(*)
                FROM schema_booking.bookings b
                JOIN schema_venue.fields f ON f.field_id = b.field_id
                WHERE f.sport_type = %s AND b.status <> 'CANCELLED'
                GROUP BY f.venue_id
                """,
                (field_sport_type,),
            )
            rows = cur.fetchall()
    return {venue_id: float(count) for venue_id, count in rows}


def _normalize(values: np.ndarray) -> np.ndarray:
    """Min-max normalize to [0, 1]; an all-equal column becomes all-zero
    (no information to rank on) rather than dividing by zero."""
    lo, hi = values.min(), values.max()
    if hi - lo < 1e-9:
        return np.zeros_like(values)
    return (values - lo) / (hi - lo)


def _history_affinity(candidate: CandidateVenue, events: list) -> float:
    total = 0.0
    for event in events:
        if event.venue_id is not None and event.venue_id == candidate.venue_id:
            total += event.weight  # exact booking-history match — strong signal
            continue
        if (
            event.venue_name
            and candidate.venue_name
            and event.venue_name.strip().lower() == candidate.venue_name.strip().lower()
        ):
            total += event.weight  # exact venue-name match (matchmaking history)
            continue
        if (
            event.lat is not None
            and event.lng is not None
            and candidate.lat is not None
            and candidate.lng is not None
        ):
            distance = haversine_km(event.lat, event.lng, candidate.lat, candidate.lng)
            total += event.weight * math.exp(-distance / HISTORY_DECAY_KM)
    return total


def _proximity(candidate: CandidateVenue, request: RecommendationRequest) -> float:
    if request.latitude is None or request.longitude is None:
        return 0.0
    if candidate.lat is None or candidate.lng is None:
        return 0.0
    distance = haversine_km(
        request.latitude, request.longitude, candidate.lat, candidate.lng
    )
    if request.radius_km is not None and distance > request.radius_km:
        return -1.0  # sentinel: filtered out by caller
    return 1.0 / (1.0 + distance)


class ScoredVenue:
    def __init__(
        self, candidate: CandidateVenue, score: float, distance_km: float | None
    ):
        self.candidate = candidate
        self.score = score
        self.distance_km = distance_km


def score_candidates(
    profile: UserSignalProfile,
    candidates: list[CandidateVenue],
    popularity: dict[int, float],
    request: RecommendationRequest,
) -> tuple[list[ScoredVenue], bool]:
    """Rank candidates for one request.

    Returns (ranked_venues, fallback) where `fallback` is True when the
    ranking is popularity/proximity-only (cold-start user, or a user whose
    history didn't match any current candidate — spec Edge Cases / FR-003).
    """
    if not candidates:
        return [], False

    events = profile.events_for_sport(request.sport)

    # Distance filter first (radiusKm is a hard cutoff, not a scoring input).
    filtered: list[CandidateVenue] = []
    distances: dict[int, float | None] = {}
    proximity_by_venue: dict[int, float] = {}
    for candidate in candidates:
        prox = _proximity(candidate, request)
        if prox == -1.0:
            continue  # outside requested radius
        filtered.append(candidate)
        proximity_by_venue[candidate.venue_id] = prox
        if request.latitude is not None and candidate.lat is not None:
            distances[candidate.venue_id] = haversine_km(
                request.latitude, request.longitude, candidate.lat, candidate.lng
            )
        else:
            distances[candidate.venue_id] = None
    if not filtered:
        return [], False

    history_raw = np.array([_history_affinity(c, events) for c in filtered])
    proximity_raw = np.array([proximity_by_venue[c.venue_id] for c in filtered])
    popularity_raw = np.array([popularity.get(c.venue_id, 0.0) for c in filtered])

    has_matching_history = bool(events) and history_raw.max() > HISTORY_MATCH_THRESHOLD
    weights = WEIGHTS_WITH_HISTORY if has_matching_history else WEIGHTS_COLD_START
    fallback = not has_matching_history

    features = np.column_stack(
        [_normalize(history_raw), _normalize(proximity_raw), _normalize(popularity_raw)]
    )
    weighted = features * weights
    ideal = weights.reshape(1, -1)

    scores = np.zeros(len(filtered))
    nonzero_rows = np.linalg.norm(weighted, axis=1) > 1e-9
    if nonzero_rows.any() and np.linalg.norm(ideal) > 1e-9:
        scores[nonzero_rows] = cosine_similarity(weighted[nonzero_rows], ideal).ravel()

    ranked = [
        ScoredVenue(candidate=c, score=float(s), distance_km=distances[c.venue_id])
        for c, s in zip(filtered, scores)
    ]
    ranked.sort(key=lambda v: v.score, reverse=True)
    return ranked, fallback
