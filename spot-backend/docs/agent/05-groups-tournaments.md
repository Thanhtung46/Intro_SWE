# spot-backend agent notes — Groups (hội) & Tournaments (giải đấu)

Part of the spot-backend agent notes — see [../../CLAUDE.md](../../CLAUDE.md) for the index. API contracts: [../api/05-groups.md](../api/05-groups.md), [../api/06-tournaments.md](../api/06-tournaments.md).

### Groups (hội)

Sport **clubs** separate from pickup kèo. Contract: [`docs/api/05-groups.md`](./docs/api/05-groups.md). Product lock: [`docs/GROUP_PLAN.md`](./docs/GROUP_PLAN.md).

**Figma → API**

| Screen | Node | API |
| :--- | :--- | :--- |
| Browse Groups | `810:612` | `GET /groups` + filters/search |
| Detail About | `810:156` | `GET /groups/:id` |
| Detail Schedule | `810:772` | `GET /groups/:id/schedule?date=` |
| Detail Members | `810:924` | `GET /groups/:id/members?search=` |
| Detail Gallery | `810:308` | `GET/POST/DELETE /groups/:id/gallery` |
| Manage Groups | `101:2` | `GET /groups/mine` |

**Key rules (locked)**

- `name` = GROUP NAME; `title` = tagline; sport from Homepage tab (`?sport=` on create).
- Join skill = **hard gate** (`400`) — unlike kèo `skillWarning`.
- `memberCount` = admin + **accepted** members; PENDING not counted. **AUTO join** → +1 immediately; **APPROVAL** → +1 only on accept (or flush).
- Roles: `ADMIN` \| `MEMBER` only; one admin; transfer before admin leave.
- Kicked → terminal `KICKED`, rejoin same group → `403`. `REJECTED` may rejoin.
- `PATCH` courts = **replace** (clears slots unless `recurringSlots` resent).
- `joinMode` → `AUTO` in PATCH auto-accepts all `PENDING`.
- Schedule matrix: 30-min steps; `BOOKED` = overlaps recurring slot (not real booking).
- Gallery: admin only; Supabase URL on FE; max 50 images.

**Browse exclusion (`GET /groups`)** — hide groups where caller is member or join request `PENDING`/`KICKED`; **`REJECTED` visible again**.

**Static routes before `GET /:id`:** `/mine`, `/my-join-requests`, then `/:id/members`, `/:id/schedule`, `/:id/gallery`, `/:id/requests`, …

**Schema (`schema_groups`)** — `010_schema_groups.sql`: `groups`, `group_courts`, `group_schedule_slots`, `group_members`, `group_join_requests`, `group_favorites`, `group_gallery_images`. Reuses `schema_matchmaking.fold_search_text` for browse search.

**Smoke:** `npm run smoke:groups` (`scripts/smoke-groups.js`) — needs server + `OTP_DEBUG=true`; includes inbox type checks.

**Notifications (G5):** `group-notification.service.js` → `createNotification` after successful group actions. Types in `shared/constants/notification.js`; migration `011`. In-app only (`sendEmail: false`).

| Event | Recipient | Type |
| :--- | :--- | :--- |
| Join (`APPROVAL`) | Admin | `GROUP_JOIN_REQUEST` |
| Join (`AUTO`) | Joiner | `GROUP_APPROVED` |
| Accept request | Joiner | `GROUP_APPROVED` |
| Reject request | Joiner | `GROUP_REJECTED` |
| Kick member | Kicked user | `GROUP_KICKED` |
| Transfer admin | New admin | `GROUP_ADMIN_TRANSFERRED` |
| PATCH `joinMode`→`AUTO` flush | Each flushed joiner | `GROUP_APPROVED` |

**Out of scope:** group ↔ kèo link; **tournaments** (separate domain — see **Tournaments (giải đấu)**); real venue booking on schedule tab; group chat; max members cap (unless product adds).

### Tournaments (giải đấu)

Sport **tournaments** separate from pickup kèo **and** groups (no `group_id`, no `match_id`). Locked with Nguyễn **Aug 2026** — **BE T0–T5 implemented**. Domain: `src/domains/tournaments/`, schema `schema_tournaments`. **FE contract:** [`docs/api/06-tournaments.md`](./docs/api/06-tournaments.md).

