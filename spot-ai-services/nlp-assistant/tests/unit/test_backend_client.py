"""Unit tests for services/backend_client.py's search_venues() — verifies
the request shape (GET /venues, criteria as query params, player bearer
token) without a live spot-backend, using an httpx MockTransport."""

import asyncio

import httpx

from services.backend_client import BackendClient


def _client_with_transport(transport: httpx.MockTransport, token: str = "player-token") -> BackendClient:
    client = BackendClient(token, base_url="http://backend.test")
    client._client._transport = transport
    return client


def test_search_venues_calls_get_venues_with_criteria_and_bearer_token():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["path"] = request.url.path
        captured["params"] = dict(request.url.params)
        captured["auth_header"] = request.headers.get("authorization")
        return httpx.Response(200, json={"venues": [{"venueId": 1, "name": "Sân A"}]})

    backend = _client_with_transport(httpx.MockTransport(handler))

    result = asyncio.run(
        backend.search_venues(
            {
                "sport": "BADMINTON",
                "date": "2026-09-04",
                "timeFrom": "19:00",
                "timeTo": "20:00",
                "province": "79",
                "city": "778",
            }
        )
    )

    assert captured["path"] == "/venues"
    assert captured["params"]["sport"] == "BADMINTON"
    assert captured["params"]["date"] == "2026-09-04"
    assert captured["params"]["timeFrom"] == "19:00"
    assert captured["params"]["timeTo"] == "20:00"
    assert captured["params"]["province"] == "79"
    assert captured["params"]["city"] == "778"
    assert captured["auth_header"] == "Bearer player-token"
    assert result == [{"venueId": 1, "name": "Sân A"}]


def test_search_venues_omits_none_criteria_fields():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["params"] = dict(request.url.params)
        return httpx.Response(200, json={"venues": []})

    backend = _client_with_transport(httpx.MockTransport(handler))

    asyncio.run(
        backend.search_venues({"sport": "FOOTBALL", "province": None, "city": None})
    )

    assert "province" not in captured["params"]
    assert "city" not in captured["params"]


def test_search_venues_returns_empty_list_when_no_venues_key():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={})

    backend = _client_with_transport(httpx.MockTransport(handler))

    result = asyncio.run(backend.search_venues({"sport": "FOOTBALL"}))

    assert result == []
