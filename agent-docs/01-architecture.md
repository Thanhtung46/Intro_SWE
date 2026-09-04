# SPOT agent notes — Architecture & Project Structure

Part of the SPOT project agent notes — see [../CLAUDE.md](../CLAUDE.md) for the index.

## Architecture & Project Structure

```
.
├── spot-frontend-web/       # Next.js web app
├── spot-frontend-mobile/    # Expo mobile app
├── spot-admin-console/      # Vite admin dashboard
├── spot-backend/            # Express API — domain-driven src/domains/{auth,booking,venue,payment,matchmaking,groups,tournaments,referee,review,notification,admin}/
├── spot-ai-services/        # 3 FastAPI microservices — recommendation/ and nlp-assistant/ implemented; noshow-prediction/ still an empty scaffold
├── docker-compose.yml               # dev stack — each service builds from its own app's Dockerfile
├── docker-compose.production.yml    # prod stack
├── .env.development / .env.production   # compose env files (gitignored, contain placeholders)
├── PROJECT_RULES.md         # target architecture & version-lock matrix (aspirational, see caveat above)
├── Docs/ , PA/               # HCMUS course assignment materials — reference only, not app code
```

**Data flow (current):**
`spot-frontend-web` / `spot-frontend-mobile` / `spot-admin-console` →
`spot-backend` REST (`:3000`) → Supabase Postgres + Redis (`:6379`).
Auth + matchmaking (kèo) + **groups (hội)** + **tournaments (giải đấu)** are
implemented. `spot-backend` also proxies to `nlp-assistant` (`:5003`) via
its `assistant` domain (`/assistant` + `/api/assistant`) for the
conversational search/join assistant — see `specs/003-nlp-assistant/`.
`spot-backend` also proxies to `recommendation` (`:5001`) via its
`recommendation` domain (`/recommendations` + `/api/recommendations`), and
`spot-frontend-mobile` now consumes both (a "Suggested for you" Home
section + an AI assistant chat screen) — see
`specs/004-ai-features-frontend-integration/`. `noshow-prediction` (`:5002`)
is still an empty scaffold — do not call it from matchmaking.

