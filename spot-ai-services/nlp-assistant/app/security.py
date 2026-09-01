"""Auth for the internal spot-backend -> nlp-assistant contract.

Two checks (research.md decision 2):
  1. X-Internal-Service-Key proves the caller is spot-backend itself
     (mirrors spot-ai-services/recommendation/app/security.py).
  2. X-Player-Access-Token is the calling player's own SPOT access token,
     forwarded verbatim — required on every request since this service
     always acts on behalf of a specific player, never anonymously.
"""

import base64
import json

from fastapi import Header, HTTPException, status

from app.config import settings


def require_internal_service_key(
    x_internal_service_key: str = Header(default=""),
) -> None:
    if not settings.internal_service_key or (
        x_internal_service_key != settings.internal_service_key
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid X-Internal-Service-Key",
        )


def require_player_access_token(
    x_player_access_token: str = Header(default=""),
) -> str:
    if not x_player_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Player-Access-Token",
        )
    return x_player_access_token


def decode_player_user_id(access_token: str) -> str:
    """Reads the `sub` claim out of the player's JWT without re-verifying
    its signature.

    spot-backend already verified this token (via its own `authenticate`
    middleware) before forwarding it — the X-Internal-Service-Key check is
    this service's trust boundary for "this really came from spot-backend",
    so re-verifying the JWT signature here would be redundant, not safer.
    """
    try:
        payload_segment = access_token.split(".")[1]
        padding = "=" * (-len(payload_segment) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_segment + padding))
        return str(payload["sub"])
    except (IndexError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Player-Access-Token",
        ) from exc
