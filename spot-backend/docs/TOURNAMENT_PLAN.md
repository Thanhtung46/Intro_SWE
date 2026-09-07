# SPOT — Tournaments plan (giải đấu)

Plan for backend work after Groups (G0–G5).  
Locked with Nguyễn (**2026-08-20**). Tournaments are **independent** from pickup kèo and **Groups** (no `match_id`, no `group_id`).

| | |
| :--- | :--- |
| Domain | `spot-backend/src/domains/tournaments/` |
| Schema | `schema_tournaments` (new migration `012`+) |
| Auth | Existing JWT: `Authorization: Bearer <accessToken>`; `req.user = { userId, role, email }` |
| Sports | `FOOTBALL`, `BADMINTON` only |
| API language | English codes / labels. UI may map Vietnamese later. |
| Currency | **VND only** — display-only fees/prize (no payment gateway) |

**Sources:** Figma Tournament screens (`880:*`, `107:*`), patterns from [`GROUP_PLAN.md`](./GROUP_PLAN.md) (browse/filter/manage), host eligibility from kèo reviews.

When a phase is done: update [`API.md`](./API.md), [`CLAUDE.md`](../CLAUDE.md), root [`CLAUDE.md`](../../CLAUDE.md).

---

## 1. What we are building

**Sport tournaments:** eligible host creates a single-category giải (e.g. one `11v11 Men's` or one `Men's Singles`). Captains register teams (name + logo + roster) → organizer approves. Organizer manually schedules matches, enters results, standings auto-calc PTS with tie-break. Browse, favorite, manage (hosted / joined).

Not in this plan: Groups link, sponsors, payment gateway, skill gate on join, auto-bracket generation, card/referee tooling, real venue booking.

---

## 2. Locked product decisions

| Topic | Decision |
| :--- | :--- |
| vs Kèo / Groups | **Separate domain.** No `match_id`, `group_id`, `booking_id`. |
| One giải = one category | Exactly **one** `format` (+ `genderDivision` for football). Card badge beside title (e.g. `"11v11"`, `"Men's Singles"`). |
| **Hosted by** | Fixed label **`SPOT`** (BE constant). Creator = organizer; shown with creator profile. |
| Create eligibility | **`hostedCompletedCount >= 80`** (kèo host, `status = COMPLETED`) **and** **`hostRating.avgRating >= 4.5`** (pickup reviews). Fail → **`403`**. No minimum review-count floor. |
| Join mode | **APPROVAL only** — always `PENDING` until organizer accept/reject. |
| Join identity | **Captain** = authenticated joiner. **One user = one join request per tournament.** |
| Team entry | **Always** `teamName` + `teamLogoUrl` (badminton singles included). Organizer contacts captain via **profile + phone** (no extra phone field on form). |
| Football roster | Each player: **`name`** + **`jerseyNumber`** (required, **unique within team**). Max squad = **format size + 5** → 5v5→**10**, 7v7→**12**, 11v11→**16**. |
| Badminton roster | Singles (`MS`/`WS`): **1** player. Doubles / Mixed: **2** players. |
| `teamCount` | **Accepted teams only.** PENDING join requests **not** counted. |
| `REJECTED` | Captain **may re-apply** (new request row). |
| Captain withdraw | Only while **`OPEN_REGISTRATION`**, **not FULL**, **before `registrationDeadline`**. |
| Organizer kick | Only **before `startsAt`** (before `ACTIVE`). Kicked captain → terminal **`403`** rejoin (mirror group/kèo kick). |
| Organizer cancel | **Before `startsAt` only** (`OPEN_REGISTRATION` or `FULL`). **Not after `ACTIVE`.** Notify organizer + all accepted captains. |
| Auto-cancel | At **`registrationDeadline`**: if **not FULL** → `CANCELLED` + notify organizer + accepted captains. |
| FULL | `acceptedTeamCount = maxTeams` → hide Join + hide from browse. Organizer may still cancel before `startsAt`. |
| ACTIVE | Auto when **`startsAt`** reached **and** status was **`FULL`**. |
| COMPLETED | Auto when **`endsAt`** reached **or** organizer **`POST .../complete`** early (T4). |
| Edit after ACTIVE | **Lock** `venue*`, `startsAt`, `endsAt`, geo fields. Other fields (description, fee display, etc.) may PATCH per product. |
| Matches | Organizer **manual**: `round` + `teamA` + `teamB` + `scheduledAt`. Venue = tournament venue (fixed). |
| Football match | **Single leg** (not home/away two legs). Result = goals **teamA** vs **teamB**. **Draw allowed.** |
| Badminton match | **BO3**, **15 pts/set**, win by **2**, deuce at **15–15**. No draw. |
| Standings PTS | **W=3, D=1, L=0** (football draws). Badminton: **W=3, L=0**. Auto from match results. |
| Tie-break | **Goal difference** (football) / **set difference** (badminton). Organizer may override display on tournament update. |
| Winners / player ranks | **Manual** by organizer on tournament update. Players tab (completed): in-team ranking manual. |
| Rules | **`description`** (About) only — no Rules tab. |
| Favorites | `tournament_favorites` — heart on browse (Figma gap). |
| Browse filter | Reuse **Groups** geo/filter — **omit skill level**. |
| Browse exclusion | Hide if caller join `PENDING` / `ACCEPTED`; **`REJECTED` visible again**. Hide **`FULL`**. |
| Money | `registrationFeeVnd`, `prizePoolVnd` — **required at create**, display-only. |
| Notifications | Inbox only (`sendEmail: false`) — see §2.1. |