**Figma → screens (reviewed nodes)**

| Screen | Node | Notes |
| :--- | :--- | :--- |
| Homepage tab Tournaments | `880:404` | Browse cards + FAB Create/Manage; format badge beside title |
| Detail Upcoming (Football) | `880:282` | Tabs: **Overview \| Matches \| Standings \| Players**; CTA **Join Tournament** |
| Overview Complete (Badminton) | `107:249` | Same tab set; no Sponsors (MVP) |
| Standings | `107:380` | PTS table; category implicit (1 giải = 1 hạng mục) |
| Matches schedule | `107:533` | Round + team pair + datetime |
| Players | `107:2` | Roster / in-team rank when completed |
| **Missing Figma** | — | Create Tournament, Manage Tournaments, Join registration form — FE may proceed from locks below |

**Sports & format (1 tournament = exactly 1 category)**

| Sport | `format` | `genderDivision` |
| :--- | :--- | :--- |
| `FOOTBALL` | `FIVE_A_SIDE` (5v5), `SEVEN_A_SIDE` (7v7), `ELEVEN_A_SIDE` (11v11) | `MEN` \| `WOMEN` — badge e.g. `"11v11"` / `"11v11 Women's"` |
| `BADMINTON` | `MS`, `WS`, `MD`, `WD`, `MIXED` | `null` (gender encoded in format; Mixed = `MIXED`) |

**FE — format / sport / gender:** set **only** on `POST /tournaments`. **`PATCH /tournaments/:id` does not accept `sport`, `format`, or `genderDivision`** — đổi thể thức = tạo giải mới.

Browse card: **`title`** + format badge (e.g. `Saigon Champions Cup` · `"11v11"`). Currency **VND only** (`registrationFeeVnd`, `prizePoolVnd` display-only — **no payment gateway**).

**Create tournament — eligibility gate**

Only users who pass **both**:

- `hostedCompletedCount >= 80` — kèo where caller is host and `status = COMPLETED`
- `hostRating.avgRating >= 4.5` — from pickup kèo host reviews (`match_host_reviews`); no minimum review-count floor (80 completed hosts is enough sample)

Fail → **`403`** on `POST /tournaments`.

**Create tournament — required fields**

| Field | Required | Notes |
| :--- | :--- | :--- |
| `sport` | ✅ | `FOOTBALL` \| `BADMINTON` (Homepage tab or explicit picker) |
| `format` | ✅ | See table above |
| `genderDivision` | ✅ football only | `MEN` \| `WOMEN` |
| `title`, `coverUrl`, `description` | ✅ | Rules / About live in `description` only (no Rules tab) |
| `venueName`, `venueAddress`, `province`, `city`, `latitude`, `longitude` | ✅ | Fixed venue for whole giải — match rows only add **date/time** |
| `startsAt`, `endsAt` | ✅ | `endsAt >= startsAt` |
| `registrationDeadline` | ✅ | After deadline: **no new joins**; if still not FULL → **auto `CANCELLED`** + notify organizer + accepted captains |
| `maxTeams` | ✅ | Cap accepted teams; reaching cap → **`FULL`** |
| `registrationFeeVnd`, `prizePoolVnd` | ✅ | Display-only |
| `registrationOpensAt` | ❌ | Registration opens immediately on publish |
| `hostedByLabel` | BE constant | Always **`"SPOT"`** (fixed text — user cannot override) |

Cover / team logo: FE **Supabase Storage** → public URL → BE stores URL (same pattern as kèo `coverUrl` / group gallery).

**Lifecycle & status**

```
OPEN_REGISTRATION → FULL → ACTIVE → COMPLETED
        ↓              ↓
    CANCELLED      CANCELLED (organizer; notify captains)
```

| Status | Rules |
| :--- | :--- |
| `OPEN_REGISTRATION` | Join allowed until `registrationDeadline` and not at `maxTeams` |
| `FULL` | `acceptedTeamCount = maxTeams`; **hide Join** + **hide from browse**; organizer **may cancel** (notify all captains) |
| `ACTIVE` | Auto when `startsAt` reached **and** status was `FULL` |
| `COMPLETED` | Auto when **`endsAt`** reached **or** organizer **`POST /tournaments/:id/complete`** early |
| `CANCELLED` | Organizer cancel **before `startsAt` only** (`OPEN_REGISTRATION` or `FULL`); **auto** at `registrationDeadline` if not FULL; notify organizer + participants. **No cancel after `ACTIVE`.** |

