"""Conversation turn orchestration.

`handle_message` is the single entry point the router calls for both text
and (once transcribed) voice turns. It dispatches between running a search
(`interpret_and_search`, US1), proposing a join/host action
(`propose_action`), and confirming/cancelling a pending one
(`confirm_action`, both US2), based on whether a `pendingAction` is
currently awaiting confirmation and whether the player's message refers to
one of the last shown results.
"""

from typing import Any, Optional

from services import interpretation
from services.backend_client import BackendClient, BackendConflictError
from services.conversation_store import ConversationStore
from services.llm_client import LLMClient

OFF_TOPIC_REPLY = (
    "Mình chỉ hỗ trợ tìm và tham gia kèo thôi. Bạn thử hỏi về sân bãi hoặc "
    "lịch chơi xem sao nhé!"
)

_CLARIFYING_QUESTIONS = {
    "sport": "Bạn muốn tìm sân cầu lông hay bóng đá vậy?",
}


class ActionConflictError(Exception):
    """Raised when a pending action can no longer be finalized because its
    target changed since it was proposed (spec User Story 2, Acceptance
    Scenario 3) — the router maps this to a 409 with an alternative."""

    def __init__(self, message: str, alternative: Optional[dict[str, Any]]) -> None:
        super().__init__(message)
        self.message = message
        self.alternative = alternative


def _clarifying_question(missing_fields: list[str]) -> str:
    field = missing_fields[0]
    return _CLARIFYING_QUESTIONS.get(
        field, f"Bạn cho mình biết thêm về {field} nhé?"
    )


def _search_params(interpreted_request: dict[str, Any]) -> dict[str, Any]:
    return {
        field: interpreted_request.get(field)
        for field in interpretation.CRITERIA_FIELDS
    }


def _to_match_result(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "matchId": item.get("matchId") or item.get("id"),
        "title": item.get("title"),
        "venueName": item.get("venueName"),
        "startsAt": item.get("startsAt"),
        "spotsLeft": item.get("spotsLeft"),
    }


def _results_reply_text(results: list[dict[str, Any]]) -> str:
    if not results:
        return (
            "Mình không tìm thấy kèo phù hợp. Bạn thử nới lỏng khung giờ "
            "hoặc khu vực xem sao nhé."
        )
    return f"Mình tìm được {len(results)} kèo phù hợp."


async def interpret_and_search(
    llm: LLMClient,
    backend: BackendClient,
    store: ConversationStore,
    conversation: dict[str, Any],
    message_text: str,
) -> dict[str, Any]:
    """Runs the US1 flow: extract criteria, ask a clarifying question if
    something required is still missing, otherwise search and return
    results (spec FR-002/FR-003)."""
    extraction = await llm.extract_message_criteria(
        conversation["messages"], message_text
    )

    if extraction["scope"] == "off_topic":
        return {"text": OFF_TOPIC_REPLY, "results": None, "clarifyingQuestion": None}

    interpreted_request = interpretation.build_interpreted_request(
        conversation.get("lastInterpretedRequest"), extraction["criteria_delta"]
    )
    await store.set_last_interpreted_request(conversation, interpreted_request)

    if interpreted_request["missingRequiredFields"]:
        return {
            "text": _clarifying_question(interpreted_request["missingRequiredFields"]),
            "results": None,
            "clarifyingQuestion": _clarifying_question(
                interpreted_request["missingRequiredFields"]
            ),
        }

    results = await backend.search_matches(_search_params(interpreted_request))
    match_results = [_to_match_result(item) for item in results]
    await store.set_last_results(conversation, match_results)
    return {
        "text": _results_reply_text(match_results),
        "results": match_results,
        "clarifyingQuestion": None,
    }


def _summary_from_match(match: dict[str, Any]) -> dict[str, Any]:
    return {
        "venueName": match.get("venueName"),
        "startsAt": match.get("startsAt"),
        "price": match.get("yourShare") or match.get("priceMin"),
        "spotsLeft": match.get("spotsLeft"),
    }


