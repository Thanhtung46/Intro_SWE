"""POST/GET/DELETE /conversations/{conversationId} — see
contracts/nlp-assistant-internal-api.md.
"""

import base64
import binascii

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.config import settings
from app.schemas.request import MessageRequest
from app.security import (
    decode_player_user_id,
    require_internal_service_key,
    require_player_access_token,
)
from services import dialogue
from services.backend_client import BackendClient
from services.conversation_store import ConversationStore, OwnershipError, get_store
from services.llm_client import LLMClient, LLMTimeoutError, get_client

router = APIRouter(
    prefix="/conversations",
    tags=["conversations"],
    dependencies=[Depends(require_internal_service_key)],
)

UNAVAILABLE_MESSAGE = (
    "Assistant is temporarily unavailable. Please use the search filters instead."
)
REPEAT_OR_TYPE_MESSAGE = (
    "Mình nghe không rõ. Bạn nói lại hoặc gõ tin nhắn giúp mình nhé."
)


async def _run_turn(
    llm: LLMClient,
    backend: BackendClient,
    store: ConversationStore,
    conversation: dict,
    conversation_id: str,
    message_text: str,
    input_mode: str,
    transcript: str = None,
):
    try:
        reply = await dialogue.handle_message(
            llm, backend, store, conversation, message_text
        )
    except LLMTimeoutError:
        return JSONResponse(status_code=503, content={"error": UNAVAILABLE_MESSAGE})
    except dialogue.ActionConflictError as exc:
        content = {"error": exc.message}
        if exc.alternative is not None:
            content["alternative"] = exc.alternative
        return JSONResponse(status_code=409, content=content)

    await store.append_message(conversation, "player", message_text, input_mode)
    await store.append_message(conversation, "assistant", reply["text"])

    return {
        "conversationId": conversation_id,
        "reply": {
            "text": reply["text"],
            "transcript": transcript,
            "results": reply.get("results"),
            "venueResults": reply.get("venueResults"),
            "pendingAction": reply.get("pendingAction"),
            "clarifyingQuestion": reply.get("clarifyingQuestion"),
            "bookingHandoff": reply.get("bookingHandoff"),
        },
    }


@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    body: MessageRequest,
    player_access_token: str = Depends(require_player_access_token),
):
    player_user_id = decode_player_user_id(player_access_token)
    store = get_store()

    try:
        conversation = await store.get_or_create(conversation_id, player_user_id)
    except OwnershipError:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    llm = get_client()

    if body.inputMode == "voice":
        try:
            audio_bytes = base64.b64decode(body.audio, validate=True)
        except (binascii.Error, ValueError):
            return JSONResponse(status_code=400, content={"error": "Invalid audio"})

        try:
            transcription = await llm.transcribe(audio_bytes, body.audioMimeType)
        except LLMTimeoutError:
            return JSONResponse(
                status_code=503, content={"error": UNAVAILABLE_MESSAGE}
            )

        if transcription.get("confidence", 0) < settings.voice_confidence_threshold:
            # No Message is appended for a low-confidence transcription
            # (data-model.md Message validation rule) — nothing reliable
            # was actually said, from this service's point of view.
            return {
                "conversationId": conversation_id,
                "reply": {
                    "text": REPEAT_OR_TYPE_MESSAGE,
                    "transcript": None,
                    "results": None,
                    "venueResults": None,
                    "pendingAction": None,
                    "clarifyingQuestion": REPEAT_OR_TYPE_MESSAGE,
                    "bookingHandoff": None,
                },
            }

        message_text = transcription["transcript"]
        input_mode = "voice"
        transcript = message_text
    else:
        message_text = body.text
        input_mode = "text"
        transcript = None

    async with BackendClient(player_access_token) as backend:
        return await _run_turn(
            llm,
            backend,
            store,
            conversation,
            conversation_id,
            message_text,
            input_mode,
            transcript,
        )


@router.get("/{conversation_id}")
async def get_history(
    conversation_id: str,
    player_access_token: str = Depends(require_player_access_token),
):
    player_user_id = decode_player_user_id(player_access_token)
    store = get_store()

    try:
        conversation = await store.get_for_player(conversation_id, player_user_id)
    except OwnershipError:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    messages = conversation["messages"] if conversation else []
    return {"conversationId": conversation_id, "messages": messages}


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    player_access_token: str = Depends(require_player_access_token),
):
    player_user_id = decode_player_user_id(player_access_token)
    store = get_store()
    try:
        await store.get_for_player(conversation_id, player_user_id)
    except OwnershipError:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
    await store.delete(conversation_id)
