import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")

import uuid

from fastapi.testclient import TestClient

import app.routers.conversation as conversation_module
from app.main import app
from app.security import settings as security_settings
from services.backend_client import BackendConflictError
from services.llm_client import LLMTimeoutError

client = TestClient(app)

INTERNAL_KEY = "unit-test-internal-key"


class FakeLLM:
    def __init__(self, responses=None, intent_responses=None, transcribe_response=None):
        self._responses = list(responses or [])
        self._intent_responses = list(intent_responses or [])
        self._transcribe_response = transcribe_response

    async def extract_message_criteria(self, messages, text):
        response = self._responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    async def detect_action_intent(self, results, pending_action, text):
        return self._intent_responses.pop(0)

    async def transcribe(self, audio_bytes, mime_type):
        if isinstance(self._transcribe_response, Exception):
            raise self._transcribe_response
        return self._transcribe_response


class FakeBackend:
    def __init__(self, items=None, match=None, join_exception=None):
        self._items = items if items is not None else []
        self._match = match or {}
        self._join_exception = join_exception

    async def search_matches(self, criteria):
        return self._items

    async def get_match(self, match_id):
        return self._match

    async def join_match(self, match_id, body=None):
        if self._join_exception is not None:
            raise self._join_exception
        return {}

    async def get_geo_vn(self):
        return {"provinces": []}

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None


def _headers(token, internal_key=INTERNAL_KEY):
    return {
        "X-Internal-Service-Key": internal_key,
        "X-Player-Access-Token": token,
    }


def setup_function():
    security_settings.internal_service_key = INTERNAL_KEY


def _patch(
    monkeypatch,
    fake_store,
    llm_responses=None,
    backend_items=None,
    intent_responses=None,
    match=None,
    join_exception=None,
    transcribe_response=None,
):
    monkeypatch.setattr(conversation_module, "get_store", lambda: fake_store)
    monkeypatch.setattr(
        conversation_module,
        "get_client",
        lambda: FakeLLM(llm_responses, intent_responses, transcribe_response),
    )
    monkeypatch.setattr(
        conversation_module,
        "BackendClient",
        lambda token: FakeBackend(backend_items, match, join_exception),
    )


def test_well_formed_request_returns_results(monkeypatch, fake_store, player_access_token):
    _patch(
        monkeypatch,
        fake_store,
        [{"criteria_delta": {"sport": "BADMINTON"}, "scope": "search"}],
        backend_items=[
            {
                "matchId": 101,
                "title": "Cầu lông giao lưu",
                "venueName": "Sân ABC",
                "startsAt": "2026-08-19T19:30:00+07:00",
                "spotsLeft": 2,
            }
        ],
    )

    conversation_id = str(uuid.uuid4())
    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Tìm sân cầu lông ở Quận 7 tối nay"},
        headers=_headers(player_access_token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"]["results"] == [
        {
            "matchId": 101,
            "title": "Cầu lông giao lưu",
            "venueName": "Sân ABC",
            "startsAt": "2026-08-19T19:30:00+07:00",
            "spotsLeft": 2,
        }
    ]
    assert body["reply"]["clarifyingQuestion"] is None


