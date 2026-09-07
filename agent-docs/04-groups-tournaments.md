# SPOT agent notes — Groups (hội) & Tournaments (giải đấu)

Part of the SPOT project agent notes — see [../CLAUDE.md](../CLAUDE.md) for the index.

### Groups (hội) — implemented (G0–G5, Aug 2026)

Separate domain from kèo (`schema_groups`, not `schema_matchmaking`). Agent rules + Figma:
[`spot-backend/docs/agent/05-groups-tournaments.md`](./spot-backend/docs/agent/05-groups-tournaments.md) section **Groups (hội)**.
FE/tester contract: [`spot-backend/docs/api/05-groups.md`](./spot-backend/docs/api/05-groups.md).
Product locks: [`spot-backend/docs/GROUP_PLAN.md`](./spot-backend/docs/GROUP_PLAN.md).

| | |
| :--- | :--- |
| Prefix | `/groups` + `/api/groups` |
| Figma | Manage Groups `101:2`; detail About `810:156`, Schedule `810:772`, Members `810:924`, Gallery `810:308`; browse `810:612` |
| Create | `POST /groups` — PLAYER; `sport`; courts + `recurringSlots`; `joinMode` `AUTO` \| `APPROVAL` |
| Browse | `GET /groups` — search `name`/venue/address; province/city; distance; **`suggestions[]`**; hide nếu member hoặc join `PENDING`/`KICKED` (**`REJECTED` hiện lại**) |
| Join | Skill **hard gate** (`400`) — khác kèo (warn). **`memberCount`**: admin + accepted only; **PENDING không tính**. AUTO → +1 ngay; APPROVAL → +1 khi accept hoặc PATCH `joinMode`→`AUTO` flush |
| Manage | `GET /groups/mine`, `GET /groups/my-join-requests`; admin accept/reject/kick/transfer; `PATCH /groups/:id`; `DELETE /groups/:id` |
| Tabs | Members `GET .../members`; Schedule matrix `GET .../schedule?date=`; Gallery CRUD (max 50) |
| Notifications (G5) | `GROUP_JOIN_REQUEST`, `GROUP_APPROVED`, `GROUP_REJECTED`, `GROUP_KICKED`, `GROUP_ADMIN_TRANSFERRED` |
| Migrations | `010_schema_groups.sql`, `011_notification_group_types.sql` |
| Smoke | `npm run smoke:groups` |

### Tournaments (giải đấu) — implemented (T0–T5, Aug 2026)

Separate domain from kèo **and** Groups (no `match_id`, no `group_id`). Full plan:
[`spot-backend/docs/TOURNAMENT_PLAN.md`](./spot-backend/docs/TOURNAMENT_PLAN.md).
Agent + API: [`spot-backend/docs/agent/05-groups-tournaments.md`](./spot-backend/docs/agent/05-groups-tournaments.md) · [`spot-backend/docs/api/06-tournaments.md`](./spot-backend/docs/api/06-tournaments.md).

| | |
| :--- | :--- |
| Prefix | `/tournaments` + `/api/tournaments` |
| Figma (reviewed) | Browse `880:404`; detail Upcoming `880:282`; Complete overview `107:249`; Standings `107:380`; Matches `107:533`; Players `107:2` |
| **Missing Figma** | Create Tournament, Manage Tournaments, Join form — build from product locks below |
| Detail tabs | **Overview \| Matches \| Standings \| Players** (all sports) |
| CTA | **Join Tournament** (hidden when FULL / past deadline / already joined) |
| Smoke | `npm run smoke:tournaments` (script tự seed eligibility — không có dev bypass API) |

**Quyết định đã chốt với Nguyễn (Aug 2026 — đừng revert)**