### 2.1 Sports & formats

| Sport | `format` | `genderDivision` | Card badge example |
| :--- | :--- | :--- | :--- |
| `FOOTBALL` | `FIVE_A_SIDE`, `SEVEN_A_SIDE`, `ELEVEN_A_SIDE` | `MEN`, `WOMEN` | `"5v5"`, `"11v11 Women's"` |
| `BADMINTON` | `MS`, `WS`, `MD`, `WD`, `MIXED` | `null` | `"Men's Singles"`, `"Mixed Doubles"` |

### 2.2 Match rounds (BE enum)

`GROUP_STAGE` · `ROUND_OF_32` · `ROUND_OF_16` · `QUARTER_FINAL` · `SEMI_FINAL` · `THIRD_PLACE` · `FINAL`

### 2.3 Lifecycle

```
OPEN_REGISTRATION → FULL → ACTIVE → COMPLETED
        ↓              ↓
    CANCELLED      CANCELLED (organizer, before startsAt)
        ↑
    auto at registrationDeadline if not FULL
```

| Status | Trigger |
| :--- | :--- |
| `OPEN_REGISTRATION` | On create (registration open immediately) |
| `FULL` | Last team accepted → `acceptedTeamCount = maxTeams` |
| `ACTIVE` | Cron/lazy: `now >= startsAt` AND status was `FULL` |
| `COMPLETED` | `now >= endsAt` OR organizer `POST .../complete` |
| `CANCELLED` | Organizer cancel before `startsAt`; OR deadline passed without FULL |

### 2.4 Manage Tournaments (FAB — mirror Groups `101:2`)

| Tab | Section | API sketch |
| :--- | :--- | :--- |
| **Hosted by Me** | My Tournaments | `GET /tournaments/mine?tab=hosted&section=tournaments` |
| | Pending Requests | `GET /tournaments/mine?tab=hosted&section=pending-requests` or `GET /tournaments/:id/requests` |
| **Joined** | Tournaments | `GET /tournaments/mine?tab=joined&section=tournaments` |
| | Join Requests | `GET /tournaments/my-join-requests` |

### 2.5 Notifications

| Event | Recipient | Type |
| :--- | :--- | :--- |
| Join submitted | Organizer | `TOURNAMENT_JOIN_REQUEST` |
| Join approved | Captain | `TOURNAMENT_JOIN_APPROVED` |
| Join rejected | Captain | `TOURNAMENT_JOIN_REJECTED` |
| Giải cancelled | Organizer + captains | `TOURNAMENT_CANCELLED` |
| Team kicked | Captain | `TOURNAMENT_KICKED` |
| Info updated | Participants | `TOURNAMENT_UPDATED` |

---

## 3. Create Tournament form (Figma missing — BE + FE contract)

**Required fields:**

