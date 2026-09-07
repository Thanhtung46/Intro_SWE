"""Conversation turn orchestration.

`handle_message` is the single entry point the router calls for both text
and (once transcribed) voice turns. It dispatches between running a search
(`interpret_and_search`, spec 003 US1 / spec 007 P2), proposing a join/host
action (`propose_action`) or a venue booking hand-off
(`propose_venue_booking`, spec 007 P3), and confirming/cancelling a pending
kèo-join action (`confirm_action`), based on whether a `pendingAction` is
currently awaiting confirmation and whether the player's message refers to
one of the last shown kèo or venue results.
"""

from typing import Any, Optional

from services import interpretation
from services.backend_client import BackendClient, BackendConflictError
from services.conversation_store import ConversationStore
from services.date_parse import normalize_date
from services.geo import get_catalog
from services.llm_client import LLMClient
from services.time_parse import normalize_time

OFF_TOPIC_REPLY = (
    "Mình chỉ hỗ trợ tìm/tham gia kèo hoặc tìm sân trống để đặt thôi. Bạn "
    "thử hỏi về sân bãi hoặc lịch chơi xem sao nhé!"
)

# Results are capped this way for both kèo and venue replies (spec 007
# FR-001/FR-007) — the player sees the 3 best options, in whatever
# best-first order the underlying search already returns (research.md
# decision 4 under specs/007-assistant-venue-search/), never more, never
# padded when fewer exist.
MAX_RESULTS_SHOWN = 3

# Default session length (spec 007 research.md decision 2) applied when the
# player only gave a starting time ("sau 7h") and never an end time — 1
# hour matches the platform's own minimum kèo duration and slot size.
DEFAULT_VENUE_SEARCH_WINDOW_HOURS = 1

