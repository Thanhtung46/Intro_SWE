"""Unit tests for dialogue.py's control flow.

Covers the confirm-before-finalize kèo state machine (SC-004, unchanged by
spec 007), and spec 007's three additions: capping results to 3, the
kèo-vs-venue clarifying question, venue search, and the "book this venue"
confirm/hand-off flow. Redis and the backend are faked so this exercises
dialogue.py's control flow in isolation.
"""

import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from services import dialogue


class FakeStore:
    def __init__(self, conversation):
        self.conversation = conversation
        self.resolved_states = []
        self.pending_action_set = None

    def get_active_pending_action(self, conversation):
        pending_action = conversation.get("pendingAction")
        if pending_action is None or pending_action["state"] != "awaiting_confirmation":
            return None
        expires_at = datetime.fromisoformat(pending_action["expiresAt"])
        if datetime.now(timezone.utc) >= expires_at:
            return None
        return pending_action

    async def resolve_pending_action(self, conversation, state):
        self.resolved_states.append(state)
        if conversation.get("pendingAction") is not None:
            conversation["pendingAction"]["state"] = state
        conversation["pendingAction"] = None

    async def set_pending_action(self, conversation, *, action_type, match_id, summary):
        pending_action = {
            "actionId": "action-1",
            "type": action_type,
            "matchId": match_id,
            "summary": summary,
            "state": "awaiting_confirmation",
            "expiresAt": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        }
        conversation["pendingAction"] = pending_action
        self.pending_action_set = pending_action
        return pending_action

    async def set_last_results(self, conversation, results):
        conversation["lastResults"] = results

    async def set_last_venue_results(self, conversation, venue_results):
        conversation["lastVenueResults"] = venue_results

    async def set_last_interpreted_request(self, conversation, interpreted_request):
        conversation["lastInterpretedRequest"] = interpreted_request


class FakeBackend:
    def __init__(self, match=None, join_result=None, matches=None, venues=None):
        self._match = match
        self._join_result = join_result or {}
        self.join_called = False
        self._matches = matches if matches is not None else []
        self._venues = venues if venues is not None else []
        self.search_venues_calls = []

    async def get_match(self, match_id):
        return self._match

    async def join_match(self, match_id, body=None):
        self.join_called = True
        return self._join_result

    async def search_matches(self, criteria):
        return self._matches

    async def search_venues(self, criteria):
        self.search_venues_calls.append(criteria)
        return self._venues

    async def get_geo_vn(self):
        return {"provinces": []}


class FakeLLM:
    def __init__(self, intent=None, extraction=None):
        self._intent = intent
        self._extraction = extraction or {"criteria_delta": {}, "scope": "off_topic"}

    async def detect_action_intent(self, results, pending_action, message_text, venue_results=None):
        return self._intent

    async def extract_message_criteria(self, messages, message_text):
        return self._extraction


def _conversation(pending_action=None, last_results=None, last_venue_results=None, last_interpreted_request=None):
    return {
        "conversationId": "c1",
        "playerUserId": "42",
        "messages": [],
        "lastInterpretedRequest": last_interpreted_request,
        "lastResults": last_results or [],
        "lastVenueResults": last_venue_results or [],
        "pendingAction": pending_action,
    }


def _pending_action(state="awaiting_confirmation", expires_in_seconds=300):
    return {
        "actionId": "action-1",
        "type": "JOIN_MATCH",
        "matchId": 101,
        "summary": {"venueName": "Sân ABC"},
        "state": state,
        "expiresAt": (
            datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)
        ).isoformat(),
    }


def test_finalize_only_reachable_via_confirm_matching_active_pending_action():
    conversation = _conversation(pending_action=_pending_action())
    store = FakeStore(conversation)
    backend = FakeBackend(match={"status": "OPEN", "spotsLeft": 3})
    llm = FakeLLM({"intent": "confirm"})

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Đồng ý")
    )

    assert backend.join_called is True
    assert store.resolved_states == ["finalized"]
    assert result["pendingAction"] is None