**After `ACTIVE`:** organizer **cannot PATCH** `venue*`, `startsAt`, `endsAt`, or fixed location fields (locked).

**Join registration (always captain + APPROVAL only)**

- **`POST /tournaments/:id/join`** → **`PENDING`** until organizer approve/reject.
- **One user = one join request per tournament** (single category per giải).
- **Required:** `teamName`, `teamLogoUrl`, `roster[]`.
- Captain = authenticated joiner → organizer views captain **profile + phone** on request (no separate contact field on form).

| Sport | Roster rules |
| :--- | :--- |
| **Football** | Each player: **`name`** + **`jerseyNumber`** (required, **unique within team**). Max squad = **format size + 5** → 5v5→**10**, 7v7→**12**, 11v11→**16** |
| **Badminton singles** (`MS`/`WS`) | **1** player |
| **Badminton doubles / mixed** | **2** players |

| Edge case | Rule |
| :--- | :--- |
| `REJECTED` | Captain **may submit again** (new request) |
| Captain **withdraw** | Only while `OPEN_REGISTRATION`, **not FULL**, and **before `registrationDeadline`** |
| Organizer **kick team** | Only **before `startsAt`** (before giải becomes `ACTIVE`) |
| Kicked captain | Terminal for that giải (mirror group kick — **`403`** rejoin) |

**Browse (`GET /tournaments`)**

- Reuse **Groups filter** pattern: location, province/city, distance — **omit skill level**.
- Hide tournaments the caller **organizes** (manage via Mine / Manage Tournaments).
- Hide tournaments where caller has join request **`PENDING`** or **`ACCEPTED`** or **`KICKED`** (**`REJECTED`** visible again).
- Hide **`FULL`** from public browse (same spirit as kèo hiding FULL).
- **Favorites:** `POST/DELETE /tournaments/:id/favorite` + `isFavorited` on list/detail (Figma heart not drawn yet — still in scope).

**Detail tabs**

| Tab | Upcoming / Active | Completed |
| :--- | :--- | :--- |
| **Overview** | About, fee, prize, venue, dates, registered teams preview | + winners (manual), final summary |
| **Matches** | Schedule list (may be empty until organizer adds) | Results |
| **Standings** | From entered results (PTS calc) | Final table |
| **Players** | Players of all **accepted** teams | **In-team member ranking** (manual — organizer sets on tournament update) |

**Matches — organizer manual entry (T2 implemented)**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/tournaments/:id/matches` | List schedule + results |
| `POST` | `/tournaments/:id/matches` | Organizer; `{ round, teamAId, teamBId, scheduledAt }` |
| `PATCH` | `/tournaments/:id/matches/:matchId` | Reschedule / change teams (clears result if teams change) |
| `PATCH` | `/tournaments/:id/matches/:matchId/result` | Football: `{ teamAGoals, teamBGoals }` · Badminton: `{ sets[] }` |
| `DELETE` | `/tournaments/:id/matches/:matchId` | Organizer |

- **Football:** single leg, draw allowed → `result.outcome` `DRAW` \| `WIN`, `winnerTeamId` null on draw.
- **Badminton:** BO3 sets, 15 pts, win-by-2, deuce; 1 set allowed (in progress), 2-0 or 2-1 complete.
- **Rounds:** `GROUP_STAGE`, `ROUND_OF_32`, `ROUND_OF_16`, `QUARTER_FINAL`, `SEMI_FINAL`, `THIRD_PLACE`, `FINAL`.
- `scheduledAt` must fall between tournament `startsAt` and `endsAt`.

Venue fixed on tournament detail; per match: **`round`**, **`teamA`**, **`teamB`**, **`scheduledAt`**.

**FE — “giải đang ở vòng nào?”:** BE **không có** field `currentRound` trên tournament. Vòng đấu gắn **từng trận** (`match.round`). FE: `GET /tournaments/:id/matches` → group/filter theo `round`; tab Standings dùng `?round=GROUP_STAGE` (optional). Chuyển vòng knock-out = organizer **tạo trận mới** (`POST .../matches`) hoặc **PATCH** `round` trên trận có sẵn — không PATCH giải.

**Round labels (BE enum — fixed set)**

`GROUP_STAGE` · `ROUND_OF_32` · `ROUND_OF_16` · `QUARTER_FINAL` · `SEMI_FINAL` · `THIRD_PLACE` · `FINAL`

**Standings (T3 implemented)**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/tournaments/:id/standings` | Optional `?round=GROUP_STAGE` filters which match results count |

