# SPOT - Sport Pitch Online Ticketing

Nền tảng đặt sân thể thao trực tuyến (HCMUS Software Engineering coursework, Group 09).

## Repository Structure

**Monorepo** — single git history at this repo's root (no nested `.git` in any app directory, since commit `a2dff26`). Each app still manages its own dependencies (no root workspace tool).

| Directory | Stack | Status |
| :--- | :--- | :--- |
| `spot-frontend-web/` | Next.js 14, React 18, TypeScript, Tailwind | Scaffolded — `next build`/Docker fail (missing configs/`globals.css`) |
| `spot-frontend-mobile/` | Expo, React Native, expo-router (`package.json` pins Expo `^57`/RN `^0.86`) | Real, mostly-wired auth/onboarding/home/booking/venue-detail flow. Plain `npm install` works. |
| `spot-admin-console/` | Vite, React 18, TypeScript, React Router | Runnable; Docker build verified. Also hosts the Venue Owner console. |
| `spot-backend/` | Node.js/Express ESM, domain-driven | **Runnable** — auth, matchmaking (kèo), groups (hội), tournaments (giải đấu), venue/booking, referee, admin/owner console all implemented |
| `spot-ai-services/` | Python/FastAPI | `recommendation/` and `nlp-assistant/` implemented; `noshow-prediction/` still an empty scaffold |

See each app's `README.md` / `CLAUDE.md`. Cross-project status: root [`CLAUDE.md`](CLAUDE.md).

## Getting Started

```bash
git clone <repo>
cd Intro_SWE

# Admin / web / mobile (examples)
cd spot-admin-console && npm install && npm run dev
cd spot-frontend-web && npm install && npm run dev
cd spot-frontend-mobile && npm install && npm start

# Backend
cd spot-backend
npm install && cp .env.example .env   # Supabase DB_*, SMTP_*, JWT_SECRET, SUPABASE_* (Storage)
npm run migrate && npm run dev        # http://localhost:3000
```

API reference: [`spot-backend/docs/API.md`](spot-backend/docs/API.md). Agent notes: [`spot-backend/CLAUDE.md`](spot-backend/CLAUDE.md).

## Docker

```bash
docker compose up -d redis backend                 # default stack (Supabase DB + Redis)
docker compose --profile local-db up -d postgres   # optional local Postgres only
docker compose up -d --build admin-console         # verified end-to-end
docker compose run --rm backend npm run migrate
```

Default backend DB is **Supabase** (not compose postgres). Full guide: [`DOCKER.md`](DOCKER.md).

## Project Structure

```
.
├── spot-frontend-web/       # Next.js web app
├── spot-frontend-mobile/    # Expo mobile app
├── spot-admin-console/      # Vite admin dashboard (+ Venue Owner console)
├── spot-backend/            # Express API — auth/matchmaking/groups/tournaments/venue/booking/referee/admin
├── spot-ai-services/        # 3 FastAPI microservices — recommendation/ + nlp-assistant/ implemented; noshow-prediction/ empty
├── docker-compose.yml               # dev stack
├── docker-compose.production.yml    # prod stack
├── DOCKER.md                # full Docker guide
├── CLAUDE.md                # AI-agent guidance + detailed project status (see docs/agent/ for detail)
├── Docs/ , PA/               # HCMUS course assignment materials — reference only
```

## Contributing

Read root [`CLAUDE.md`](CLAUDE.md) before cross-cutting changes — it tracks what is implemented vs scaffolded. Backend work: follow [`spot-backend/CLAUDE.md`](spot-backend/CLAUDE.md).
