# API Reference — Conventions & Enums

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

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
**`yourShare`**: preview runtime trên match (`ceil(priceMin / maxPlayers)` cho `SPLIT_EVENLY`). **`shareAmount`**: số tiền chốt trên join request / participant (joiner + guests).  
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