def test_missing_sport_returns_clarifying_question(
    monkeypatch, fake_store, player_access_token
):
    _patch(
        monkeypatch,
        fake_store,
        [{"criteria_delta": {"province": "79"}, "scope": "search"}],
    )

    conversation_id = str(uuid.uuid4())
    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Tìm sân ở Quận 7 tối nay"},
        headers=_headers(player_access_token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"]["clarifyingQuestion"] is not None
    assert body["reply"]["results"] is None


def test_zero_results_explains_and_suggests_loosening(
    monkeypatch, fake_store, player_access_token
):
    _patch(
        monkeypatch,
        fake_store,
        [{"criteria_delta": {"sport": "FOOTBALL"}, "scope": "search"}],
        backend_items=[],
    )

    conversation_id = str(uuid.uuid4())
    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Tìm sân bóng đá"},
        headers=_headers(player_access_token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"]["results"] == []
    assert "không tìm thấy" in body["reply"]["text"]


def test_off_topic_message_declines_gracefully(
    monkeypatch, fake_store, player_access_token
):
    _patch(
        monkeypatch,
        fake_store,
        [{"criteria_delta": {}, "scope": "off_topic"}],
    )

    conversation_id = str(uuid.uuid4())
    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Hủy đăng ký gói cước giúp mình"},
        headers=_headers(player_access_token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"]["results"] is None
    assert body["reply"]["clarifyingQuestion"] is None


def test_llm_timeout_returns_503_within_budget(
    monkeypatch, fake_store, player_access_token
):
    _patch(monkeypatch, fake_store, [LLMTimeoutError("timed out")])

    conversation_id = str(uuid.uuid4())
    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Tìm sân cầu lông"},
        headers=_headers(player_access_token),
    )

    assert response.status_code == 503
    assert "temporarily unavailable" in response.json()["error"]


def test_missing_internal_service_key_is_401(player_access_token):
    conversation_id = str(uuid.uuid4())
    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Tìm sân cầu lông"},
        headers={"X-Player-Access-Token": player_access_token},
    )

    assert response.status_code == 401


def test_get_history_returns_empty_for_unknown_conversation(
    monkeypatch, fake_store, player_access_token
):
    monkeypatch.setattr(conversation_module, "get_store", lambda: fake_store)

    response = client.get(
        f"/conversations/{uuid.uuid4()}",
        headers=_headers(player_access_token),
    )

    assert response.status_code == 200
    assert response.json()["messages"] == []


def test_propose_then_confirm_join_succeeds(
    monkeypatch, fake_store, player_access_token
):
    conversation_id = str(uuid.uuid4())

    # Turn 1: search, so lastResults is populated.
    _patch(
        monkeypatch,
        fake_store,
        llm_responses=[{"criteria_delta": {"sport": "BADMINTON"}, "scope": "search"}],
        backend_items=[
            {
                "matchId": 101,
                "title": "Cầu lông giao lưu",
                "venueName": "Sân ABC",
                "startsAt": "2026-08-19T19:30:00+07:00",
                "spotsLeft": 2,
            }
        ],
    )
    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Tìm sân cầu lông"},
        headers=_headers(player_access_token),
    )

    # Turn 2: propose joining the first result.
    _patch(
        monkeypatch,
        fake_store,
        intent_responses=[{"intent": "propose_join", "targetIndex": 0}],
        match={"venueName": "Sân ABC", "startsAt": "2026-08-19T19:30:00+07:00", "spotsLeft": 2, "status": "OPEN"},
    )
    propose_response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Tham gia sân đầu tiên đi"},
        headers=_headers(player_access_token),
    )

    assert propose_response.status_code == 200
    pending_action = propose_response.json()["reply"]["pendingAction"]
    assert pending_action is not None
    assert pending_action["state"] == "awaiting_confirmation"

    # Turn 3: confirm.
    _patch(
        monkeypatch,
        fake_store,
        intent_responses=[{"intent": "confirm"}],
        match={"status": "OPEN", "spotsLeft": 2},
    )
    confirm_response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Đồng ý"},
        headers=_headers(player_access_token),
    )

    assert confirm_response.status_code == 200
    assert confirm_response.json()["reply"]["pendingAction"] is None


