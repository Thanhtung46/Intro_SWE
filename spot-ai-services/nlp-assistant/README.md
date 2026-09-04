# spot-ai-services / nlp-assistant

Conversational (text + voice) assistant microservice for SPOT. Lets a
player search for pickup matches (kèo) in natural language and finalize
joining/hosting one through conversation. FastAPI, Python 3.11. Called
internally by `spot-backend` only — see `../../specs/003-nlp-assistant/`
for spec, plan, research, data model, and the full API contracts.

## Run locally

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt   # or requirements.txt for prod-only
cp .env.example .env                  # fill GEMINI_API_KEY, REDIS_URL, BACKEND_URL, INTERNAL_SERVICE_KEY
uvicorn app.main:app --reload --port 5003
```

Requires a reachable Redis (`redis-server` locally, or
`docker compose up -d redis` from the repo root) and a running
`spot-backend` with matchmaking already functional.

## Test

```bash
pytest tests/unit tests/integration
```

All Gemini and `spot-backend` calls are mocked in these tests — no live
API key, Redis, or backend needed to run them. See
`../../specs/003-nlp-assistant/quickstart.md` for how to validate the full
stack end-to-end with real credentials.

## Endpoints

Full request/response shapes:
`../../specs/003-nlp-assistant/contracts/nlp-assistant-internal-api.md`.

### `GET /health`

No auth. `{ "status": "ok" }`.

### `POST /conversations/{conversationId}/messages`

Requires `X-Internal-Service-Key` and `X-Player-Access-Token` headers. Body
is `{ inputMode: "text", text }` or `{ inputMode: "voice", audio (base64), audioMimeType }`.
Runs a search, proposes a join/host action, or finalizes a previously
proposed one depending on conversation state — see
`services/dialogue.py`.

### `GET /conversations/{conversationId}` / `DELETE /conversations/{conversationId}`

History and clear, both scoped to the player identified by
`X-Player-Access-Token`.

## What this service does NOT do

- No new Postgres schema — conversation/pending-action state lives in
  Redis only, with a TTL (research.md decision 4). Matches, join requests,
  and venues stay owned entirely by `spot-backend`.
- No separate speech-to-text vendor — voice transcription goes through
  Gemini's multimodal audio input (research.md decision 3).
- Never finalizes a join/host action without an explicit player
  confirmation in that same conversation (research.md decision 5).
- Not reachable by any frontend directly — only `spot-backend` should
  call it, forwarding the calling player's own access token.
