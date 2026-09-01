"""Unit tests for services/features.py — DB access is stubbed via a fake
cursor/connection so these don't need a live Postgres connection. See
quickstart.md for the DB-backed manual validation script.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.schemas.response import NotApplicableReason
from services import features as features_module
from services.features import (
    DEFAULT_NO_SHOW_RATE,
    MIN_HISTORY_THRESHOLD,
    build_booking_features,
)


class _FakeCursor:
    def __init__(self, responses):
        # `responses` is a list of (expected_sql_fragment, return_value)
        # consumed in order — good enough for these deterministic call
        # sequences without a real DB driver.
        self._responses = list(responses)
        self._last_result = None

    def execute(self, sql, params=None):
        _, result = self._responses.pop(0)
        self._last_result = result

    def fetchone(self):
        return self._last_result

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _FakeConn:
    def __init__(self, cursor):
        self._cursor = cursor

    def cursor(self):
        return self._cursor


class _FakeConnectionCtx:
    def __init__(self, cursor):
        self._cursor = cursor

    def __enter__(self):
        return _FakeConn(self._cursor)

    def __exit__(self, *exc):
        return False


def _patch_connection(monkeypatch, responses):
    cursor = _FakeCursor(responses)
    monkeypatch.setattr(
        features_module, "connection", lambda: _FakeConnectionCtx(cursor)
    )
    return cursor


NOW = datetime(2026, 8, 31, 10, 0, tzinfo=timezone.utc)


def _booking_row(
    status, created_at, slot_starts_at, total_amount=200_000, deposit_amount=200_000
):
    return (
        "booking_lookup",
        (1, 10, status, created_at, slot_starts_at, total_amount, deposit_amount),
    )


def test_not_found_booking_returns_not_found_reason(monkeypatch):
    _patch_connection(monkeypatch, [("lookup", None)])

    result = build_booking_features(999)

    assert result.applicable is False
    assert result.reason == NotApplicableReason.NOT_FOUND


@pytest.mark.parametrize(
    "status,expected_reason",
    [
        ("COMPLETED", NotApplicableReason.ALREADY_RESOLVED),
        ("CANCELLED", NotApplicableReason.ALREADY_RESOLVED),
        ("NO_SHOW", NotApplicableReason.ALREADY_RESOLVED),
        ("PENDING_PAYMENT", NotApplicableReason.NOT_YET_COMMITTED),
    ],
)
def test_non_scorable_statuses_are_not_applicable(monkeypatch, status, expected_reason):
    _patch_connection(
        monkeypatch,
        [("lookup", (1, 10, status))],
    )

    result = build_booking_features(123)

    assert result.applicable is False
    assert result.reason == expected_reason


def test_scorable_booking_computes_lead_time_and_deposit_ratio(monkeypatch):
    created_at = NOW - timedelta(hours=48)
    slot_starts_at = NOW
    cursor = _patch_connection(
        monkeypatch,
        [
            ("lookup", (1, 10, "PAID")),
            ("feature_row", (created_at, slot_starts_at, 200_000, 100_000)),
            ("player_history", (5, 1)),  # 5 prior resolved, 1 no-show
            ("venue_history", (10, 2)),  # 10 prior resolved, 2 no-shows
        ],
    )

    result = build_booking_features(123)

    assert result.applicable is True
    assert result.lead_time_hours == pytest.approx(48.0)
    assert result.deposit_ratio == pytest.approx(0.5)
    assert result.day_of_week == slot_starts_at.weekday()
    assert result.hour_of_day == slot_starts_at.hour
    assert result.prior_booking_count == 5
    assert result.prior_no_show_rate == pytest.approx(1 / 5)
    assert result.venue_no_show_rate == pytest.approx(2 / 10)
    assert result.low_confidence is False


def test_cold_start_player_gets_default_rate_and_low_confidence(monkeypatch):
    created_at = NOW - timedelta(hours=24)
    slot_starts_at = NOW
    _patch_connection(
        monkeypatch,
        [
            ("lookup", (1, 10, "PAID")),
            ("feature_row", (created_at, slot_starts_at, 200_000, 200_000)),
            ("player_history", (0, 0)),  # brand-new player
            ("venue_history", (0, 0)),
        ],
    )

    result = build_booking_features(123)

    assert result.applicable is True
    assert result.low_confidence is True
    assert result.prior_booking_count == 0
    assert result.prior_no_show_rate == pytest.approx(DEFAULT_NO_SHOW_RATE)
    assert result.venue_no_show_rate == pytest.approx(DEFAULT_NO_SHOW_RATE)


def test_history_below_threshold_still_imputes_default_rate(monkeypatch):
    created_at = NOW - timedelta(hours=24)
    slot_starts_at = NOW
    _patch_connection(
        monkeypatch,
        [
            ("lookup", (1, 10, "PAID")),
            ("feature_row", (created_at, slot_starts_at, 200_000, 200_000)),
            ("player_history", (MIN_HISTORY_THRESHOLD - 1, MIN_HISTORY_THRESHOLD - 1)),
            ("venue_history", (0, 0)),
        ],
    )

    result = build_booking_features(123)

    assert result.low_confidence is True
    assert result.prior_no_show_rate == pytest.approx(DEFAULT_NO_SHOW_RATE)
