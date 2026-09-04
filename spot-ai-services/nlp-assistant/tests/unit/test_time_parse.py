from services.time_parse import normalize_time


def test_none_stays_none():
    assert normalize_time(None) is None


def test_already_hhmm_passes_through():
    assert normalize_time("19:00") == "19:00"


def test_single_digit_hour_hhmm_is_padded():
    assert normalize_time("9:30") == "09:30"


def test_unambiguous_24h_hour_passes_through():
    assert normalize_time("19h") == "19:00"
    assert normalize_time("19h30") == "19:30"


def test_bare_low_hour_defaults_to_pm():
    # "sau 7h" in the app's own example prompt means 7pm, not 7am.
    assert normalize_time("7h") == "19:00"
    assert normalize_time("7h30") == "19:30"


def test_morning_keyword_keeps_hour_as_is():
    assert normalize_time("7h", context_text="sáng nay lúc 7h") == "07:00"


def test_evening_keyword_forces_pm():
    assert normalize_time("8h", context_text="tối nay lúc 8h") == "20:00"


def test_afternoon_keyword_forces_pm():
    assert normalize_time("3h", context_text="chiều nay lúc 3h") == "15:00"


def test_bare_higher_hour_left_as_stated():
    # 8-12 is ambiguous but left as literal (late-morning bookings exist).
    assert normalize_time("10h") == "10:00"


def test_unparseable_text_returns_none():
    assert normalize_time("khoảng chiều chiều") is None


def test_out_of_range_hour_returns_none():
    assert normalize_time("25h") is None
