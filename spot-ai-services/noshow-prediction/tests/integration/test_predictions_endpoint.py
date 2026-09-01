"""Integration tests for POST /predict, POST /predict/batch, and GET /health.

Data-access (services.features.build_booking_features) and the loaded
model (services.model_registry) are monkeypatched/stubbed so these tests
don't need a live Postgres connection or a real trained artifact. See
quickstart.md for the DB-backed manual validation script.
"""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.schemas.response import NotApplicableReason
from services import model_registry
from services import predictor as predictor_module
from services.features import BookingFeatures

INTERNAL_KEY = "test-internal-key"


class _StubModel:
    def __init__(self, no_show_proba: float):
        self._no_show_proba = no_show_proba

    def predict_proba(self, X):
        return [[1 - self._no_show_proba, self._no_show_proba] for _ in X]


@pytest.fixture(autouse=True)
def _set_internal_key(monkeypatch):
    monkeypatch.setattr(settings, "internal_service_key", INTERNAL_KEY)


@pytest.fixture(autouse=True)
def _reset_model():
    yield
    model_registry.set_model_for_testing(None)


@pytest.fixture
def client():
    return TestClient(app)


def _auth_headers():
    return {"X-Internal-Service-Key": INTERNAL_KEY}


def _stub_features(by_id: dict[int, BookingFeatures], monkeypatch):
    def fake(booking_id: int) -> BookingFeatures:
        return by_id.get(
            booking_id,
            BookingFeatures(
                booking_id=booking_id,
                applicable=False,
                reason=NotApplicableReason.NOT_FOUND,
            ),
        )

    monkeypatch.setattr(predictor_module, "build_booking_features", fake)


def test_health_needs_no_auth_and_reports_model_state(client):
    model_registry.set_model_for_testing(None)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "modelLoaded": False}

    model_registry.set_model_for_testing(_StubModel(0.1))
    response = client.get("/health")
    assert response.json()["modelLoaded"] is True


def test_missing_service_key_is_401(client):
    response = client.post("/predict", json={"bookingId": 1})
    assert response.status_code == 401


def test_invalid_body_is_400(client):
    response = client.post("/predict", json={"bookingId": -1}, headers=_auth_headers())
    assert response.status_code == 400


def test_not_found_booking_is_404(client, monkeypatch):
    _stub_features({}, monkeypatch)
    model_registry.set_model_for_testing(_StubModel(0.1))

    response = client.post(
        "/predict", json={"bookingId": 999999}, headers=_auth_headers()
    )
    assert response.status_code == 404


def test_not_applicable_booking_returns_200_with_reason(client, monkeypatch):
    _stub_features(
        {
            5: BookingFeatures(
                booking_id=5,
                applicable=False,
                reason=NotApplicableReason.ALREADY_RESOLVED,
            )
        },
        monkeypatch,
    )
    model_registry.set_model_for_testing(_StubModel(0.1))

    response = client.post("/predict", json={"bookingId": 5}, headers=_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["applicable"] is False
    assert body["riskScore"] is None
    assert body["reason"] == "ALREADY_RESOLVED"


def test_applicable_booking_returns_score_and_tier(client, monkeypatch):
    _stub_features(
        {7: BookingFeatures(booking_id=7, applicable=True, low_confidence=False)},
        monkeypatch,
    )
    model_registry.set_model_for_testing(_StubModel(0.8))

    response = client.post("/predict", json={"bookingId": 7}, headers=_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["applicable"] is True
    assert body["riskScore"] == pytest.approx(0.8)
    assert body["riskTier"] == "HIGH"


def test_predict_unavailable_when_model_not_loaded(client, monkeypatch):
    _stub_features(
        {7: BookingFeatures(booking_id=7, applicable=True, low_confidence=False)},
        monkeypatch,
    )
    model_registry.set_model_for_testing(None)

    response = client.post("/predict", json={"bookingId": 7}, headers=_auth_headers())

    assert response.status_code == 503


def test_batch_returns_partial_results_without_failing_whole_batch(client, monkeypatch):
    _stub_features(
        {
            1: BookingFeatures(booking_id=1, applicable=True),
            2: BookingFeatures(
                booking_id=2,
                applicable=False,
                reason=NotApplicableReason.ALREADY_RESOLVED,
            ),
        },
        monkeypatch,
    )
    model_registry.set_model_for_testing(_StubModel(0.1))

    response = client.post(
        "/predict/batch",
        json={"bookingIds": [1, 2, 999999]},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    results = response.json()["results"]
    assert [r["bookingId"] for r in results] == [1, 2, 999999]
    assert results[0]["applicable"] is True
    assert results[1]["reason"] == "ALREADY_RESOLVED"
    assert results[2]["reason"] == "NOT_FOUND"


def test_batch_over_max_size_is_400(client):
    response = client.post(
        "/predict/batch",
        json={"bookingIds": list(range(1, 102))},
        headers=_auth_headers(),
    )
    assert response.status_code == 400
