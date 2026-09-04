# API Reference — Tournaments (giải đấu)

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 9. Tournaments endpoints

Base: `/tournaments` hoặc `/api/tournaments`. Mọi route cần Bearer.  
`POST /tournaments`, `POST /tournaments/:id/join`, `DELETE /tournaments/:id/join`, `PATCH /tournaments/:id` thêm `requireRole('PLAYER')`.  
Route tĩnh (`/mine`, `/my-join-requests`) **trước** `GET /:id`. Sub-routes (`/matches`, `/standings`, `/players`, …) **trước** `GET /:id`.

Product lock: [`docs/TOURNAMENT_PLAN.md`](./TOURNAMENT_PLAN.md). Schema: `012`–`014` (`schema_tournaments`).

**Tách biệt** kèo và Groups — không có `match_id` / `group_id`.

**API map**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `POST` | `/tournaments` | Create; gate 80 kèo COMPLETED + host rating ≥ 4.5 |
| `GET` | `/tournaments` | Browse (ẩn FULL; ẩn PENDING/ACCEPTED join) |
| `GET` | `/tournaments/mine` | `?tab=hosted\|joined` + `section` |
| `GET` | `/tournaments/my-join-requests` | Captain outbound |
| `GET` | `/tournaments/:id` | Detail Overview |
| `PATCH` | `/tournaments/:id` | Organizer edit; winners + playerRanks |
| `POST` | `/tournaments/:id/cancel` | Before `startsAt` only |
| `POST` | `/tournaments/:id/complete` | Early complete when `ACTIVE` |
| `POST` | `/tournaments/:id/join` | Captain register (APPROVAL only) |
| `DELETE` | `/tournaments/:id/join` | Withdraw PENDING |
| `GET` | `/tournaments/:id/requests` | Organizer pending |
| `POST` | `/tournaments/:id/requests/:requestId/accept` | |
| `POST` | `/tournaments/:id/requests/:requestId/reject` | |
| `POST` | `/tournaments/:id/teams/:teamId/kick` | Before `startsAt` |
| `POST` / `DELETE` | `/tournaments/:id/favorite` | Heart |
| `GET` | `/tournaments/:id/players` | Accepted teams + roster (+ rank) |
| `GET` | `/tournaments/:id/matches` | Schedule / results |
| `POST` | `/tournaments/:id/matches` | Organizer create |
| `PATCH` | `/tournaments/:id/matches/:matchId` | Reschedule / change teams |
| `PATCH` | `/tournaments/:id/matches/:matchId/result` | Football goals / badminton sets |
| `DELETE` | `/tournaments/:id/matches/:matchId` | Organizer |
| `GET` | `/tournaments/:id/standings` | Optional `?round=GROUP_STAGE` |

---

### 9.1 `POST /tournaments`

Organizer = caller. **`403`** nếu chưa đủ điều kiện host (≥ **80** kèo hosted `COMPLETED` + **avg host rating ≥ 4.5**).

**Query (optional):** `sport=FOOTBALL|BADMINTON`

**Body (required highlights)**

| Field | Notes |
| :--- | :--- |
| `sport`, `format` | Football: `FIVE_A_SIDE`/`SEVEN_A_SIDE`/`ELEVEN_A_SIDE` + `genderDivision` `MEN`/`WOMEN`. Badminton: `MS`/`WS`/`MD`/`WD`/`MIXED`; omit `genderDivision`. |
| `title`, `coverUrl`, `description` | Rules chỉ trong `description` |
| `venueName`, `venueAddress`, `province`, `city`, `latitude`, `longitude` | Fixed venue |
| `startsAt`, `endsAt`, `registrationDeadline` | ISO offset; deadline ≤ starts ≤ ends |
| `maxTeams` | 2–128 |
| `registrationFeeVnd`, `prizePoolVnd` | Display-only VND |

**Success `201`:** `{ message, tournament }` — `hostedByLabel: "SPOT"`, `status: "OPEN_REGISTRATION"`, `formatBadge`.

### 9.2 `GET /tournaments`

Browse giống Groups **không có skill**. Ẩn giải `FULL`. Ẩn nếu caller join `PENDING`/`ACCEPTED`/`KICKED`; **`REJECTED` hiện lại**.

**Query:** `sport`, `location` (+ `suggestions[]`), `province`/`city`, `latitude`+`longitude`+`radiusKm`, `favorited=true`, `limit`, `offset`.

### 9.3 `GET /tournaments/:id`

**Success `200`:** `{ tournament }` — khi `includeDescription`: `description`, `winners` (nullable). `canJoin`, `isOrganizer`, `myJoinRequest`, `teamLogos` (preview).

### 9.4 `POST /tournaments/:id/join`

