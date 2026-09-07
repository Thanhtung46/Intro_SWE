"""Response schemas for the internal conversation API.

Field names/shapes follow data-model.md's entities and
contracts/nlp-assistant-internal-api.md / contracts/assistant-proxy-api.md.
"""

from typing import Any, List, Literal, Optional

from pydantic import BaseModel


class InterpretedRequest(BaseModel):
    searchKind: Optional[Literal["match", "venue"]] = None
    sport: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    date: Optional[str] = None
    timeFrom: Optional[str] = None
    timeTo: Optional[str] = None
    skill: Optional[List[str]] = None
    priceMin: Optional[int] = None
    priceMax: Optional[int] = None
    missingRequiredFields: List[str] = []


class MatchResult(BaseModel):
    matchId: int
    title: str
    venueName: str
    startsAt: str
    spotsLeft: int


class VenueResult(BaseModel):
    venueId: int
    venueName: str
    address: str
    priceFromPerHour: Optional[int] = None


class BookingHandoff(BaseModel):
    venueId: int
    venueName: str
    date: Optional[str] = None
    timeFrom: Optional[str] = None


class PendingAction(BaseModel):
    actionId: str
    type: Literal["JOIN_MATCH", "HOST_MATCH"]
    matchId: Optional[int] = None
    summary: dict[str, Any]
    state: Literal[
        "awaiting_confirmation", "finalized", "expired", "cancelled"
    ]
    expiresAt: str


class AssistantReply(BaseModel):
    text: str
    transcript: Optional[str] = None
    results: Optional[List[MatchResult]] = None
    venueResults: Optional[List[VenueResult]] = None
    pendingAction: Optional[PendingAction] = None
    clarifyingQuestion: Optional[str] = None
    bookingHandoff: Optional[BookingHandoff] = None


class MessageResponse(BaseModel):
    conversationId: str
    reply: AssistantReply


class MessageHistoryItem(BaseModel):
    role: Literal["player", "assistant"]
    inputMode: Optional[Literal["text", "voice"]] = None
    text: str
    timestamp: str


class ConversationHistoryResponse(BaseModel):
    conversationId: str
    messages: List[MessageHistoryItem]


class ConflictAlternative(BaseModel):
    matchId: int
    title: str
    startsAt: str


class ConflictResponse(BaseModel):
    error: str
    alternative: Optional[ConflictAlternative] = None
