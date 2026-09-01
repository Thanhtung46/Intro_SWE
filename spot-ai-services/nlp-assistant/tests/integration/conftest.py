import base64
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import pytest

from services.conversation_store import OwnershipError


def make_player_access_token(user_id: str = "42") -> str:
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": user_id}).encode()
    ).rstrip(b"=")
    return f"header.{payload.decode()}.signature"


class FakeConversationStore:
    """In-memory stand-in for services.conversation_store.ConversationStore,
    same public surface, no real Redis — keeps integration tests fast and
    hermetic."""

    def __init__(self) -> None:
        self._conversations: dict[str, dict[str, Any]] = {}

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    async def get_for_player(
        self, conversation_id: str, player_user_id: str
    ) -> Optional[dict[str, Any]]:
        conversation = self._conversations.get(conversation_id)
        if conversation is None:
            return None
        if conversation["playerUserId"] != player_user_id:
            raise OwnershipError(conversation_id)
        return conversation

    async def get_or_create(
        self, conversation_id: str, player_user_id: str
    ) -> dict[str, Any]:
        conversation = await self.get_for_player(conversation_id, player_user_id)
        if conversation is not None:
            return conversation
        conversation = {
            "conversationId": conversation_id,
            "playerUserId": player_user_id,
            "messages": [],
            "lastInterpretedRequest": None,
            "lastResults": [],
            "pendingAction": None,
            "createdAt": self._now_iso(),
            "updatedAt": self._now_iso(),
        }
        self._conversations[conversation_id] = conversation
        return conversation

    async def append_message(
        self, conversation, role, text, input_mode=None
    ) -> dict[str, Any]:
        message = {
            "role": role,
            "inputMode": input_mode,
            "text": text,
            "timestamp": self._now_iso(),
        }
        conversation["messages"].append(message)
        return message

    async def set_last_interpreted_request(self, conversation, interpreted_request):
        conversation["lastInterpretedRequest"] = interpreted_request

    async def set_last_results(self, conversation, results):
        conversation["lastResults"] = results

    async def set_pending_action(
        self, conversation, *, action_type, match_id, summary
    ) -> dict[str, Any]:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        pending_action = {
            "actionId": "action-1",
            "type": action_type,
            "matchId": match_id,
            "summary": summary,
            "state": "awaiting_confirmation",
            "expiresAt": expires_at.isoformat(),
        }
        conversation["pendingAction"] = pending_action
        return pending_action

    def get_active_pending_action(self, conversation) -> Optional[dict[str, Any]]:
        pending_action = conversation.get("pendingAction")
        if pending_action is None or pending_action["state"] != "awaiting_confirmation":
            return None
        expires_at = datetime.fromisoformat(pending_action["expiresAt"])
        if datetime.now(timezone.utc) >= expires_at:
            return None
        return pending_action

    async def resolve_pending_action(self, conversation, state):
        if conversation.get("pendingAction") is not None:
            conversation["pendingAction"]["state"] = state
        conversation["pendingAction"] = None

    async def delete(self, conversation_id: str) -> None:
        self._conversations.pop(conversation_id, None)


@pytest.fixture
def fake_store():
    return FakeConversationStore()


@pytest.fixture
def player_access_token():
    return make_player_access_token()