| Field | Notes |
| :--- | :--- |
| `sport` | `FOOTBALL` \| `BADMINTON` |
| `format` | See §2.1 |
| `genderDivision` | Required for football; omit/null for badminton |
| `title` | Card + detail title |
| `coverUrl` | FE Supabase Storage → URL |
| `description` | About + rules |
| `venueName`, `venueAddress`, `province`, `city` | Pre-2025 admin units (`GET /geo/vn`) |
| `latitude`, `longitude` | Required pair |
| `startsAt`, `endsAt` | ISO +07; `endsAt >= startsAt` |
| `registrationDeadline` | Must be before `startsAt` (validate) |
| `maxTeams` | ≥ 2 recommended |
| `registrationFeeVnd`, `prizePoolVnd` | Integer VND, display-only |

**Not required:** `registrationOpensAt` (opens on publish).

```json
POST /tournaments
{
  "sport": "FOOTBALL",
  "format": "ELEVEN_A_SIDE",
  "genderDivision": "MEN",
  "title": "Saigon Champions Cup",
  "coverUrl": "https://...",
  "description": "Rules and about text...",
  "venueName": "San ABC",
  "venueAddress": "123 Nguyen Van Linh, Q7, TP.HCM",
  "province": "79",
  "city": "778",
  "latitude": 10.73,
  "longitude": 106.72,
  "startsAt": "2026-09-01T08:00:00+07:00",
  "endsAt": "2026-09-15T22:00:00+07:00",
  "registrationDeadline": "2026-08-25T23:59:59+07:00",
  "maxTeams": 16,
  "registrationFeeVnd": 500000,
  "prizePoolVnd": 10000000
}
```

**Eligibility check (before insert):**

```sql
-- hostedCompletedCount: COUNT matches WHERE host_user_id = $user AND status = 'COMPLETED'
-- hostRating: aggregate from schema_matchmaking.match_host_reviews (existing service)
```

---

## 4. Join form

```json
POST /tournaments/:id/join
{
  "teamName": "District 7 FC",
  "teamLogoUrl": "https://...",
  "roster": [
    { "name": "Nguyen Van A", "jerseyNumber": 10 },
    { "name": "Tran Van B", "jerseyNumber": 7 }
  ]
}
```

- Badminton singles: `roster` length **1** (jersey optional / omit).
- Badminton doubles/mixed: length **2**.
- Football: length **1..maxSquad** per format; jersey required + unique per team.
- Creates `PENDING` join request; captain = `req.user.userId`.

---

## 5. Detail tabs (Figma unified)

| Tab | Upcoming / Active | Completed |
| :--- | :--- | :--- |
| **Overview** | Fee, prize, venue, dates, teams preview, **Join Tournament** CTA | + manual winners |
| **Matches** | Organizer-created schedule | Results |
| **Standings** | PTS table (from results) | Final |
| **Players** | All roster players on accepted teams | In-team ranks (manual) |

CTA: **Join Tournament** (hidden when FULL / past deadline / already joined / not eligible).

---

## 6. Matches & results

Organizer creates each match:

```json
POST /tournaments/:id/matches
{
  "round": "GROUP_STAGE",
  "teamAId": 1,
  "teamBId": 2,
  "scheduledAt": "2026-09-02T14:00:00+07:00"
}
```

**Football result (single leg):**

```json
PATCH /tournaments/:id/matches/:matchId/result
{
  "teamAGoals": 2,
  "teamBGoals": 2
}
```

**Badminton result:**

```json
PATCH /tournaments/:id/matches/:matchId/result
{
  "sets": [
    { "teamAPoints": 15, "teamBPoints": 12 },
    { "teamAPoints": 13, "teamBPoints": 15 },
    { "teamAPoints": 15, "teamBPoints": 10 }
  ]
}
```

Validate: win set by 2 from 15; deuce continuation at 15–15.

---

## 7. Data sketch

Migration **`012_schema_tournaments.sql`** (+ **`013_notification_tournament_types.sql`**). Reuse `fold_search_text` for browse search on `title` / venue.

### 7.1 `schema_tournaments.tournaments`

