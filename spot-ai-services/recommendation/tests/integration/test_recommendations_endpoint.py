"""Integration tests for GET /recommendations and GET /health.

Data-access functions (services/signals.py, services/candidates.py,
services/scoring.py's compute_popularity_scores) are monkeypatched so these
tests don't need a live Postgres connection — score_candidates() itself
(the part that matters for these assertions) runs for real. See
quickstart.md for the DB-backed manual validation script.
"""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.routers import recommendations as recommendations_module
from services.candidates import CandidateSlot, CandidateVenue
from services.signals import SignalEvent, UserSignalProfile

INTERNAL_KEY = "test-internal-key"


@pytest.fixture(autouse=True)
def _set_internal_key(monkeypatch):
    monkeypatch.setattr(settings, "internal_service_key", INTERNAL_KEY)


@pytest.fixture
def client():
    return TestClient(app)


def _auth_headers():
    return {"X-Internal-Service-Key": INTERNAL_KEY}


def _venue(venue_id, name, lat=10.73, lng=106.72):
    v = CandidateVenue(
        venue_id=venue_id, venue_name=name, address="Addr", lat=lat, lng=lng
    )
    v.slots = [
        CandidateSlot(
            field_id=venue_id * 10,
            starts_at=datetime(2030, 1, 1, tzinfo=timezone.utc),
            ends_at=datetime(2030, 1, 1, 1, tzinfo=timezone.utc),
        )
    ]
    return v


def test_health_needs_no_auth(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_missing_service_key_is_401(client):
    response = client.get("/recommendations", params={"userId": 1, "sport": "FOOTBALL"})
    assert response.status_code == 401


def test_invalid_sport_is_400(client):
    response = client.get(
        "/recommendations",
        params={"userId": 1, "sport": "TENNIS"},
        headers=_auth_headers(),
    )
    assert response.status_code == 400


def test_lat_without_lng_is_400(client):
    response = client.get(
        "/recommendations",
        params={"userId": 1, "sport": "FOOTBALL", "latitude": 10.7},
        headers=_auth_headers(),
    )
    assert response.status_code == 400


def test_returning_user_gets_sport_weighted_results(client, monkeypatch):
    monkeypatch.setattr(
        recommendations_module,
        "build_user_signal_profile",
        lambda user_id: UserSignalProfile(
            events=[
                SignalEvent(
                    sport="FOOTBALL",
                    venue_id=1,
                    venue_name="San ABC",
                    lat=10.73,
                    lng=106.72,
                    weight=1.0,
                )
            ]
        ),
    )
    monkeypatch.setattr(
        recommendations_module,
        "fetch_candidate_venues",
        lambda sport: [
            _venue(1, "San ABC"),
            _venue(2, "Unrelated", lat=21.0, lng=105.8),
        ],
    )
    monkeypatch.setattr(
        recommendations_module, "populate_available_slots", lambda cs: cs
    )
    monkeypatch.setattr(
        recommendations_module, "compute_popularity_scores", lambda sport: {}
    )

    response = client.get(
        "/recommendations",
        params={"userId": 1, "sport": "FOOTBALL"},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["fallback"] is False
    assert (
        body["items"][0]["venueId"] == 1
    )  # SC-001: history-matching venue ranks first


def test_brand_new_user_gets_non_empty_fallback_list(client, monkeypatch):
    monkeypatch.setattr(
        recommendations_module,
        "build_user_signal_profile",
        lambda user_id: UserSignalProfile(),
    )
    monkeypatch.setattr(
        recommendations_module,
        "fetch_candidate_venues",
        lambda sport: [_venue(1, "Any Pitch")],
    )
    monkeypatch.setattr(
        recommendations_module, "populate_available_slots", lambda cs: cs
    )
    monkeypatch.setattr(
        recommendations_module, "compute_popularity_scores", lambda sport: {1: 10.0}
    )

    response = client.get(
        "/recommendations",
        params={"userId": 42, "sport": "FOOTBALL"},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["fallback"] is True
    assert len(body["items"]) == 1  # SC-002: never empty for a valid cold-start request


def test_removed_venue_never_appears(client, monkeypatch):
    # fetch_candidate_venues is the only source of venues — a venue absent
    # from its result (e.g. because it was deleted) structurally cannot
    # appear in the response (FR-004).
    monkeypatch.setattr(
        recommendations_module,
        "build_user_signal_profile",
        lambda user_id: UserSignalProfile(),
    )
    monkeypatch.setattr(
        recommendations_module, "fetch_candidate_venues", lambda sport: []
    )
    monkeypatch.setattr(
        recommendations_module, "populate_available_slots", lambda cs: cs
    )
    monkeypatch.setattr(
        recommendations_module, "compute_popularity_scores", lambda sport: {}
    )

    response = client.get(
        "/recommendations",
        params={"userId": 1, "sport": "FOOTBALL"},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    assert response.json()["items"] == []