def test_expired_pending_action_is_not_finalized_on_unrelated_reply():
    conversation = _conversation(pending_action=_pending_action(expires_in_seconds=-10))
    store = FakeStore(conversation)
    backend = FakeBackend(match={"status": "OPEN", "spotsLeft": 3})
    llm = FakeLLM(extraction={"criteria_delta": {"sport": "BADMINTON"}, "scope": "search"})

    # get_active_pending_action must treat the expired action as absent —
    # handle_message falls through to a fresh search instead of finalizing.
    asyncio.run(dialogue.handle_message(llm, backend, store, conversation, "Tìm sân khác"))

    assert backend.join_called is False
    assert store.resolved_states == []


def test_unrelated_reply_while_pending_cancels_it_instead_of_finalizing():
    conversation = _conversation(pending_action=_pending_action())
    store = FakeStore(conversation)
    backend = FakeBackend(match={"status": "OPEN", "spotsLeft": 3})
    llm = FakeLLM({"intent": "other"})

    asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "à mà thôi tìm sân khác")
    )

    assert backend.join_called is False
    assert store.resolved_states == ["cancelled"]


def test_explicit_cancel_reply_cancels_without_finalizing():
    conversation = _conversation(pending_action=_pending_action())
    store = FakeStore(conversation)
    backend = FakeBackend(match={"status": "OPEN", "spotsLeft": 3})
    llm = FakeLLM({"intent": "cancel"})

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Thôi không tham gia nữa")
    )

    assert backend.join_called is False
    assert store.resolved_states == ["cancelled"]
    assert "hủy" in result["text"]


def test_confirm_on_since_unavailable_target_raises_conflict_not_finalize():
    conversation = _conversation(pending_action=_pending_action())
    store = FakeStore(conversation)
    backend = FakeBackend(match={"status": "FULL", "spotsLeft": 0})
    llm = FakeLLM({"intent": "confirm"})

    with pytest.raises(dialogue.ActionConflictError):
        asyncio.run(
            dialogue.handle_message(llm, backend, store, conversation, "Đồng ý")
        )

    assert backend.join_called is False
    assert store.resolved_states == ["cancelled"]


# --- spec 007 P1: cap kèo results to 3 -------------------------------------

def _match(i):
    return {"matchId": i, "title": f"Kèo {i}", "venueName": "Sân", "startsAt": "t", "spotsLeft": 1}


def test_kero_search_caps_results_to_three_even_when_backend_returns_more():
    conversation = _conversation()
    store = FakeStore(conversation)
    backend = FakeBackend(matches=[_match(i) for i in range(5)])
    llm = FakeLLM(
        extraction={
            "criteria_delta": {"sport": "BADMINTON", "searchKind": "match"},
            "scope": "search",
        }
    )

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Tìm kèo cầu lông")
    )

    assert len(result["results"]) == 3


def test_kero_search_does_not_pad_when_fewer_than_three_match():
    conversation = _conversation()
    store = FakeStore(conversation)
    backend = FakeBackend(matches=[_match(1)])
    llm = FakeLLM(
        extraction={
            "criteria_delta": {"sport": "BADMINTON", "searchKind": "match"},
            "scope": "search",
        }
    )

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Tìm kèo cầu lông")
    )

    assert len(result["results"]) == 1


# --- spec 007 P2: kèo-vs-venue disambiguation + venue search --------------

def test_missing_search_kind_asks_clarifying_question_without_calling_backend():
    conversation = _conversation()
    store = FakeStore(conversation)
    backend = FakeBackend()
    llm = FakeLLM(
        extraction={"criteria_delta": {"sport": "BADMINTON"}, "scope": "search"}
    )

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Tìm sân cầu lông ở Quận 7 tối nay")
    )

    assert result["clarifyingQuestion"] is not None
    assert result["results"] is None
    assert result["venueResults"] is None
    assert backend.search_venues_calls == []


def test_unambiguous_kero_wording_skips_clarifying_question():
    conversation = _conversation()
    store = FakeStore(conversation)
    backend = FakeBackend(matches=[_match(1)])
    llm = FakeLLM(
        extraction={
            "criteria_delta": {"sport": "FOOTBALL", "searchKind": "match"},
            "scope": "search",
        }
    )

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Tìm kèo bóng đá tối nay")
    )

    assert result["clarifyingQuestion"] is None
    assert result["results"] is not None


def _venue(i):
    """Raw shape backend.search_venues() (GET /venues) returns."""
    return {"venueId": i, "name": f"Sân {i}", "address": "Đâu đó", "priceFromPerHour": 100000}


