"""Outbound client back into spot-backend's matchmaking API.

Per research.md decision 2, every call is made *as the calling player* —
the forwarded X-Player-Access-Token is sent as this client's own
Authorization: Bearer header, so spot-backend's existing matchmaking
authorization (occupancy conflicts, join modes, skill-mismatch warnings)
applies unchanged. This service invents no new authorization logic.
"""

from typing import Any, Optional

import httpx

from app.config import settings


class BackendConflictError(Exception):
    """Raised when spot-backend rejects a join/host call with a 409."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class BackendClient:
    def __init__(
        self, access_token: str, base_url: Optional[str] = None
    ) -> None:
        self._access_token = access_token
        self._client = httpx.AsyncClient(
            base_url=base_url or settings.backend_url,
            timeout=settings.backend_timeout_seconds,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "BackendClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        await self.close()

    async def search_matches(self, criteria: dict[str, Any]) -> list[dict[str, Any]]:
        params = {k: v for k, v in criteria.items() if v is not None}
        response = await self._client.get("/matches", params=params)
        response.raise_for_status()
        return response.json().get("items", [])

    async def get_match(self, match_id: int) -> dict[str, Any]:
        response = await self._client.get(f"/matches/{match_id}")
        response.raise_for_status()
        return response.json()

    async def get_geo_vn(self) -> dict[str, Any]:
        response = await self._client.get("/geo/vn")
        response.raise_for_status()
        return response.json()

    async def join_match(
        self, match_id: int, body: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        response = await self._client.post(
            f"/matches/{match_id}/join", json=body or {}
        )
        if response.status_code == 409:
            raise BackendConflictError(response.json().get("message", "Conflict"))
        response.raise_for_status()
        return response.json()

    async def create_match(self, body: dict[str, Any]) -> dict[str, Any]:
        response = await self._client.post("/matches", json=body)
        if response.status_code == 409:
            raise BackendConflictError(response.json().get("message", "Conflict"))
        response.raise_for_status()
        return response.json()
