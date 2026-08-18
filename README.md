# SPOT - Sport Pitch Online Ticketing

Nền tảng đặt sân thể thao trực tuyến (HCMUS Software Engineering coursework, Group 09).

## Repository Structure

This is a **polyrepo**, not a monorepo — there are no `feature/*` branches
here, and each app below manages its own dependencies and (for three of
them) its own git history:

| Directory | Stack | Own `.git`? | Status |
| :--- | :--- | :---: | :--- |
| `spot-frontend-web/` | Next.js 14, React 18, TypeScript, Tailwind | ✅ | Scaffolded — `next build`/Docker build fail, missing `globals.css` + config files |
| `spot-frontend-mobile/` | Expo 49, React Native 0.72, expo-router | ✅ | Scaffolded — `npm install` fails on a peer-dependency conflict |
| `spot-admin-console/` | Vite, React 18, TypeScript, React Router | ✅ | Scaffolded, **builds successfully end-to-end** (Docker verified) |
| `spot-backend/` | Node.js/Express, domain-driven | — (tracked here) | Source skeleton only, no `package.json` yet |
| `spot-ai-services/` | Python/FastAPI (recommendation, no-show, NLP) | — (tracked here) | Empty scaffolds, no code yet |

See each app's own `README.md` and `CLAUDE.md` for details, and the
repo-root `CLAUDE.md` for the full cross-project status and known gotchas.

## Getting Started

```bash
git clone <repo>
cd Intro_SoftWare_Engineering

# Each app installs and runs independently, e.g.:
cd spot-admin-console && npm install && npm run dev
cd spot-frontend-web && npm install && npm run dev
cd spot-frontend-mobile && npm install --legacy-peer-deps && npm start
```

`spot-backend` and `spot-ai-services/*` aren't installable yet (no
`package.json` / `requirements.txt`) — see their `README.md` for what's
planned.

## Docker

```bash
docker compose up -d postgres redis          # always works
docker compose up -d --build admin-console   # also works
docker compose run --rm backend npm run migrate
```

`backend`, `frontend-web`, and the three AI services don't build yet (see
table above and `DOCKER.md`/root `CLAUDE.md` for exact reasons and status).

For the full guide — all services, ports, health checks, production
deployment, backup/restore — see **[DOCKER.md](DOCKER.md)**.

## Project Structure

```
.
├── spot-frontend-web/       # Next.js web app (own git repo)
├── spot-frontend-mobile/    # Expo mobile app (own git repo)
├── spot-admin-console/      # Vite admin dashboard (own git repo)
├── spot-backend/            # Express API (tracked by this repo)
├── spot-ai-services/        # 3 planned FastAPI microservices (tracked by this repo)
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
