"""Unit tests for services/candidates.py slot logic — User Story 3.

`populate_available_slots` is exercised directly against a fake
`fetch_available_slots` (monkeypatched) so no DB is required; the
overlap/exclusion arithmetic itself is what's under test, matching
data-model.md's exclusion rule (FR-004/005).
"""

from services import candidates as candidates_module
from services.candidates import CandidateSlot, CandidateVenue, populate_available_slots


def test_venue_with_one_full_field_and_one_open_field_keeps_open_slot(monkeypatch):
    def fake_fetch(field_id):
        if field_id == 1:
            return []  # fully booked out
        return [CandidateSlot(field_id=2, starts_at="t0", ends_at="t1")]

    monkeypatch.setattr(candidates_module, "fetch_available_slots", fake_fetch)

    venue = CandidateVenue(
        venue_id=1, venue_name="V", address="A", lat=None, lng=None, field_ids=[1, 2]
    )

    kept = populate_available_slots([venue])

    assert len(kept) == 1
    assert [s.field_id for s in kept[0].slots] == [2]


def test_venue_with_zero_available_slots_is_dropped(monkeypatch):
    monkeypatch.setattr(candidates_module, "fetch_available_slots", lambda field_id: [])

    venue = CandidateVenue(
        venue_id=1, venue_name="V", address="A", lat=None, lng=None, field_ids=[1]
    )

    kept = populate_available_slots([venue])

    assert kept == []
