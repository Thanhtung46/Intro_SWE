import asyncio

from services.geo import GeoCatalog

SAMPLE_GEO = {
    "map": "pre-2025",
    "provinces": [
        {
            "code": "79",
            "name": "Thành phố Hồ Chí Minh",
            "cities": [
                {"code": "760", "name": "Quận 1"},
                {"code": "778", "name": "Quận 7"},
                {"code": "783", "name": "Huyện Bình Chánh"},
            ],
        },
        {
            "code": "01",
            "name": "Thành phố Hà Nội",
            "cities": [
                {"code": "007", "name": "Quận Hai Bà Trưng"},
            ],
        },
    ],
}


class _StubBackend:
    async def get_geo_vn(self):
        return SAMPLE_GEO


def test_city_only_resolves_city_and_infers_province():
    province, city = asyncio.run(GeoCatalog().resolve(_StubBackend(), None, "Quận 7"))
    assert province == "79"
    assert city == "778"


def test_unaccented_city_still_matches():
    province, city = asyncio.run(GeoCatalog().resolve(_StubBackend(), None, "Quan 7"))
    assert province == "79"
    assert city == "778"


def test_bare_number_matches_short_form():
    province, city = asyncio.run(GeoCatalog().resolve(_StubBackend(), None, "7"))
    assert province == "79"
    assert city == "778"


def test_province_only_resolves_province_with_no_city():
    province, city = asyncio.run(
        GeoCatalog().resolve(_StubBackend(), "Hồ Chí Minh", None)
    )
    assert province == "79"
    assert city is None


def test_district_name_without_leading_zero_matches():
    province, city = asyncio.run(
        GeoCatalog().resolve(_StubBackend(), None, "Hai Bà Trưng")
    )
    assert province == "01"
    assert city == "007"


def test_unrecognized_place_resolves_to_none_none():
    province, city = asyncio.run(GeoCatalog().resolve(_StubBackend(), None, "Sao Hỏa"))
    assert province is None
    assert city is None


def test_catalog_is_only_fetched_once():
    calls = {"n": 0}

    class _CountingBackend:
        async def get_geo_vn(self):
            calls["n"] += 1
            return SAMPLE_GEO

    async def _run():
        catalog = GeoCatalog()
        counting_backend = _CountingBackend()
        await catalog.resolve(counting_backend, None, "Quận 7")
        await catalog.resolve(counting_backend, None, "Quận 1")

    asyncio.run(_run())
    assert calls["n"] == 1
