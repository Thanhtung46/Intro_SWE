"""Unit tests for services/scoring.py — pure functions, no DB required.

Covers User Story 1 (sport/location-weighted ranking for a returning user)
and User Story 2 (non-empty popularity/proximity fallback for cold start).
"""

from app.schemas.request import RecommendationRequest
from services.candidates import CandidateVenue
from services.scoring import score_candidates
from services.signals import SignalEvent, UserSignalProfile


def _venue(venue_id, name, lat, lng, address="Some St"):
    return CandidateVenue(
        venue_id=venue_id, venue_name=name, address=address, lat=lat, lng=lng
    )


def test_history_weighted_venue_ranks_above_unrelated_venue():
    # User has repeatedly booked "San ABC" (District 7-ish coordinates).
    profile = UserSignalProfile(
        events=[
            SignalEvent(
                sport="FOOTBALL",
                venue_id=1,
                venue_name="San ABC",
                lat=10.73,
                lng=106.72,
                weight=1.0,
            ),
            SignalEvent(
                sport="FOOTBALL",
                venue_id=1,
                venue_name="San ABC",
                lat=10.73,
                lng=106.72,
                weight=0.9,
            ),
            SignalEvent(
                sport="FOOTBALL",
                venue_id=1,
                venue_name="San ABC",
                lat=10.73,
                lng=106.72,
                weight=0.8,
            ),
        ]
    )
    candidates = [
        _venue(1, "San ABC", 10.73, 106.72),  # matches history exactly
        _venue(2, "Unrelated Pitch", 21.03, 105.85),  # Hanoi — far away, no history
    ]
    request = RecommendationRequest(user_id=1, sport="FOOTBALL", limit=10)

    ranked, fallback = score_candidates(
        profile, candidates, popularity={}, request=request
    )

    assert fallback is False
    assert ranked[0].candidate.venue_id == 1
    assert ranked[0].score > ranked[1].score


def test_empty_profile_still_returns_non_empty_popularity_ranked_list():
    profile = UserSignalProfile(events=[])
    candidates = [
        _venue(1, "Popular Pitch", 10.73, 106.72),
        _venue(2, "Quiet Pitch", 10.80, 106.70),
    ]
    request = RecommendationRequest(user_id=99, sport="FOOTBALL", limit=10)

    ranked, fallback = score_candidates(
        profile, candidates, popularity={1: 50.0, 2: 2.0}, request=request
    )

    assert fallback is True
    assert len(ranked) == 2  # SC-002: non-empty even with zero history
    assert ranked[0].candidate.venue_id == 1  # more popular venue ranks first


def test_history_that_matches_no_candidate_falls_back_to_popularity():
    # User's history is all in a region with no currently listed venues.
    profile = UserSignalProfile(
        events=[
            SignalEvent(
                sport="FOOTBALL",
                venue_id=None,
                venue_name="Faraway Pitch",
                lat=9.0,
                lng=105.0,
                weight=1.0,
            )
        ]
    )
    candidates = [_venue(1, "Nearby Pitch", 10.73, 106.72)]
    request = RecommendationRequest(user_id=1, sport="FOOTBALL", limit=10)

    ranked, fallback = score_candidates(
        profile, candidates, popularity={1: 5.0}, request=request
    )

    assert fallback is True
    assert len(ranked) == 1


def test_no_eligible_candidates_returns_empty_list_not_error():
    profile = UserSignalProfile(events=[])
    request = RecommendationRequest(user_id=1, sport="FOOTBALL", limit=10)

    ranked, fallback = score_candidates(profile, [], popularity={}, request=request)

    assert ranked == []
    assert fallback is False


def test_radius_km_excludes_candidates_outside_it():
    profile = UserSignalProfile(events=[])
    candidates = [
        _venue(1, "Close Pitch", 10.730, 106.720),
        _venue(2, "Far Pitch", 21.030, 105.850),  # Hanoi — hundreds of km away
    ]
    request = RecommendationRequest(
        user_id=1,
        sport="FOOTBALL",
        limit=10,
        latitude=10.730,
        longitude=106.720,
        radius_km=5,
    )

    ranked, _ = score_candidates(profile, candidates, popularity={}, request=request)

    assert [v.candidate.venue_id for v in ranked] == [1]


def test_limit_shorter_than_candidate_count_is_not_padded():
    profile = UserSignalProfile(events=[])
    candidates = [_venue(1, "A", 10.0, 106.0), _venue(2, "B", 10.1, 106.1)]
    request = RecommendationRequest(user_id=1, sport="FOOTBALL", limit=10)

    ranked, _ = score_candidates(profile, candidates, popularity={}, request=request)

    # score_candidates itself doesn't truncate to limit (the router does);
    # this just confirms it never invents extra candidates.
    assert len(ranked) == len(candidates)
