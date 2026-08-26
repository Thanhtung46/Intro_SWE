"""Request schemas for the internal conversation API.

Shapes mirror contracts/nlp-assistant-internal-api.md, which passes the
client-facing body from contracts/assistant-proxy-api.md through largely
unchanged.
"""

from typing import Literal, Optional

from pydantic import BaseModel, model_validator

# Base64-encoded audio size cap. spot-backend's proxy already enforces this
# (contracts/assistant-proxy-api.md 400), this is a defense-in-depth mirror.
MAX_AUDIO_BASE64_CHARS = 14_000_000  # ~10MB decoded


class MessageRequest(BaseModel):
    inputMode: Literal["text", "voice"]
    text: Optional[str] = None
    audio: Optional[str] = None
    audioMimeType: Optional[str] = None

    @model_validator(mode="after")
    def _validate_mode(self) -> "MessageRequest":
        if self.inputMode == "text":
            if not self.text or not self.text.strip():
                raise ValueError("text is required when inputMode is text")
        else:
            if not self.audio:
                raise ValueError("audio is required when inputMode is voice")
            if not self.audioMimeType:
                raise ValueError("audioMimeType is required when inputMode is voice")
            if len(self.audio) > MAX_AUDIO_BASE64_CHARS:
                raise ValueError("audio payload too large")
        return self
