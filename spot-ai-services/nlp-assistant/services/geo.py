"""Resolves Gemini's free-text province/city extraction (e.g. "Quận 7",
"TP.HCM") into the exact GSO codes spot-backend's `GET /matches` requires
(`province`+`city` must both be set, `city` max 5 chars — see
contracts). Mirrors why services/date_parse.py normalizes dates in code
rather than prompting the model to know spot-backend's own catalog: the
catalog is a deterministic fact spot-backend already owns
(`GET /geo/vn`), not something Gemini should have to memorize or guess.
"""

import re
import unicodedata
from dataclasses import dataclass
from typing import Optional

from services.backend_client import BackendClient

# Common Vietnamese administrative-unit prefixes that don't help matching
# once stripped to a folded comparison (e.g. "Quận 7" and "7" should match
# the same way) — order matters: longest/most-specific first.
_ADMIN_PREFIXES = [
    "thanh pho",
    "thi xa",
    "quan",
    "huyen",
    "tinh",
    "tp.",
    "tp",
    "q.",
]


def _fold(text: str) -> str:
    text = text.lower().replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _fold_and_strip_prefix(text: str) -> str:
    folded = _fold(text)
    for prefix in _ADMIN_PREFIXES:
        if folded.startswith(prefix + " "):
            return folded[len(prefix) + 1 :].strip()
        if folded == prefix:
            return ""
    return folded


@dataclass
class _Unit:
    code: str
    folded_name: str
    folded_short: str  # name with admin prefix stripped


class GeoCatalog:
    """In-process cache of spot-backend's pre-2025 province/city catalog.

    The catalog is static reference data (not per-user), so caching it for
    the process lifetime is safe and avoids an extra backend round trip on
    every single search turn (research.md's Simplicity First bias — no
    Redis entry needed for something this small and this static).
    """

    def __init__(self) -> None:
        self._provinces: list[_Unit] = []
        # city code -> owning province code, for province inference when
        # only a city name was mentioned.
        self._city_to_province: dict[str, str] = {}
        self._cities: list[_Unit] = []
        self._loaded = False

    async def _ensure_loaded(self, backend: BackendClient) -> None:
        if self._loaded:
            return
        data = await backend.get_geo_vn()
        for province in data.get("provinces", []):
            p_code = province["code"]
            self._provinces.append(
                _Unit(p_code, _fold(province["name"]), _fold_and_strip_prefix(province["name"]))
            )
            for city in province.get("cities", []):
                c_code = city["code"]
                self._city_to_province[c_code] = p_code
                self._cities.append(
                    _Unit(c_code, _fold(city["name"]), _fold_and_strip_prefix(city["name"]))
                )
        self._loaded = True

    @staticmethod
    def _best_match(query_folded: str, query_short: str, units: list[_Unit]) -> Optional[_Unit]:
        if not query_folded:
            return None
        # 1) exact match on the short (prefix-stripped) form — "7" == "7"
        exact = [u for u in units if u.folded_short == query_short]
        if len(exact) == 1:
            return exact[0]
        # 2) exact match on the full folded name
        exact_full = [u for u in units if u.folded_name == query_folded]
        if len(exact_full) == 1:
            return exact_full[0]
        # 3) substring match, shortest name wins (most specific) — avoids
        # e.g. "quan 1" accidentally preferring a province containing it
        # as a substring of a longer, unrelated name.
        candidates = [
            u for u in units if query_short and query_short in u.folded_short
        ]
        if candidates:
            candidates.sort(key=lambda u: len(u.folded_short))
            if len(candidates) == 1 or len(candidates[0].folded_short) < len(candidates[1].folded_short):
                return candidates[0]
        return None

    async def resolve(
        self, backend: BackendClient, province_raw: Optional[str], city_raw: Optional[str]
    ) -> tuple[Optional[str], Optional[str]]:
        """Returns (province_code, city_code). Falls back to (None, None)
        for a given side when it can't be confidently resolved, rather
        than guessing — spot-backend rejects province+city unless both are
        present and valid, so an unresolved city is dropped along with its
        province rather than sent as free text (research.md decision:
        prefer no location filter over a guaranteed 400)."""
        await self._ensure_loaded(backend)

        city_code: Optional[str] = None
        province_code: Optional[str] = None

        if city_raw:
            match = self._best_match(_fold(city_raw), _fold_and_strip_prefix(city_raw), self._cities)
            if match:
                city_code = match.code
                province_code = self._city_to_province[match.code]

        if province_code is None and province_raw:
            match = self._best_match(
                _fold(province_raw), _fold_and_strip_prefix(province_raw), self._provinces
            )
            if match:
                province_code = match.code

        if city_code and not province_code:
            # Shouldn't happen (city match always sets its own province),
            # but guard anyway since spot-backend requires both together.
            city_code = None

        return province_code, city_code


_catalog: Optional[GeoCatalog] = None


def get_catalog() -> GeoCatalog:
    global _catalog
    if _catalog is None:
        _catalog = GeoCatalog()
    return _catalog
