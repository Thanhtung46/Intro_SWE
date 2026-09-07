# SPOT agent notes — Common Commands

Part of the SPOT project agent notes — see [../CLAUDE.md](../CLAUDE.md) for the index.

## Common Commands

There is no root-level build tool — each app manages its own dependencies.
Run commands from inside the relevant directory.

**Web (`spot-frontend-web/`):**
```bash
npm install
npm run dev      # start dev server
npm run build && npm run start
npm run lint
npm test
```

**Admin console (`spot-admin-console/`):**
```bash
npm install
npm run dev
npm run build     # tsc && vite build
npm run lint      # eslint — fails today, no .eslintrc* committed yet
npm run lint:fix
```

**Mobile (`spot-frontend-mobile/`):**
```bash
npm install
npm start                 # daily — then press a / i / w
npm run android           # first time per emulator: build+install Dev Client (JDK 17+)
npm run ios / web
npm test
npx expo start --clear
```
Android error `No development build (com.anonymous.spotapp)` means the
emulator has no SPOT APK yet — run `npm run android` once, then `npm start`.

**Backend (`spot-backend/`):** runnable. From `spot-backend/`:
```bash
npm install
npm run migrate
npm run dev              # http://localhost:3000
npm test
npm run smoke:login      # OTP_DEBUG=true
npm run smoke:profile
npm run smoke:matches    # host / join / approve / kick / mine / cancel
npm run smoke:groups     # create / join / PATCH flush / members / schedule / gallery / kick / transfer / delete
npm run smoke:tournaments
npm run smoke:referee    # OTP_DEBUG=true + seed:admin + migrate 015–022
npm run worker:reminders # rating prompt + booking reminders (prod-like)
npm run worker:match-expiry   # prod/cron — process ended kèo
```
Compose (from this repo root `Intro_SWE/`):
```bash
docker compose up -d redis backend
docker compose run --rm backend npm run migrate
docker restart spot-backend   # Windows: after changing bind-mounted src/
```
Do not run `docker compose` from inside `spot-backend/` (no compose file there).

**AI services (`spot-ai-services/*/`):** `recommendation/` and
`nlp-assistant/` are runnable (`cd` into either, `pip install -r
requirements-dev.txt`, `uvicorn app.main:app --reload --port 5001` /
`5003`). `noshow-prediction/` is not — no application code or
`requirements.txt` exists yet.

**Docker (repo root `Intro_SWE/`):**
```bash
docker compose up -d redis backend                 # default stack (Supabase DB + Redis)
docker compose --profile local-db up -d postgres   # optional local Postgres only
docker compose up -d --build admin-console         # verified end-to-end
docker compose up -d --build redis nlp             # nlp-assistant wired into docker-compose.yml
docker compose run --rm backend npm run migrate
docker compose logs -f <service>
docker compose down [-v]
docker compose -f docker-compose.production.yml --env-file .env.production up -d   # --env-file required
```
`build.context` for `backend`/`frontend-web`/`admin-console` points at each
app directory. Status:
- `admin-console` — **builds successfully end-to-end.**
- `backend` — **builds and runs**; `env_file: ./spot-backend/.env` (Supabase
  `DB_*`, SMTP, JWT, Supabase Storage). Redis hostname overridden to
  `redis`. Matchmaking/groups/tournaments/venue-booking/referee all live.
  Optional local Postgres:
  `docker compose --profile local-db up -d postgres` (not the default DB).
- `frontend-web` — gets past `npm ci` (lockfile added) but fails at
  `next build`: `src/app/globals.css` doesn't exist, and `tsconfig.json`/
  `next.config.js`/`tailwind.config.js`/`postcss.config.js` are all missing
  too. This is an app-scaffold gap, not a Docker problem.
- `nlp` — has a `Dockerfile`, real app code, and its `docker-compose.yml`
  service block is uncommented/live (`docker compose up -d --build redis nlp`
  builds); not yet verified end-to-end against live Redis/Gemini in this
  environment.
- `recommendation` — has a `Dockerfile` and real app code, but there is
  still no `recommendation` service block in `docker-compose.yml` at all
  (not commented out — just never added; adding one plus verifying against
  live Supabase is a separate, not-yet-done step).
- `noshow` still fails immediately: no `Dockerfile` exists under
  `spot-ai-services/noshow-prediction/` at all (empty scaffold), and there
  is no `noshow` service block in `docker-compose.yml` either.

`docker-compose.production.yml` uses `${DB_USER}`/`${DB_PASSWORD}`/
`${JWT_SECRET}`/etc. with **no defaults**. Compose only auto-loads a file
literally named `.env` — `.env.production` is a different name, so those
vars come back blank unless you pass `--env-file .env.production` explicitly
(reproduced via `docker compose -f docker-compose.production.yml config`).
`docker-compose.yml` (dev) doesn't have this specific problem — most values
(`NODE_ENV`, `PORT`, `REDIS_*`, AI-service URLs) are hard-coded inline, but
the `backend` service still reads DB/SMTP/JWT credentials from
`env_file: ./spot-backend/.env` (a different, gitignored file from
`.env.development`) — so it's not *fully* hard-coded, just not gated behind
the `--env-file` flag the way prod is.
See `DOCKER.md` for the full guide (ports, health checks, backup/restore).

