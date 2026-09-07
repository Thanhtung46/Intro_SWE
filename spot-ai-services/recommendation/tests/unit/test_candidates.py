"""Unit tests for services/candidates.py slot logic — User Story 3.

`populate_available_slots` is exercised directly against a fake
`fetch_available_slots_bulk` (monkeypatched) so no DB is required; the
overlap/exclusion arithmetic itself is what's under test, matching
data-model.md's exclusion rule (FR-004/005). `fetch_available_slots_bulk`
is the single query populate_available_slots() actually calls (see
research.md N+1 fix) — monkeypatching it, not the per-field
fetch_available_slots(), is what exercises the real code path.
"""

from services import candidates as candidates_module
from services.candidates import CandidateSlot, CandidateVenue, populate_available_slots


def test_venue_with_one_full_field_and_one_open_field_keeps_open_slot(monkeypatch):
    def fake_fetch_bulk(field_ids):
        return {
            1: [],  # fully booked out
            2: [CandidateSlot(field_id=2, starts_at="t0", ends_at="t1")],
        }

    monkeypatch.setattr(candidates_module, "fetch_available_slots_bulk", fake_fetch_bulk)

    venue = CandidateVenue(
        venue_id=1, venue_name="V", address="A", lat=None, lng=None, field_ids=[1, 2]
    )

    kept = populate_available_slots([venue])

    assert len(kept) == 1
    assert [s.field_id for s in kept[0].slots] == [2]


def test_venue_with_zero_available_slots_is_dropped(monkeypatch):
    monkeypatch.setattr(candidates_module, "fetch_available_slots_bulk", lambda field_ids: {})

    venue = CandidateVenue(
        venue_id=1, venue_name="V", address="A", lat=None, lng=None, field_ids=[1]
    )

    kept = populate_available_slots([venue])

    assert kept == []


def test_populate_available_slots_makes_a_single_bulk_call(monkeypatch):
    calls = []

    def fake_fetch_bulk(field_ids):
        calls.append(list(field_ids))
        return {
            fid: [CandidateSlot(field_id=fid, starts_at="t0", ends_at="t1")]
            for fid in field_ids
        }

    monkeypatch.setattr(candidates_module, "fetch_available_slots_bulk", fake_fetch_bulk)

    venues = [
        CandidateVenue(venue_id=1, venue_name="A", address="", lat=None, lng=None, field_ids=[1, 2]),
        CandidateVenue(venue_id=2, venue_name="B", address="", lat=None, lng=None, field_ids=[3]),
    ]

    kept = populate_available_slots(venues)

    assert len(calls) == 1
    assert sorted(calls[0]) == [1, 2, 3]
    assert len(kept) == 2
