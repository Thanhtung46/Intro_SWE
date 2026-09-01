"""Redis-backed Conversation/Message/PendingAction storage.

Per research.md decision 4: conversation state is short-lived and
disposable, so it lives entirely in Redis (already provisioned in the
stack) rather than a new Postgres schema. Per data-model.md, a
Conversation is always scoped to the player that created it — this module
enforces that scoping so a conversation is never readable/writable by a
different player (see `OwnershipError`).
"""

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import redis.asyncio as redis

from app.config import settings

_KEY_PREFIX = "assistant:conversation:"


class OwnershipError(Exception):
    """Raised when a conversation is accessed by a player who doesn't own it."""


def _key(conversation_id: str) -> str:
    return f"{_KEY_PREFIX}{conversation_id}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ConversationStore:
    def __init__(self, redis_url: Optional[str] = None) -> None:
        self._redis = redis.from_url(redis_url or settings.redis_url, decode_responses=True)

    async def close(self) -> None:
        await self._redis.aclose()

    async def _read(self, conversation_id: str) -> Optional[dict[str, Any]]:
        raw = await self._redis.get(_key(conversation_id))
        if raw is None:
            return None
        return json.loads(raw)

    async def _write(self, conversation: dict[str, Any]) -> None:
        conversation["updatedAt"] = _now_iso()
        await self._redis.set(
            _key(conversation["conversationId"]),
            json.dumps(conversation),
            ex=settings.conversation_ttl_seconds,
        )

    async def get_for_player(
        self, conversation_id: str, player_user_id: str
    ) -> Optional[dict[str, Any]]:
        """Returns the conversation, or None if it doesn't exist (or expired).

        Raises OwnershipError if it exists but belongs to a different player.
        """
        conversation = await self._read(conversation_id)
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
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        }
        await self._write(conversation)
        return conversation

    async def append_message(
        self,
        conversation: dict[str, Any],
        role: str,
        text: str,
        input_mode: Optional[str] = None,
    ) -> dict[str, Any]:
        message = {
            "role": role,
            "inputMode": input_mode,
            "text": text,
            "timestamp": _now_iso(),
        }
        conversation["messages"].append(message)
        if len(conversation["messages"]) > settings.max_history_messages:
            conversation["messages"] = conversation["messages"][
                -settings.max_history_messages :
            ]
        await self._write(conversation)
        return message

    async def set_last_interpreted_request(
        self, conversation: dict[str, Any], interpreted_request: dict[str, Any]
    ) -> None:
        conversation["lastInterpretedRequest"] = interpreted_request
        await self._write(conversation)

    async def set_last_results(
        self, conversation: dict[str, Any], results: list[dict[str, Any]]
    ) -> None:
        """Remembers the most recently shown search results so a follow-up
        like "join the first one" can be resolved to a matchId (used by
        propose_action, US2) — not part of data-model.md's formal entities,
        it's short-lived working state scoped to the same conversation
        record."""
        conversation["lastResults"] = results
        await self._write(conversation)

    async def set_pending_action(
        self,
        conversation: dict[str, Any],
        *,
        action_type: str,
        match_id: Optional[int],
        summary: dict[str, Any],
    ) -> dict[str, Any]:
        expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=settings.pending_action_ttl_seconds
        )
        pending_action = {
            "actionId": str(uuid.uuid4()),
            "type": action_type,
            "matchId": match_id,
            "summary": summary,
            "state": "awaiting_confirmation",
            "expiresAt": expires_at.isoformat(),
        }
        conversation["pendingAction"] = pending_action
        await self._write(conversation)
        return pending_action

    def get_active_pending_action(
        self, conversation: dict[str, Any]
    ) -> Optional[dict[str, Any]]:
        """Returns the pending action if present and not yet expired.

        A pending action past its expiresAt is treated as absent (spec edge
        case: abandoning confirmation mid-way results in nothing being
        booked) — this does not mutate storage, callers that transition
        state should call `clear_pending_action` afterwards.
        """
        pending_action = conversation.get("pendingAction")
        if pending_action is None:
            return None
        if pending_action["state"] != "awaiting_confirmation":
            return None
        expires_at = datetime.fromisoformat(pending_action["expiresAt"])
        if datetime.now(timezone.utc) >= expires_at:
            return None
        return pending_action

    async def resolve_pending_action(
        self, conversation: dict[str, Any], state: str
    ) -> None:
        """Transitions the current pending action to a terminal state and
        clears it from the conversation (data-model.md: transitions are
        one-way; a new proposal starts fresh)."""
        if conversation.get("pendingAction") is not None:
            conversation["pendingAction"]["state"] = state
        conversation["pendingAction"] = None
        await self._write(conversation)

    async def delete(self, conversation_id: str) -> None:
        await self._redis.delete(_key(conversation_id))


_store: Optional[ConversationStore] = None


def get_store() -> ConversationStore:
    global _store
    if _store is None:
        _store = ConversationStore()
    return _store