| Column | Notes |
| :--- | :--- |
| `tournament_id` | PK |
| `organizer_user_id` | FK → users |
| `sport` | `FOOTBALL` \| `BADMINTON` |
| `format` | See §2.1 |
| `gender_division` | `MEN` \| `WOMEN` \| null |
| `title`, `description` | |
| `cover_url` | |
| `venue_name`, `venue_address`, `province`, `city`, `venue_lat`, `venue_lng` | Fixed venue |
| `starts_at`, `ends_at`, `registration_deadline` | timestamptz |
| `max_teams`, `accepted_team_count` | Denormalized count |
| `registration_fee_vnd`, `prize_pool_vnd` | bigint |
| `status` | `OPEN_REGISTRATION` \| `FULL` \| `ACTIVE` \| `COMPLETED` \| `CANCELLED` |
| `hosted_by_label` | Always `'SPOT'` |
| `winners_json` | Manual podium (T4) — nullable JSON |
| `created_at`, `updated_at` | |

### 7.2 Related tables

| Table | Purpose |
| :--- | :--- |
| `tournament_teams` | Accepted entry: `tournament_id`, `captain_user_id`, `team_name`, `team_logo_url`, `join_request_id`, `created_at` |
| `tournament_roster_players` | `team_id`, `name`, `jersey_number` (nullable badminton), `sort_order` |
| `tournament_join_requests` | `tournament_id`, `captain_user_id`, `team_name`, `team_logo_url`, `status` (`PENDING`\|`ACCEPTED`\|`REJECTED`\|`KICKED`), roster snapshot JSON, unique `(tournament_id, captain_user_id)` |
| `tournament_matches` | `tournament_id`, `round`, `team_a_id`, `team_b_id`, `scheduled_at`, result columns / `sets_json` |
| `tournament_player_ranks` | Manual in-team rank: `team_id`, `roster_player_id`, `rank`, `note?` |
| `tournament_favorites` | `(user_id, tournament_id)` PK |

No link to `schema_groups` or `schema_matchmaking.matches`.

---

## 8. Auth contract

Same as groups: `authenticate`, `requireRole('PLAYER')` on mutating routes.

Organizer-only: approve/reject, kick, cancel, match CRUD, result entry, `POST .../complete`, manual winners/ranks.

Layering: `controller / dto / entity / repository / service`. Zod DTOs. `AppError`.

---

## 9. Background jobs

| Job | Action |
| :--- | :--- |
| Registration deadline | `OPEN_REGISTRATION` + `now > registration_deadline` + not FULL → `CANCELLED` + notify |
| Start tournament | `FULL` + `now >= starts_at` → `ACTIVE` |
| End tournament | `ACTIVE` + `now >= ends_at` → `COMPLETED` |

Dev mirror: `POST /tournaments/dev/process-lifecycle` (non-prod), similar to match expiry worker.

---

## 10. Implementation order

Stop after each phase so Nguyễn can test.

### Phase T0 — Schema + create + browse + detail + join

- Migration `012_schema_tournaments.sql`
- Create gate (80 completed + rating ≥ 4.5)
- `POST /tournaments`, `GET /tournaments`, `GET /tournaments/:id`
- `POST /tournaments/:id/join`, `DELETE /tournaments/:id/join` (withdraw PENDING)
- `GET /tournaments/mine`, `GET /tournaments/my-join-requests`
- Favorites

**Verify:** create 11v11 giải; browse with format badge; join with roster pending; deadline auto-cancel when not full.

### Phase T1 — Organizer manage + notifications

- Accept / reject join; kick team; cancel giải
- `PATCH /tournaments/:id` (respect ACTIVE lock)
- Migration `013` notification types
- Deadline + start lifecycle worker

**Verify:** approve → FULL at cap; cancel before startsAt notifies captains; reject → re-join.

### Phase T2 — Matches + results — **done**

- Migration `014_schema_tournament_matches.sql`
- `GET/POST/PATCH/DELETE /tournaments/:id/matches`
- `PATCH /tournaments/:id/matches/:matchId/result`
- Football goals; badminton sets validation (`tournament-scoring.js`)

**Verify:** create group-stage match; enter 2-2 football draw; enter badminton 2-1 sets.

### Phase T3 — Standings — **done**

- `GET /tournaments/:id/standings?round=` — PTS + tie-break (`tournament-standings.js`)