| Topic | Rule |
| :--- | :--- |
| Phạm vi | Tách kèo + Groups; **1 giải = 1 hạng mục** (một `format` + gender) |
| Tạo giải | Chỉ user ≥ **80 kèo hosted COMPLETED** + **host rating avg ≥ 4.5** → else `403` |
| Hosted by | Luôn hiển thị **`SPOT`** (`hostedByLabel` — BE constant) |
| Join | **Captain only**; luôn **APPROVAL** (`PENDING`); bắt buộc `teamName` + `teamLogoUrl` + `roster` |
| Football roster | Name + jersey (unique/team); max squad = format+5 (5v5→10, 7v7→12, 11v11→16) |
| Badminton roster | Singles=1; doubles/mixed=2 |
| Lifecycle | `OPEN_REGISTRATION` → `FULL` → `ACTIVE` → `COMPLETED`; auto-cancel nếu hết deadline mà chưa FULL |
| Cancel | Organizer **chỉ trước `startsAt`** — **không** sau `ACTIVE` |
| Sau ACTIVE | **Lock** venue, geo, `startsAt`, `endsAt`, `registrationDeadline` on PATCH |
| Matches | Organizer nhập tay: round + team A vs B + datetime; venue = giải venue; **không có `currentRound` trên giải** — FE group `GET .../matches` theo `round` |
| Format | Chỉ set lúc **create** — **không** PATCH `sport`/`format`/`genderDivision` |
| Football result | Single leg; goals A vs B; **draw OK** |
| Badminton result | BO3; 15 pts/set; win-by-2; deuce @15 |
| Standings | Auto PTS: football W=3,D=1,L=0; badminton W=3,L=0; tie-break GD / set diff |
| Winners | **Manual** on PATCH / optional on `POST .../complete` — `[{ place, teamId }]` |
| Players tab (completed) | **In-team rank manual** — PATCH `playerRanks: [{ rosterPlayerId, rank }]` |
| Browse | Filter như Groups **không skill**; ẩn FULL; ẩn join PENDING/ACCEPTED; REJECTED hiện lại |
| Favorites | `POST/DELETE .../favorite` + `isFavorited` (Figma chưa vẽ heart — vẫn làm) |
| Money | `registrationFeeVnd`, `prizePoolVnd` display-only VND — **no payment** |
| Rules | Chỉ trong **`description`** (About) — không tab Rules |

**Sport / format (pick ONE at create)**

| Sport | Formats | Extra |
| :--- | :--- | :--- |
| Football | `FIVE_A_SIDE`, `SEVEN_A_SIDE`, `ELEVEN_A_SIDE` | + `genderDivision` `MEN`/`WOMEN` — badge e.g. `"11v11 Women's"` |
| Badminton | `MS`, `WS`, `MD`, `WD`, `MIXED` | Roster 1 or 2; omit `genderDivision` |

**Lifecycle (FE badges)**

| Status | FE behavior |
| :--- | :--- |
| `OPEN_REGISTRATION` | Show **Join Tournament**; countdown `registrationDeadline` |
| `FULL` | Hide Join; hide browse; deep link / Manage vẫn thấy |
| `ACTIVE` | Auto at `startsAt` when was FULL |
| `COMPLETED` | Auto at `endsAt` or organizer `POST .../complete` |
| `CANCELLED` | Auto deadline without FULL; organizer cancel before starts |

**Manage Tournaments (FAB — mirror Manage Groups `101:2`)**

| Tab | Sections |
| :--- | :--- |
| **Hosted by Me** | My Tournaments + Pending join requests |
| **Joined** | Tournaments joined + my join requests |

**Notifications (inbox):** `TOURNAMENT_JOIN_REQUEST`, `TOURNAMENT_JOIN_APPROVED`, `TOURNAMENT_JOIN_REJECTED`, `TOURNAMENT_CANCELLED`, `TOURNAMENT_KICKED`, `TOURNAMENT_UPDATED`.

**Out of scope MVP:** Groups link, sponsors, payment gateway, skill gate on join, auto-bracket generator.

(See **Data flow** in Architecture & Project Structure above — same flow applies here, not repeated.)