Captain only. Luôn tạo **`PENDING`**.

**Body**

| Field | Notes |
| :--- | :--- |
| `teamName`, `teamLogoUrl` | Required |
| `roster[]` | Football: `name` + `jerseyNumber` (unique/team), max format+5. Badminton: 1 (singles) hoặc 2 (doubles/mixed). |

**Success `201`:** `{ message, request }` · Notify organizer `TOURNAMENT_JOIN_REQUEST`.

### 9.5 Organizer manage

| Action | Path | Notes |
| :--- | :--- | :--- |
| Approve | `POST .../requests/:requestId/accept` | At cap → `FULL`; notify captain |
| Reject | `POST .../requests/:requestId/reject` | Captain có thể join lại |
| Kick team | `POST .../teams/:teamId/kick` | Before `startsAt`; `403` rejoin |
| Cancel giải | `POST .../cancel` | `OPEN_REGISTRATION`/`FULL` only; notify |
| Complete sớm | `POST .../complete` | `ACTIVE` only; optional `{ winners: [{ place, teamId }] }` |

### 9.6 `PATCH /tournaments/:id`

Organizer partial update. **Sau `ACTIVE`/`COMPLETED` — lock:** `venueName`, `venueAddress`, `province`, `city`, `latitude`, `longitude`, `startsAt`, `endsAt`, `registrationDeadline` → **`400`**.

**Không PATCH được:** `sport`, `format`, `genderDivision`, `maxTeams` — thể thức / hạng mục chốt lúc `POST /tournaments` (product lock **1 giải = 1 format**).

| Field | Notes |
| :--- | :--- |
| `winners` | `[{ place, teamId }]` → `winners_json`; teamId phải thuộc giải |
| `playerRanks` | `[{ rosterPlayerId, rank \| null }]` — xếp hạng trong đội (Players tab) |
| Other | `title`, `coverUrl`, `description`, fees, … |

Thay đổi info (không phải winners/ranks) → notify captains `TOURNAMENT_UPDATED`.

### 9.7 Matches & results

**Create match:** `POST /tournaments/:id/matches` — `{ round, teamAId, teamBId, scheduledAt }` — `scheduledAt` trong `[startsAt, endsAt]`.

**Update match:** `PATCH /tournaments/:id/matches/:matchId` — partial `{ round?, teamAId?, teamBId?, scheduledAt? }` (đổi đội → xóa kết quả cũ).

**List matches:** `GET /tournaments/:id/matches` — mỗi item có `round`, `resultStatus`, `teamA`/`teamB`. **FE:** không có `currentRound` trên giải — group/filter theo `round` từ danh sách trận.

**Football result:** `PATCH .../result` — `{ teamAGoals, teamBGoals }` — draw OK.

**Badminton result:** `{ sets: [{ teamAPoints, teamBPoints }] }` — BO3, 15 pts, win-by-2.

**Rounds:** `GROUP_STAGE`, `ROUND_OF_32`, `ROUND_OF_16`, `QUARTER_FINAL`, `SEMI_FINAL`, `THIRD_PLACE`, `FINAL`.

### 9.8 `GET /tournaments/:id/standings`

**Query:** `round` (optional) — chỉ tính kết quả vòng đó.

**Football:** W=3, D=1, L=0; tie-break GD → goalsFor. **Badminton:** W=3, L=0; chỉ BO3 hoàn thành; tie-break set diff.

**Success `200`:** `{ tournamentId, sport, round, standings: [{ rank, teamId, teamName, played, won, pts, … }] }`

### 9.9 `GET /tournaments/:id/players`

**Success `200`:** `{ tournamentId, teams: [{ teamId, teamName, roster: [{ rosterPlayerId, name, jerseyNumber, rank }] }] }` — sort theo `rank` asc.

### 9.10 Lifecycle worker

`npm run worker:tournament-lifecycle`:

| Trigger | Transition |
| :--- | :--- |
| `registrationDeadline` passed, not FULL | → `CANCELLED` + notify |
| `startsAt` reached, was `FULL` | → `ACTIVE` |
| `endsAt` reached, was `ACTIVE` | → `COMPLETED` |

### 9.11 Notifications (inbox only)

| Event | Type |
| :--- | :--- |
| Join submitted | `TOURNAMENT_JOIN_REQUEST` |
| Approved / rejected | `TOURNAMENT_JOIN_APPROVED` / `TOURNAMENT_JOIN_REJECTED` |
| Cancelled | `TOURNAMENT_CANCELLED` |
| Kicked | `TOURNAMENT_KICKED` |
| Info updated | `TOURNAMENT_UPDATED` |

Migration `013_notification_tournament_types.sql`.

---