def _propose_reply_text(summary: dict[str, Any]) -> str:
    return (
        f"Xác nhận tham gia kèo tại {summary.get('venueName')} lúc "
        f"{summary.get('startsAt')}, còn {summary.get('spotsLeft')} chỗ nhé?"
    )


async def propose_action(
    llm: LLMClient,
    backend: BackendClient,
    store: ConversationStore,
    conversation: dict[str, Any],
    match_id: int,
) -> dict[str, Any]:
    """Proposes joining a specific, previously-shown match. The summary is
    re-derived from a fresh backend read (not the cached search result) so
    it reflects live availability at proposal time (data-model.md
    PendingAction validation rule)."""
    match = await backend.get_match(match_id)
    summary = _summary_from_match(match)
    pending_action = await store.set_pending_action(
        conversation, action_type="JOIN_MATCH", match_id=match_id, summary=summary
    )
    return {
        "text": _propose_reply_text(summary),
        "results": None,
        "pendingAction": pending_action,
        "clarifyingQuestion": None,
    }


async def confirm_action(
    llm: LLMClient,
    backend: BackendClient,
    store: ConversationStore,
    conversation: dict[str, Any],
    pending_action: dict[str, Any],
) -> dict[str, Any]:
    """Re-verifies the target is still available, then finalizes the join
    (FR-006/FR-012/FR-007/FR-008; research.md decision 5's state machine)."""
    match_id = pending_action["matchId"]
    fresh_match = await backend.get_match(match_id)
    spots_left = fresh_match.get("spotsLeft")
    still_open = fresh_match.get("status", "OPEN") == "OPEN" and (
        spots_left is None or spots_left > 0
    )

    if not still_open:
        await store.resolve_pending_action(conversation, "cancelled")
        alternative_matches = await backend.search_matches(
            _search_params(conversation.get("lastInterpretedRequest") or {})
        )
        alternative = None
        for candidate in alternative_matches:
            if (candidate.get("matchId") or candidate.get("id")) != match_id:
                alternative = _to_match_result(candidate)
                break
        raise ActionConflictError("That kèo is no longer available.", alternative)

    try:
        await backend.join_match(match_id)
    except BackendConflictError as exc:
        await store.resolve_pending_action(conversation, "cancelled")
        raise ActionConflictError(exc.message, None) from exc

    await store.resolve_pending_action(conversation, "finalized")
    return {
        "text": "Bạn đã tham gia kèo thành công!",
        "results": None,
        "pendingAction": None,
        "clarifyingQuestion": None,
    }


async def handle_message(
    llm: LLMClient,
    backend: BackendClient,
    store: ConversationStore,
    conversation: dict[str, Any],
    message_text: str,
) -> dict[str, Any]:
    """Entry point for a text turn: routes between confirming/cancelling a
    pending action, proposing a new one against the last shown results, or
    running a fresh search."""
    pending_action = store.get_active_pending_action(conversation)
    if pending_action is not None:
        intent = await llm.detect_action_intent(
            conversation.get("lastResults", []), pending_action, message_text
        )
        if intent.get("intent") == "confirm":
            return await confirm_action(llm, backend, store, conversation, pending_action)
        if intent.get("intent") == "cancel":
            await store.resolve_pending_action(conversation, "cancelled")
            return {
                "text": "Đã hủy yêu cầu tham gia. Bạn cần mình tìm kèo khác không?",
                "results": None,
                "pendingAction": None,
                "clarifyingQuestion": None,
            }
        # "other" — the player has moved on; the stale pending action is
        # cancelled and this turn is treated fresh (data-model.md: any
        # other reply cancels/replaces the pending action).
        await store.resolve_pending_action(conversation, "cancelled")

    last_results = conversation.get("lastResults") or []
    if last_results:
        intent = await llm.detect_action_intent(last_results, None, message_text)
        target_index = intent.get("targetIndex")
        if (
            intent.get("intent") == "propose_join"
            and target_index is not None
            and 0 <= target_index < len(last_results)
        ):
            match_id = last_results[target_index]["matchId"]
            return await propose_action(llm, backend, store, conversation, match_id)

    return await interpret_and_search(llm, backend, store, conversation, message_text)
