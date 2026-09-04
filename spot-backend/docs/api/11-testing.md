# API Reference — Testing (Checklist + Smoke Scripts)

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 14. Checklist test

Dùng Postman / Thunder Client / Insomnia. Collection gợi ý theo folder **Auth** / **Matches** / **Groups** / **Users** / **Notifications** / **Reviews**.

### Happy path — PLAYER

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | `GET /health` | `200` `status: ok` |
| 2 | `POST /auth/register` (email mới) | `201` + `nextStep: SELECT_ROLE` |
| 3 | `POST /auth/role` `PLAYER` | `200` + `status: ACTIVE` |
| 4 | `POST /auth/otp/verify` (otp từ email/`debugOtp`) | `200` verified |
| 5 | `POST /auth/login` | `200` + `accessToken` |
| 6 | `GET /auth/me` + Bearer access | `200` + `user` |
| 7 | `GET /users/me` | cùng `user` như `/auth/me` |
| 8 | `PATCH /users/me` `{ fullName, gender }` | `200` + user cập nhật |
| 9 | `PATCH /users/me` prefs (`language`, `appearance`, toggles, `avatarUrl`) | `200` |
| 10 | `POST /users/me/email/request` → `confirm` | `200` email mới |
| 11 | `POST /users/me/phone/request` → `confirm` | `200` phone mới |
| 12 | `POST /users/me/schedule/dev/seed` | `201` + booking (+ match) |
| 13 | `GET /users/me/schedule` (+ `type=booking\|match`) | `200` + items |
| 14 | `POST /reviews/dev/seed-booking` | `201` + booking `COMPLETED` |
| 15 | `POST /reviews` | `201` + `venueRating` |
| 16 | `POST /reviews/:id/reply` | `201` (user là venue owner) |
| 17 | `GET /reviews/venues/:venueId/rating` | `200` |
| 18 | `POST /notifications/dev/seed` | `201` + notification |
| 19 | `GET /notifications` / `unread-count` | `200` |
| 20 | `PATCH /notifications/:id/read` + `POST /read-all` | `200` |
| 21 | `POST /auth/refresh` | `200` + token mới |

### Happy path — host + browse kèo

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | `POST /matches` football `SEVEN_A_SIDE` | `201`, `filledCount: 1` |
| 2 | `GET /matches?sport=FOOTBALL` | chứa kèo vừa tạo (joiner; host không thấy kèo mình trên browse) |
| 3 | `GET /users/:hostUserId` | `fullName`, `skills`, `matchCount`, `joinedMatches`; **không** email/phone; `rating`/`reviewCount` live |
| 4 | `GET /matches/:id` | `canJoin`, `participants`, `summary` |
| 5 | `POST /matches/:id/join` `{}` (AUTO) | `201` `ACCEPTED` |
| 6 | `POST /matches/:id/join` guests (APPROVAL) | `201` `PENDING`, `heads` tăng, filled chưa tăng |
| 7 | `GET /matches/:id/requests` (host) | PENDING — `avatarUrl`, `skill`, `shareAmount` |
| 8 | accept / reject / kick | đúng status + filledCount |
| 9 | `GET /matches/mine?tab=active` | host + participant ACCEPTED |
| 10 | `GET /matches/my-join-requests` | `pendingCount`, PENDING + REJECTED; `DELETE /join` hủy PENDING |
| 11 | Sau kèo reviewable | `POST /matches/:id/review` → `GET /reviews/hosts/:userId/reviews` |
| 12 | `PATCH /matches/:id` trước giờ | `200` |
| 13 | `POST /matches/:id/cancel` | `CANCELLED` + notify joiners |

### Happy path — Groups (hội)

Cần ≥ 3 PLAYER (admin + 2 joiner). Chạy `npm run migrate` (010 + 011) trước.

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | `POST /groups` `joinMode: APPROVAL` | `201`, `memberCount: 1`, `myRole: ADMIN` |
| 2 | `GET /groups` (joiner) | thấy group; sau join PENDING — **ẩn** khỏi browse |
| 3 | `POST /groups/:id/join` (joiner) | `201` PENDING; **`memberCount` detail vẫn 1** |
| 4 | `GET /groups/:id/requests` (admin) | PENDING + avatar/skill |
| 5 | accept | `memberCount: 2`; joiner `myRole: MEMBER` |
| 6 | Tạo group `joinMode: AUTO` | joiner join → `memberCount` +1 **ngay** |
| 7 | `PATCH /groups/:id` `joinMode: AUTO` (còn pending) | flush → pending thành member, count tăng |
| 8 | `GET /groups/:id/members?search=` | paginated members |
| 9 | `GET /groups/:id/schedule?date=` | matrix 30 phút BOOKED/AVAILABLE |
| 10 | `POST /groups/:id/gallery` + `GET` + `DELETE` | max 50 |
| 11 | `GET /groups/mine` / `my-join-requests` | tab/section đúng |
| 12 | kick / transfer-admin / leave / delete | status + `memberCount` đúng |
| 13 | `GET /notifications` | types `GROUP_*` sau join/approve/reject/kick/transfer |

### Happy path — Tournaments (giải đấu)