_CLARIFYING_QUESTIONS = {
    "sport": "Bạn muốn tìm sân cầu lông hay bóng đá vậy?",
    "searchKind": "Bạn muốn tìm sân trống để đặt, hay tìm kèo có sẵn để tham gia?",
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


async def _normalize_criteria(
    backend: BackendClient, interpreted_request: dict[str, Any], message_text: str
) -> None:
    """Rewrites `date`/`timeFrom`/`timeTo` to the exact shapes spot-backend's
    `GET /matches` requires and `province`/`city` to GSO codes, in place —
    so it never sees Gemini's raw free-text extraction (e.g. "tối nay",
    "7h", "Quận 7"). See services/date_parse.py, services/time_parse.py,
    and services/geo.py."""
    interpreted_request["date"] = normalize_date(interpreted_request.get("date"))
    interpreted_request["timeFrom"] = normalize_time(
        interpreted_request.get("timeFrom"), message_text
    )
    interpreted_request["timeTo"] = normalize_time(
        interpreted_request.get("timeTo"), message_text
    )

    province_raw = interpreted_request.get("province")
    city_raw = interpreted_request.get("city")
    if province_raw or city_raw:
        province_code, city_code = await get_catalog().resolve(
            backend, province_raw, city_raw
        )
        interpreted_request["province"] = province_code
        interpreted_request["city"] = city_code


def _search_params(interpreted_request: dict[str, Any]) -> dict[str, Any]:
    return {
        field: interpreted_request.get(field)
        for field in interpretation.CRITERIA_FIELDS
        if field != "searchKind"  # spot-backend endpoints don't take this
    }


def _venue_search_params(interpreted_request: dict[str, Any]) -> dict[str, Any]:
    """Same criteria `_search_params()` sends, plus a synthesized `timeFrom`
    or `timeTo` when only one bound was given — `GET /venues`' availability
    filter only activates when `date`+`timeFrom`+`timeTo` are ALL present
    (spot-backend venue.repository.js `hasAvailability`); leaving either one
    null doesn't widen the window, it silently disables filtering entirely
    and returns venues with no regard to the requested time at all (spec 007
    research.md decision 2). Handles both directions: "sau 7h" (timeFrom
    only) gets a synthesized end 1h later; "trước 7h" (timeTo only) gets a
    synthesized start 1h earlier.

    A single-bound phrase like "trước 7h tối nay" doesn't always come out of
    Gemini's extraction as *only* `timeTo` — in production it has been
    observed to fill BOTH `timeFrom` and `timeTo` with the same normalized
    "19:00", producing a zero-width window spot-backend's DTO rejects
    outright (`timeTo` must be strictly greater than `timeFrom`), which
    surfaced as a 500 on every message in that conversation. Treat an
    already-equal pair the same as a lone `timeTo`: widen the start back by
    the default window instead of forwarding an impossible range."""
    params = _search_params(interpreted_request)
    if params.get("timeFrom") and not params.get("timeTo"):
        hour, minute = (int(part) for part in params["timeFrom"].split(":"))
        end_hour = (hour + DEFAULT_VENUE_SEARCH_WINDOW_HOURS) % 24
        params["timeTo"] = f"{end_hour:02d}:{minute:02d}"
    elif params.get("timeTo") and not params.get("timeFrom"):
        hour, minute = (int(part) for part in params["timeTo"].split(":"))
        start_hour = (hour - DEFAULT_VENUE_SEARCH_WINDOW_HOURS) % 24
        params["timeFrom"] = f"{start_hour:02d}:{minute:02d}"
    elif (
        params.get("timeFrom")
        and params.get("timeTo")
        and params["timeFrom"] == params["timeTo"]
    ):
        hour, minute = (int(part) for part in params["timeTo"].split(":"))
        start_hour = (hour - DEFAULT_VENUE_SEARCH_WINDOW_HOURS) % 24
        params["timeFrom"] = f"{start_hour:02d}:{minute:02d}"
    return params


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


def _to_venue_result(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "venueId": item.get("venueId"),
        "venueName": item.get("name"),
        "address": item.get("address"),
        "priceFromPerHour": item.get("priceFromPerHour"),
    }


def _venue_results_reply_text(venue_results: list[dict[str, Any]]) -> str:
    if not venue_results:
        return (
            "Mình không tìm thấy sân trống phù hợp. Bạn thử nới lỏng khung "
            "giờ hoặc khu vực xem sao nhé."
        )
    return f"Mình tìm được {len(venue_results)} sân còn trống."


async def interpret_and_search(
    llm: LLMClient,
    backend: BackendClient,
    store: ConversationStore,
    conversation: dict[str, Any],
    message_text: str,
) -> dict[str, Any]:
    """Runs the search flow: extract criteria, ask a clarifying question if
    something required is still missing (including which kind of search —
    spec 007 FR-003), otherwise run a kèo or venue search and return up to
    the 3 best results (spec 007 FR-001/FR-007)."""
    extraction = await llm.extract_message_criteria(
        conversation["messages"], message_text
    )

    if extraction["scope"] == "off_topic":
        return {
            "text": OFF_TOPIC_REPLY,
            "results": None,
            "venueResults": None,
            "clarifyingQuestion": None,
        }

    interpreted_request = interpretation.build_interpreted_request(
        conversation.get("lastInterpretedRequest"), extraction["criteria_delta"]
    )
    await _normalize_criteria(backend, interpreted_request, message_text)
    await store.set_last_interpreted_request(conversation, interpreted_request)

    if interpreted_request["missingRequiredFields"]:
        question = _clarifying_question(interpreted_request["missingRequiredFields"])
        return {
            "text": question,
            "results": None,
            "venueResults": None,
            "clarifyingQuestion": question,
        }

    if interpreted_request["searchKind"] == "venue":
        venues = await backend.search_venues(_venue_search_params(interpreted_request))
        venue_results = [_to_venue_result(item) for item in venues][:MAX_RESULTS_SHOWN]
        await store.set_last_venue_results(conversation, venue_results)
        await store.set_last_results(conversation, [])
        return {
            "text": _venue_results_reply_text(venue_results),
            "results": None,
            "venueResults": venue_results,
            "clarifyingQuestion": None,
        }

    results = await backend.search_matches(_search_params(interpreted_request))
    match_results = [_to_match_result(item) for item in results][:MAX_RESULTS_SHOWN]
    await store.set_last_results(conversation, match_results)
    await store.set_last_venue_results(conversation, [])
    return {
        "text": _results_reply_text(match_results),
        "results": match_results,
        "venueResults": None,
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


def _booking_handoff_from_venue(
    venue: dict[str, Any], interpreted_request: dict[str, Any]
) -> dict[str, Any]:
    return {
        "venueId": venue["venueId"],
        "venueName": venue["venueName"],
        "date": interpreted_request.get("date"),
        "timeFrom": interpreted_request.get("timeFrom"),
    }


def _booking_confirm_text(
    venue: dict[str, Any], interpreted_request: dict[str, Any]
) -> str:
    date = interpreted_request.get("date")
    time_from = interpreted_request.get("timeFrom")
    when = f" lúc {time_from} ngày {date}" if date and time_from else ""
    return (
        f"Mình sẽ đưa bạn tới trang đặt sân {venue['venueName']}{when} để bạn "
        "xác nhận nhé."
    )


async def propose_venue_booking(
    backend: BackendClient,
    conversation: dict[str, Any],
    venue: dict[str, Any],
) -> dict[str, Any]:
    """Confirms the player's intent to book a previously-shown venue result,
    then hands off to the app's own booking screen — never creates a
    booking itself (spec 007 FR-010). Re-checks availability first so a
    slot someone else just booked in the meantime isn't handed off as if
    still open (spec 007 FR-011, Acceptance Scenario 4)."""
    interpreted_request = conversation.get("lastInterpretedRequest") or {}
    still_open = True
    if interpreted_request.get("date") and interpreted_request.get("timeFrom"):
        current_venues = await backend.search_venues(
            _venue_search_params(interpreted_request)
        )
        still_open = any(
            item.get("venueId") == venue["venueId"] for item in current_venues
        )

    if not still_open:
        return {
            "text": (
                f"Sân {venue['venueName']} vừa có người đặt mất khung giờ đó "
                "rồi. Bạn thử tìm sân khác xem sao nhé."
            ),
            "results": None,
            "venueResults": None,
            "clarifyingQuestion": None,
            "bookingHandoff": None,
        }

    return {
        "text": _booking_confirm_text(venue, interpreted_request),
        "results": None,
        "venueResults": None,
        "clarifyingQuestion": None,
        "bookingHandoff": _booking_handoff_from_venue(venue, interpreted_request),
    }


async def handle_message(
    llm: LLMClient,
    backend: BackendClient,
    store: ConversationStore,
    conversation: dict[str, Any],
    message_text: str,
) -> dict[str, Any]:
    """Entry point for a text turn: routes between confirming/cancelling a
    pending action, proposing a kèo-join or venue-booking hand-off against
    the last shown results, or running a fresh search."""
    pending_action = store.get_active_pending_action(conversation)
    if pending_action is not None:
        intent = await llm.detect_action_intent(
            conversation.get("lastResults", []),
            pending_action,
            message_text,
            venue_results=conversation.get("lastVenueResults", []),
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
    last_venue_results = conversation.get("lastVenueResults") or []
    if last_results or last_venue_results:
        intent = await llm.detect_action_intent(
            last_results, None, message_text, venue_results=last_venue_results
        )
        target_index = intent.get("targetIndex")
        if (
            intent.get("intent") == "propose_join"
            and last_results
            and target_index is not None
            and 0 <= target_index < len(last_results)
        ):
            match_id = last_results[target_index]["matchId"]
            return await propose_action(llm, backend, store, conversation, match_id)
        if (
            intent.get("intent") == "propose_book"
            and last_venue_results
            and target_index is not None
            and 0 <= target_index < len(last_venue_results)
        ):
            venue = last_venue_results[target_index]
            return await propose_venue_booking(backend, conversation, venue)

    return await interpret_and_search(llm, backend, store, conversation, message_text)
