# SPOT Backend — API Reference

Tài liệu dành cho **Frontend** (web / mobile / admin) và **Tester**.  
Endpoint đã implement: **auth**, **profile**, **matchmaking (kèo)**, **groups (G0–G5)**, **tournaments (T0–T5)**, **notifications**, **reviews**, **schedule read**. Booking CRUD / payment chưa có API đầy đủ.

| | |
| :--- | :--- |
| Base URL (local) | `http://localhost:3000` |
| Content-Type | `application/json` |
| Auth hiện tại | Access JWT trên protected routes (`Authorization: Bearer …`); refresh qua `POST /auth/refresh` |
| Alias | `/auth`↔`/api/auth`, `/users`↔`/api/users`, `/matches`↔`/api/matches`, `/groups`↔`/api/groups`, `/tournaments`↔`/api/tournaments`, `/geo`↔`/api/geo`, `/notifications`↔`/api/notifications`, `/reviews`↔`/api/reviews` |

**Khuyến nghị FE:** dùng prefix `/api/…`.

### Changelog bảo trì (Aug 2026 — Manage Matches P0–P3 + Groups G0–G5)

| Batch | API / hành vi | Migration / worker |
| :--- | :--- | :--- |
| **P0 Lifecycle** | Tab Completed chỉ kèo đủ người + hết giờ; `outcome`/`outcomeMessage`; notify `MATCH_CANCELLED` / `MATCH_EXPIRED_UNDERFILLED`; browse/join chặn sau `endsAt` | `008`, `npm run worker:match-expiry`, dev `POST /matches/dev/process-expired` |
| **P1 Manage Squad** | `GET /matches/:id/requests` + `participants[]`: `avatarUrl`, `skill`, `shareAmount`, `paymentStatus`, phones; `DELETE /matches/:id/join` | — |
| **P2 Requests badge** | `GET /matches/my-join-requests`: `pendingCount`, `?status=PENDING\|REJECTED`, `match.hostAvatarUrl`; host `skill` trong squad | — |
| **P3 Review host** | `POST /matches/:id/review`; `GET /matches/:id` → `summary`; `GET /reviews/hosts/:userId/reviews`; `joinedMatches` + live `rating`/`reviewCount` trên profile | `009_schema_match_host_reviews.sql` |
| **Groups G0–G1** | `POST/GET /groups`, detail, join/cancel, mine/favorites, kick/transfer/leave/delete | `010_schema_groups.sql` |
| **Groups G2–G3** | `PATCH /groups/:id` (+ courts replace, `joinMode`→`AUTO` flush); members, schedule matrix, gallery CRUD | — |
| **Groups G4** | Docs + `npm run smoke:groups` | — |
| **Groups G5** | Inbox: `GROUP_JOIN_REQUEST`, `GROUP_APPROVED`, `GROUP_REJECTED`, `GROUP_KICKED`, `GROUP_ADMIN_TRANSFERRED` | `011_notification_group_types.sql` |
| **Tournaments T0–T5** | Full giải đấu: create/browse/join/manage/matches/standings/PATCH/complete | `012`–`014`, `npm run worker:tournament-lifecycle`, `npm run smoke:tournaments` |

Chi tiết agent: [`CLAUDE.md`](./CLAUDE.md) mục **Changelog bảo trì** + **Groups (hội)** + **Tournaments (giải đấu)**. Figma kèo: Manage `101:98`. Figma groups: Manage `101:2`, detail `810:*`. Figma tournaments: browse `880:404`, detail `880:282`.

---

## Mục lục

