"""Gemini wrapper for language understanding.

Per research.md decision 3, all text/voice understanding goes through a
single Gemini model (google-generativeai, locked in PROJECT_RULES.md) —
voice reuses the same interpretation pipeline as text via Gemini's
multimodal input (see `transcribe_and_interpret`, added alongside the voice
story). Every call is wrapped with a short timeout so a slow/unavailable
provider surfaces as `LLMTimeoutError` well within the SC-005 ~5s budget,
rather than hanging the request.
"""

import asyncio
import json
from typing import Any, Optional

import google.generativeai as genai

from app.config import settings

MODEL_NAME = "gemini-2.5-flash"

_EXTRACTION_INSTRUCTIONS = """
You are the search-criteria extractor for a Vietnamese sports-pitch pickup-match
(kèo) assistant. Given the player's latest message, return ONLY a JSON object
(no prose) with these fields, extracting only what THIS message states (leave
a field null if the message doesn't mention it — a separate deterministic
merge step combines this with previously known criteria, so do not guess or
carry over values yourself):

{
  "sport": "BADMINTON" | "FOOTBALL" | null,
  "province": string | null,
  "city": string | null,
  "date": string | null,
  "timeFrom": string | null,
  "timeTo": string | null,
  "skill": [string] | null,
  "priceMin": number | null,
  "priceMax": number | null,
  "scope": "search" | "off_topic"
}

Extraction rules for each field — extract the RAW phrase as the player said
it, do not reformat or convert it yourself (a separate deterministic step
does that):
- "province"/"city": if the message names ANY place (a district/quận,
  ward/phường, city/thành phố, or province/tỉnh — e.g. "quận 7", "hà nội",
  "q1", "thủ đức"), you MUST fill the most specific one into "city" (and the
  broader one into "province" only if BOTH are mentioned). Never leave both
  null when a place name appears in the message.
- "date": copy the player's own words for when they want to play (e.g. "tối
  nay", "ngày mai", "thứ 7 này") verbatim — do not compute a calendar date.
- "timeFrom"/"timeTo": copy the player's own words for the time (e.g. "7h",
  "19h30", "sau 7 giờ tối") verbatim — do not convert to HH:mm yourself.

Set "scope" to "off_topic" if the message is not about finding, joining, or
hosting a pickup match/kèo (e.g. small talk, unrelated requests).
"""

_TRANSCRIPTION_INSTRUCTIONS = """
Transcribe this Vietnamese voice message from a player talking to a sports
pickup-match (kèo) assistant. Return ONLY a JSON object:

{
  "transcript": string,
  "confidence": number
}

"confidence" is your own estimate from 0.0 to 1.0 of how sure you are the
transcript is accurate (low for unclear audio, background noise, or an
unintelligible recording).
"""

_JOIN_INTENT_INSTRUCTIONS = """
You are deciding whether the player's message expresses intent to join or
host a specific kèo from the list already shown to them, or intent to
confirm/cancel a pending action. Return ONLY a JSON object:

{
  "intent": "propose_join" | "confirm" | "cancel" | "other",
  "targetIndex": number | null
}

"targetIndex" is the 0-based index into the shown results the player is
referring to (for "propose_join"), or null otherwise. Use "confirm" only for
a clear affirmative reply to a pending confirmation; use "cancel" for a
clear negative/backing-out reply; use "other" for anything else (including a
brand new search).
"""


class LLMTimeoutError(Exception):
    """Raised when a Gemini call doesn't return within the configured budget."""


class LLMClient:
    def __init__(self, api_key: Optional[str] = None) -> None:
        genai.configure(api_key=api_key or settings.gemini_api_key)
        self._model = genai.GenerativeModel(MODEL_NAME)

    async def _generate_json(self, parts: list[Any]) -> dict[str, Any]:
        try:
            response = await asyncio.wait_for(
                self._model.generate_content_async(
                    parts,
                    generation_config={"response_mime_type": "application/json"},
                ),
                timeout=settings.llm_timeout_seconds,
            )
        except asyncio.TimeoutError as exc:
            raise LLMTimeoutError("Gemini request timed out") from exc
        return json.loads(response.text)

    def _history_text(self, messages: list[dict[str, Any]]) -> str:
        return "\n".join(
            f"{m['role']}: {m['text']}" for m in messages[-10:]
        )

    async def extract_message_criteria(
        self,
        messages: list[dict[str, Any]],
        new_message_text: str,
    ) -> dict[str, Any]:
        """Returns the criteria fields THIS message states (deltas only,
        unmentioned fields null) plus a "scope" hint. Merging these deltas
        onto the conversation's previously known criteria, and computing
        `missingRequiredFields`, is a separate deterministic step (see
        services/interpretation.py) — kept out of the model so that
        behavior is guaranteed by code, not prompt-dependent model output.
        """
        prompt = (
            _EXTRACTION_INSTRUCTIONS
            + f"\nConversation so far:\n{self._history_text(messages)}"
            + f"\nPlayer's latest message: {new_message_text}"
        )
        raw = await self._generate_json([prompt])
        scope = raw.pop("scope", "search")
        return {"criteria_delta": raw, "scope": scope}

    async def detect_action_intent(
        self,
        results: list[dict[str, Any]],
        pending_action: Optional[dict[str, Any]],
        message_text: str,
    ) -> dict[str, Any]:
        prompt = (
            _JOIN_INTENT_INSTRUCTIONS
            + f"\nShown results: {json.dumps(results)}"
            + f"\nPending action: {json.dumps(pending_action)}"
            + f"\nPlayer's message: {message_text}"
        )
        return await self._generate_json([prompt])

    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> dict[str, Any]:
        """Transcribes a voice message via Gemini's multimodal audio input
        (research.md decision 3 — no separate speech-to-text service).
        Returns {"transcript": str, "confidence": float}; the router treats
        a low-confidence result as "ask the player to repeat or type"
        rather than acting on an unreliable guess (spec User Story 3,
        Acceptance Scenario 2)."""
        audio_part = {"mime_type": mime_type, "data": audio_bytes}
        return await self._generate_json([_TRANSCRIPTION_INSTRUCTIONS, audio_part])


_client: Optional[LLMClient] = None


def get_client() -> LLMClient:
    global _client
    if _client is None:
        _client = LLMClient()
    return _client
