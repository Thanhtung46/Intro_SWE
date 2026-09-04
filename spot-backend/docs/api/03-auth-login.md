# API Reference — Auth: Login / Session / Password Reset

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index. Register/OTP endpoints are in [02-auth-register.md](./02-auth-register.md).

### 6.5 `POST /auth/login`

Đăng nhập → JWT.

**Điều kiện bắt buộc**

1. Email + password đúng  
2. Email đã verify  
3. Đã chọn role (`role_selected_at`)  
4. `status` không phải `LOCKED`; nếu `PENDING` xem **PENDING REFEREE** dưới  
5. Không trong `lockout_until`

**PENDING REFEREE — resume token**

Một `REFEREE` `PENDING` **chưa có bộ hồ sơ nào đang chờ duyệt** (chưa nộp,
hoặc mọi giấy tờ đã bị REJECTED) → login (đúng password) trả **`200`** kèm
`accessToken` / `refreshToken` + `nextStep: "SUBMIT_VERIFICATION"` để quay
lại màn nộp giấy tờ từ thiết bị bất kỳ (giống `POST /auth/role` +
`POST /auth/otp/verify`).

`REFEREE` đã nộp & đang chờ admin duyệt, **và mọi `OWNER` `PENDING`** →
vẫn `403` + `details.nextStep: "SUBMIT_VERIFICATION"`.

Kiểm tra password **trước** khi phân biệt PENDING → sai password luôn trả
`401` chung, không lộ trạng thái account.

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
| `403` | Account is pending approval and cannot log in yet. | `nextStep: "SUBMIT_VERIFICATION"` — OWNER pending, hoặc REFEREE đã nộp/đang chờ duyệt (REFEREE chưa nộp → `200` + token, xem trên) |
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

