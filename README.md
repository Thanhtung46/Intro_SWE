# SPOT - Sport Pitch Online Ticketing

Nền tảng đặt sân thể thao trực tuyến (HCMUS Software Engineering coursework, Group 09).

## Repository Structure

**Polyrepo** — no root monorepo workspace. Each app manages its own dependencies; three frontends have their own `.git`:

| Directory | Stack | Own `.git`? | Status |
| :--- | :--- | :---: | :--- |
| `spot-frontend-web/` | Next.js 14, React 18, TypeScript, Tailwind | ✅ | Scaffolded — `next build`/Docker fail (missing configs/`globals.css`) |
| `spot-frontend-mobile/` | Expo 49, React Native 0.72, expo-router | ✅ | Scaffolded — use `npm install --legacy-peer-deps` |
| `spot-admin-console/` | Vite, React 18, TypeScript, React Router | ✅ | Runnable; Docker build verified |
| `spot-backend/` | Node.js/Express ESM, domain-driven | — (this repo) | **Runnable** — auth, profile/settings, schedule, notifications, reviews |
| `spot-ai-services/` | Python/FastAPI (planned) | — (this repo) | Empty scaffolds |

See each app’s `README.md` / `CLAUDE.md`. Cross-project status: root [`CLAUDE.md`](CLAUDE.md).

## Getting Started

```bash
git clone <repo>
cd Intro_SWE

# Admin / web / mobile (examples)
cd spot-admin-console && npm install && npm run dev
cd spot-frontend-web && npm install && npm run dev
cd spot-frontend-mobile && npm install --legacy-peer-deps && npm start

# Backend
cd spot-backend
npm install && cp .env.example .env   # Supabase DB_*, SMTP_*, JWT_SECRET
npm run migrate && npm run dev        # http://localhost:3000
```

API reference: `spot-backend/docs/API.md`. Agent notes: `spot-backend/CLAUDE.md`.

## Docker

```bash
docker compose up -d postgres redis          # always works
docker compose up -d --build admin-console   # also works
docker compose up -d --build redis backend   # env_file: spot-backend/.env
docker compose run --rm backend npm run migrate
```

Default backend DB is **Supabase** (not compose postgres). Full guide: [`DOCKER.md`](DOCKER.md).

## Project Structure

```
.
├── spot-frontend-web/       # Next.js web app
├── spot-frontend-mobile/    # Expo mobile app
├── spot-admin-console/      # Vite admin dashboard
├── spot-backend/            # Express API — auth domain implemented
├── spot-ai-services/        # 3 planned FastAPI microservices (empty scaffolds)
├── docker-compose.yml               # dev stack
├── docker-compose.production.yml    # prod stack
├── .env.development / .env.production   # compose env files (gitignored)
├── DOCKER.md                # full Docker guide
├── CLAUDE.md                # AI-agent guidance + detailed project status
├── Docs/ , PA/               # HCMUS course assignment materials — reference only
```

## Contributing

Read root `CLAUDE.md` before cross-cutting changes — it tracks what is implemented vs scaffolded. Backend work: follow `spot-backend/CLAUDE.md`.


<!-- : ui-test-owner@example.com / Password1! ( -->