"""Deterministic normalization of Gemini's free-text `date` extraction into
the `YYYY-MM-DD` shape spot-backend's `GET /matches` requires.

Gemini extracts whatever the player said verbatim (e.g. "tối nay",
"tomorrow", "mai") rather than resolving it — resolving relative dates is
inherently about *when the request happened*, which is a deterministic
fact the model shouldn't have to reason about, so it's handled here
instead (mirrors why services/geo.py resolves place names in code rather
than asking the model to know spot-backend's GSO catalog).
"""

import re
import unicodedata
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Day offsets from "now" for common Vietnamese/English relative-date terms
# a player would actually say to a pickup-match assistant. Anything not
# recognized here is dropped (None) rather than sent to spot-backend as an
# invalid value — a missing date just means "any day", which is a safe,
# already-supported fallback (date is not a required search field).
_RELATIVE_DAY_OFFSETS = {
    "hom nay": 0,
    "toi nay": 0,
    "sang nay": 0,
    "chieu nay": 0,
    "trua nay": 0,
    "nay": 0,
    "today": 0,
    "tonight": 0,
    "this evening": 0,
    "ngay mai": 1,
    "sang mai": 1,
    "chieu mai": 1,
    "toi mai": 1,
    "mai": 1,
    "tomorrow": 1,
    "ngay mot": 2,
    "mot": 2,
    "ngay kia": 2,
}


def _fold(text: str) -> str:
    """Lowercase + strip Vietnamese diacritics (incl. đ/Đ), collapse
    whitespace — mirrors spot-backend's fold_search_text() so the same
    player phrasing matches the same way on both sides."""
    text = text.lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", text).strip()


def normalize_date(raw: Optional[str], now: Optional[datetime] = None) -> Optional[str]:
    """Returns a `YYYY-MM-DD` string, or None if `raw` is empty/unrecognized."""
    if not raw:
        return None
    if _ISO_DATE_RE.match(raw):
        return raw

    now = now or datetime.now(VN_TZ)
    folded = _fold(raw)

    offset = _RELATIVE_DAY_OFFSETS.get(folded)
    if offset is None:
        # Try substring match (e.g. Gemini returns "di choi toi nay" instead
        # of just "toi nay") before giving up — longest keyword first so
        # "ngay mai" doesn't get shadowed by a shorter unrelated hit.
        for keyword in sorted(_RELATIVE_DAY_OFFSETS, key=len, reverse=True):
            if keyword in folded:
                offset = _RELATIVE_DAY_OFFSETS[keyword]
                break

    if offset is None:
        return None

    return (now + timedelta(days=offset)).strftime("%Y-%m-%d")