1. [Quick start](#1-quick-start)
2. [Quy ước chung](#2-quy-ước-chung)
3. [Enums & rules](#3-enums--rules)
4. [Luồng nghiệp vụ](#4-luồng-nghiệp-vụ)
5. [System endpoints](#5-system-endpoints)
6. [Auth endpoints](#6-auth-endpoints)
7. [Matchmaking endpoints](#7-matchmaking-endpoints)
8. [Groups endpoints](#8-groups-endpoints)
9. [Tournaments endpoints](#9-tournaments-endpoints)
10. [Users / Profile endpoints](#10-users--profile-endpoints)
11. [Notifications endpoints](#11-notifications-endpoints)
12. [Reviews endpoints](#12-reviews-endpoints)
13. [JWT & FE integration](#13-jwt--fe-integration)
14. [Checklist test](#14-checklist-test)
15. [Smoke scripts](#15-smoke-scripts)
16. [Chưa có / sắp làm](#16-chưa-có--sắp-làm)

---

## 1. Quick start

```bash
cd spot-backend
npm install
cp .env.example .env   # điền DB_*, SMTP_*, JWT_SECRET, Redis
npm run migrate
npm run dev            # http://localhost:3000
```

Kiểm tra server:

```bash
curl -s http://localhost:3000/health
```

**OTP khi test local:** set `OTP_DEBUG=true` trong `.env` (không phải production).  
Các response tạo OTP có thể kèm `debugOtp` (6 số) — dùng ngay trong Postman/curl, không cần mở email.

---

## 2. Quy ước chung

### Request

- Method: `GET` / `POST` / `PATCH` / `DELETE`.
- Body: JSON object (trừ upload avatar: multipart).
- Public auth (register, login, OTP, forgot/reset): không cần `Authorization`.
- `GET` / `PATCH /auth/me` và mọi `/matches/*`, `/users/*`, `/geo/*`: `Authorization: Bearer <accessToken>`.

### Success

Body là JSON object (field tùy endpoint). Không bọc trong `{ data: ... }`.

### Lỗi validation (Zod) — `400`

```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email is invalid" }
  ]
}
```

### Lỗi nghiệp vụ (`AppError`)

```json
{
  "message": "Invalid OTP",
  "details": { "attemptsRemaining": 3 }
}
```

`details` chỉ có khi backend gắn thêm (không phải mọi lỗi đều có).

### HTTP status thường gặp

| Status | Ý nghĩa |
| :--- | :--- |
| `200` / `201` | Thành công |
| `400` | Validation / OTP sai / JSON invalid |
| `401` | Sai email/password (login) / thiếu hoặc JWT invalid |
| `403` | Không đủ điều kiện login (chưa verify, PENDING, lockout, …) |
| `404` | User không tồn tại |
| `409` | Conflict (email/phone trùng, role đã chọn) |
| `429` | Rate limit / OTP attempts / resend cooldown |
| `500` | Lỗi server |
| `503` | `JWT_SECRET` chưa cấu hình đúng (khi login) |

### Rate limit

Một số route có `express-rate-limit` (OTP / login / forgot / reset).  
Khi bị chặn: `429`. Response có thể theo format của `express-rate-limit` (không phải `AppError`).

---

## 3. Enums & rules

### Gender (`register`)

`male` | `female` 

Fee / guest trên kèo chỉ `male` | `female`.

### Sports & skill levels

Hai skill **độc lập** (một per sport). Unset = `null`. API lưu `code`. Cập nhật kèo: `PATCH /auth/me`.

**Badminton** (`skills.badminton`): `BEGINNER_MINUS` … `FAIR`, `SEMI_PRO`, `PROFESSIONAL` (10 bậc).  
**Football** (`skills.football`): `LEARNING`, `REC_BASIC`, `REC_ADVANCED`, `SEMI_PRO`, `PROFESSIONAL`, `ELITE`.  
`SEMI_PRO` / `PROFESSIONAL` scoped theo sport. `badminton: "ELITE"` → `400`.

### Match format / fee / join / status

| Field | Values |
| :--- | :--- |
| `BADMINTON` format | `SINGLES` \| `DOUBLES` |
| `FOOTBALL` format | `FIVE_A_SIDE` \| `SEVEN_A_SIDE` \| `ELEVEN_A_SIDE` |
| `feeType` | `GENDER_RANGE` \| `SPLIT_EVENLY` |
| `joinMode` | `AUTO` \| `APPROVAL` |
| Match `status` | `OPEN` \| `FULL` \| `COMPLETED` \| `CANCELLED` |
| Join request | `PENDING` \| `ACCEPTED` \| `REJECTED` \| `KICKED` |
| `paymentStatus` | `SUCCESS` (stub) |
| `outcome` (ended kèo) | `COMPLETED` \| `CANCELLED` + `outcomeMessage` |

Host chiếm **1 slot** lúc tạo. Join: `filledCount += 1 + guests.length` (AUTO ngay; APPROVAL khi accept).  
**`yourShare`**: preview runtime trên match (`ceil(priceMin / filledCount)`). **`shareAmount`**: số tiền chốt trên join request / participant (joiner + guests).  
Pitch global: cùng `venueName` + `venueAddress` + tên court + giờ chồng → `409`.

### Role (chọn ở Step 2)

| API value | UI gợi ý | `status` sau khi chọn | Login được? |
| :--- | :--- | :--- | :--- |
| `PLAYER` | Player | `ACTIVE` | Có (sau verify OTP) |
| `OWNER` | Venue Owner | `PENDING` | **Không** — chờ admin duyệt |
| `REFEREE` | Referee | `PENDING` | **Không** — chờ admin duyệt |

Role chỉ chọn **một lần**. `ADMIN` không chọn được qua API này.

### User status

`ACTIVE` | `PENDING` | `LOCKED`

### OTP purpose

| Value | Dùng cho |
| :--- | :--- |
| `REGISTER` | Đăng ký / verify email (`/otp/verify`, `/otp/resend`) |
| `FORGOT_PASSWORD` | Quên mật khẩu — **chỉ** qua `/forgot-password` + `/reset-password` |

> **Quan trọng:** Không dùng `/otp/verify` hay `/otp/resend` cho quên mật khẩu.  
> Hai route đó gắn với `email_verified_at` (đăng ký).

### Password

- Tối thiểu 8 ký tự
- Có chữ thường, chữ hoa, số, **và ký tự đặc biệt** (vd. `!@#$%...`)
- `confirmPassword` phải khớp password tương ứng

Ví dụ hợp lệ: `Secret123!`

### Phone

Số Việt Nam **10 chữ số**, bắt đầu bằng `02` / `03` / `05` / `07` / `08` / `09`
(`/^0(2|3|5|7|8|9)[0-9]{8}$/`), không dấu `+`.

| Đầu số | Loại | Ví dụ OK |
| :--- | :--- | :--- |
| `03`, `05`, `07`, `08`, `09` | Di động | `0901234567` |
| `02` | Cố định (máy bàn) | `0241234567`, `0281234567` |

Từ chối: `1234567890`, `0123456789`, `+84901234567`.  
(Chỉ check format / đầu số — không chứng minh số đang active.)

### OTP

- 6 chữ số (`^\d{6}$`)
- TTL mặc định: **300s** (`OTP_TTL_SECONDS`)
- Sai tối đa **5** lần (`OTP_MAX_ATTEMPTS`) → `429`
- Resend cooldown: **60s** (`OTP_RESEND_COOLDOWN_SECONDS`)

### Login lockout

- Sai mật khẩu **5** lần → khóa **15** phút (`LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES`)

---

## 4. Luồng nghiệp vụ

### A. Đăng ký → đăng nhập (PLAYER)

```
POST /auth/register
     → nextStep: SELECT_ROLE
POST /auth/role          { email, role: "PLAYER" }
     → nextStep: VERIFY_OTP  (nếu chưa verify)
POST /auth/otp/verify    { email, otp }
POST /auth/login         { email, password }
     → accessToken + refreshToken + user
GET  /auth/me            Header: Authorization: Bearer <accessToken>
PATCH /auth/me           { skills: { badminton?, football? }, avatarUrl? }
POST /auth/refresh       { refreshToken }  (khi access hết hạn)
```

### B. Đăng ký OWNER / REFEREE

Giống trên tới `POST /auth/role` với `OWNER` hoặc `REFEREE` → `status: PENDING`.  
Sau verify OTP, **login sẽ trả 403** cho đến khi admin duyệt (API duyệt chưa có).

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

## 5. System endpoints

### `GET /health`

Kiểm tra server sống.

**Response `200`**

```json
{
  "status": "ok",
  "timestamp": "2026-04-11T06:00:00.000Z"
}
```

```bash
curl -s http://localhost:3000/health
```

### `GET /api`

Ping API root.

**Response `200`**

```json
{ "message": "SPOT Backend API" }
```

---

## 6. Auth endpoints

Base: `/auth` hoặc `/api/auth`. Ví dụ dưới dùng `/auth`.

---

### 6.1 `POST /auth/register`

Tạo user + gửi OTP đăng ký (`purpose=REGISTER`).

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `fullName` | string | ✓ | 1–100 ký tự |
| `email` | string | ✓ | email hợp lệ, max 150 |
| `phoneNumber` | string | ✓ | số VN 10 chữ số, đầu `02`/`03`/`05`/`07`/`08`/`09` |
| `gender` | string | ✓ | xem enum Gender |
| `password` | string | ✓ | rule Password |
| `confirmPassword` | string | ✓ | khớp `password` |

**Success `201`**

```json
{
  "message": "Registration successful. Please select your role, then verify OTP.",
  "userId": "uuid-or-id",
  "email": "player@example.com",
  "nextStep": "SELECT_ROLE",
  "debugOtp": "123456"
}
```

`debugOtp` chỉ khi `OTP_DEBUG=true` và không phải production.

**Errors**

| Status | Message (ví dụ) |
| :--- | :--- |
| `400` | Validation failed |
| `409` | Email is already registered / Phone number is already registered |

**curl**

```bash
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"fullName\": \"Nguyen Van A\",
    \"email\": \"player@example.com\",
    \"phoneNumber\": \"0901234567\",
    \"gender\": \"male\",
    \"password\": \"Secret123!\",
    \"confirmPassword\": \"Secret123!\"
  }"
```

**FE notes**

- Sau success → điều hướng màn chọn role với `email` vừa đăng ký.
- Lưu tạm `email` (và `debugOtp` nếu đang dev) để bước OTP.

---

### 6.2 `POST /auth/role`

Register Step 2 — chọn role một lần.

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `email` | string | ✓ | |
| `role` | string | ✓ | `PLAYER` \| `OWNER` \| `REFEREE` |

**Success `200`**

```json
{
  "message": "Role selected successfully",
  "nextStep": "VERIFY_OTP",
  "user": {
    "userId": "...",
    "email": "player@example.com",
    "fullName": "Nguyen Van A",
    "phoneNumber": "0901234567",
    "role": "PLAYER",
    "status": "ACTIVE",
    "gender": "male",
    "roleSelected": true,
    "roleSelectedAt": "2026-04-11T06:01:00.000Z",
    "emailVerified": false,
    "createdAt": "2026-04-11T06:00:00.000Z"
  }
}
```

Nếu `OWNER` / `REFEREE`: `message` ≈ *"Role selected. Account is pending approval."*, `user.status` = `PENDING`.

`nextStep`:

- `VERIFY_OTP` — chưa verify email
- `LOGIN` — đã verify (hiếm khi xảy ra ở flow chuẩn)

**Errors**

| Status | Message |
| :--- | :--- |
| `400` | Validation failed |
| `404` | User not found |
| `409` | Role has already been selected (`details.role`, `details.status`) |

**curl**

```bash
curl -s -X POST http://localhost:3000/auth/role \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"player@example.com\", \"role\": \"PLAYER\"}"
```

**FE notes**

- Map label UI “Venue Owner” → gửi `OWNER`.
- Nếu `status === "PENDING"`: sau OTP hiện thông báo chờ duyệt, **không** đưa vào màn login thành công.

---

### 6.3 `POST /auth/otp/verify`

Xác minh OTP **đăng ký** → set `email_verified_at`.

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `email` | string | ✓ | |
| `otp` | string | ✓ | đúng 6 chữ số |
| `purpose` | string | | Default `REGISTER`. Không dùng cho quên MK |

**Success `200`**

```json
{
  "message": "Email verified successfully",
  "email": "player@example.com"
}
```

Đã verify rồi → vẫn `200`:

```json
{
  "message": "Email already verified",
  "email": "player@example.com"
}
```

**Errors**

| Status | Message | details |
| :--- | :--- | :--- |
| `400` | Invalid OTP | `attemptsRemaining` |
| `400` | OTP expired or not found. Please request a new code. | |
| `404` | User not found | |
| `429` | Too many invalid OTP attempts. Please request a new code. | |

**curl**

```bash
curl -s -X POST http://localhost:3000/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"player@example.com\", \"otp\": \"123456\"}"
```

---

### 6.4 `POST /auth/otp/resend`

Gửi lại OTP **đăng ký**.

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `email` | string | ✓ | |
| `purpose` | string | | Default `REGISTER` |

**Success `200`**

```json
{
  "message": "A new OTP has been sent to your email",
  "email": "player@example.com",
  "resendAvailableInSeconds": 60,
  "debugOtp": "654321"
}
```

**Errors**

| Status | Message | details |
| :--- | :--- | :--- |
| `400` | Email already verified | |
| `404` | User not found | |
| `429` | Please wait before requesting a new OTP | `retryAfterSeconds` |

**curl**

```bash
curl -s -X POST http://localhost:3000/auth/otp/resend \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"player@example.com\"}"
```

**FE notes**

- Disable nút Resend theo `resendAvailableInSeconds` / `details.retryAfterSeconds`.

---

### 6.5 `POST /auth/login`

Đăng nhập → JWT.

**Điều kiện bắt buộc**

1. Email + password đúng  
2. Email đã verify  
3. Đã chọn role (`role_selected_at`)  
4. `status` không phải `LOCKED` / `PENDING`  
5. Không trong `lockout_until`

**Body**

| Field | Type | Required |
| :--- | :--- | :--- |
| `email` | string | ✓ |
| `password` | string | ✓ |

**Success `200`**

```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "userId": "...",
    "email": "player@example.com",
    "fullName": "Nguyen Van A",
    "phoneNumber": "0901234567",
    "role": "PLAYER",
    "status": "ACTIVE",
    "gender": "male",
    "roleSelected": true,
    "roleSelectedAt": "...",
    "emailVerified": true,
    "createdAt": "..."
  }
}
```

`expiresIn`: giây (TTL access token, mặc định `900` = 15 phút).

**Errors**

| Status | Message | details |
| :--- | :--- | :--- |
| `401` | Invalid email or password | `attemptsRemaining` (khi password sai, chưa lock) |
| `403` | Account is locked. Please contact support. | |
| `403` | Account is pending approval and cannot log in yet. | |
| `403` | Account temporarily locked. Try again later. | `lockoutUntil` |
| `403` | Email is not verified. Please verify OTP first. | |
| `403` | Please select your role to continue. | `nextStep: "SELECT_ROLE"` |
| `403` | Too many failed attempts. Account locked for 15 minutes. | `lockoutUntil` |
| `503` | JWT_SECRET is not configured | |

**curl**

```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"player@example.com\", \"password\": \"Secret123!\"}"
```

**FE notes**

- Lưu `accessToken` + `refreshToken` + `user` (Zustand / secure storage).
- Điều hướng theo `user.role` (`PLAYER` / `OWNER` / `REFEREE`).
- Map `403` + `nextStep: SELECT_ROLE` → màn chọn role.
- Map `403` pending → màn “chờ duyệt”.
- Gửi access token: `Authorization: Bearer <accessToken>` trên API protected.
- Khi `401` do hết hạn → gọi `POST /auth/refresh`, lưu token mới, retry request.

---

### 6.6 `POST /auth/refresh`

Đổi refresh token lấy cặp token mới (access hết hạn / sắp hết hạn).

**Body**

| Field | Type | Required |
| :--- | :--- | :--- |
| `refreshToken` | string | ✓ |

**Success `200`**

```json
{
  "message": "Token refreshed",
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": { "...": "..." }
}
```

**Errors**

| Status | Message |
| :--- | :--- |
| `400` | Validation failed |
| `401` | Invalid or expired refresh token |
| `403` | Account locked / pending |

**curl**

```bash
curl -s -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"<refreshToken từ login>\"}"
```

**FE notes**

- Chỉ gửi **refresh** token (không gửi access).
- Lưu lại cả `accessToken` và `refreshToken` mới.
- Chưa có Redis blacklist — refresh cũ vẫn dùng được đến khi hết TTL.

---

### 6.7 `GET /auth/me`

Alias của `GET /users/me` — cùng handler / cùng `{ user }` shape.

**Headers**

```http
Authorization: Bearer <accessToken>
```

**Success `200`**

```json
{
  "user": {
    "userId": 1,
    "email": "player@example.com",
    "fullName": "Nguyen Van A",
    "phoneNumber": "0901234567",
    "gender": "male",
    "role": "PLAYER",
    "status": "ACTIVE",
    "emailVerified": true,
    "roleSelected": true,
    "roleSelectedAt": "...",
    "createdAt": "...",
    "skills": { "badminton": null, "football": null }
  }
}
```

**Errors**

| Status | Message |
| :--- | :--- |
| `401` | Missing or invalid Authorization header / Invalid or expired token / Invalid token type |
| `404` | User not found |

**curl**

```bash
curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

---

### 6.7b `PATCH /auth/me`

Cập nhật **skill kèo** và/hoặc `avatarUrl` (URL). Tên/gender/prefs: `PATCH /users/me`.

**Body:** ít nhất một trong `skills` / `avatarUrl`. `skills` cần ≥1 key `badminton` \| `football` (code đúng sport, hoặc `null` để xóa).

**Success `200`:** `{ "message": "Profile updated", "user" }`

---

### 6.8 `POST /auth/forgot-password`

Yêu cầu OTP quên mật khẩu (`purpose=FORGOT_PASSWORD`).

**Body**

| Field | Type | Required |
| :--- | :--- | :--- |
| `email` | string | ✓ |

**Success `200`** (luôn cùng message — kể cả email không tồn tại)

```json
{
  "message": "If an account exists for this email, an OTP has been sent.",
  "debugOtp": "123456"
}
```

`debugOtp` **chỉ** khi email tồn tại **và** OTP thực sự được tạo (`OTP_DEBUG`).

**Errors**

| Status | Message | details |
| :--- | :--- | :--- |
| `400` | Validation failed | |
| `429` | Please wait before requesting a new OTP | `retryAfterSeconds` |

**curl**

```bash
curl -s -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"player@example.com\"}"
```

**FE / Tester notes**

- UI luôn hiện “đã gửi email nếu tài khoản tồn tại” — không lộ email có/không có trong hệ thống.
- Khi test: nếu không có `debugOtp` → email không tồn tại **hoặc** OTP_DEBUG tắt.

---

### 6.9 `POST /auth/reset-password`

Đặt mật khẩu mới bằng OTP quên MK.

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `email` | string | ✓ | |
| `otp` | string | ✓ | 6 digits |
| `newPassword` | string | ✓ | rule Password |
| `confirmPassword` | string | ✓ | khớp `newPassword` |

**Success `200`**

```json
{
  "message": "Password has been reset successfully. You can now log in.",
  "email": "player@example.com"
}
```

Sau success: `password_hash` mới, clear `login_attempts` / `lockout_until`.

**Errors**

| Status | Message | details |
| :--- | :--- | :--- |
| `400` | Validation failed | |
| `400` | Invalid or expired OTP | `attemptsRemaining` (khi OTP sai) |
| `429` | Too many invalid OTP attempts. Please request a new code. | |

Email không tồn tại cũng trả `400` + `"Invalid or expired OTP"` (không lộ user).

**curl**

```bash
curl -s -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"player@example.com\",
    \"otp\": \"123456\",
    \"newPassword\": \"NewSecret123!\",
    \"confirmPassword\": \"NewSecret123!\"
  }"
```

---

### 6.10 `GET /users/:id`

Profile **public** (Check Profile / host card). Bearer bắt buộc. **Không** trả `email`, `phoneNumber`, `role`, `status`, `gender`. SĐT host chỉ trên `GET /matches/:id` khi caller là host hoặc `yourRequest.status === ACCEPTED`.

`matchCount` = số kèo đã host trừ `CANCELLED`. `joinedMatches` = số join request `ACCEPTED` (pickup kèo). `rating` / `reviewCount` = aggregate từ `schema_review.match_host_reviews` — `null` / `0` nếu chưa có review.

**Success `200`**

```json
{
  "user": {
    "userId": 12,
    "fullName": "Nguyen Van A",
    "avatarUrl": null,
    "createdAt": "...",
    "skills": { "badminton": null, "football": "PROFESSIONAL" },
    "matchCount": 10,
    "joinedMatches": 4,
    "rating": 4.9,
    "reviewCount": 12
  }
}
```

`matchCount` = kèo hosted trừ `CANCELLED`. `joinedMatches` = join request `ACCEPTED`.  
`rating` / `reviewCount` = aggregate từ pickup kèo reviews (`schema_review.match_host_reviews`). `null` / `0` nếu chưa có review.

Hosted Matches trên Figma = `GET /matches?hostUserId=:id`. Reviews section = `GET /reviews/hosts/:userId/reviews`.

**Errors:** `400` Invalid user id · `401` · `404` User not found

---

## 7. Matchmaking endpoints

Base: `/matches` hoặc `/api/matches`. Mọi route cần Bearer.  
`POST /matches`, `POST /matches/:id/join`, `DELETE /matches/:id/join` thêm `requireRole('PLAYER')`.  
Route tĩnh (`/mine`, `/my-join-requests`, `/venue-suggestions`, `/bulk`, `/dev/process-expired`) **trước** `GET /:id`.

Host = 1 slot lúc tạo. Payment là stub `SUCCESS`.

### 7.1 `POST /matches`

Tạo kèo tự do (không cần `booking_id`).

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `sport` | string | ✓ | `BADMINTON` \| `FOOTBALL` |
| `format` | string | ✓ | Đúng ladder của sport |
| `title` | string | ✓ | ≤ 150 |
| `notes` | string | | ≤ 2000 |
| `venueName` | string | ✓ | |
| `venueAddress` | string | ✓ | Số nhà / đường (≤ 500). Không thay dropdown tỉnh/quận |
| `province` | string | ✓ | Mã tỉnh/TP pre-2025. HCM = `79`. List: `GET /geo/vn` |
| `city` | string | ✓ | Mã quận/huyện **thuộc** `province`. Quận 7 = `778` |
| `latitude` / `longitude` | number | | Optional, phải gửi cặp. Pin map; không dùng occupancy |
| `startsAt` / `endsAt` | datetime | ✓ | ISO, tương lai; duration **≥ 1 giờ** |
| `isMultiDay` | boolean | | Luôn coi `false` trên product hiện tại |
| `isRecurring` | boolean | | Default `false` |
| `maxPlayers` | int | ✓ | 2–40 |
| `allLevels` | boolean | | `true` → full ladder |
| `skillMin` / `skillMax` | string | nếu không `allLevels` | Cùng sport; min rank ≤ max |
| `feeType` | string | ✓ | `GENDER_RANGE` \| `SPLIT_EVENLY` |
| `priceMin` / `priceMax` | int | theo fee | `GENDER_RANGE`: nữ min, nam max. `SPLIT_EVENLY`: chỉ `priceMin` = tổng, không `priceMax` |
| `joinMode` | string | ✓ | `AUTO` \| `APPROVAL` |
| `courts` | `{ name }[]` | ✓ | Tên bắt buộc, không trùng |
| `coverUrl` | string | | http(s) ≤ 2048. Không upload S3 |

**Success `201`:** `{ "message": "Match created", "match": { matchId, host, hostPhoneNumber, spotsLeft, yourShare, courts, … } }`

`filledCount` bắt đầu = 1. Occupancy trùng → `409`.

```bash
curl -s -X POST http://localhost:3000/matches \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"sport\":\"FOOTBALL\",\"format\":\"SEVEN_A_SIDE\",\"title\":\"Saturday 7v7\",\"venueName\":\"San ABC\",\"venueAddress\":\"123 Nguyen Van Linh, Q7, TP.HCM\",\"province\":\"79\",\"city\":\"778\",\"startsAt\":\"2026-09-01T09:00:00+07:00\",\"endsAt\":\"2026-09-01T11:00:00+07:00\",\"maxPlayers\":14,\"skillMin\":\"REC_BASIC\",\"skillMax\":\"SEMI_PRO\",\"feeType\":\"SPLIT_EVENLY\",\"priceMin\":1400000,\"joinMode\":\"APPROVAL\",\"courts\":[{\"name\":\"1\"}]}"
```

### 7.1b `POST /matches/bulk`

Nhiều kèo cùng template (FE expand ngày/tuần → `schedules[]`). PLAYER. `isMultiDay` luôn false. `isRecurring: true` khi `schedules.length > 1`.

**Body:** `template` (giống 7.1 trừ `startsAt`/`endsAt`/`isMultiDay`) + `schedules: [{ startsAt, endsAt }]` (1–100).

**Success `201`:** `{ totalRequested, totalCreated, created[], failed[] }`. Một số slot 409 vẫn tạo slot khác. Không tạo được cái nào → `409`.

### 7.1c `GET /matches/venue-suggestions`

Gợi ý **địa điểm** cho form Host — **không** dùng cho Homepage browse.

**Query:** `location` (required), `sport?`, `limit?` (default 10, max 10).

Pool: kèo `status <> CANCELLED`. Distinct venue. Không có trong DB → `suggestions: []` → FE mở Geoapify.

**Success `200`:** `{ "suggestions": [ { venueName, venueAddress, province, provinceName, city, cityName, latitude, longitude } ] }`

### `GET /geo/vn`

Dropdown 2 cấp pre-2025 (63 tỉnh + 705 quận/huyện). JSON tĩnh, Bearer. Alias `/api/geo/vn`.

**Success `200`:** `{ "map": "pre-2025", "provinces": [ { "code": "79", "name": "Thành phố Hồ Chí Minh", "cities": [ { "code": "778", "name": "Quận 7" } ] } ] }`

### 7.2 `GET /matches`

Browse: `OPEN`, còn slot, `endsAt > now`. `FULL` **ẩn** trên homepage; vẫn thấy qua `?hostUserId=` (OPEN/FULL còn hạn).

**Ẩn khỏi browse mặc định** (không khi `hostUserId=`): kèo caller đang host; join `PENDING`/`ACCEPTED`/`KICKED`. **`REJECTED` hiện lại**.

**Query:** `sport`, `date` (`YYYY-MM-DD`), `timeFrom`/`timeTo` (`HH:mm`), `skill` (cần `sport`; OR ranks), `priceMin`/`priceMax` (VND), `location` (title/venue/address, unaccent + fuzzy; trả `suggestions[]` max 5), `province`/`city` (exact; `city` cần `province`), `favorited=true`, `hostUserId`, `latitude`+`longitude`+`radiusKm` (1–20, XOR với `location`), `limit` (default 20, max 50), `offset`.

**Success `200`:** `{ total, limit, offset, matches[], suggestions[] }`. List **không** có `hostPhoneNumber`.

### 7.3 `GET /matches/:id`

Chi tiết (kể cả đã qua giờ / cancelled).

**Success `200`:** `{ match, canJoin, yourRequest, participants[], summary }`

`summary` (View Summary / post-match review): `{ reviewable, canReview, yourReview, hostRating: { avgRating, reviewCount } }`.  
`reviewable` = kèo đã hết giờ + đủ người + không cancel. `canReview` = participant `ACCEPTED` chưa review.  
Đánh giá host: `POST /matches/:id/review` (xem 7.4c). `host.rating` / `host.reviewCount` trên card lấy từ aggregate review pickup kèo.

`hostPhoneNumber` **chỉ** khi caller là host hoặc `yourRequest.status === ACCEPTED`. `yourRequest` = `PENDING`/`ACCEPTED`/`KICKED` (hoặc `null` nếu chưa join / `REJECTED`); gồm `avatarUrl`, `skill` (sport của kèo).  
`canJoin` = không phải host, `OPEN`, còn slot, chưa request active, **`endsAt > now`**, không bị kick.

`participants[]`: HOST + joiners `ACCEPTED`. HOST và player gồm `skill` (sport kèo). Player thêm `shareAmount`, `paymentStatus`, `avatarUrl`, `phoneNumber` (host hoặc chính mình).

**Errors:** `400` Invalid match id / Match has ended · `401` · `404`

### 7.4 `POST /matches/:id/join`

PLAYER. Body có thể `{}`.

| Field | Notes |
| :--- | :--- |
| `message` | ≤ 500 |
| `phoneNumber` | SĐT người xin; bỏ trống → SĐT account |
| `guests` | max 10; mỗi guest: `name`, `skill` (đúng sport), `gender` male/female, `phoneNumber` bắt buộc |

Skill ngoài range → vẫn join, `skillWarning: true`. Skill sai sport → `400`.  
`AUTO`: `ACCEPTED`, tăng `filledCount`. `APPROVAL`: `PENDING`, chưa tăng filled.

**Success `201`:** `{ message, skillWarning, request, match }`

**Errors:** `400` host join own / not enough spots / **Match has ended** · `403` kicked / not PLAYER · `409` đã PENDING/ACCEPTED

### 7.4b `DELETE /matches/:id/join`

Joiner hủy request **`PENDING`** (xóa row + guests). Host không được gọi.

**Success `200`:** `{ message: "Join request cancelled", matchId, requestId }`

**Errors:** `400` No pending join request / Host cannot withdraw · `404` match not found

### 7.4c `POST /matches/:id/review`

Participant đã **`ACCEPTED`** đánh giá **host** sau kèo reviewable (hết giờ + đủ người). Host không được tự review. 1 review / user / kèo.

**Body:** `{ rating: 1..5, reviewText?: string }`

**Success `201`:** `{ message, review, hostRating: { avgRating, reviewCount } }`

**Errors:** `400` not reviewable / host self-review · `403` not participant · `409` already reviewed · `429` spam limit

### 7.5 `GET /matches/:id/requests`

Host, **PENDING only**. Mỗi request: `avatarUrl`, `skill` (sport kèo), `shareAmount`, `phoneNumber` requester + guests.

**Success `200`:** `{ matchId, total, requests[] }` · `403` nếu không phải host

### 7.6 / 7.7 Accept · reject

`POST /matches/:id/requests/:requestId/accept` — chỉ `PENDING`; `heads` ≤ `spotsLeft`; tăng `filledCount`.  
`POST /matches/:id/requests/:requestId/reject` — `PENDING` → `REJECTED`; có thể join lại (cùng `requestId`).

### 7.8 `POST /matches/:id/participants/:userId/kick`

Kick joiner `ACCEPTED` (+ guests). `filledCount -= heads`. Không kick host. Bị kick **không join lại kèo đó** (`403`).

### 7.9 `GET /matches/mine`

Manage Matches — tab **Active** / **Completed**. Query `tab` (default `active`), `limit`, `offset`.

| `tab` | Host | Participant |
| :--- | :--- | :--- |
| `active` | `OPEN`/`FULL`, `endsAt > now`, chưa cancel | Join **`ACCEPTED`**, kèo chưa hết, chưa cancel |
| `completed` | **Chỉ** hết giờ + **đủ người** + không cancel | **`ACCEPTED`** + cùng điều kiện kèo |

**Không** vào Completed: host cancel, hết giờ thiếu người, kicked. Kèo đó vẫn xem qua `GET /matches/:id` (có `outcome`).  
**Không** gồm `PENDING` — xem 7.9b. Thêm `myRole`, `myRequestStatus`, `pendingRequestCount`, `outcome`/`outcomeMessage` (completed).

### 7.9b `GET /matches/my-join-requests`

Tab Join Requests (joiner). Mặc định `PENDING` + `REJECTED`. `ACCEPTED` → `/mine?tab=active`; `KICKED` → completed.

**Query:** `limit`, `offset`, `status?` (`PENDING` \| `REJECTED` — bỏ trống = cả hai).

**Success `200`:** `{ total, pendingCount, limit, offset, requests: [ ... ] }`

`pendingCount` = số request `PENDING` của caller (dùng badge tab Requests, không phụ thuộc filter `status`).  
Với badge chỉ cần số chờ duyệt: gọi `?status=PENDING&limit=1` hoặc đọc `pendingCount`.

### 7.10 `PATCH /matches/:id`

Host, trước `startsAt`. Partial. Nếu `filledCount > 1` không đổi sport/format/fee/giá. `maxPlayers >= filledCount`. Occupancy trừ chính kèo này.

### 7.11 `POST /matches/:id/cancel`

Host. PENDING → REJECTED. Status `CANCELLED` (hết chiếm sân). Notify joiners inbox `MATCH_CANCELLED` (`data.reason = HOST_CANCEL`). **Không** xuất hiện tab Completed.

### 7.11b Match expiry (background)

| Case | Worker action | Tab Completed |
| :--- | :--- | :--- |
| Hết giờ, **đủ người** | `status → COMPLETED`, nhả sân | Có |
| Hết giờ, **thiếu người** | `status → CANCELLED`, reject PENDING, notify (`data.reason = EXPIRED_UNDERFILLED`) | Không |

`GET /matches/mine` chạy expiry trước khi query. Prod: `npm run worker:match-expiry`. Dev: `POST /matches/dev/process-expired` (non-prod).

### 7.12 Favorite

`POST /matches/:id/favorite` · `DELETE /matches/:id/favorite`. List có `isFavorited`.

---

## 8. Groups endpoints

Base: `/groups` hoặc `/api/groups`. Mọi route cần Bearer.  
`POST /groups`, `POST /groups/:id/join`, `DELETE /groups/:id/join`, `POST /groups/:id/leave`, `DELETE /groups/:id` thêm `requireRole('PLAYER')`.  
Route tĩnh (`/mine`, `/my-join-requests`) **trước** `GET /:id`.

Product lock: [`docs/GROUP_PLAN.md`](./GROUP_PLAN.md). Schema: `010_schema_groups.sql` (`schema_groups`).

**API map**

| Method | Path | Notes |
| :--- | :--- | :--- |
| `POST` | `/groups` | Create (caller = admin); `?sport=` |
| `GET` | `/groups` | Browse + search/filters |
| `GET` | `/groups/mine` | `?tab=managed\|joined` + section |
| `GET` | `/groups/my-join-requests` | Joiner outbound; `?status=` |
| `GET` | `/groups/:id` | Detail About |
| `PATCH` | `/groups/:id` | Admin edit; joinMode→AUTO flush pending |
| `DELETE` | `/groups/:id` | Admin disband |
| `POST` | `/groups/:id/join` | Joiner (`PLAYER`) |
| `DELETE` | `/groups/:id/join` | Cancel PENDING |
| `POST` | `/groups/:id/leave` | Member leave |
| `GET` | `/groups/:id/requests` | Admin pending |
| `POST` | `/groups/:id/requests/:requestId/accept` | Admin |
| `POST` | `/groups/:id/requests/:requestId/reject` | Admin |
| `POST` | `/groups/:id/members/:userId/kick` | Admin |
| `POST` | `/groups/:id/members/:userId/transfer-admin` | Admin transfer |
| `POST` / `DELETE` | `/groups/:id/favorite` | Heart |
| `GET` | `/groups/:id/members` | Members tab + `?search=` |
| `GET` | `/groups/:id/schedule` | `?date=YYYY-MM-DD` matrix |
| `GET` | `/groups/:id/gallery` | Paginated list |
| `POST` | `/groups/:id/gallery` | Admin add URL |
| `DELETE` | `/groups/:id/gallery/:imageId` | Admin delete |

---

### 8.1 `POST /groups`

Tạo hội/club. Caller = admin. `sport` từ Homepage tab (query `?sport=` hoặc body).

**Query (optional):** `sport=FOOTBALL|BADMINTON`

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `name` | string | ✓ | GROUP NAME, ≤ 150 |
| `title` | string | ✓ | Tagline, ≤ 150 |
| `description` | string | | ≤ 5000 |
| `joinMode` | string | ✓ | `AUTO` \| `APPROVAL` |
| `allLevels` | boolean | | default `false` |
| `skillMin` / `skillMax` | string | nếu không `allLevels` | Cùng sport |
| `venueName`, `venueAddress` | string | ✓ | |
| `province`, `city` | string | ✓ | Pre-2025; `GET /geo/vn` |
| `latitude` / `longitude` | number | | Optional, gửi cặp |
| `logoUrl`, `coverUrl`, `zaloUrl` | string | | http(s) URL |
| `courts` | `{ name }[]` | ✓ | ≥ 1, tên không trùng |
| `recurringSlots` | object[] | ✓ | `dayOfWeek` 1=Mon…7=Sun; `startsAt` HH:mm (step 30 phút); `durationMinutes`; `courtName` |

**Success `201`:** `{ "message": "Group created", "group": { …, myRole: "ADMIN", memberCount: 1, courts[], recurringSlots[] } }`

### 8.2 `GET /groups`

Browse + search. Ẩn group caller đã là member hoặc join request `PENDING`/`KICKED`. **`REJECTED` hiện lại**.

**Query:** `sport`, `skill` (cần `sport`), `location` (fuzzy `name`/venue/address + `suggestions[]` max 5), `province`/`city`, `latitude`+`longitude`+`radiusKm` (1–20, XOR `location`), `favorited=true`, `limit` (default 20), `offset`.

**Success `200`:** `{ total, limit, offset, groups[], suggestions[] }`. Suggestion `kind`: `name` \| `venueName` \| `venueAddress`.

### 8.3 `GET /groups/:id`

Detail tab About (+ config schedule).

**Success `200`:** `{ group }` — `recurringSlots[]`, `zaloUrl`, `myRole`, `isFavorited`, `admin`, `memberAvatars`, `memberCount`.

**Errors:** `400` Invalid group id · `401` · `404`

### 8.4 `POST /groups/:id/join`

PLAYER. Body có thể `{}`.

| Field | Notes |
| :--- | :--- |
| `message` | ≤ 500 |

Skill **ngoài range → `400`** (hard gate, khác kèo). Không tạo request nếu fail skill.

**`memberCount` — khi nào thay đổi:**

| Sự kiện | `memberCount` |
| :--- | :--- |
| `POST /groups` (tạo) | `1` (admin) |
| Join `AUTO` thành công | `+1` ngay |
| Join `APPROVAL` (PENDING) | **không đổi** |
| Accept request | `+1` |
| Reject / hủy PENDING | không đổi |
| `PATCH joinMode`→`AUTO` flush | `+N` (mỗi pending chưa là member) |
| Kick / member leave | `-1` |
| Transfer admin | không đổi |

`AUTO`: thêm `group_members`, `memberCount++`. `APPROVAL`: `PENDING`, chưa tăng member.

**Success `201`:** `{ message, request, group }`

**Errors:** `400` skill mismatch / already member (via membership) · `403` kicked / not PLAYER · `409` đã PENDING / đã member

### 8.4b `DELETE /groups/:id/join`

Joiner hủy request **`PENDING`** (xóa row).

**Success `200`:** `{ message: "Join request cancelled", groupId, requestId }`

**Errors:** `400` No pending join request · `404` group not found

### 8.5 `GET /groups/:id/requests`

Admin, **PENDING only**. Mỗi request: `avatarUrl`, `skill` (sport group).

**Success `200`:** `{ groupId, total, requests[] }` · `403` nếu không phải admin

### 8.6 / 8.7 Accept · reject

`POST /groups/:id/requests/:requestId/accept` — chỉ `PENDING`; skill joiner phải trong range; thêm `group_members`, `memberCount++`.  
`POST /groups/:id/requests/:requestId/reject` — `PENDING` → `REJECTED`; có thể join lại.

### 8.8 `POST /groups/:id/members/:userId/kick`

Admin kick member. Xóa `group_members`, `memberCount--`, join request → `KICKED`. **Bị kick không join lại group đó** (`403`).

**Errors:** `400` Admin cannot be kicked · `403` not admin · `404` member not found

### 8.8b `POST /groups/:id/members/:userId/transfer-admin`

Admin chuyển quyền. Target phải là `MEMBER`. Admin cũ → `MEMBER`; cập nhật `groups.admin_user_id`.

**Success `200`:** `{ message, groupId, adminUserId, group }`

### 8.9 `POST /groups/:id/leave`

Member rời group. **Admin không được leave** — phải transfer hoặc `DELETE /groups/:id`.

**Success `200`:** `{ message: "Left group", groupId }`

### 8.9b `DELETE /groups/:id`

Admin disband group (cascade members, requests, gallery, schedule).

**Success `200`:** `{ message: "Group deleted", groupId }`

### 8.10 `GET /groups/mine`

Manage Groups (Figma `101:2`). Query `tab`, `section`, `limit`, `offset`.

| `tab` | `section` | Response |
| :--- | :--- | :--- |
| `managed` (default) | `groups` (default) | `groups[]` admin tạo + `pendingRequestCount` |
| `managed` | `pending-requests` | `requests[]` inbound (all admin groups) |
| `joined` | `groups` | `groups[]` where `myRole=MEMBER` |
| `joined` | `join-requests` | Cùng shape `my-join-requests` |

**Success `200`:** `{ tab, section, total, limit, offset, groups[] \| requests[] }`

### 8.10b `GET /groups/my-join-requests`

Tab Join Requests (joiner). Mặc định `PENDING` + `REJECTED`.

**Query:** `limit`, `offset`, `status?` (`PENDING` \| `REJECTED`).

**Success `200`:** `{ total, pendingCount, limit, offset, requests[] }` — mỗi item có nested `group` (name, title, sport, admin avatar…).

### 8.11 Favorite

`POST /groups/:id/favorite` · `DELETE /groups/:id/favorite`. List/detail có `isFavorited`.

### 8.12 `PATCH /groups/:id`

Admin chỉnh sửa mọi field (partial). `requireRole('PLAYER')`.

**Body (≥1 field):** cùng shape với create (trừ `sport` optional); `courts` replace toàn bộ — xóa slots cũ; nếu không gửi `recurringSlots` thì schedule trống. Gửi `recurringSlots` bắt buộc kèm `courts`.

**joinMode → `AUTO`:** nếu còn request `PENDING` → auto-accept tất cả (thêm member, `memberCount++`).

**Success `200`:** `{ message: "Group updated", group }`

**Errors:** `400` validation · `403` not admin · `404`

### 8.13 `GET /groups/:id/members`

Members tab. Paginated + optional `search` (full name fuzzy).

**Query:** `search?`, `limit` (default 20, max 50), `offset`

**Success `200`:** `{ groupId, total, limit, offset, members[] }` — mỗi member: `userId`, `fullName`, `avatarUrl`, `role`, `isAdmin`, `skill`, `joinedAt`

### 8.14 `GET /groups/:id/schedule`

Schedule tab matrix. **Query bắt buộc:** `date=YYYY-MM-DD`

**Success `200`:** `{ groupId, date, dayOfWeek, courts[] }` — mỗi court có `slots[]` 30 phút (00:00–23:30), `status`: `BOOKED` \| `AVAILABLE`

### 8.15 Gallery

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/groups/:id/gallery` | `limit`, `offset` — paginated |
| `POST` | `/groups/:id/gallery` | Admin; body `{ imageUrl }` — max **50**/group |
| `DELETE` | `/groups/:id/gallery/:imageId` | Admin |

**POST Success `201`:** `{ message, image }` · **GET `200`:** `{ groupId, total, limit, offset, images[] }`

**Errors:** `400` gallery full · `403` not admin · `404`

**Example schedule fragment (`GET /groups/:id/schedule?date=2026-08-23`):**

```json
{
  "groupId": 1,
  "date": "2026-08-23",
  "dayOfWeek": 7,
  "courts": [
    {
      "courtId": 1,
      "name": "Court A",
      "slots": [
        { "startsAt": "17:00", "durationMinutes": 30, "status": "AVAILABLE" },
        { "startsAt": "17:30", "durationMinutes": 30, "status": "BOOKED" },
        { "startsAt": "18:00", "durationMinutes": 30, "status": "BOOKED" }
      ]
    }
  ]
}
```

### 8.16 Group notifications (inbox)

Không có endpoint riêng — BE ghi vào `GET /notifications` khi các action group thành công (sau commit). Email **không** gửi (`sendEmail: false`).

| Event | Recipient | `type` | `data` (fragment) |
| :--- | :--- | :--- | :--- |
| Join `APPROVAL` | Admin | `GROUP_JOIN_REQUEST` | `{ groupId, groupName, requestId, userId }` |
| Join `AUTO` | Joiner | `GROUP_APPROVED` | `{ groupId, groupName, sport }` |
| Accept request | Joiner | `GROUP_APPROVED` | `{ groupId, groupName, sport }` |
| Reject request | Joiner | `GROUP_REJECTED` | `{ groupId, groupName, sport }` |
| Kick member | Kicked user | `GROUP_KICKED` | `{ groupId, groupName, sport }` |
| Transfer admin | New admin | `GROUP_ADMIN_TRANSFERRED` | `{ groupId, groupName, previousAdminUserId }` |
| `PATCH joinMode`→`AUTO` flush pending | Each flushed joiner | `GROUP_APPROVED` | `{ groupId, groupName, sport }` |

Migration: `011_notification_group_types.sql`. Chi tiết: [`GROUP_PLAN.md`](./GROUP_PLAN.md) §2.

---

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

## 10. Users / Profile endpoints

Profile Hub: identity trên `schema_auth.users`, display/prefs trên
`schema_auth.user_profiles` (JOIN). JSON `user` giữ nguyên cho FE.  
Mọi route dưới đây cũng có alias `/api/users/*`. Cần `Authorization: Bearer <accessToken>`.

| Method | Path | Body | Success |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/me` | — | `200` `{ user }` (cùng shape với `GET /auth/me`) |
| `GET` | `/users/me/profile` | — | `200` `{ user, stats }` Main Profile stats |
| `PATCH` | `/users/me` | partial profile/prefs (≥1 field) | `200` `{ message, user }` |
| `GET` | `/users/me/preferences` | — | `200` `{ preferences }` Settings prefs |
| `PATCH` | `/users/me/preferences` | language / appearance / push / location | `200` `{ message, preferences }` |
| `POST` | `/users/me/password` | `{ currentPassword, newPassword, confirmPassword }` | `200` `{ message }` |
| `POST` | `/users/me/avatar` | multipart `avatar` (jpeg/png/webp/gif ≤2MB) | `200` `{ message, user }` |
| `POST` | `/users/me/email/request` | `{ newEmail }` | `200` OTP gửi tới **email mới** (`purpose=CHANGE_EMAIL`) |
| `POST` | `/users/me/email/confirm` | `{ newEmail, otp }` | `200` `{ message, user }` — cập nhật email + `email_verified_at` |
| `POST` | `/users/me/phone/request` | `{ newPhone }` | `200` OTP gửi tới **email hiện tại** (`purpose=CHANGE_PHONE`) |
| `POST` | `/users/me/phone/confirm` | `{ newPhone, otp }` | `200` `{ message, user }` |
| `GET` | `/users/me/schedule` | query `type`/`from`/`to`/`limit` | `200` `{ items, timezone }` |
| `POST` | `/users/me/schedule/dev/seed` | optional `{ includeMatch, daysFromNow }` | `201` venue/field/booking/match — **dev only** |

**PATCH** cho phép `fullName`, `gender`, `avatarUrl`, `language`, `appearance`, `pushNotificationsEnabled`, `locationServicesEnabled`. Gửi `email` / `phone` → `400` (strict Zod). Đổi email/phone bắt buộc qua request → confirm OTP (FR-1.4).

### 10.1 `GET /users/me`

Giống `GET /auth/me`. `user` gồm prefs defaults: `language: "en"`, `appearance: "light"`, toggles `true`, `avatarUrl: null`.

### 10.1b `GET /users/me/profile` (Main Profile)

Header Main Profile: cùng `user` như `/users/me` + `stats` aggregate từ bookings/matches (không denormalize, không Redis trong MVP).

**Success `200`**

```json
{
  "user": { "...": "same as GET /users/me" },
  "stats": {
    "hostedMatches": 0,
    "joinedMatches": 0,
    "completedBookings": 0,
    "reviewsCount": 0,
    "avgRating": null,
    "joinedAt": "2026-07-18T10:00:00.000Z"
  }
}
```

| Field | Nguồn |
| :--- | :--- |
| `hostedMatches` | `COUNT` `schema_social.matches` where `host_id = me` |
| `joinedMatches` | join requests `ACCEPTED` trên pickup kèo (không tính host) |
| `completedBookings` | bookings `status = COMPLETED` |
| `reviewsCount` / `avgRating` | pickup kèo `match_host_reviews` where user is host (+ venue reviews later) |
| `joinedAt` | `users.created_at` |

### 10.2 `PATCH /users/me`   

**Body** (ít nhất một field)

| Field | Type | Notes |
| :--- | :--- | :--- |
| `fullName` | string (1–100) | |
| `gender` | `male` \| `female`  |
| `avatarUrl` | string URL http(s) \| `null` | `null` xóa avatar; hoặc `POST /users/me/avatar` |
| `language` | `en` \| `vi` | |
| `appearance` | `light` \| `dark` \| `system` | |
| `pushNotificationsEnabled` | boolean | |
| `locationServicesEnabled` | boolean | |

**Success `200`**

```json
{
  "message": "Profile updated successfully",
  "user": { "...": "..." }
}
```

**Errors:** `400` validation / unrecognized keys, `401`, `404`.

```bash
curl -s -X PATCH http://localhost:3000/users/me \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Nguyen Van B","gender":"female","language":"vi","appearance":"dark"}'
```

### 10.2b `POST /users/me/password` (Change Password)

**Body:** `currentPassword`, `newPassword`, `confirmPassword` (rule giống register).

**Success `200`:** `{ "message": "Password updated successfully" }`

### 10.2c `POST /users/me/avatar`

Multipart field **`avatar`** (jpeg/png/webp/gif, ≤2MB). Lưu `uploads/avatars/`, URL qua `/uploads/avatars/*`. Set `PUBLIC_BASE_URL` cho device LAN.

```bash
curl -s -X POST http://localhost:3000/users/me/avatar \
  -H "Authorization: Bearer <accessToken>" \
  -F "avatar=@./photo.jpg"
```

### 10.2d `GET/PATCH /users/me/preferences` (Settings)

Preference + Layout (Figma Settings). Data trên `user_profiles`; view `schema_auth.user_prefs`. Sync đa thiết bị = cùng row DB.

**GET `200`:** `{ "preferences": { language, appearance, pushNotificationsEnabled, locationServicesEnabled } }`

**PATCH** (≥1 field): `language` (`en`|`vi`), `appearance` (`light`|`dark`|`system`), toggles. Strict — không nhận `fullName`/email.

**PATCH `200`:** `{ "message": "Preferences updated successfully", "preferences": { ... } }`

### 10.3 Đổi email (OTP)

1. `POST /users/me/email/request` `{ "newEmail": "new@example.com" }`
2. `POST /users/me/email/confirm` `{ "newEmail": "new@example.com", "otp": "123456" }`

OTP gửi tới **email mới**. OTP row dùng `purpose = CHANGE_EMAIL:{sha256(newEmail)[:32]}` để gắn đúng địa chỉ. Trùng email khác user → `409`. Email giống hiện tại → `400`. OTP sai / hết hạn giống auth (`400` / `429`).

### 10.4 Đổi phone (OTP)

1. `POST /users/me/phone/request` `{ "newPhone": "0901234567" }`
2. `POST /users/me/phone/confirm` `{ "newPhone": "0901234567", "otp": "123456" }`

OTP gửi tới **email hiện tại** (chưa có SMS). Purpose: `CHANGE_PHONE:{newPhone}`. Phone VN 10 số (cùng rule register).

### 10.5 `GET /users/me/schedule` (View Schedule)

Lịch cá nhân: booking của player + social match (host hoặc participant `APPROVED`).  
Join `schema_booking` + `schema_social` + `schema_venue`. Timezone lịch: **`Asia/Bangkok`**.

**Query**

| Param | Default | Notes |
| :--- | :--- | :--- |
| `type` | `all` | `all` \| `booking` \| `match` |
| `from` | hôm nay (Bangkok) | `YYYY-MM-DD` |
| `to` | `from` + 30 ngày | `YYYY-MM-DD`; phải ≥ `from` |
| `limit` | `50` | 1–100 |

Ngày `from`/`to` là ngày lịch Bangkok; server map sang nửa khoảng UTC `[from 00:00+07, to+1 00:00+07)` rồi so với `booking_time_range` (`tstzrange`).

**Success `200`**

```json
{
  "items": [
    {
      "type": "BOOKING",
      "bookingId": 1,
      "matchId": null,
      "startsAt": "2026-08-20T11:00:00.000Z",
      "endsAt": "2026-08-20T12:00:00.000Z",
      "bookingDate": "2026-08-20",
      "status": "PAID",
      "venueName": "Smoke Venue",
      "fieldName": "Pitch A",
      "address": "123 Nguyen Trai, Dist 1, HCMC",
      "sportType": "Football"
    },
    {
      "type": "MATCH",
      "bookingId": 1,
      "matchId": 9,
      "role": "HOST",
      "startsAt": "2026-08-20T11:00:00.000Z",
      "endsAt": "2026-08-20T12:00:00.000Z",
      "bookingDate": "2026-08-20",
      "status": "PAID",
      "venueName": "Smoke Venue",
      "fieldName": "Pitch A",
      "address": "123 Nguyen Trai, Dist 1, HCMC",
      "sportType": "Football"
    }
  ],
  "timezone": "Asia/Bangkok"
}
```

`bookingId` / `matchId` đủ để FE navigate detail / cancellation policy. Bỏ `CANCELLED`.

```bash
curl -s "http://localhost:3000/users/me/schedule?type=all" \
  -H "Authorization: Bearer <accessToken>"
```

### 10.6 `POST /users/me/schedule/dev/seed` (dev only)

Tạo venue + field + booking (+ match nếu `includeMatch`, default `true`) gắn user hiện tại. Không có trong production.

```bash
curl -s -X POST http://localhost:3000/users/me/schedule/dev/seed \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"includeMatch":true,"daysFromNow":3}'
```

---

## 11. Notifications endpoints

Inbox in-app + badge unread + mark read (SPOT-153/154). Schema: `schema_notification`.  
Alias `/api/notifications/*`. Tất cả route cần Bearer access.

| Method | Path | Behavior |
| :--- | :--- | :--- |
| `GET` | `/notifications` | Inbox: `?limit=20&beforeId=&unreadOnly=` → `{ items, nextCursor }` |
| `GET` | `/notifications/unread-count` | `{ count }` cho bell badge |
| `PATCH` | `/notifications/:id/read` | Đánh dấu một thông báo đã đọc |
| `POST` | `/notifications/read-all` | Đánh dấu tất cả đã đọc → `{ updated }` |
| `POST` | `/notifications/dev/seed` | Dev only — tạo inbox (+ optional `dueReminderNow` / schedule) |
| `POST` | `/notifications/dev/process-due` | Dev only — chạy một tick reminder worker |

Types: `BOOKING_CREATED` \| `BOOKING_REMINDER` \| `MATCH_CANCELLED` \| `MATCH_EXPIRED_UNDERFILLED` \| `GROUP_JOIN_REQUEST` \| `GROUP_APPROVED` \| `GROUP_REJECTED` \| `GROUP_KICKED` \| `GROUP_ADMIN_TRANSFERRED` \| `SYSTEM`.  
Match cancel/expiry: `MATCH_CANCELLED` với `data.reason` = `HOST_CANCEL` \| `EXPIRED_UNDERFILLED` (host cancel không notify chính host).  
Group join/manage: xem [§8.16 Group notifications](#816-group-notifications-inbox).
Reminder T-24h / T-2h: service `scheduleBookingReminders` + Redis ZSET `notif:reminders` + DB `reminder_jobs`. Worker: `npm run worker:reminders`. Match expiry: `npm run worker:match-expiry`.  
Opt-out (`pushNotificationsEnabled: false`): vẫn ghi inbox; **không** gửi email cho `BOOKING_REMINDER`.

```bash
curl -s http://localhost:3000/notifications/unread-count \
  -H "Authorization: Bearer <accessToken>"
```

---

## 12. Reviews endpoints

Đánh giá sân sau booking (SPOT-165/166). Schema: `schema_review` + cột `avg_rating` / `rating_count` trên `schema_venue.venues`.  
Alias `/api/reviews/*`. Cần Bearer access.

| Method | Path | Behavior |
| :--- | :--- | :--- |
| `GET` | `/reviews/hosts/:userId/reviews` | Pickup kèo — reviews host nhận từ participants (`limit`, `offset`) |
| `POST` | `/reviews` | Player tạo review cho booking `COMPLETED` |
| `POST` | `/reviews/:id/reply` | Venue owner trả lời (1 reply / review) |
| `GET` | `/reviews/venues/:venueId/rating` | Aggregate rating (DB + Redis cache `venue:rating:{id}`) |
| `POST` | `/reviews/dev/seed-booking` | Dev only — tạo booking `COMPLETED` để test review |

**Pickup kèo host review** (Manage Matches Completed / Check Profile)

- `POST /matches/:id/review` — participant `ACCEPTED`, kèo reviewable, 1 review / user / kèo
- `GET /reviews/hosts/:userId/reviews` — list + `hostRating` aggregate
- `host.rating` trên match cards + `GET /users/:id` lấy từ `match_host_reviews`

**Booking venue review rules**

- 1 review / `booking_id` (`UNIQUE`)
- Chỉ `status = COMPLETED`
- Spam filter cơ bản (Zod): rating 1–5, text ≤ 2000, reject text “spammy”
- Rate limit: tối đa 10 review / player / 24h → `429`
- Reply: chỉ `venues.owner_id ===` user hiện tại; 1 reply / review
- Sau create: cập nhật `venues.avg_rating` / `rating_count`, invalidate Redis cache

### 11.1 `POST /reviews`

**Body**

```json
{
  "bookingId": 1,
  "rating": 5,
  "reviewText": "Clean field and friendly staff"
}
```

**Success `201`**

```json
{
  "review": {
    "reviewId": 1,
    "bookingId": 1,
    "venueId": 1,
    "playerId": 1,
    "rating": 5,
    "reviewText": "Clean field and friendly staff",
    "createdAt": "...",
    "reply": null
  },
  "venueRating": {
    "venueId": 1,
    "avgRating": 5,
    "ratingCount": 1
  }
}
```

**Errors:** `400` (chưa COMPLETED / validation), `401`, `404` booking, `409` đã review, `429` spam rate.

### 11.2 `POST /reviews/:id/reply`

```json
{ "replyText": "Thanks for your feedback!" }
```

**Success `201`** → `{ review, reply }`.  
**Errors:** `403` không phải owner, `404`, `409` đã reply.

### 11.3 `GET /reviews/venues/:venueId/rating`

```json
{ "venueId": 1, "avgRating": 5, "ratingCount": 1, "source": "db" }
```

`source` là `cache` hoặc `db`.

```bash
curl -s -X POST http://localhost:3000/reviews \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":1,"rating":5,"reviewText":"Great pitch"}'
```

---

## 13. JWT & FE integration

### Claims

| Token | Claims | TTL mặc định |
| :--- | :--- | :--- |
| Access | `sub` (userId), `role`, `email`, `type: "access"` | `15m` (`JWT_EXPIRY`) |
| Refresh | `sub`, `role`, `type: "refresh"` | `7d` (`JWT_REFRESH_EXPIRY`) |

### Gợi ý Axios / fetch

```ts
// baseURL ví dụ
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Gắn access token cho mọi request:
api.interceptors.request.use((config) => {
  const token = getAccessToken(); // từ store
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Khi 401: gọi POST /auth/refresh rồi retry (một lần)
```

### Object `user` (public)

| Field | Type | Ý nghĩa |
| :--- | :--- | :--- |
| `userId` | string/number | ID |
| `email` | string | |
| `fullName` | string | |
| `phoneNumber` | string | |
| `role` | string | `PLAYER` / `OWNER` / `REFEREE` / … |
| `status` | string | `ACTIVE` / `PENDING` / `LOCKED` |
| `gender` | string? | |
| `avatarUrl` | string \| null | URL ảnh; chưa có upload BE |
| `language` | `en` \| `vi` | default `en` |
| `appearance` | `light` \| `dark` \| `system` | default `light` |
| `pushNotificationsEnabled` | boolean | default `true` |
| `locationServicesEnabled` | boolean | default `true` |
| `roleSelected` | boolean | |
| `roleSelectedAt` | string \| null | ISO datetime |
| `emailVerified` | boolean | |
| `createdAt` | string | |
| `skills` | object | `{ badminton, football }` — code hoặc `null` |

`GET /users/:id` dùng shape **host profile** (6.10): không `email`/`phoneNumber`/`role`/`status`/`gender`; có `matchCount`, `joinedMatches`, `rating`/`reviewCount` live từ pickup kèo reviews.

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

## 16. Chưa có / sắp làm

| Hạng mục | Status |
| :--- | :--- |
| `authenticate` / `requireRole` middleware | Done |
| `POST /auth/refresh` | Done |
| `GET /auth/me` / `GET /users/me` | Done |
| `PATCH /users/me` + OTP email/phone change | Done |
| Prefs / `avatar_url` (`001` `user_profiles`) | Done |
| Notifications inbox + reminders (`003`) | Done |
| `GET /users/me/schedule` + venue/booking/social schema (`004`) | Done |
| `POST /reviews` + reply + venue rating (`005`) | Done |
| Matchmaking kèo (`006`) — host/list/join/approve/kick/mine | Done |
| Match lifecycle + Completed tab rules + `outcome` (`008`) | Done |
| Match host reviews + `summary` + profile `joinedMatches` (`009`) | Done |
| `DELETE /matches/:id/join`, `pendingCount`, Manage Squad fields | Done |
| Refresh token rotate / Redis blacklist | Chưa |
| Admin duyệt `OWNER` / `REFEREE` (`PENDING` → `ACTIVE`) | Chưa |
| Logout | Chưa |
| Avatar file upload (S3) | Chưa (URL + local `POST /users/me/avatar` đã có) |
| FCM / device tokens | Chưa |
| Booking create/pay/cancel, payment gateway | Chưa (schedule read + reviews only) |
| **Groups G0–G5** — full groups + inbox notifications | Done (`010`, `011`) — [`GROUP_PLAN.md`](./GROUP_PLAN.md) |
| **Tournaments T0–T5** — full giải đấu + inbox notifications | Done (`012`–`014`, `013`) — [`TOURNAMENT_PLAN.md`](./TOURNAMENT_PLAN.md) |

Khi thêm endpoint mới, cập nhật file này (request / response / lỗi / curl / checklist).

---

## Liên kết

- Setup & Docker: [`README.md`](./README.md)
- Ghi chú agent / schema: [`CLAUDE.md`](./CLAUDE.md)
- Bản copy trong `docs/`: [`docs/API.md`](./docs/API.md) (cùng nội dung)