def _stored_venue(i):
    """Already-mapped shape (services.dialogue._to_venue_result) that ends
    up in conversation["lastVenueResults"] — what a "book this" follow-up
    actually receives as its target."""
    return {"venueId": i, "venueName": f"Sân {i}", "address": "Đâu đó", "priceFromPerHour": 100000}


def test_venue_search_returns_up_to_three_venue_results():
    conversation = _conversation()
    store = FakeStore(conversation)
    backend = FakeBackend(venues=[_venue(i) for i in range(5)])
    llm = FakeLLM(
        extraction={
            "criteria_delta": {"sport": "BADMINTON", "searchKind": "venue"},
            "scope": "search",
        }
    )

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Tìm sân trống")
    )

    assert result["results"] is None
    assert len(result["venueResults"]) == 3
    assert result["venueResults"][0]["venueId"] == 0


def test_venue_search_defaults_time_to_when_only_time_from_given():
    conversation = _conversation()
    store = FakeStore(conversation)
    backend = FakeBackend(venues=[])
    llm = FakeLLM(
        extraction={
            "criteria_delta": {
                "sport": "BADMINTON",
                "searchKind": "venue",
                "date": "2026-09-04",
                "timeFrom": "19:00",
            },
            "scope": "search",
        }
    )

    asyncio.run(dialogue.handle_message(llm, backend, store, conversation, "Tìm sân sau 7h tối nay"))

    assert len(backend.search_venues_calls) == 1
    assert backend.search_venues_calls[0]["timeFrom"] == "19:00"
    assert backend.search_venues_calls[0]["timeTo"] == "20:00"


def test_zero_venue_results_returns_empty_list_not_none():
    conversation = _conversation()
    store = FakeStore(conversation)
    backend = FakeBackend(venues=[])
    llm = FakeLLM(
        extraction={
            "criteria_delta": {"sport": "BADMINTON", "searchKind": "venue"},
            "scope": "search",
        }
    )

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Tìm sân trống")
    )

    assert result["venueResults"] == []


# --- spec 007 P3: "book this venue" hand-off --------------------------------

def test_book_this_venue_confirms_and_returns_booking_handoff():
    stored_venue = _stored_venue(7)
    conversation = _conversation(
        last_venue_results=[stored_venue],
        last_interpreted_request={
            "sport": "BADMINTON",
            "searchKind": "venue",
            "date": "2026-09-04",
            "timeFrom": "19:00",
        },
    )
    store = FakeStore(conversation)
    backend = FakeBackend(venues=[_venue(7)])
    llm = FakeLLM({"intent": "propose_book", "targetIndex": 0})

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Đăng ký sân đó giúp mình")
    )

    assert result["bookingHandoff"] is not None
    assert result["bookingHandoff"]["venueId"] == 7
    assert result["bookingHandoff"]["date"] == "2026-09-04"
    assert result["bookingHandoff"]["timeFrom"] == "19:00"
    assert stored_venue["venueName"] in result["text"]


def test_book_this_venue_when_slot_no_longer_available_tells_player_instead_of_handoff():
    stored_venue = _stored_venue(7)
    conversation = _conversation(
        last_venue_results=[stored_venue],
        last_interpreted_request={
            "sport": "BADMINTON",
            "searchKind": "venue",
            "date": "2026-09-04",
            "timeFrom": "19:00",
        },
    )
    store = FakeStore(conversation)
    backend = FakeBackend(venues=[])  # re-check finds nothing open anymore
    llm = FakeLLM({"intent": "propose_book", "targetIndex": 0})

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Đăng ký sân đó giúp mình")
    )

    assert result["bookingHandoff"] is None
    assert "không" in result["text"] or "mất" in result["text"]


def test_book_this_venue_with_no_prior_venue_result_asks_instead_of_guessing():
    conversation = _conversation()
    store = FakeStore(conversation)
    backend = FakeBackend()
    llm = FakeLLM(
        extraction={"criteria_delta": {"searchKind": "venue"}, "scope": "search"}
    )

    result = asyncio.run(
        dialogue.handle_message(llm, backend, store, conversation, "Đăng ký sân giúp mình")
    )

    # No lastVenueResults to target -> falls through to a fresh search,
    # which asks a clarifying question (missing sport) rather than booking
    # or fabricating a venue.
    assert result["clarifyingQuestion"] is not None
    assert result.get("bookingHandoff") is None
