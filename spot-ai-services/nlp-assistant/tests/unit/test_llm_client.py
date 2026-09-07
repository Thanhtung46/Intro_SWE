"""Unit tests for services/llm_client.py's prompt plumbing.

Gemini's actual comprehension isn't unit-testable without a live call (the
rest of this codebase treats that as integration/manual-verified — see
quickstart.md — not unit tested); what's covered here is that
detect_action_intent() actually forwards `venue_results` into the prompt it
sends, so a "book this venue" follow-up has the data it needs to be
recognized at all.
"""

import asyncio
import os

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from services.llm_client import LLMClient


def test_detect_action_intent_includes_venue_results_in_prompt(monkeypatch):
    captured = {}

    async def fake_generate_json(self, parts):
        captured["prompt"] = parts[0]
        return {"intent": "propose_book", "targetIndex": 0}

    monkeypatch.setattr(LLMClient, "_generate_json", fake_generate_json)

    client = LLMClient(api_key="test-key")
    venue_results = [{"venueId": 7, "venueName": "Sân ABC"}]

    result = asyncio.run(
        client.detect_action_intent(
            results=[],
            pending_action=None,
            message_text="Đăng ký sân đó giúp mình",
            venue_results=venue_results,
        )
    )

    assert result == {"intent": "propose_book", "targetIndex": 0}
    # json.dumps escapes non-ASCII by default — assert on the venueId
    # (unambiguous either way) rather than the raw Vietnamese text.
    assert '"venueId": 7' in captured["prompt"]
    assert "propose_book" in captured["prompt"]


def test_detect_action_intent_defaults_venue_results_to_empty_list(monkeypatch):
    captured = {}

    async def fake_generate_json(self, parts):
        captured["prompt"] = parts[0]
        return {"intent": "other", "targetIndex": None}

    monkeypatch.setattr(LLMClient, "_generate_json", fake_generate_json)

    client = LLMClient(api_key="test-key")
    asyncio.run(
        client.detect_action_intent(results=[], pending_action=None, message_text="hi")
    )

    assert "Shown venue results: []" in captured["prompt"]
