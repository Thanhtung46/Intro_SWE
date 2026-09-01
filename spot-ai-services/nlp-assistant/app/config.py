"""Environment configuration for the nlp-assistant service.

No new dependency is added for .env loading (PROJECT_RULES.md §1.6 doesn't
lock python-dotenv for spot-ai-services/*); `.env` is parsed with the same
small built-in loader used by spot-ai-services/recommendation/app/config.py.
"""

import os
from pathlib import Path

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv(_ENV_PATH)


class Settings:
    """Process-wide settings, read once from the environment."""

    def __init__(self) -> None:
        self.port = int(os.environ.get("PORT", "5003"))
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
        self.redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        self.backend_url = os.environ.get("BACKEND_URL", "http://localhost:3000")
        self.internal_service_key = os.environ.get("INTERNAL_SERVICE_KEY", "")

        # Timeout budgets: SC-001 (full reply < 15s), SC-005 (unavailable
        # message < ~5s) — the LLM call itself must return comfortably
        # within the 5s budget so the router still has time to build and
        # send a 503 before that budget is spent.
        self.llm_timeout_seconds = float(
            os.environ.get("LLM_TIMEOUT_SECONDS", "4")
        )
        self.backend_timeout_seconds = float(
            os.environ.get("BACKEND_TIMEOUT_SECONDS", "8")
        )

        # Conversation/pending-action TTLs (research.md decision 4)
        self.conversation_ttl_seconds = int(
            os.environ.get("CONVERSATION_TTL_SECONDS", str(6 * 60 * 60))
        )
        self.pending_action_ttl_seconds = int(
            os.environ.get("PENDING_ACTION_TTL_SECONDS", str(5 * 60))
        )
        self.max_history_messages = int(
            os.environ.get("MAX_HISTORY_MESSAGES", "20")
        )

        # Below this Gemini-reported confidence, a voice message is treated
        # as unreliable and the player is asked to repeat/type instead of
        # acting on a low-confidence guess (spec User Story 3, Acceptance
        # Scenario 2).
        self.voice_confidence_threshold = float(
            os.environ.get("VOICE_CONFIDENCE_THRESHOLD", "0.5")
        )


settings = Settings()
