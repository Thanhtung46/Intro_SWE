# spot-backend agent notes — Referee (trọng tài)

Part of the spot-backend agent notes — see [../../CLAUDE.md](../../CLAUDE.md) for the index. Full API contract: [../api/15-referee-onboarding.md](../api/15-referee-onboarding.md) (+ `16-referee-venue-registration.md`, `17-referee-assignments.md`). Product spec: [../REFEREE_PLAN.md](../REFEREE_PLAN.md).

## Referee (trọng tài)

Product spec + **báo cáo BE/FE:** [`docs/REFEREE_PLAN.md`](./docs/REFEREE_PLAN.md) **§0**.  
**FE contract chi tiết (từng endpoint, query, JSON, curl):** [`docs/api/15-referee-onboarding.md`](./docs/api/15-referee-onboarding.md) (+ `16-referee-venue-registration.md`, `17-referee-assignments.md`).

### Trạng thái triển khai (Aug 2026)

| | BE | FE mobile |
| :--- | :---: | :---: |
| Core domain `/referee/*` | ✅ | ❌ |
| Board filter + favourite H22–H23 | ✅ | ❌ |
| Plan A pending (`myVenues` + Queue) | ✅ | ❌ |
| Hire-referee fan-out + rating notify | ✅ | ❌ (player booking UI) |
| Payment IPN / FCM / Admin UI | ❌ | ❌ |

Migrations **`015`–`022`**. Smoke: `npm run smoke:referee` (`OTP_DEBUG`, `seed:admin`).

### Hai tầng nghiệp vụ

1. **Job Board (venue pool)** — `GET /referee/board?sport=` + filter; `POST/DELETE .../register`; favourite `POST/DELETE .../favorite`. Sân đã apply ẩn khỏi board.
2. **Invitations (booking)** — player `hireReferee: true` + PAID → fan-out PENDING; **first accept wins** (`409 ASSIGNMENT_ALREADY_TAKEN`).

### Plan A — Pending tab

`GET /referee/invitations?tab=pending` → `{ matchInvitations[], myVenues[] }`. FE **một màn scroll:** Pending Queue (`224:3113`) + **My venues** dưới. Cancel pool = `DELETE /referee/venues/:venueId/register` + `{ sportType }`.

### Endpoint map (tóm tắt — chi tiết §19 API.md)

| Method | Path |
| :--- | :--- |
| `GET` | `/referee/me`, `/referee/me/certifications` |
| `GET` | `/referee/board?sport=&province=&city=&lat=&lng=&radiusKm=&favorited=&q=&page=&limit=` |
| `POST` / `DELETE` | `/referee/venues/:venueId/favorite` |
| `POST` / `DELETE` | `/referee/venues/:venueId/register` (DELETE body `{ sportType }`) |
| `GET` | `/referee/invitations?tab=pending\|confirmed\|completed&since=&filter=` |
| `GET` | `/referee/assignments/:id` |
| `POST` | `/referee/assignments/:id/accept`, `.../decline` |
| `GET` | `/referee/schedule?month=`, `/referee/earnings`, `/referee/earnings/history` |
| `POST` | `/referee/assignments/:id/dev/complete` (non-prod) |

**Onboarding (không prefix `/referee`):** batch `POST /users/me/verification-requests/batch`; admin `POST /admin/approvals/:id/approve` `{ certifiedSportTypes }`.

**Player-side:** `POST /bookings` `{ hireReferee?, refereeFeeVnd? }`; test fan-out `POST /bookings/:id/dev/mark-paid`. Rating: `POST /reviews/referee` + inbox `REFEREE_RATING_REQUEST`.

**Geo reuse:** `GET /geo/vn` — filter sheet Tỉnh/Phường (Figma Ward = BE `city`).

**Assignment detail FE (`224:5703`):** Zalo/Call/breakdown UI — BE trả assignment fields; contact/directions reuse `GET /venues/:id`.

**Schema:** `schema_referee.referee_profiles`, `referee_venue_registrations`, `referee_assignments`, `referee_venue_favorites`; `bookings.hire_referee`, `referee_fee_vnd`; `venues.province`, `venues.city` (`021`).

**Chưa có:** Payment IPN → PAID tự fan-out; FCM push; Admin console UI duyệt docs.
