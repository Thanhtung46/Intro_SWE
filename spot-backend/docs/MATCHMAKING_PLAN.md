# SPOT — Matchmaking plan (kèo)

Plan for backend work after auth is done.  
Locked with Nguyễn (2026-08-15). Do **not** implement Group / Tournament in this plan.  
**Tournaments:** see [`TOURNAMENT_PLAN.md`](./TOURNAMENT_PLAN.md) (locked Aug 2026, separate domain).

| | |
| :--- | :--- |
| Domain | `spot-backend/src/domains/matchmaking/` + skill fields on auth |
| Schema | `schema_matchmaking` (new) + `schema_auth.user_sport_skills` |
| Auth | Existing JWT: `Authorization: Bearer <accessToken>`; `req.user = { userId, role, email }` |
| Sports | Badminton + football only |
| API language | English codes / labels. UI may map Vietnamese later. |

**Sources:** PA1 FR-3 / U033–U037, PA2 Match entity, Figma Matches screens, [Vmito](https://vmito.com/vi), [ALO Booking](https://datlich.alobo.vn/).

When a phase is done: update [`API.md`](./API.md) and [`CLAUDE.md`](../CLAUDE.md). Phases 1–5 + post-phase **P0–P3** (Aug 2026) are **done** — see [`api/04-matchmaking.md`](./api/04-matchmaking.md).

---

## 1. What we are building

Pickup **matches** (“kèo”): host publishes a session, players (plus guests) join, host can require approval.

Not in this plan: Groups, Tournaments, real payment gateway, venue booking lock, AI Fill, join codes, auto court assignment.

---

## 2. Locked product decisions

| Topic | Decision |
| :--- | :--- |
| Host model | **Free listing.** No `booking_id`. Time: future start, duration at least 1h (no max). Courts must be named. Pitch occupancy is **global** (see below). |
| Sports | `BADMINTON`, `FOOTBALL` |
| Player skills | **Two independent skills** (one per sport), like Alobo profile. Stored on user, not a single global level. |
| Skill mismatch on join | **Warn** the player. Request is still sent. Host may still approve. |
| Join mode | Host chooses **auto-join** or **approval required**. |
| Guests | Allowed, multiple (`+ Add Guest`). Each person (joiner + each guest) = **1 slot**. |
| Guest fields | `name`, `skill`, **`gender` required** (needed for Min–Max price). |
| Full match | Hide Join. **No waitlist.** Reject join if `1 + guests.length > spotsLeft`. |
| Zalo | **Do not** implement “Contact via Zalo”. |
| Entry fee (MVP) | **Min–Max** (`GENDER_RANGE`: female = `priceMin`, male = `priceMax`) **or** **Chia đều** (`SPLIT_EVENLY`: `priceMin` = total, split by `maxPlayers`). Same `price_min`/`price_max` columns. No `FREE`. |
| Split equally (“Chia đều”) | **In MVP** as `SPLIT_EVENLY`. |
| Flat fixed price (everyone same) | **Dropped** for MVP (only Min–Max or split evenly). |
| Payment | **Stub always Success.** Record the amount; do not call MoMo/VNPay. |
| Recurring / multi-day | Multi-day **off** (`isMultiDay: false`). **Bulk publish** via `POST /matches/bulk` + `schedules[]` (Vmito-style; FE expands weekdays/dates). No cron / auto future weeks. |
| Advanced Settings (Figma collapsed) | Skip (no cover upload, join code, court colors, shuttle brand — notes text is enough). Optional map coords on the match are allowed. |
| `maxPlayers` | **Required** on host (Figma detail shows `Squad 10/14`; Vmito shows `0/16`). |
| Scope order | **Matches only**, then Groups, then Tournaments (later plans). |

### 2.1 Pitch occupancy (all hosts)

A **pitch** = normalized `venueName` + normalized `venueAddress` + normalized court `name` (trim, lowercase, collapse spaces). Same pitch cannot be listed twice in overlapping time, **regardless of who hosts**.

Overlap: `startsAt < other.endsAt AND endsAt > other.startsAt` (half-open). 09:00–11:00 and 10:00–12:00 conflict; 09:00–11:00 and 11:00–13:00 do not.

| Situation | Allowed? |
| :--- | :--- |
| Same pitch, 9–11 vs 9–11, any host | No (`409`) |
| Same pitch, 9–11 vs 10–12 | No |
| Same pitch, 9–11 vs 11–13 (adjacent) | Yes |
| Same venue name + address, same time, **different court name** | Yes |
| Same `venueName`, **different** `venueAddress` | Yes |
| Different `venueName` | Yes |
| Existing listing `CANCELLED` or `COMPLETED` | Yes (does not occupy) |
| Existing listing `OPEN` or `FULL` | Occupies the pitch |
| Different sport on the same pitch+time | No (same physical court) |
| Two hosts POST the same pitch at once | Serialized; one `201`, one `409` |

Free-text venue is not a GPS/catalog lock. `"San ABC"` / `"san  abc"` are the same name; address is compared separately the same way. `"Sân ABC Q7"` vs `"San ABC, Q7"` are **not** auto-merged. Optional `latitude`/`longitude` are for the map pin only — they do not affect occupancy.

---

## 3. Skill ladders

API stores `code`. Labels use ASCII `-` / `+` (not Unicode minus).

### 3.1 Badminton — 10 levels (`sport = BADMINTON`)

| rank | code | Label | Vietnamese |
| :--- | :--- | :--- | :--- |
| 1 | `BEGINNER_MINUS` | Beginner- | Yếu- |
| 2 | `BEGINNER` | Beginner | Yếu |
| 3 | `BEGINNER_PLUS` | Beginner+ | Yếu+ |
| 4 | `LOW_AVERAGE` | Low avg | Trung bình yếu |
| 5 | `AVERAGE_MINUS` | Avg- | Trung bình- |
| 6 | `AVERAGE` | Avg | Trung bình |
| 7 | `AVERAGE_PLUS` | Avg+ | Trung bình+ |
| 8 | `FAIR` | Fair | Khá |
| 9 | `SEMI_PRO` | Semi-pro | Bán chuyên |
| 10 | `PROFESSIONAL` | Pro | Chuyên nghiệp |

### 3.2 Football — 6 levels (`sport = FOOTBALL`)

| rank | code | Label | Vietnamese |
| :--- | :--- | :--- | :--- |
| 1 | `LEARNING` | Learning | Tập chơi |
| 2 | `REC_BASIC` | Rec basic | Phong trào cơ bản |
| 3 | `REC_ADVANCED` | Rec advanced | Phong trào nâng cao |
| 4 | `SEMI_PRO` | Semi-pro | Bán chuyên |
| 5 | `PROFESSIONAL` | Pro | Chuyên nghiệp |
| 6 | `ELITE` | Elite | Đỉnh cao |

`SEMI_PRO` / `PROFESSIONAL` may appear in both sports; always scoped by `sport`.

A match stores `skillMin` + `skillMax` (same sport, by rank).  
**All Levels Welcome** = full ladder for that sport (min rank 1, max last rank).

---

## 4. Formats

| Sport | `format` values |
| :--- | :--- |
| Badminton | `SINGLES` \| `DOUBLES` |
| Football | `FIVE_A_SIDE` \| `SEVEN_A_SIDE` \| `ELEVEN_A_SIDE` |

Courts: `courts: [{ name }]` **required** (số/tên sân, vd. `"1"`, `"Court 1"`). `+ Add Court` → nhiều row `match_courts`. Tên không trùng trên một kèo.

---

## 5. Data sketch

Reuse auth: `schema_auth.users.user_id`, `gender`, JWT `req.user.userId`.

### 5.1 `schema_auth.user_sport_skills`

| Column | Notes |
| :--- | :--- |
| `user_id` | FK → `schema_auth.users` |
| `sport` | `BADMINTON` \| `FOOTBALL` |
| `skill_level` | Code from the ladder for that sport |
| Unique | `(user_id, sport)` — at most one row per sport |

Public user adds:

```json
"skills": { "badminton": "BEGINNER", "football": "LEARNING" }
```

Unset sport → `null`.

### 5.2 `schema_matchmaking.matches` (Phase 2)

Core fields:

- `host_user_id`, `sport`, `format`, `title`, `description`, `notes`
- `venue_name`, `venue_address` (no booking FK)
- `venue_lat`, `venue_lng` (optional map pin; both or neither)
- `starts_at`, `ends_at`
- `is_multi_day`, `is_recurring` (flags only)
- `max_players`, `filled_count`
- `skill_min`, `skill_max`, `all_levels` boolean optional
- `fee_type`: `GENDER_RANGE` \| `SPLIT_EVENLY`
- `price_min`, `price_max` (VND; `GENDER_RANGE` = female/male, `SPLIT_EVENLY` = total in `price_min`)
- `join_mode`: `AUTO` \| `APPROVAL`
- `status`: `OPEN` \| `FULL` \| `COMPLETED` \| `CANCELLED`

Related: `match_courts`, `match_join_requests`, `match_guests`.

**Your share:** `GENDER_RANGE`: female → `price_min`, male → `price_max` (guest uses guest gender). `SPLIT_EVENLY` → `ceil(price_min / max_players)`.

---

## 6. Auth contract (already built — do not redo)

Protected routes:

```http
Authorization: Bearer <accessToken>
```

`req.user = { userId, role, email }` from `authenticate`.  
Use `requireRole('PLAYER')` on host/join when needed (OWNER/REFEREE pending cannot login today).

Layering: `controller / dto / entity / repository / service`. Zod DTOs. `AppError`. Explicit schema names in SQL. Passwords stay argon2id (unchanged).

---

## 7. Implementation order

Stop after each phase so Nguyễn can test.

### Phase 1 — User skills (auth) — **done**

**Why first:** Join Match (Figma) shows “You + skill”; guests pick skill per sport.

- Shared constants: sports + ladders + ranks  
- Migration `002_user_sport_skills.sql`  
- `GET /auth/me` includes `user.skills`  
- `PATCH /auth/me` body `{ "skills": { "badminton": "...", "football": "..." } }`  
  - Omit key = leave unchanged  
  - `null` = clear that sport  
- Login / refresh public `user` also includes `skills`  
- DTO unit tests  

**Verify**

1. `npm run migrate`  
2. Login (existing PLAYER)  
3. `PATCH /auth/me` with both skills  
4. `GET /auth/me` returns both  
5. `PATCH` football `null` → football becomes `null`  
6. Reject `badminton: "ELITE"` (wrong sport) → 400  

### Phase 2 — Host + list + detail — **done**

- `src/domains/matchmaking/` (full layering)  
- Migrations for matches + courts  
- `POST /matches` (auth)  
- `GET /matches` filters: sport, date, timeFrom/timeTo, skill, priceMin/priceMax, location, favorited, hostUserId, lat/lng/radiusKm, province/city  
- `GET /users/:id` — public host profile (`matchCount`, `joinedMatches`, skills, `createdAt`; live `rating`/`reviewCount`; no email/phone)  
- `GET /matches/:id` — squad `filled/max`, `spotsLeft`, `yourShare`, `summary` (post-match)  
- When `filled_count >= max_players` → `status FULL`, `spotsLeft: 0` (FE hides Join)  
- `host.rating` / `host.reviewCount` on list cards from `match_host_reviews`

**Verify:** create one football 7v7 and one badminton doubles; list/filter; detail shows capacity.

### Phase 3 — Join + guests + approval — **reviewed**

- Join request + guests  
- `POST /matches/:id/join` `{ message?, guests: [{ name, skill, gender }] }`  
- Skill out of range → response includes **warning**, request still created  
- Auto vs approval  
- Host: list / accept / reject / kick  
- Slot math; over-capacity → 400  
- Payment stub `SUCCESS` + recorded share  

**Verify:** join with 2 guests (`filledCount` += 1 + guests.length); female/male prices; SPLIT_EVENLY share = `ceil(total/maxPlayers)` per head (stable as squad fills); auto vs approve; full match rejects.

### Phase 4 — Manage (host) — **reviewed**

- `GET /matches/mine?tab=active|completed`  
- Edit (not started) / cancel  
- No waitlist, no Zalo, no real recurring  

**Verify:** smoke path host → join → approve → mine.

### Phase 5 — Docs + smoke — **done**

Update [`API.md`](./API.md) (request/response/errors/curl/checklist).  
Smoke script: `npm run smoke:matches` (`scripts/smoke-matches.js`).

### Post-phase — Manage Matches lifecycle (Aug 2026) — **done**

Figma Manage `101:98` + squad/requests/completed/profile. Contract: [`API.md`](./API.md) changelog + [`CLAUDE.md`](../CLAUDE.md).

| Batch | Delivered |
| :--- | :--- |
| **P0 Lifecycle** | Browse/join chặn sau `endsAt`; `npm run worker:match-expiry`; tab **Completed** = đủ người + hết giờ only; `outcome`/`outcomeMessage`; notify `MATCH_CANCELLED` (`008`) |
| **P1 Manage Squad** | Requests: `avatarUrl`, `skill`, `shareAmount`, `phoneNumber`. Squad: `shareAmount`, `paymentStatus`, `skill`. `DELETE /matches/:id/join` |
| **P2 Requests badge** | `GET /matches/my-join-requests`: `pendingCount`, `?status=`, `hostAvatarUrl`; host `skill` in `participants[]` |
| **P3 Review host** | `POST /matches/:id/review`; `GET /matches/:id` → `summary`; `GET /reviews/hosts/:userId/reviews` (`009`) |

**Completed tab rule (locked):** `ends_at <= now` + `filled_count >= max_players` + `status <> CANCELLED` + participant `ACCEPTED`. **Exclude:** host cancel, underfilled expiry, kicked.

**Verify:** `npm run migrate` (008, 009) → `npm run smoke:matches` → manual: end kèo + worker → review host → profile rating updates.

---

## 8. API map (implemented)

Prefix `/matches` and `/api/matches` (same pattern as auth). Reviews pickup host: `/reviews/hosts/:userId/reviews`.

| Method | Path | Notes |
| :--- | :--- | :--- |
| `PATCH` | `/auth/me` | Phase 1 — skills |
| `GET` | `/users/:id` | Public host profile |
| `POST` | `/matches` | Host create |
| `POST` | `/matches/bulk` | Bulk publish |
| `GET` | `/matches` | Browse + filters |
| `GET` | `/matches/venue-suggestions` | Host location picker |
| `GET` | `/matches/mine` | `?tab=active\|completed` |
| `GET` | `/matches/my-join-requests` | Joiner tab + `pendingCount` |
| `GET` | `/matches/:id` | Detail + `summary` |
| `PATCH` | `/matches/:id` | Host edit (before start) |
| `POST` | `/matches/:id/cancel` | Host cancel + notify |
| `POST` | `/matches/:id/join` | Joiner |
| `DELETE` | `/matches/:id/join` | Joiner hủy PENDING |
| `GET` | `/matches/:id/requests` | Host pending list |
| `POST` | `/matches/:id/requests/:requestId/accept` | Host |
| `POST` | `/matches/:id/requests/:requestId/reject` | Host |
| `POST` | `/matches/:id/participants/:userId/kick` | Host |
| `POST` | `/matches/:id/favorite` / `DELETE` | Heart |
| `POST` | `/matches/:id/review` | Participant rate host |
| `POST` | `/matches/dev/process-expired` | Dev expiry tick |
| `GET` | `/reviews/hosts/:userId/reviews` | Check Profile reviews |
| `GET` | `/geo/vn` | Pre-2025 admin units |

---

## 9. Out of scope (later)

- Groups / clubs  
- Tournaments (standings, schedule, teams)  
- Real payment (MoMo/VNPay); split-evenly fee  
- Match created from a paid booking (`booking_id`)  
- Recurring cron / auto future weeks, multi-day expansion
- Waitlist  
- Zalo / chat with host  
- Cover file upload / S3 (URL-only `coverUrl` is implemented)  
- Geocoding / routing on backend (FE uses Geoapify; host sends `latitude`/`longitude`)  
- Admin approve OWNER/REFEREE (already listed under auth backlog)  
- Recommendation / NLP chatbot (homepage search is **unaccent + fuzzy title/venue/address** via `GET /matches?location=`, plus `suggestions` while typing from our kèo — not AI / Geoapify)
- Public browse hides `FULL` kèo (`OPEN` only + `spotsLeft > 0`); profile `hostUserId` list still shows `FULL`  
- Booking tab / Schedule tab (pickup kèo has no `booking_id`; schedule read exists for venue bookings)  
- Football **position** on squad (Figma field — not stored)  
- Verified-host badge  

**Done (was backlog):**

- Notifications (bell + match cancel types `MATCH_CANCELLED`)  
- **Host rating** — `POST /matches/:id/review`; `host.rating` live on cards + `GET /users/:id`; `null` until first review  

---

## 10. How to review

After **Phase 1**: only profile skills.  
After **Phase 2**: publish/browse kèo.  
After **Phase 3**: full join loop.  
After **Phase 4–5**: host manage + `API.md` + `npm run smoke:matches`.  
After **P0–P3 (Aug 2026)**: lifecycle worker, Completed rules, Manage Squad fields, host review — see [`API.md`](./API.md) changelog.

Tester: Postman + `OTP_DEBUG=true` + auth smoke, then `npm run smoke:matches`. Prod/cron: `npm run worker:match-expiry`.
