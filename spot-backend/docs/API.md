# SPOT Backend — API Reference

Tài liệu dành cho **Frontend** (web / mobile / admin) và **Tester**.  
Chỉ mô tả endpoint đã implement. Domain booking CRUD / venue search / payment / … chưa có API đầy đủ (có **View Schedule** read + **Reviews**).

| | |
| :--- | :--- |
| Base URL (local) | `http://localhost:3000` |
| Content-Type | `application/json` |
| Auth hiện tại | Access JWT trên protected routes (`Authorization: Bearer …`); refresh qua `POST /auth/refresh` |
| Alias | `/auth`↔`/api/auth`, `/users`↔`/api/users`, `/notifications`↔`/api/notifications`, `/reviews`↔`/api/reviews` |

**Khuyến nghị FE:** dùng prefix `/api/auth`, `/api/users`, `/api/notifications`, `/api/reviews`.

---

## Mục lục

1. [Quick start](#1-quick-start)
2. [Quy ước chung](#2-quy-ước-chung)
3. [Enums & rules](#3-enums--rules)
4. [Luồng nghiệp vụ](#4-luồng-nghiệp-vụ)
5. [System endpoints](#5-system-endpoints)
6. [Auth endpoints](#6-auth-endpoints)
7. [Users / Profile endpoints](#7-users--profile-endpoints)
8. [Notifications endpoints](#8-notifications-endpoints)
9. [Reviews endpoints](#9-reviews-endpoints)
10. [JWT & FE integration](#10-jwt--fe-integration)
11. [Checklist test](#11-checklist-test)
12. [Smoke scripts](#12-smoke-scripts)
13. [Chưa có / sắp làm](#13-chưa-có--sắp-làm)

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
POST /matches/bulk       Bearer + template + schedules[] (multi-publish)
GET  /matches/venue-suggestions  ?location&sport&limit  (Host form only)
GET  /matches            ?sport&date&timeFrom&timeTo&skill&priceMin&priceMax&location&province&city&favorited&hostUserId&latitude&longitude&radiusKm
GET  /geo/vn             dropdown 63 tỉnh/TP + quận/huyện (bản đồ **trước 2025**, không API ngoài)
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
GET    /matches/my-join-requests              joiner — Join Requests tab
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
    "gender": "male",
    "roleSelected": true,
    "roleSelectedAt": "...",
    "emailVerified": true,
    "roleSelected": true,
    "roleSelectedAt": "...",
    "createdAt": "..."
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

## 7. Users / Profile endpoints

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

### 7.1 `GET /users/me`

Giống `GET /auth/me`. `user` gồm prefs defaults: `language: "en"`, `appearance: "light"`, toggles `true`, `avatarUrl: null`.

### 7.1b `GET /users/me/profile` (Main Profile)

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
| `joinedMatches` | `match_participants` `APPROVED` (không tính host) |
| `completedBookings` | bookings `status = COMPLETED` |
| `reviewsCount` / `avgRating` | stub `0` / `null` (chưa có host-review) |
| `joinedAt` | `users.created_at` |

### 7.2 `PATCH /users/me`

**Body** (ít nhất một field)

| Field | Type | Notes |
| :--- | :--- | :--- |
| `fullName` | string (1–100) | |
| `gender` | `male` \| `female` \| `other` \| `prefer_not_to_say` | |
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

### 7.2b `POST /users/me/password` (Change Password)

**Body:** `currentPassword`, `newPassword`, `confirmPassword` (rule giống register).

**Success `200`:** `{ "message": "Password updated successfully" }`

### 7.2c `POST /users/me/avatar`

Multipart field **`avatar`** (jpeg/png/webp/gif, ≤2MB). Lưu `uploads/avatars/`, URL qua `/uploads/avatars/*`. Set `PUBLIC_BASE_URL` cho device LAN.

```bash
curl -s -X POST http://localhost:3000/users/me/avatar \
  -H "Authorization: Bearer <accessToken>" \
  -F "avatar=@./photo.jpg"
```

### 7.2d `GET/PATCH /users/me/preferences` (Settings)

Preference + Layout (Figma Settings). Data trên `user_profiles`; view `schema_auth.user_prefs`. Sync đa thiết bị = cùng row DB.

**GET `200`:** `{ "preferences": { language, appearance, pushNotificationsEnabled, locationServicesEnabled } }`

**PATCH** (≥1 field): `language` (`en`|`vi`), `appearance` (`light`|`dark`|`system`), toggles. Strict — không nhận `fullName`/email.

**PATCH `200`:** `{ "message": "Preferences updated successfully", "preferences": { ... } }`

### 7.3 Đổi email (OTP)

1. `POST /users/me/email/request` `{ "newEmail": "new@example.com" }`
2. `POST /users/me/email/confirm` `{ "newEmail": "new@example.com", "otp": "123456" }`

OTP gửi tới **email mới**. OTP row dùng `purpose = CHANGE_EMAIL:{sha256(newEmail)[:32]}` để gắn đúng địa chỉ. Trùng email khác user → `409`. Email giống hiện tại → `400`. OTP sai / hết hạn giống auth (`400` / `429`).

### 7.4 Đổi phone (OTP)

1. `POST /users/me/phone/request` `{ "newPhone": "0901234567" }`
2. `POST /users/me/phone/confirm` `{ "newPhone": "0901234567", "otp": "123456" }`

OTP gửi tới **email hiện tại** (chưa có SMS). Purpose: `CHANGE_PHONE:{newPhone}`. Phone VN 10 số (cùng rule register).

### 7.5 `GET /users/me/schedule` (View Schedule)

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

### 7.6 `POST /users/me/schedule/dev/seed` (dev only)

Tạo venue + field + booking (+ match nếu `includeMatch`, default `true`) gắn user hiện tại. Không có trong production.

```bash
curl -s -X POST http://localhost:3000/users/me/schedule/dev/seed \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"includeMatch":true,"daysFromNow":3}'
```

---

## 8. Notifications endpoints

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

Types: `BOOKING_CREATED` \| `BOOKING_REMINDER` \| `SYSTEM`.  
Reminder T-24h / T-2h: service `scheduleBookingReminders` + Redis ZSET `notif:reminders` + DB `reminder_jobs`. Worker: `npm run worker:reminders`.  
Opt-out (`pushNotificationsEnabled: false`): vẫn ghi inbox; **không** gửi email cho `BOOKING_REMINDER`.

```bash
curl -s http://localhost:3000/notifications/unread-count \
  -H "Authorization: Bearer <accessToken>"
```

---

## 9. Reviews endpoints

Đánh giá sân sau booking (SPOT-165/166). Schema: `schema_review` + cột `avg_rating` / `rating_count` trên `schema_venue.venues`.  
Alias `/api/reviews/*`. Cần Bearer access.

| Method | Path | Behavior |
| :--- | :--- | :--- |
| `POST` | `/reviews` | Player tạo review cho booking `COMPLETED` |
| `POST` | `/reviews/:id/reply` | Venue owner trả lời (1 reply / review) |
| `GET` | `/reviews/venues/:venueId/rating` | Aggregate rating (DB + Redis cache `venue:rating:{id}`) |
| `POST` | `/reviews/dev/seed-booking` | Dev only — tạo booking `COMPLETED` để test review |

**Rules**

- 1 review / `booking_id` (`UNIQUE`)
- Chỉ `status = COMPLETED`
- Spam filter cơ bản (Zod): rating 1–5, text ≤ 2000, reject text “spammy”
- Rate limit: tối đa 10 review / player / 24h → `429`
- Reply: chỉ `venues.owner_id ===` user hiện tại; 1 reply / review
- Sau create: cập nhật `venues.avg_rating` / `rating_count`, invalidate Redis cache

### 9.1 `POST /reviews`

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

### 9.2 `POST /reviews/:id/reply`

```json
{ "replyText": "Thanks for your feedback!" }
```

**Success `201`** → `{ review, reply }`.  
**Errors:** `403` không phải owner, `404`, `409` đã reply.

### 9.3 `GET /reviews/venues/:venueId/rating`

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

## 10. JWT & FE integration

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
| `avatarUrl` | string \| null | |
| `createdAt` | string | |
| `skills` | object | `{ badminton, football }` — code hoặc `null` |

`GET /users/:id` dùng shape **host profile** (6.8): không có `email` / `phoneNumber` / `role` / `status` / `gender`; có thêm `matchCount`, `rating` (`null`), `reviewCount` (`0`).

---

## 11. Checklist test

Dùng Postman / Thunder Client / Insomnia. Collection gợi ý theo folder **Auth** / **Users** / **Notifications** / **Reviews**.

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
| `PATCH /users/me` với `email` | `400` (strict) |
| Email/phone change trùng user khác | `409` |
| Email/phone change giống giá trị hiện tại | `400` |
| Review duplicate booking / non-COMPLETED | `409` / `400` |
| Reply khi không phải venue owner | `403` |
| `PATCH /notifications/999999/read` (không thuộc user) | `404` |

### Forgot password path

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | User đã register + role + verify | — |
| 2 | `POST /auth/forgot-password` | `200` (+ `debugOtp` nếu có) |
| 3 | `POST /auth/reset-password` | `200` |
| 4 | `POST /auth/login` password mới | `200` |

---

## 12. Smoke scripts

Chạy khi server đang `npm run dev` và (nên) `OTP_DEBUG=true`:

```bash
npm run smoke:otp      # register → verify
npm run smoke:login    # register → role → verify → login → me → refresh
npm run smoke:profile  # login → GET/PATCH me → email/phone OTP change
npm run smoke:notifications  # inbox + mark read + due reminder
npm run smoke:schedule       # seed schedule → GET /users/me/schedule
npm run smoke:reviews        # seed COMPLETED booking → review → reply
npm run worker:reminders     # background T-24h/T-2h processor
node scripts/smoke-forgot-password.js
node scripts/smoke-register.js
```

Unit test DTO:

```bash
npm test
```

---

## 13. Chưa có / sắp làm

| Hạng mục | Status |
| :--- | :--- |
| `authenticate` / `requireRole` middleware | Done |
| `POST /auth/refresh` | Done |
| `GET /auth/me` / `GET /users/me` | Done |
| `PATCH /users/me` + OTP email/phone change | Done |
| Prefs / `avatar_url` (`002_user_prefs.sql`) | Done |
| Notifications inbox + reminders (`003`/`004`) | Done |
| `GET /users/me/schedule` + venue/booking/social schema (`005`) | Done |
| `POST /reviews` + reply + venue rating (`006`) | Done |
| Refresh token rotate / Redis blacklist | Chưa |
| Admin duyệt `OWNER` / `REFEREE` (`PENDING` → `ACTIVE`) | Chưa |
| Logout | Chưa |
| Avatar file upload (S3) / stats | Chưa |
| FCM / device tokens | Chưa |
| Booking create/pay/cancel, matchmaking lobby, payment, … | Chưa (schedule read + reviews only) |

Khi thêm endpoint mới, cập nhật file này (request / response / lỗi / curl / checklist).

---

## Liên kết

- Setup & Docker: [`README.md`](../README.md)
- Ghi chú agent / schema: [`CLAUDE.md`](../CLAUDE.md)
