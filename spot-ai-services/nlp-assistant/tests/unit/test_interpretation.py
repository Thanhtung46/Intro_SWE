from services.interpretation import build_interpreted_request, merge_criteria


def test_sport_present_has_no_missing_fields():
    result = build_interpreted_request(None, {"sport": "BADMINTON"})
    assert result["sport"] == "BADMINTON"
    assert result["missingRequiredFields"] == []


def test_sport_absent_is_missing():
    result = build_interpreted_request(None, {"province": "79"})
    assert result["missingRequiredFields"] == ["sport"]


def test_followup_message_merges_onto_previous_without_resetting_it():
    first = build_interpreted_request(None, {"sport": "BADMINTON", "province": "79"})
    second = build_interpreted_request(first, {"timeFrom": "19:00"})

    assert second["sport"] == "BADMINTON"
    assert second["province"] == "79"
    assert second["timeFrom"] == "19:00"
    assert second["missingRequiredFields"] == []


def test_new_message_can_override_a_previously_set_field():
    first = build_interpreted_request(None, {"sport": "BADMINTON"})
    second = build_interpreted_request(first, {"sport": "FOOTBALL"})

    assert second["sport"] == "FOOTBALL"


def test_merge_criteria_ignores_empty_list_and_empty_string_deltas():
    previous = {"skill": ["BEGINNER"], "city": "778"}
    merged = merge_criteria(previous, {"skill": [], "city": ""})

    assert merged["skill"] == ["BEGINNER"]
    assert merged["city"] == "778"
