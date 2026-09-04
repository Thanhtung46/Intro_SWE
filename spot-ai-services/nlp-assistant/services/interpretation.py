"""Deterministic merge of extracted criteria into an InterpretedRequest.

Kept separate from services/llm_client.py so this logic is a pure function,
testable without mocking Gemini (data-model.md InterpretedRequest
validation rules; spec FR-003).
"""

from typing import Any, Optional

CRITERIA_FIELDS = [
    "searchKind",
    "sport",
    "province",
    "city",
    "date",
    "timeFrom",
    "timeTo",
    "skill",
    "priceMin",
    "priceMax",
]

# Minimum criteria needed to "search meaningfully" (spec FR-003). `sport` is
# required for either search kind; `searchKind` ("match" | "venue") is also
# required once resolved, per spec 007's FR-003/FR-004 — a player asking to
# find something must first be understood as wanting to join a kèo or book a
# venue before either search runs (research.md decision 3 under
# specs/007-assistant-venue-search/).
REQUIRED_SEARCH_FIELDS = ["sport", "searchKind"]


def merge_criteria(
    previous: Optional[dict[str, Any]], delta: dict[str, Any]
) -> dict[str, Any]:
    """Overlays `delta`'s non-null fields onto `previous`; null/absent
    fields in `delta` keep whatever `previous` already had."""
    previous = previous or {}
    merged: dict[str, Any] = {}
    for field in CRITERIA_FIELDS:
        new_value = delta.get(field)
        merged[field] = new_value if new_value not in (None, "", []) else previous.get(field)
    return merged


def compute_missing_required_fields(criteria: dict[str, Any]) -> list[str]:
    return [field for field in REQUIRED_SEARCH_FIELDS if not criteria.get(field)]


def build_interpreted_request(
    previous: Optional[dict[str, Any]], delta: dict[str, Any]
) -> dict[str, Any]:
    merged = merge_criteria(previous, delta)
    merged["missingRequiredFields"] = compute_missing_required_fields(merged)
    return merged
