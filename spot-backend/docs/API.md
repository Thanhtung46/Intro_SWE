# SPOT Backend — API Reference

Tài liệu dành cho **Frontend** (web / mobile / admin) và **Tester**.  
Endpoint đã implement: **auth** + **matchmaking** (host / list / detail / join / approve / kick / mine / edit / cancel).

| | |
| :--- | :--- |
| Base URL (local) | `http://localhost:3000` |
| Content-Type | `application/json` |
| Auth hiện tại | Access JWT trên protected routes (`Authorization: Bearer …`); refresh qua `POST /auth/refresh` |
| Alias | Mọi route `/auth/*` cũng có bản `/api/auth/*`. `/matches/*` ↔ `/api/matches/*`. |

**Khuyến nghị FE:** dùng prefix `/api/auth` (ví dụ `http://localhost:3000/api/auth/login`).

---

## Mục lục

1. [Quick start](#1-quick-start)
2. [Quy ước chung](#2-quy-ước-chung)
3. [Enums & rules](#3-enums--rules)
4. [Luồng nghiệp vụ](#4-luồng-nghiệp-vụ)
5. [System endpoints](#5-system-endpoints)
6. [Auth endpoints](#6-auth-endpoints)
7. [Matchmaking endpoints](#7-matchmaking-endpoints)
8. [JWT & FE integration](#8-jwt--fe-integration)
9. [Checklist test](#9-checklist-test)
10. [Smoke scripts](#10-smoke-scripts)
11. [Chưa có / sắp làm](#11-chưa-có--sắp-làm)

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

- Method: chủ yếu `POST` + `GET` / `PATCH`.
- Body: JSON object.
- Public auth (register, login, OTP, forgot/reset): không cần `Authorization`.
- `GET` / `PATCH /auth/me` và mọi `/matches/*`: `Authorization: Bearer <accessToken>`.

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

`male` | `female` | `other` | `prefer_not_to_say`

### Sports & skill levels (profile)

Hai skill **độc lập** (một per sport). Unset = `null`. API lưu `code` (English).

**Badminton** (`skills.badminton`)

| rank | code | Label |
| :--- | :--- | :--- |
| 1 | `BEGINNER_MINUS` | Beginner- |
| 2 | `BEGINNER` | Beginner |
| 3 | `BEGINNER_PLUS` | Beginner+ |
| 4 | `LOW_AVERAGE` | Low avg |
| 5 | `AVERAGE_MINUS` | Avg- |
| 6 | `AVERAGE` | Avg |
| 7 | `AVERAGE_PLUS` | Avg+ |
| 8 | `FAIR` | Fair |
| 9 | `SEMI_PRO` | Semi-pro |
| 10 | `PROFESSIONAL` | Pro |

**Football** (`skills.football`)

| rank | code | Label |
| :--- | :--- | :--- |
| 1 | `LEARNING` | Learning |
| 2 | `REC_BASIC` | Rec basic |
| 3 | `REC_ADVANCED` | Rec advanced |
| 4 | `SEMI_PRO` | Semi-pro |
| 5 | `PROFESSIONAL` | Pro |
| 6 | `ELITE` | Elite |

`SEMI_PRO` / `PROFESSIONAL` tồn tại ở cả hai sport — luôn scoped theo sport.  
`badminton: "ELITE"` → `400`. Cập nhật: `PATCH /auth/me`.

### Match format

| Sport | `format` |
| :--- | :--- |
| `BADMINTON` | `SINGLES` \| `DOUBLES` |
| `FOOTBALL` | `FIVE_A_SIDE` \| `SEVEN_A_SIDE` \| `ELEVEN_A_SIDE` |

### Match fee / join / status

| Field | Values |
| :--- | :--- |
| `feeType` | `GENDER_RANGE` \| `SPLIT_EVENLY` — cùng `priceMin`/`priceMax` |
| `joinMode` | `AUTO` \| `APPROVAL` |
| `status` | `OPEN` \| `FULL` \| `COMPLETED` \| `CANCELLED` |
| Join request `status` | `PENDING` \| `ACCEPTED` \| `REJECTED` \| `KICKED` |
| Guest / fee `gender` | `female` \| `male` |
| `paymentStatus` | `SUCCESS` (stub) |

Host chiếm **1 slot** lúc tạo (`filledCount` bắt đầu = 1). Join: `filledCount += 1 + guests.length` (AUTO ngay; APPROVAL khi host accept).  
Pitch (mọi host): cùng `venueName` + cùng `venueAddress` + cùng tên court + giờ chồng (`starts < other.ends AND ends > other.starts`) → `409`. 9–11 chặn 10–12; 9–11 và 11–13 (kề) thì được. Court khác tên, hoặc cùng tên sân khác địa chỉ, thì được. `CANCELLED`/`COMPLETED` không chiếm sân.

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
PATCH /auth/me           { skills: { badminton?, football? } }
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
GET  /matches            ?sport&date&timeFrom&timeTo&skill&priceMin&priceMax&location&favorited&hostUserId&latitude&longitude&radiusKm
GET  /matches/:id        squad, spotsLeft, yourShare, canJoin, yourRequest, participants
GET  /users/:id          public host profile (no email/phone)
```

### E. Join + duyệt (PLAYER / host)

```
POST /matches/:id/join                              { message?, guests? }
GET  /matches/:id/requests                          host only
POST /matches/:id/requests/:requestId/accept        host only
POST /matches/:id/requests/:requestId/reject        host only
POST /matches/:id/participants/:userId/kick         host only (kèo ACCEPTED + guests)
```

### F. Quản lý kèo (host)

```
GET    /matches/mine?tab=active|completed
PATCH  /matches/:id                                 chưa kick-off (startsAt > now)
POST   /matches/:id/cancel
```

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
    "createdAt": "2026-04-11T06:00:00.000Z",
    "skills": { "badminton": null, "football": null }
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
    "createdAt": "...",
    "skills": { "badminton": null, "football": null }
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

API **protected** — lấy profile hiện tại (kèm skill 2 sport).

**Headers**

```http
Authorization: Bearer <accessToken>
```

**Success `200`**

```json
{
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
    "avatarUrl": null,
    "createdAt": "...",
    "skills": {
      "badminton": "BEGINNER",
      "football": "LEARNING"
    }
  }
}
```

Sport chưa set → `null`.

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

### 6.8 `GET /users/:id`

Profile **public** của user khác (màn Check Profile / host). Bearer bắt buộc. **Không** trả `email`, `phoneNumber`, `role`, `status`, `gender`. SĐT host vẫn chỉ trên `GET /matches/:id` khi caller là host hoặc `yourRequest.status === ACCEPTED`.

`rating` luôn `null`, `reviewCount` luôn `0` (review domain chưa làm). Groups không có. Badge verified không có.

**Success `200`**

```json
{
  "user": {
    "userId": 12,
    "fullName": "Vonws Jr",
    "avatarUrl": "https://example.com/a.jpg",
    "createdAt": "2026-07-18T00:00:00.000Z",
    "skills": {
      "badminton": null,
      "football": "PROFESSIONAL"
    },
    "matchCount": 10,
    "rating": null,
    "reviewCount": 0
  }
}
```

`matchCount` = số kèo user đã host, trừ `CANCELLED` (cùng công thức `host.matchCount`).

Section **Hosted Matches** trên Figma = `GET /matches?hostUserId=:id` (kèo `OPEN`/`FULL` còn hạn). View All dùng cùng filter + `limit`/`offset`.

**curl**

```bash
curl -s "http://localhost:3000/users/12" \
  -H "Authorization: Bearer <accessToken>"
```

**Errors**

| Status | Message |
| :--- | :--- |
| `400` | Validation failed (`id` không phải số ≥ 1) |
| `401` | Missing or invalid Authorization header / Invalid or expired token |
| `404` | User not found (không tồn tại, `LOCKED`, hoặc chưa `ACTIVE`) |

---

### 6.9 `PATCH /auth/me`

Cập nhật skill per sport và/hoặc avatar. **Omit key** = giữ nguyên; **`null`** trên skill = xóa skill sport đó; **`null`** trên `avatarUrl` = xóa avatar.

**Headers**

```http
Authorization: Bearer <accessToken>
```

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `skills` | object | một trong hai | Ít nhất một trong `badminton` / `football` nếu gửi `skills` |
| `skills.badminton` | string \| null | | Code badminton ladder, hoặc `null` để clear |
| `skills.football` | string \| null | | Code football ladder, hoặc `null` để clear |
| `avatarUrl` | string \| null | một trong hai | URL `http`/`https` ≤ 2048. Không upload file. |

**Success `200`**

```json
{
  "message": "Profile updated",
  "user": {
    "userId": "...",
    "email": "player@example.com",
    "skills": {
      "badminton": "BEGINNER",
      "football": "LEARNING"
    }
  }
}
```

(`user` đủ field như `GET /auth/me`.)

**Errors**

| Status | Message |
| :--- | :--- |
| `400` | Validation failed (`errors[]`, vd. `skills.badminton` khi gửi `ELITE`) |
| `401` | Missing / invalid token |
| `404` | User not found |

**curl**

```bash
curl -s -X PATCH http://localhost:3000/auth/me \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"skills\": {\"badminton\": \"BEGINNER\", \"football\": \"LEARNING\"}}"

curl -s -X PATCH http://localhost:3000/auth/me \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"skills\": {\"football\": null}}"

curl -s -X PATCH http://localhost:3000/auth/me \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"avatarUrl\": \"https://cdn.example.com/me.png\"}"
```

---

### 6.10 `POST /auth/forgot-password`

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

### 6.11 `POST /auth/reset-password`

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

## 7. Matchmaking endpoints

Base: `/matches` hoặc `/api/matches`. Mọi route cần `Authorization: Bearer <accessToken>`.  
`POST /matches` và `POST /matches/:id/join` thêm `requireRole('PLAYER')`.

Host = 1 slot lúc tạo. Join AUTO tăng `filledCount` ngay; APPROVAL tăng khi accept. Payment là stub `SUCCESS`.

---

### 7.1 `POST /matches`

Tạo kèo tự do (không cần booking).

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `sport` | string | ✓ | `BADMINTON` \| `FOOTBALL` |
| `format` | string | ✓ | Đúng ladder của sport |
| `title` | string | ✓ | ≤ 150 |
| `notes` | string | | ≤ 2000 |
| `venueName` | string | ✓ | Tên sân (vd. `San ABC`) |
| `venueAddress` | string | ✓ | Địa chỉ để mở map (≤ 500) |
| `latitude` / `longitude` | number | | Optional, phải gửi cặp. Pin map; không dùng cho occupancy |
| `startsAt` | datetime | ✓ | ISO, phải ở tương lai |
| `endsAt` | datetime | ✓ | Sau `startsAt`; kéo dài **tối thiểu 1 giờ**, không trần |
| `isMultiDay` | boolean | | Default `false` (không generate thêm ngày) |
| `isRecurring` | boolean | | Default `false` |
| `maxPlayers` | int | ✓ | 2–40 |
| `allLevels` | boolean | | `true` → full ladder sport đó |
| `skillMin` / `skillMax` | string | nếu không `allLevels` | Code cùng sport; min rank ≤ max |
| `feeType` | string | ✓ | `GENDER_RANGE` \| `SPLIT_EVENLY` |
| `priceMin` / `priceMax` | int | theo `feeType` | `GENDER_RANGE`: nữ min, nam max. `SPLIT_EVENLY`: chỉ `priceMin` = tổng tiền, không gửi `priceMax`. |
| `joinMode` | string | ✓ | `AUTO` \| `APPROVAL` |
| `courtCount` | int | | Optional; nếu gửi phải = `courts.length` |
| `courts` | `{ name }[]` | ✓ | Mỗi sân **bắt buộc tên/số** (`"1"`, `"Court 1"`). Tên không trùng. |
| `coverUrl` | string | | URL `http`/`https` ảnh cover (≤ 2048). Không upload S3. |

**Success `201`**

```json
{
  "message": "Match created",
  "match": {
    "matchId": 1,
    "hostUserId": 12,
    "hostFullName": "Nguyen Van A",
    "host": {
      "userId": 12,
      "fullName": "Nguyen Van A",
      "avatarUrl": null,
      "matchCount": 1,
      "rating": null
    },
    "hostPhoneNumber": "0901234567",
    "coverUrl": null,
    "isFavorited": false,
    "participantAvatars": [],
    "sport": "FOOTBALL",
    "format": "SEVEN_A_SIDE",
    "title": "Saturday 7v7",
    "notes": null,
    "venueName": "San ABC",
    "venueAddress": "123 Nguyen Van Linh, Q7, TP.HCM",
    "latitude": 10.729,
    "longitude": 106.721,
    "startsAt": "2026-09-01T02:00:00.000Z",
    "endsAt": "2026-09-01T04:00:00.000Z",
    "isMultiDay": false,
    "isRecurring": false,
    "maxPlayers": 14,
    "filledCount": 1,
    "spotsLeft": 13,
    "squad": { "filled": 1, "max": 14 },
    "skillMin": "REC_BASIC",
    "skillMax": "SEMI_PRO",
    "allLevels": false,
    "feeType": "SPLIT_EVENLY",
    "priceMin": 1400000,
    "priceMax": null,
    "yourShare": 1400000,
    "joinMode": "APPROVAL",
    "status": "OPEN",
    "courtCount": 1,
    "courts": [{ "courtId": 1, "name": "1", "sortOrder": 0 }],
    "createdAt": "..."
  }
}
```

`yourShare`: `GENDER_RANGE` + female → `priceMin`; male → `priceMax`; `SPLIT_EVENLY` → `ceil(priceMin / filledCount)` (giảm khi thêm người).

`host.matchCount` = số kèo host đã tạo, trừ `CANCELLED`. `host.rating` luôn `null` ở slice này (chưa có review). Figma card `4.9` = trung bình điểm **sau khi kèo xong**: người `ACCEPTED` đánh giá host; 1 user / 1 kèo. Domain `review` + `POST` complete/rate **chưa làm** — FE ẩn sao khi `null`. `participantAvatars` tối đa 3 URL (host rồi người ACCEPTED, bỏ trống nếu chưa có avatar). `isFavorited` theo caller.

`hostPhoneNumber`: có trên create/update (caller là host). **Không** có trên `GET /matches` / `GET /matches/mine` / `GET /users/:id`. Chi tiết: xem 7.3.

Map / chỉ đường (**FE + [Geoapify](https://apidocs.geoapify.com/docs/routing/)**, không gọi từ `spot-backend`):

- **Pin kèo:** `GET /matches` trả `latitude` / `longitude`. Chỉ pin khi cả hai khác `null`. Nút map trên list mở map tiles Geoapify + marker từng kèo.
- **Chỉ đường:** icon máy bay trên card kèo **không phải share**. FE lấy GPS user → [Routing API](https://apidocs.geoapify.com/docs/routing/) `waypoints=userLat,userLng|matchLat,matchLng&mode=drive`. Không có lat/lng trên kèo thì [Geocoding](https://www.geoapify.com/maps-api/) `venueName` + `venueAddress` rồi mới route.
- **Host gõ địa chỉ:** Autocomplete/Geocoding trên form tạo kèo, rồi `POST /matches` gửi cặp `latitude`/`longitude`. Occupancy **không** dùng toạ độ.
- Key Geoapify chỉ trên FE (restrict HTTP referrer / bundle ID). **Không** đưa `GEOAPIFY_API_KEY` vào backend / `.env` server.

**Errors**

| Status | Message |
| :--- | :--- |
| `400` | Validation failed |
| `401` | Missing / invalid token |
| `403` | Only PLAYER accounts can host a match |
| `404` | User not found |
| `409` | This pitch is already booked at an overlapping time (`details.matchId`, `courtName`, `hostUserId`) |

**curl**

```bash
curl -s -X POST http://localhost:3000/matches \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"sport\":\"FOOTBALL\",\"format\":\"SEVEN_A_SIDE\",\"title\":\"Saturday 7v7\",\"venueName\":\"San ABC\",\"venueAddress\":\"123 Nguyen Van Linh, Q7, TP.HCM\",\"latitude\":10.729,\"longitude\":106.721,\"startsAt\":\"2026-09-01T09:00:00+07:00\",\"endsAt\":\"2026-09-01T11:00:00+07:00\",\"maxPlayers\":14,\"skillMin\":\"REC_BASIC\",\"skillMax\":\"SEMI_PRO\",\"feeType\":\"SPLIT_EVENLY\",\"priceMin\":1400000,\"joinMode\":\"APPROVAL\",\"courts\":[{\"name\":\"1\"}]}"
```

---

### 7.2 `GET /matches`

List kèo `OPEN`/`FULL` chưa kết thúc (`endsAt > now`), sort `startsAt` tăng dần.

**Query**

| Param | Notes |
| :--- | :--- |
| `sport` | `BADMINTON` \| `FOOTBALL` |
| `date` | `YYYY-MM-DD` (ngày `startsAt` theo `Asia/Ho_Chi_Minh`) |
| `timeFrom` / `timeTo` | `HH:mm` (24h, timezone `Asia/Ho_Chi_Minh`). Có `date`: kèo **chồng giờ** với cửa sổ `[date+from, date+to]` (`startsAt < to` và `endsAt > from`; thiếu from → `00:00`, thiếu to → `23:59:59`). Không `date`: lọc **giờ bắt đầu** kèo (`startsAt::time >= timeFrom`, `< timeTo`). `timeTo` phải sau `timeFrom`. |
| `skill` | Cần kèm `sport`. Một hoặc nhiều code (lặp `skill=` hoặc `skill=A,B`). Kèo **chứa ít nhất một** rank đã chọn trong `[skillMin, skillMax]` (OR). Tối đa 10. |
| `priceMin` / `priceMax` | Integer **VND** (FE đổi `$20–$150` trước khi gửi). Cả hai: `GENDER_RANGE` nếu khoảng `[price_min, price_max]` **chồng** `[priceMin, priceMax]`; `SPLIT_EVENLY` nếu `ceil(price_min / maxPlayers)` nằm trong khoảng. Chỉ `priceMax`: như cũ (`price_min` hoặc share-khi-đầy `<= priceMax`). Chỉ `priceMin`: giá kèo `>= priceMin`. `priceMin <= priceMax`. |
| `location` | Substring `venueName` **hoặc** `venueAddress` (không phân biệt hoa thường). Radio **Location** trên Figma. **Không** gửi cùng `latitude`/`longitude`/`radiusKm`. |
| `favorited` | `true` → chỉ kèo caller đã tim (`match_favorites`). Kết hợp được với `location` **hoặc** distance (không cả hai). Bỏ trống / `false` = không lọc tim. |
| `hostUserId` | Chỉ kèo do user này host. Dùng cho màn profile host (Hosted Matches). Kết hợp được với filter khác. User không tồn tại → `total: 0`. |
| `latitude` / `longitude` / `radiusKm` | Radio **Distance**. Cả ba **cùng lúc**. GPS user + bán kính 1–20 km. Haversine; kèo không có toạ độ bị loại. **Không** gửi cùng `location`. |
| `limit` | Default 20, max 50 |
| `offset` | Default 0 |

**Success `200`**

```json
{
  "total": 2,
  "limit": 20,
  "offset": 0,
  "matches": [ { "matchId": 1, "spotsLeft": 13, "yourShare": 1400000 } ]
}
```

Mỗi phần tử cùng shape với `match` ở 7.1, **trừ** `hostPhoneNumber` (không lộ trên list).

---

### 7.3 `GET /matches/:id`

Chi tiết 1 kèo (kể cả đã qua giờ / cancelled).

**Success `200`**

```json
{
  "match": { },
  "canJoin": true,
  "yourRequest": null,
  "participants": [
    { "userId": 12, "fullName": "Host", "role": "HOST", "heads": 1, "guests": [] }
  ]
}
```

`match` cùng shape 7.1. `hostPhoneNumber` **chỉ** có khi caller là host hoặc `yourRequest.status === ACCEPTED` (đã vào kèo). List / viewer chưa join / `PENDING` / `KICKED` không có field này. `yourRequest` là request `PENDING`/`ACCEPTED`/`KICKED` của caller (hoặc `null` nếu chưa join / đã `REJECTED`). `canJoin` = không phải host, kèo `OPEN`, còn slot, chưa có request active, **không bị kick**. Khi `filledCount >= maxPlayers` → `status` = `FULL`, `spotsLeft` = `0` (FE ẩn Join).

`participants[0]` (HOST) cũng có `phoneNumber` trong cùng điều kiện. Player khác không thấy SĐT host nếu chưa `ACCEPTED`.

**Errors:** `400` Invalid match id · `401` · `404` Match not found

---

### 7.4 `POST /matches/:id/join`

PLAYER xin vào kèo. Body có thể `{}` (một mình, không guests).

**Body**

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `message` | string | | ≤ 500 |
| `phoneNumber` | string | | SĐT liên lạc của **người xin kèo**. Bỏ trống → dùng SĐT account. Số VN 10 chữ số. |
| `guests` | `{ name, skill, gender, phoneNumber }[]` | | Max 10. `phoneNumber` **bắt buộc** (host gọi khách). `skill` đúng ladder sport. `gender`: `female` \| `male`. |

Skill ngoài range kèo → **vẫn tạo request**, `skillWarning: true`. Skill sai sport → `400`.

`AUTO`: request `ACCEPTED`, `filledCount` tăng, `shareAmount` ghi nhận, `paymentStatus: SUCCESS`.  
`APPROVAL`: request `PENDING`, `filledCount` chưa đổi; share ghi lúc accept.

**Success `201`**

```json
{
  "message": "Join request submitted",
  "skillWarning": false,
  "warning": null,
  "request": {
    "requestId": 1,
    "matchId": 8,
    "userId": 20,
    "phoneNumber": "0912345678",
    "status": "PENDING",
    "skillWarning": false,
    "heads": 3,
    "shareAmount": null,
    "paymentStatus": null,
    "guests": [
      { "guestId": 1, "name": "Minh", "skill": "REC_BASIC", "gender": "male", "phoneNumber": "0901111111" }
    ]
  },
  "match": { "filledCount": 1, "spotsLeft": 13, "status": "OPEN" }
}
```

AUTO → `message: "Joined match"`, `request.status: "ACCEPTED"`, `shareAmount` = tổng share của joiner + guests.

`GENDER_RANGE`: profile joiner phải `male`/`female` (guest cũng vậy). `SPLIT_EVENLY`: `shareAmount` = `(1 + guests.length) * ceil(priceMin / filledCountAfter)`.

**Errors**

| Status | Message |
| :--- | :--- |
| `400` | Validation failed / Invalid match id / Host cannot join / Match is full / Not enough spots left / Match is cancelled / gender missing for GENDER_RANGE |
| `401` | Missing / invalid token |
| `403` | Only PLAYER accounts can join a match / You were kicked from this match |
| `404` | Match not found |
| `409` | You already have a pending or accepted request for this match |

**curl**

```bash
curl -s -X POST http://localhost:3000/matches/8/join \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Can I bring friends?\",\"phoneNumber\":\"0912345678\",\"guests\":[{\"name\":\"Minh\",\"skill\":\"REC_BASIC\",\"gender\":\"male\",\"phoneNumber\":\"0901111111\"},{\"name\":\"Lan\",\"skill\":\"LEARNING\",\"gender\":\"female\",\"phoneNumber\":\"0902222222\"}]}"
```

---

### 7.5 `GET /matches/:id/requests`

Host xem **danh sách chờ**: chỉ request `PENDING`. Rejected / accepted / kicked không nằm đây (accepted nằm `participants` ở detail). Mỗi request có `phoneNumber` (người xin) và `guests[].phoneNumber` để host gọi.

**Success `200`:** `{ "matchId", "total", "requests": [ ... ] }`

**Errors:** `403` Only the host can list join requests · `404` Match not found

---

### 7.6 `POST /matches/:id/requests/:requestId/accept`

Host duyệt. Chỉ `PENDING`. Slot: `heads` phải ≤ `spotsLeft`. Ghi `shareAmount` + `paymentStatus: SUCCESS`, tăng `filledCount`.

**Success `200`:** `{ "message": "Join request accepted", "request", "match" }`

**Errors:** `400` not pending / not enough spots / match full · `403` not host · `404`

---

### 7.7 `POST /matches/:id/requests/:requestId/reject`

Host từ chối `PENDING`. User có thể join lại sau đó (**cùng `requestId`**, chỉ đổi `status`). `filledCount` không đổi.

**Success `200`:** `{ "message": "Join request rejected", "request" }`

---

### 7.8 `POST /matches/:id/participants/:userId/kick`

Host kick joiner **ACCEPTED** (kèm toàn bộ guests của request đó). `filledCount -= heads`. Nếu đang `FULL` và còn slot → `OPEN`. Không kick được host. User bị kick **không join lại được** kèo đó (`403`).

**Success `200`:** `{ "message": "Participant kicked", "request", "match" }`

---

### 7.9 `GET /matches/mine`

Kèo **host đang login**. Query `tab` mặc định `active`.

| `tab` | Gồm |
| :--- | :--- |
| `active` | `OPEN`/`FULL` và `endsAt` còn tương lai |
| `completed` | `CANCELLED`/`COMPLETED`, hoặc `OPEN`/`FULL` đã qua `endsAt` |

Cũng nhận `limit` / `offset` như list.

**Success `200`:** `{ "tab", "total", "limit", "offset", "matches": [ ... ] }`

**curl**

```bash
curl -s "http://localhost:3000/matches/mine?tab=active" \
  -H "Authorization: Bearer <accessToken>"
```

**Errors:** `400` tab không hợp lệ · `401`

---

### 7.10 `PATCH /matches/:id`

Host sửa kèo **chưa bắt đầu** (`startsAt` > now). Body partial (ít nhất 1 field). Merge rồi validate như create (duration ≥ 1h, occupancy trừ chính kèo này).

Nếu đã có người join (`filledCount > 1`): **không** đổi `sport` / `format` / `feeType` / giá. `maxPlayers` ≥ `filledCount`.

**Success `200`:** `{ "message": "Match updated", "match" }`

**curl**

```bash
curl -s -X PATCH http://localhost:3000/matches/8 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Evening 7v7 updated\"}"
```

**Errors:** `400` already started / cancelled / completed / validation / maxPlayers too small · `403` not host · `404` · `409` pitch overlap

---

### 7.11 `POST /matches/:id/cancel`

Host hủy. Request `PENDING` → `REJECTED`. Status `CANCELLED` (không còn chiếm sân). Joiner ACCEPTED giữ nguyên lịch sử.

**Success `200`:** `{ "message": "Match cancelled", "match" }`

**curl**

```bash
curl -s -X POST http://localhost:3000/matches/8/cancel \
  -H "Authorization: Bearer <accessToken>"
```

**Errors:** `400` already cancelled / completed · `403` not host · `404`

---

### 7.12 `POST /matches/:id/favorite` · `DELETE /matches/:id/favorite`

Tim trên card homepage. `POST` gắn (idempotent). `DELETE` bỏ. Không cần body.

**Success `200`:** `{ "message": "Match favorited" | "Match unfavorited", "isFavorited": true|false, "match" }`

List `GET /matches` có `isFavorited` trên từng phần tử.

**Errors:** `401` · `404` Match not found

---

## 8. JWT & FE integration

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
| `roleSelected` | boolean | |
| `roleSelectedAt` | string \| null | ISO datetime |
| `emailVerified` | boolean | |
| `avatarUrl` | string \| null | |
| `createdAt` | string | |
| `skills` | object | `{ badminton, football }` — code hoặc `null` |

`GET /users/:id` dùng shape **host profile** (6.8): không có `email` / `phoneNumber` / `role` / `status` / `gender`; có thêm `matchCount`, `rating` (`null`), `reviewCount` (`0`).

---

## 9. Checklist test

Dùng Postman / Thunder Client / Insomnia. Collection gợi ý theo folder **Auth**.

### Happy path — PLAYER

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | `GET /health` | `200` `status: ok` |
| 2 | `POST /auth/register` (email mới) | `201` + `nextStep: SELECT_ROLE` |
| 3 | `POST /auth/role` `PLAYER` | `200` + `status: ACTIVE` |
| 4 | `POST /auth/otp/verify` (otp từ email/`debugOtp`) | `200` verified |
| 5 | `POST /auth/login` | `200` + `accessToken` |
| 6 | `GET /auth/me` + Bearer access | `200` + `user` (kèm `skills`) |
| 7 | `PATCH /auth/me` `{ skills: { badminton, football } }` | `200` + cả hai skill |
| 8 | `GET /auth/me` | `200` skill đã lưu |
| 9 | `PATCH /auth/me` `{ skills: { football: null } }` | football = `null` |
| 10 | `PATCH /auth/me` `{ skills: { badminton: "ELITE" } }` | `400` |
| 11 | `POST /auth/refresh` | `200` + token mới |
| 12 | `GET /auth/me` với access mới | `200` |

### Happy path — host + browse kèo

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | `POST /matches` football `SEVEN_A_SIDE` `maxPlayers: 14` | `201`, `filledCount: 1`, `spotsLeft: 13` |
| 2 | `POST /matches` badminton `DOUBLES` `allLevels: true` + `GENDER_RANGE` | `201`, `yourShare` theo gender |
| 2b | `POST /matches` football + `SPLIT_EVENLY` + `priceMin` (tổng) | `201`, `yourShare` = ceil(priceMin / 1) |
| 3 | `GET /matches?sport=FOOTBALL` | chứa kèo 7v7 |
| 3b | `GET /users/:hostUserId` (joiner) | `fullName`, `skills`, `matchCount`; **không** có `email`/`phoneNumber`; `rating: null` |
| 3c | `GET /matches?hostUserId=:hostUserId` | chỉ kèo OPEN/FULL còn hạn của host đó |
| 4 | `GET /matches/:id` | `squad.filled/max`, `spotsLeft`, `canJoin`, `participants` |
| 5 | `POST /matches/:id/join` `{}` (account 2, kèo AUTO) | `201`, `status: ACCEPTED`, `filledCount` += 1 |
| 6 | `POST /matches/:id/join` 2 guests (kèo APPROVAL) | `201` `PENDING`, `heads: 3`, `filledCount` chưa tăng |
| 7 | `GET /matches/:id/requests` (host) | thấy request PENDING |
| 8 | `POST .../requests/:requestId/accept` | `ACCEPTED`, `filledCount` += 3, `paymentStatus: SUCCESS` |
| 9 | Join khi `1+guests > spotsLeft` | `400` Not enough spots left |
| 10 | Join lại khi đang PENDING/ACCEPTED | `409` |
| 11 | `POST .../participants/:userId/kick` | `KICKED`, `filledCount` giảm |
| 11b | Join lại kèo đã kick | `403` You were kicked from this match |
| 12 | `GET /matches/mine?tab=active` (host) | kèo OPEN/FULL chưa hết giờ |
| 13 | `PATCH /matches/:id` `{ "title": "..." }` trước giờ | `200` title mới |
| 14 | `POST /matches/:id/cancel` | `CANCELLED`; kèo biến khỏi list public |
| 15 | `GET /matches/:id/requests` sau reject | không còn request đó (chỉ `PENDING`) |

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
| `PATCH /auth/me` không token | `401` |
| `POST /auth/refresh` bằng access token | `401` |

### Forgot password path

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | User đã register + role + verify | — |
| 2 | `POST /auth/forgot-password` | `200` (+ `debugOtp` nếu có) |
| 3 | `POST /auth/reset-password` | `200` |
| 4 | `POST /auth/login` password mới | `200` |

---

## 10. Smoke scripts

Chạy khi server đang `npm run dev` và (nên) `OTP_DEBUG=true`:

```bash
npm run smoke:otp      # register → verify
npm run smoke:login    # register → role → verify → login → me → refresh
npm run smoke:matches  # 2 PLAYER → host/join/approve/kick/mine/edit/cancel
node scripts/smoke-forgot-password.js
node scripts/smoke-register.js
```

Unit test DTO:

```bash
npm test
```

---

## 11. Chưa có / sắp làm

| Hạng mục | Status |
| :--- | :--- |
| `authenticate` / `requireRole` middleware | Done |
| `POST /auth/refresh` | Done |
| `GET /auth/me` | Done — kèm `user.skills` |
| `GET /users/:id` | Done — public host profile (không email/SĐT); `rating`/`reviewCount` stub |
| `PATCH /auth/me` | Done — set/clear skill per sport |
| Refresh token rotate / Redis blacklist | Chưa |
| Admin duyệt `OWNER` / `REFEREE` (`PENDING` → `ACTIVE`) | Chưa |
| Logout | Chưa |
| Booking / venue / payment / … | Scaffold rỗng — chưa có route |
| Matchmaking host / list / detail | Done — `POST/GET /matches`, `GET /matches/:id` |
| Join / guests / approve / kick | Done — Phase 3 |
| Host mine / edit / cancel | Done — Phase 4 |
| Matchmaking smoke (`npm run smoke:matches`) | Done — Phase 5 |
| Host rating (`host.rating` / Figma `4.9`) | **Hoãn.** Sau kèo `COMPLETED` (hoặc `endsAt` đã qua), player `ACCEPTED` rate host → trung bình. Chưa có bảng review, chưa có `POST` complete/rate. Field API giữ `null`. |
| Figma homepage: AI chatbot, notification (chuông), Booking, Schedule, Groups, Tournaments | **Khóa / chưa đụng** — không có route |

Khi thêm endpoint mới, cập nhật file này (request / response / lỗi / curl / checklist).

---

## Liên kết

- Setup & Docker: [`README.md`](../README.md)
- Ghi chú agent / schema: [`CLAUDE.md`](../CLAUDE.md)
