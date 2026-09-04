# API Reference — Admin Console Endpoints

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

## 17. Admin Console endpoints

Prefix `/admin` + `/api/admin`. Mọi route cần `Authorization: Bearer` với `role = ADMIN`. Seed admin: `npm run seed:admin` (`ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`).

### Applicant verification (Owner / Referee — trước khi admin duyệt)

Sau `POST /auth/otp/verify`, user `PENDING` + `OWNER`/`REFEREE` nhận thêm `accessToken` (`nextStep: SUBMIT_VERIFICATION`) để gửi giấy tờ **trước khi** login được.

| Method | Path | Body / query | Response |
| :--- | :--- | :--- | :--- |
| `POST` | `/users/me/verification-documents` | multipart `document` (PDF/JPG/PNG, max 5MB) | `{ documentUrl }` |
| `POST` | `/users/me/verification-requests` | `{ documentUrl, requestType: OWNER_LICENSE \| REFEREE_CREDENTIAL }` | `201` `{ request }` |
| `POST` | `/users/me/verification-requests/batch` | `{ documents: [{ documentKind: ID_FRONT\|ID_BACK\|VFF_LICENSE, documentUrl }] }` | `201` `{ requests: [] }` |
| `GET` | `/users/me/verification-requests` | — | `200` `{ requests: [{ verificationReqId, requestType, documentKind, documentUrl, status, adminNotes, reviewedAt, createdAt }] }` — **auth only** (đọc được khi còn `PENDING`); `ORDER BY createdAt DESC`; `401` |

Reject → user vẫn `PENDING`; gửi lại document → reset request `REJECTED` → `PENDING`.

**`POST /auth/login` khi `PENDING`:**

- **REFEREE chưa có hồ sơ chờ duyệt** (chưa nộp / mọi doc REJECTED) → `200` + `accessToken`/`refreshToken` + `nextStep: "SUBMIT_VERIFICATION"` (quay lại màn nộp giấy tờ từ thiết bị bất kỳ).
- **REFEREE đã nộp & đang chờ duyệt**, và **mọi OWNER `PENDING`** → `403 "Account is pending approval and cannot log in yet."` + `details.nextStep: "SUBMIT_VERIFICATION"`, không token.
- Password verify chạy **trước** nhánh PENDING → sai password luôn `401` chung (không lộ trạng thái account).

### Dashboard (Figma `224:3615` / TC_ADMIN_01)

| Method | Path | Query | Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/dashboard/summary` | `registrationDays` (7–90, default 30), `role?` | `{ summary: { totalUsers, pendingApprovals, revenueTotal, revenueCurrency, revenueBreakdown, revenueSource }, userRegistrations: [{ day, count }] }` |

`revenueTotal` = booking `PAID`/`CHECKED_IN`/`COMPLETED` + match join `payment_status=SUCCESS`. Nếu cả hai = 0 → `revenueSource: "stub"`.

### Pending Approvals (Figma `224:4314` / TC_ADMIN_02)

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/admin/approvals` | `status` (default `PENDING`), `role`, `limit`, `offset` |
| `GET` | `/admin/approvals/:id` | Chi tiết + `documentUrl` |
| `POST` | `/admin/approvals/:id/approve` | `users.status` → `ACTIVE`; email notify; audit log |
| `POST` | `/admin/approvals/:id/reject` | `{ reason? }`; request → `REJECTED`; user giữ `PENDING` |

### User Management (Figma `224:3879` / TC_ADMIN_03)

| Method | Path | Body |
| :--- | :--- | :--- |
| `GET` | `/admin/users` | `role`, `status`, `q`, `limit`, `offset` |
| `GET` | `/admin/users/:id` | — |
| `PATCH` | `/admin/users/:id` | `{ role?, status? }` — không gán `ADMIN` qua API |

Suspend = `status: LOCKED` → login `403`.

### System Settings (Figma `224:4128` / TC_ADMIN_04)

| Method | Path | Body |
| :--- | :--- | :--- |
| `GET` | `/admin/settings` | — |
| `PATCH` | `/admin/settings` | Partial: `commissionRatePercent` (0–100), `paymentGateways.momo/vnpay.enabled`, `otpExpirySeconds`, `defaultCancellationWindowHours` |

Redis cache key `admin:settings:all` (TTL 60s); invalidate on PATCH.

### Audit log

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/admin/audit-log` | `limit`, `offset` — mọi approve/reject/user/settings |

Schema: migration `008_schema_admin.sql` — `verification_requests`, `admin_audit_log`, `system_settings`.

---

---

