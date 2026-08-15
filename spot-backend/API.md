# SPOT Backend — API Reference

Tài liệu dành cho **Frontend** (web / mobile / admin) và **Tester**.  
Chỉ mô tả endpoint đã implement. Domain khác (`booking`, `venue`, …) chưa có API.

| | |
| :--- | :--- |
| Base URL (local) | `http://localhost:3000` |
| Content-Type | `application/json` |
| Auth hiện tại | Access JWT trên protected routes (`Authorization: Bearer …`); refresh qua `POST /auth/refresh` |
| Alias | Mọi route `/auth/*` cũng có bản `/api/auth/*` (cùng handler) |

**Khuyến nghị FE:** dùng prefix `/api/auth` (ví dụ `http://localhost:3000/api/auth/login`).

---

## Mục lục

1. [Quick start](#1-quick-start)
2. [Quy ước chung](#2-quy-ước-chung)
3. [Enums & rules](#3-enums--rules)
4. [Luồng nghiệp vụ](#4-luồng-nghiệp-vụ)
5. [System endpoints](#5-system-endpoints)
6. [Auth endpoints](#6-auth-endpoints)
7. [JWT & FE integration](#7-jwt--fe-integration)
8. [Checklist test](#8-checklist-test)
9. [Smoke scripts](#9-smoke-scripts)
10. [Chưa có / sắp làm](#10-chưa-có--sắp-làm)

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

- Method: chủ yếu `POST` + `GET` (health).
- Body: JSON object.
- Không cần header `Authorization` cho các endpoint auth hiện tại.

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

Sample API **protected** — kiểm tra JWT / lấy profile hiện tại.

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
    "role": "PLAYER",
    "status": "ACTIVE",
    "emailVerified": true,
    "roleSelected": true
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

## 7. JWT & FE integration

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
| `createdAt` | string | |

---

## 8. Checklist test

Dùng Postman / Thunder Client / Insomnia. Collection gợi ý theo folder **Auth**.

### Happy path — PLAYER

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | `GET /health` | `200` `status: ok` |
| 2 | `POST /auth/register` (email mới) | `201` + `nextStep: SELECT_ROLE` |
| 3 | `POST /auth/role` `PLAYER` | `200` + `status: ACTIVE` |
| 4 | `POST /auth/otp/verify` (otp từ email/`debugOtp`) | `200` verified |
| 5 | `POST /auth/login` | `200` + `accessToken` |
| 6 | `GET /auth/me` + Bearer access | `200` + `user` |
| 7 | `POST /auth/refresh` | `200` + token mới |
| 8 | `GET /auth/me` với access mới | `200` |

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

### Forgot password path

| # | Request | Expect |
| :--- | :--- | :--- |
| 1 | User đã register + role + verify | — |
| 2 | `POST /auth/forgot-password` | `200` (+ `debugOtp` nếu có) |
| 3 | `POST /auth/reset-password` | `200` |
| 4 | `POST /auth/login` password mới | `200` |

---

## 9. Smoke scripts

Chạy khi server đang `npm run dev` và (nên) `OTP_DEBUG=true`:

```bash
npm run smoke:otp      # register → verify
npm run smoke:login    # register → role → verify → login → me → refresh
node scripts/smoke-forgot-password.js
node scripts/smoke-register.js
```

Unit test DTO:

```bash
npm test
```

---

## 10. Chưa có / sắp làm

| Hạng mục | Status |
| :--- | :--- |
| `authenticate` / `requireRole` middleware | Done |
| `POST /auth/refresh` | Done |
| `GET /auth/me` (sample protected) | Done |
| Refresh token rotate / Redis blacklist | Chưa |
| Admin duyệt `OWNER` / `REFEREE` (`PENDING` → `ACTIVE`) | Chưa |
| Logout | Chưa |
| Booking / venue / payment / … | Scaffold rỗng — chưa có route |

Khi thêm endpoint mới, cập nhật file này (request / response / lỗi / curl / checklist).

---

## Liên kết

- Setup & Docker: [`README.md`](./README.md)
- Ghi chú agent / schema: [`CLAUDE.md`](./CLAUDE.md)
