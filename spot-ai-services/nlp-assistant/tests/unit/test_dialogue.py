"""Unit tests for the confirm-before-finalize state machine (SC-004):
`finalized` must be reachable only via an `awaiting_confirmation` pending
action with a matching player confirmation — never on any other path.
Redis and the backend are faked so this exercises dialogue.py's control
flow in isolation.
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

    async def set_last_interpreted_request(self, conversation, interpreted_request):
        conversation["lastInterpretedRequest"] = interpreted_request


class FakeBackend:
    def __init__(self, match, join_result=None):
        self._match = match
        self._join_result = join_result or {}
        self.join_called = False

    async def get_match(self, match_id):
        return self._match

    async def join_match(self, match_id, body=None):
        self.join_called = True
        return self._join_result

    async def search_matches(self, criteria):
        return []

    async def get_geo_vn(self):
        return {"provinces": []}


class FakeLLM:
    def __init__(self, intent=None, extraction=None):
        self._intent = intent
        self._extraction = extraction or {"criteria_delta": {}, "scope": "off_topic"}

    async def detect_action_intent(self, results, pending_action, message_text):
        return self._intent

    async def extract_message_criteria(self, messages, message_text):
        return self._extraction


def _conversation(pending_action=None):
    return {
        "conversationId": "c1",
        "playerUserId": "42",
        "messages": [],
        "lastInterpretedRequest": None,
        "lastResults": [],
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