**Verify:** 3-team group table matches manual PTS/GD calc; `?round=GROUP_STAGE` excludes knockout.

### Phase T4 — Completed experience — **done**

- `POST /tournaments/:id/complete` (early; optional `winners[]`)
- `PATCH /tournaments/:id` — manual `winners`, `playerRanks`, ACTIVE field lock
- `GET /tournaments/:id/players` — roster + in-team ranks (sorted by rank)

**Verify:** completed overview with winners; in-team ranks on Players tab; locked venue after ACTIVE.

### Phase T5 — Docs + smoke — **done**

- Update [`api/06-tournaments.md`](./api/06-tournaments.md), CLAUDE files
- `npm run smoke:tournaments`

---

## 11. API map (planned)

Prefix `/tournaments` and `/api/tournaments`. Static routes **before** `GET /:id`.

| Method | Path | Notes |
| :--- | :--- | :--- |
| `POST` | `/tournaments` | Create; eligibility gate |
| `GET` | `/tournaments` | Browse + filters |
| `GET` | `/tournaments/mine` | Hosted / joined tabs |
| `GET` | `/tournaments/my-join-requests` | Captain outbound |
| `GET` | `/tournaments/:id` | Detail overview |
| `PATCH` | `/tournaments/:id` | Organizer edit |
| `POST` | `/tournaments/:id/cancel` | Before `startsAt` |
| `POST` | `/tournaments/:id/complete` | Early complete (T4) |
| `POST` | `/tournaments/:id/join` | Captain register |
| `DELETE` | `/tournaments/:id/join` | Withdraw PENDING |
| `GET` | `/tournaments/:id/requests` | Organizer pending |
| `POST` | `/tournaments/:id/requests/:requestId/accept` | |
| `POST` | `/tournaments/:id/requests/:requestId/reject` | |
| `POST` | `/tournaments/:id/teams/:teamId/kick` | Before `startsAt` |
| `POST` / `DELETE` | `/tournaments/:id/favorite` | |
| `GET` | `/tournaments/:id/matches` | Schedule / results |
| `POST` | `/tournaments/:id/matches` | Organizer |
| `PATCH` | `/tournaments/:id/matches/:matchId/result` | |
| `GET` | `/tournaments/:id/standings` | |
| `GET` | `/tournaments/:id/players` | Roster + ranks |

---

## 12. Error cases (selected)

| Case | Code |
| :--- | :--- |
| Create without eligibility | `403` |
| Join when not `OPEN_REGISTRATION` | `400` |
| Join after `registrationDeadline` | `400` |
| Join when FULL | `400` |
| Duplicate join (same captain) | `409` |
| Roster size / jersey validation fail | `400` |
| Withdraw when FULL or past deadline | `400` |
| Kick / cancel after `startsAt` | `400` |
| Cancel after `ACTIVE` | `400` |
| PATCH locked fields after `ACTIVE` | `400` |
| Kicked captain rejoin | `403` |
| Non-organizer manage | `403` |

---

## 13. Out of scope (later)

- Groups ↔ tournament link
- Sponsors
- Payment / MoMo / VNPay
- Skill gate on join
- Auto bracket / fixture generator
- Card penalties / referee tools
- `registrationOpensAt` scheduling
- Multi-category giải (one row per category)

---

## 14. Figma reference

| Node | Screen |
| :--- | :--- |
| `880:404` | Homepage — Tournaments browse + FAB |
| `880:282` | Detail Upcoming (Football) |
| `107:249` | Overview Complete (Badminton) |
| `107:380` | Standings |
| `107:533` | Matches |
| `107:2` | Players |
| — | **Missing:** Create, Manage, Join form, favorite heart |

File: `ZTpFWfkdcEpHH4xJaKaBxT/Spot`

Detail tabs (all sports): **Overview | Matches | Standings | Players**. CTA: **Join Tournament**.

---

## 15. How to review

After **T0**: create + browse + join pending.  
After **T1**: approve/reject + cancel + deadline worker + notifications.  
After **T2**: matches + results.  
After **T5**: `api/06-tournaments.md` + `npm run smoke:tournaments`. **MVP tournaments BE complete.**  
After **T5**: `API.md` + `npm run smoke:tournaments`.
