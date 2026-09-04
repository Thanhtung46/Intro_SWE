from datetime import datetime
from zoneinfo import ZoneInfo

from services.date_parse import normalize_date

NOW = datetime(2026, 9, 3, 21, 0, tzinfo=ZoneInfo("Asia/Ho_Chi_Minh"))  # a Thursday


def test_none_stays_none():
    assert normalize_date(None, NOW) is None


def test_already_iso_passes_through_unchanged():
    assert normalize_date("2026-12-25", NOW) == "2026-12-25"


def test_toi_nay_resolves_to_today():
    assert normalize_date("tối nay", NOW) == "2026-09-03"


def test_hom_nay_unaccented_resolves_to_today():
    assert normalize_date("hom nay", NOW) == "2026-09-03"


def test_english_tonight_resolves_to_today():
    assert normalize_date("tonight", NOW) == "2026-09-03"


def test_mai_resolves_to_tomorrow():
    assert normalize_date("mai", NOW) == "2026-09-04"


def test_ngay_mai_resolves_to_tomorrow():
    assert normalize_date("ngày mai", NOW) == "2026-09-04"


def test_substring_match_inside_a_longer_phrase():
    assert normalize_date("đi đá banh tối nay nhé", NOW) == "2026-09-03"


def test_unrecognized_text_returns_none_rather_than_garbage():
    assert normalize_date("thứ bảy tuần sau", NOW) is None


def test_empty_string_is_none():
    assert normalize_date("", NOW) is None
