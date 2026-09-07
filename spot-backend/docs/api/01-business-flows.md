# API Reference — Business Flows

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 4. Luồng nghiệp vụ

### A. Đăng ký → đăng nhập (PLAYER)

```
POST /auth/register
     → nextStep: SELECT_ROLE
POST /auth/otp/verify    { email, otp }
     → email verified (không token)
POST /auth/role          { email, role: "PLAYER" }
     → nextStep: LOGIN  (email đã verify)
POST /auth/login         { email, password }
     → accessToken + refreshToken + user
GET  /auth/me            Header: Authorization: Bearer <accessToken>
PATCH /auth/me           { skills: { badminton?, football? }, avatarUrl? }
POST /auth/refresh       { refreshToken }  (khi access hết hạn)
```

> Thứ tự chuẩn là **Register → OTP → Role**. `POST /auth/role` vẫn chấp nhận
> khi gọi **trước** `POST /auth/otp/verify` (backward-compat) → khi đó
> `nextStep: VERIFY_OTP`.

### B. Đăng ký OWNER / REFEREE

Giống trên tới `POST /auth/role` với `OWNER` hoặc `REFEREE` → `status: PENDING`.
Vì email đã verify ở bước OTP, `POST /auth/role` trả luôn `accessToken` +
`refreshToken` + `nextStep: SUBMIT_VERIFICATION` để nộp giấy tờ
(`POST /users/me/verification-requests/batch`). **Login sẽ trả 403** cho đến
khi admin duyệt.

### C. Quên mật khẩu

```
POST /auth/forgot-password   { email }
     → luôn 200 + cùng message (anti-enumeration)
POST /auth/reset-password    { email, otp, newPassword, confirmPassword }
POST /auth/login             { email, password mới }
```

Muốn gửi lại OTP quên MK: gọi lại `POST /auth/forgot-password` (chịu cooldown 60s), **không** gọi `/otp/resend`.

### D. Host kèo + browse (PLAYER)

```
POST /matches            Bearer + body host
POST /matches/bulk       Bearer + template + schedules[]
GET  /matches/venue-suggestions  ?location&sport&limit
GET  /matches            filters (sport, date, location XOR distance, …)
GET  /geo/vn             dropdown tỉnh/quận pre-2025
GET  /matches/:id
GET  /users/:id          public host profile (no email/phone)
```

### E. Join + duyệt

```
POST /matches/:id/join
DELETE /matches/:id/join                         joiner — hủy PENDING
GET  /matches/:id/requests                          host
POST /matches/:id/requests/:requestId/accept|reject host
POST /matches/:id/participants/:userId/kick         host
```

### F. Quản lý kèo

```
GET    /matches/mine?tab=active|completed
GET    /matches/my-join-requests
PATCH  /matches/:id
POST   /matches/:id/cancel
POST   /matches/dev/process-expired                 dev only — expiry tick
POST   /matches/:id/review                         participant — rate host
POST|DELETE /matches/:id/favorite
```

### G. Groups (hội) — G0–G5

```
POST /groups              Bearer PLAYER — courts + recurringSlots + joinMode
GET  /groups              browse (search, province/city, distance, suggestions[])
GET  /groups/:id          detail — recurringSlots, myRole, memberCount
POST /groups/:id/join     AUTO → member ngay (+memberCount); APPROVAL → PENDING (memberCount không đổi)
DELETE /groups/:id/join   hủy PENDING
GET  /groups/:id/requests admin — PENDING only
POST /groups/:id/requests/:requestId/accept|reject
POST /groups/:id/members/:userId/kick|transfer-admin
POST /groups/:id/leave
DELETE /groups/:id        admin delete
GET  /groups/mine?tab=...
GET  /groups/my-join-requests
PATCH /groups/:id         admin — joinMode→AUTO flush pending (+memberCount từng người)
GET  /groups/:id/members?search=
GET  /groups/:id/schedule?date=YYYY-MM-DD
GET|POST|DELETE /groups/:id/gallery
POST|DELETE /groups/:id/favorite
GET  /notifications       verify GROUP_* types sau join/approve/reject/kick/transfer
```

**`memberCount` (đã chốt):** admin + **accepted** members; **PENDING không tính**. Tạo group = `1`. Kick/leave = `-1`. Reject/hủy PENDING = không đổi. Skill join **ngoài range → `400`** (hard gate, khác kèo).

### H. Tournaments (giải đấu) — T0–T5

```
POST /tournaments              Bearer PLAYER — gate 80 COMPLETED host + rating ≥ 4.5
GET  /tournaments              browse (no skill; hide FULL; hide PENDING/ACCEPTED join)
GET  /tournaments/:id          detail — canJoin, winners when completed
POST /tournaments/:id/join     captain — teamName + logo + roster → PENDING
DELETE /tournaments/:id/join   withdraw PENDING (not FULL, before deadline)
GET  /tournaments/:id/requests organizer — PENDING
POST /tournaments/:id/requests/:requestId/accept|reject
POST /tournaments/:id/teams/:teamId/kick   before startsAt
POST /tournaments/:id/cancel               before startsAt only
PATCH /tournaments/:id         organizer — winners, playerRanks; lock venue/schedule after ACTIVE
POST /tournaments/:id/complete early when ACTIVE
GET  /tournaments/:id/matches|standings|players
POST/PATCH/DELETE /tournaments/:id/matches (+ result)
GET  /tournaments/mine?tab=hosted|joined&section=...
GET  /tournaments/my-join-requests
POST|DELETE /tournaments/:id/favorite
npm run worker:tournament-lifecycle   deadline cancel / start / end
```

**Join:** luôn **APPROVAL** (captain only). **1 giải = 1 hạng mục** (format + gender). **`hostedByLabel` = `"SPOT"`** (BE constant).

---

