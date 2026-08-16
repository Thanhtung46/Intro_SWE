# SPOT - Sport Pitch Online Ticketing

Nền tảng đặt sân thể thao trực tuyến (HCMUS Software Engineering coursework, Group 09).

## Repository Structure

This is a **monorepo** — every app below is tracked by this repo's git
history (no nested `.git` anywhere), and branches/PRs (e.g. `develop`,
`SPOT-NNN-...`) live here at the root:

| Directory | Stack | Status |
| :--- | :--- | :--- |
| `spot-frontend-web/` | Next.js 14, React 18, TypeScript, Tailwind | Scaffolded — `next build`/Docker build fail, missing `globals.css` + config files |
| `spot-frontend-mobile/` | Expo, React Native, expo-router | Real, mostly-wired auth/onboarding/home flow — not an empty scaffold. `npm install` works (no `--legacy-peer-deps` needed) |
| `spot-admin-console/` | Vite, React 18, TypeScript, React Router | Scaffolded, **builds successfully end-to-end** (Docker verified) |
| `spot-backend/` | Node.js/Express, domain-driven | Installable & runnable — `auth` domain fully implemented, other domains still empty scaffolds |
| `spot-ai-services/` | Python/FastAPI (recommendation, no-show, NLP) | Empty scaffolds, no code yet |

See each app's own `README.md` and `CLAUDE.md` for details, and the
repo-root `CLAUDE.md` for the full cross-project status and known gotchas.

## Getting Started

```bash
git clone <repo>
cd Intro_SoftWare_Engineering

# Each app installs and runs independently, e.g.:
cd spot-admin-console && npm install && npm run dev
cd spot-frontend-web && npm install && npm run dev
cd spot-frontend-mobile && npm install && npm start
cd spot-backend && npm install && cp .env.example .env && npm run migrate && npm run dev
```

`spot-ai-services/*` aren't installable yet (no `requirements.txt`) — see
its `README.md` for what's planned.

## Docker

```bash
docker compose up -d postgres redis          # always works
docker compose up -d --build admin-console   # also works
```

`frontend-web` and the three AI services don't build yet; `backend` has a
`Dockerfile` and is documented as runnable but its Docker build hasn't been
re-verified recently (see table above and `DOCKER.md`/root `CLAUDE.md` for
exact reasons and status).

For the full guide — all services, ports, health checks, production
deployment, backup/restore — see **[DOCKER.md](DOCKER.md)**.

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

Each app's `README.md` has its own quick-start. Read the repo-root
`CLAUDE.md` before making cross-cutting changes — it tracks what's actually
implemented vs. still scaffolded, so you don't have to rediscover it.