- All **accepted teams** listed (0 `played` if no results).
- **Football:** W=3, D=1, L=0 · tie-break: **goalDifference** → **goalsFor** → team name.
- **Badminton:** W=3, L=0 · only **completed** BO3 matches count · tie-break: **setDifference** → **pointDifference** → **pointsFor**.
- Response: `{ tournamentId, sport, round, standings: [{ rank, teamId, teamName, teamLogoUrl, played, won, lost, pts, ... }] }`.

**Update & completed (T4 implemented)**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `PATCH` | `/tournaments/:id` | Organizer; partial update |
| `POST` | `/tournaments/:id/complete` | Early complete when `ACTIVE`; optional `winners[]` |
| `GET` | `/tournaments/:id/players` | Accepted teams + roster; sorted by in-team `rank` |

- **ACTIVE lock:** cannot PATCH `venue*`, geo, `startsAt`, `endsAt`, `registrationDeadline` after `ACTIVE`.
- **`winners`:** `[{ place, teamId }]` → stored in `winners_json`; shown on completed Overview.
- **`playerRanks`:** `[{ rosterPlayerId, rank \| null }]` — manual in-team order on Players tab.
- Non-locked info changes notify accepted captains (`TOURNAMENT_UPDATED`).

**Manage Tournaments (FAB — mirror Manage Groups `101:2`)**

| Tab | Section | Content |
| :--- | :--- | :--- |
| **Hosted by Me** | My Tournaments | Giải user created (organizer) |
| | Pending Requests | Inbound join requests to approve/reject |
| **Joined** | Tournaments | Giải user joined (captain / accepted) |
| | Join Requests | Outbound `PENDING` / `REJECTED` |

Organizer manage: approve/reject join, **manual** match create + result entry, PATCH info (except locked fields after `ACTIVE`), cancel giải **before `startsAt` only** (with notifications).

**Notifications (inbox only, `sendEmail: false`)**

| Event | Recipient | Type |
| :--- | :--- | :--- |
| Join submitted | Organizer | `TOURNAMENT_JOIN_REQUEST` |
| Approved / rejected | Captain | `TOURNAMENT_JOIN_APPROVED` / `TOURNAMENT_JOIN_REJECTED` |
| Giải cancelled (manual or auto deadline) | Organizer + captains | `TOURNAMENT_CANCELLED` |
| Team kicked | Captain | `TOURNAMENT_KICKED` |
| Info updated (non-locked fields) | Participants | `TOURNAMENT_UPDATED` |

**Smoke / dev test create gate:** `npm run smoke:tournaments` (`scripts/smoke-tournaments.js`) — needs server + `OTP_DEBUG=true` + DB; script **tự seed** 80 kèo COMPLETED + host review cho account smoke. Test bằng account riêng: seed DB thủ công (xem `seedOrganizerEligibility` trong script) — **không có** dev bypass API / env skip eligibility.

**Implementation phases**

| Phase | Status |
| :--- | :--- |
| **T0** | Done — browse, detail, join, mine, favorites |
| **T1** | Done — approve/reject, cancel, kick, notifications, lifecycle worker |
| **T2** | Done — matches CRUD + manual result (football goals / badminton sets) |
| **T3** | Done — `GET /tournaments/:id/standings` (PTS, GD / set diff tie-break) |
| **T4** | Done — PATCH tournament, winners, player ranks, early complete |
| **T5** | Done — `docs/api/06-tournaments.md`, `npm run smoke:tournaments` |

**Out of scope (tournaments MVP):** link to **Groups**; sponsors; payment gateway; skill gate on join; real bracket auto-generation; card penalty / referee tooling; `registrationOpensAt` scheduling.

