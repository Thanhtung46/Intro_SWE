"""Deterministic normalization of Gemini's free-text `timeFrom`/`timeTo`
extraction into the `HH:mm` shape spot-backend's `GET /matches` requires.

Same rationale as services/date_parse.py: resolving what "7h"/"19h30" means
in 24-hour time is a deterministic parsing problem, not something worth
asking the model to get exactly right on every call.
"""

import re
import unicodedata
from typing import Optional

_HHMM_RE = re.compile(r"^([01]?\d|2[0-3]):([0-5]\d)$")
_TIME_TOKEN_RE = re.compile(r"(\d{1,2})\s*(?:h|:|giờ)?\s*(\d{1,2})?")

_MORNING_WORDS = ("sang", "am")
_NOON_WORDS = ("trua",)
_AFTERNOON_EVENING_WORDS = ("chieu", "toi", "dem", "pm")


def _fold(text: str) -> str:
    text = text.lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in text if unicodedata.category(ch) != "Mn")


def normalize_time(raw: Optional[str], context_text: str = "") -> Optional[str]:
    """Returns `HH:mm`, or None if `raw` doesn't contain a parseable time.

    `context_text` (typically the player's full message) is scanned for
    period-of-day words ("sáng"/"trưa"/"chiều"/"tối") to disambiguate a
    bare 1-12 hour. Without any such word, hours 1-7 default to PM (the
    common case for pickup-sports bookings — "7h"/"sau 7h" means 7pm, not
    7am, in this context) and hours 8-12 are left as stated.
    """
    if not raw:
        return None

    exact = _HHMM_RE.match(raw.strip())
    if exact:
        return f"{int(exact.group(1)):02d}:{exact.group(2)}"

    match = _TIME_TOKEN_RE.search(raw)
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2)) if match.group(2) else 0
    if hour > 23 or minute > 59:
        return None

    if hour <= 12:
        folded = _fold(f"{raw} {context_text}")
        if any(word in folded for word in _MORNING_WORDS):
            pass  # keep as-is (e.g. "sáng 7h" -> 07:00)
        elif any(word in folded for word in _NOON_WORDS):
            hour = 12 if hour in (11, 12) else hour
        elif any(word in folded for word in _AFTERNOON_EVENING_WORDS):
            if hour < 12:
                hour += 12
        elif 1 <= hour <= 7:
            hour += 12  # default: bare "7h" in a pickup-sports context = 7pm

    return f"{hour:02d}:{minute:02d}"