def test_confirm_after_target_became_unavailable_returns_409_with_alternative(
    monkeypatch, fake_store, player_access_token
):
    conversation_id = str(uuid.uuid4())
    conversation = {
        "conversationId": conversation_id,
        "playerUserId": "42",
        "messages": [],
        "lastInterpretedRequest": {"sport": "BADMINTON", "missingRequiredFields": []},
        "lastResults": [{"matchId": 101, "title": "A", "venueName": "Sân ABC", "startsAt": "t", "spotsLeft": 0}],
        "pendingAction": {
            "actionId": "action-1",
            "type": "JOIN_MATCH",
            "matchId": 101,
            "summary": {"venueName": "Sân ABC"},
            "state": "awaiting_confirmation",
            "expiresAt": "2999-01-01T00:00:00+00:00",
        },
        "createdAt": "now",
        "updatedAt": "now",
    }
    fake_store._conversations[conversation_id] = conversation

    _patch(
        monkeypatch,
        fake_store,
        intent_responses=[{"intent": "confirm"}],
        match={"status": "FULL", "spotsLeft": 0},
        backend_items=[
            {"matchId": 202, "title": "B", "venueName": "Sân XYZ", "startsAt": "u", "spotsLeft": 1}
        ],
    )

    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Đồng ý"},
        headers=_headers(player_access_token),
    )

    assert response.status_code == 409
    body = response.json()
    assert body["alternative"]["matchId"] == 202


def test_confirm_when_join_call_itself_conflicts_returns_409(
    monkeypatch, fake_store, player_access_token
):
    conversation_id = str(uuid.uuid4())
    conversation = {
        "conversationId": conversation_id,
        "playerUserId": "42",
        "messages": [],
        "lastInterpretedRequest": None,
        "lastResults": [],
        "pendingAction": {
            "actionId": "action-1",
            "type": "JOIN_MATCH",
            "matchId": 101,
            "summary": {"venueName": "Sân ABC"},
            "state": "awaiting_confirmation",
            "expiresAt": "2999-01-01T00:00:00+00:00",
        },
        "createdAt": "now",
        "updatedAt": "now",
    }
    fake_store._conversations[conversation_id] = conversation

    _patch(
        monkeypatch,
        fake_store,
        intent_responses=[{"intent": "confirm"}],
        match={"status": "OPEN", "spotsLeft": 1},
        join_exception=BackendConflictError("Already joined."),
    )

    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"inputMode": "text", "text": "Đồng ý"},
        headers=_headers(player_access_token),
    )

    assert response.status_code == 409
    assert response.json()["error"] == "Already joined."


def test_voice_message_high_confidence_matches_equivalent_text_flow(
    monkeypatch, fake_store, player_access_token
):
    _patch(
        monkeypatch,
        fake_store,
        llm_responses=[{"criteria_delta": {"sport": "BADMINTON"}, "scope": "search"}],
        backend_items=[
            {
                "matchId": 101,
                "title": "Cầu lông giao lưu",
                "venueName": "Sân ABC",
                "startsAt": "2026-08-19T19:30:00+07:00",
                "spotsLeft": 2,
            }
        ],
        transcribe_response={"transcript": "Tìm sân cầu lông", "confidence": 0.9},
    )

    conversation_id = str(uuid.uuid4())
    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={
            "inputMode": "voice",
            "audio": "ZmFrZS1hdWRpby1ieXRlcw==",
            "audioMimeType": "audio/webm",
        },
        headers=_headers(player_access_token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"]["transcript"] == "Tìm sân cầu lông"
    assert len(body["reply"]["results"]) == 1


def test_voice_message_low_confidence_asks_to_repeat_and_appends_no_message(
    monkeypatch, fake_store, player_access_token
):
    _patch(
        monkeypatch,
        fake_store,
        transcribe_response={"transcript": "??", "confidence": 0.1},
    )

    conversation_id = str(uuid.uuid4())
    response = client.post(
        f"/conversations/{conversation_id}/messages",
        json={
            "inputMode": "voice",
            "audio": "ZmFrZS1hdWRpby1ieXRlcw==",
            "audioMimeType": "audio/webm",
        },
        headers=_headers(player_access_token),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"]["clarifyingQuestion"] is not None
    assert body["reply"]["transcript"] is None

    conversation = fake_store._conversations.get(conversation_id)
    assert conversation is None or conversation["messages"] == []


def test_delete_conversation_is_idempotent(
    monkeypatch, fake_store, player_access_token
):
    monkeypatch.setattr(conversation_module, "get_store", lambda: fake_store)

    response = client.delete(
        f"/conversations/{uuid.uuid4()}",
        headers=_headers(player_access_token),
    )

    assert response.status_code == 204