Cần organizer đủ điều kiện (≥ 80 kèo COMPLETED + host rating ≥ 4.5) + 2 captain. Chạy `npm run migrate` (012–014) trước. Hoặc `npm run smoke:tournaments` (script tự seed eligibility).

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | `POST /tournaments` football 5v5 Men's | `201`, `hostedByLabel: SPOT`, `OPEN_REGISTRATION` |
| 2 | `GET /tournaments` (captain) | thấy giải; sau join PENDING — **ẩn** browse |
| 3 | `POST /tournaments/:id/join` + roster | `201` PENDING; notify organizer |
| 4 | accept ×2 captains | `FULL` at cap |
| 5 | lifecycle / `startsAt` reached | `ACTIVE` |
| 6 | `POST .../matches` + `PATCH .../result` | football goals / badminton sets |
| 7 | `GET .../standings` | PTS + tie-break |
| 8 | `PATCH /tournaments/:id` winners + playerRanks | Overview + Players tab |
| 9 | `POST .../complete` (optional) | `COMPLETED` |
| 10 | `PATCH venue*` after ACTIVE | `400` locked |
| 11 | `GET /tournaments/mine` / `my-join-requests` | hosted/joined tabs |

### Negative / edge

| Case | Expect |
| :--- | :--- |
| Register trùng email | `409` |
| Register password yếu / confirm lệch | `400` + `errors[]` |
| Role lần 2 | `409` Role has already been selected |
| OTP sai | `400` Invalid OTP (+ `attemptsRemaining`) |
| OTP sai ≥ 5 lần | `429` |
| Resend trong 60s | `429` + `retryAfterSeconds` |
| Login trước khi verify | `403` Email is not verified |
| Login trước khi chọn role | `403` + `nextStep: SELECT_ROLE` |
| Login OWNER/REFEREE (PENDING) | `403` pending approval |
| Login sai password | `401` (+ `attemptsRemaining`) |
| Login sai 5 lần | `403` locked + `lockoutUntil` |
| Forgot email lạ | `200` cùng generic message, **không** `debugOtp` |
| Reset OTP sai | `400` Invalid or expired OTP |
| Reset rồi login password mới | `200` |
| `GET /auth/me` không token | `401` |
| `POST /auth/refresh` bằng access token | `401` |
| `PATCH /users/me` với `email` | `400` (strict) |
| Email/phone change trùng user khác | `409` |
| Email/phone change giống giá trị hiện tại | `400` |
| Review duplicate booking / non-COMPLETED | `409` / `400` |
| Reply khi không phải venue owner | `403` |
| Join kèo đã kick | `403` |
| Join lại khi PENDING/ACCEPTED | `409` |
| Host join kèo mình | `400` |
| `GET /matches` + `location` cùng distance | `400` |
| Join group skill ngoài range | `400` (hard gate) |
| Join group sau kick | `403` |
| Join group khi đã PENDING/member | `409` |
| Gallery > 50 ảnh | `400` |
| Non-admin PATCH / kick / delete group | `403` |
| Create tournament without eligibility | `403` |
| Join when FULL / past deadline | `400` |
| PATCH locked fields after ACTIVE | `400` |
| Cancel tournament after ACTIVE | `400` |
| Kicked captain rejoin tournament | `403` |

### Forgot password path

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | User đã register + role + verify | — |
| 2 | `POST /auth/forgot-password` | `200` (+ `debugOtp` nếu có) |
| 3 | `POST /auth/reset-password` | `200` |
| 4 | `POST /auth/login` password mới | `200` |

---

## 15. Smoke scripts

Chạy khi server đang `npm run dev` và (nên) `OTP_DEBUG=true`:

```bash
npm run smoke:otp      # register → verify
npm run smoke:login    # register → role → verify → login → me → refresh
npm run smoke:profile  # login → GET/PATCH me → email/phone OTP change
npm run smoke:matches  # host / join AUTO+APPROVAL / approve / kick / mine / cancel
npm run smoke:groups   # create / join / PATCH flush / members / schedule / gallery / kick / transfer / delete
npm run smoke:tournaments  # eligibility seed / create / join / approve / match / standings / PATCH / complete
npm run smoke:notifications  # inbox + mark read + due reminder
npm run smoke:schedule       # seed schedule → GET /users/me/schedule
npm run smoke:venues         # dev-seed → list/detail/availability
npm run smoke:booking        # dev-seed → create → 409 conflict → schedule
npm run seed:admin           # upsert ADMIN user (ADMIN_SEED_* env)
npm run smoke:admin-approvals  # owner pending → verify → submit doc → admin approve
npm run smoke:referee        # referee batch → board → booking hire → accept

npm run smoke:reviews        # seed COMPLETED booking → review → reply
npm run worker:reminders     # background T-24h/T-2h processor
npm run worker:match-expiry  # đủ người → COMPLETED; thiếu người → CANCELLED + notify
npm run worker:tournament-lifecycle  # deadline cancel / FULL→ACTIVE / ACTIVE→COMPLETED
node scripts/smoke-forgot-password.js
node scripts/smoke-register.js
```

Unit test DTO:

```bash
npm test
```

---

