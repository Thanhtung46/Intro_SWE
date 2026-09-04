# spot-backend agent notes — Vmito Dev-Seed Import (overview)

Part of the spot-backend agent notes — see [../../CLAUDE.md](../../CLAUDE.md) for the index. Script/command reference is in [02-vmito-scripts.md](./02-vmito-scripts.md).

## Vmito import (dev seed kèo)

**Mục đích:** Lấy kèo cầu lông/bóng đá thật từ [Vmito](https://vmito.com/vi) để **seed DB SPOT** cho dev/demo/QA — thay vì crawl Facebook (unstructured, ToS rủi ro). **Dev/demo only** — tôn trọng ToS Vmito; không hammer server.

**Aug 2026 — đã implement:** `scripts/fetch-vmito-listings.js`, `scripts/sync-vmito-to-spot.js`, `scripts/reset-vmito-import.js`, `scripts/lib/vmito-parser.js`, `scripts/lib/vmito-sync.js`, `scripts/lib/vmito-venue-dedupe.js`.

**Đọc section này trước khi chạy fetch/sync** — không cần context chat; mọi quyết định thiết kế (phạm vi tỉnh, 2 file JSON, free listing, shadow host) đều ghi ở đây.

### Tóm tắt cho team mới

| Câu hỏi | Trả lời ngắn |
| :--- | :--- |
| Fetch có ghi DB không? | **Không** — chỉ ghi `data/vmito-sessions.json` |
| Sync ghi gì? | **Postgres** (users + matches) + `data/vmito-sync-report.json` |
| Chỉ lấy kèo tỉnh nào? | **TP.HCM (`79`) + Hà Nội (`01`)** — Bình Dương, Bắc Ninh, … bị bỏ |
| Kèo import có gắn catalog sân SPOT/Vmito không? | **Không** — **free listing** (text + mã tỉnh/quận + lat/lng), giống user host tay |
| Host Vmito có login được app không? | **Không** (account thật) — sync tạo **shadow user** `@import.spot.local` cho dev |
| Sync lại có ghi đè kèo cũ không? | **Không** — skip nếu slug đã import; muốn import lại từ đầu: **`npm run reset:vmito`** rồi `sync:vmito` (giữ kèo/user khác) |
| Xóa dữ liệu Vmito test mà không đụng DB cũ? | **`npm run reset:vmito`** — xóa kèo có link Vmito trong `notes` + shadow host `@import.spot.local`; **không** xóa kèo smoke/tay hay user đăng ký OTP |
| Khác gì báo cáo PA (PA0–PA2)? | PA mô tả kèo gắn **booking**; triển khai hiện tại là **free listing** (matchmaking đã ship) |

### Pipeline 2 bước

```
Vmito public API                    Postgres (Supabase)
GET /api/sessions/public                    │
        │                                   │
        ▼  npm run fetch:vmito*             │
 data/vmito-sessions.json  ────────────────►│  npm run sync:vmito*
 (snapshot — xem/sửa/sync lại)              │       │
                                            ▼       ▼
                                    matches + shadow users
                                            │
                                            └──► data/vmito-sync-report.json
                                                 (biên bản lần sync)
```

- **Bước 1 — Fetch:** cào + map sang body `POST /matches`, lưu JSON. **An toàn** — chạy thoải mái, không đụng DB.
- **Bước 2 — Sync:** đọc `spotDrafts[]` từ JSON, tạo host + kèo. **Cần** `DB_*` trong `.env`.

### Hai file JSON — khác nhau, đừng nhầm

| File | Sinh ra khi | Ghi DB? | Dùng để |
| :--- | :--- | :--- | :--- |
| **`data/vmito-sessions.json`** | `fetch:vmito*` hoặc `sync:vmito:live*` (bước fetch) | **Không** | Snapshot nguồn: raw `sessions[]` Vmito + `spotDrafts[]` (body SPOT đã map). Xem trước khi sync; sync lại nhiều lần từ cùng file. **Ghi đè** mỗi lần fetch. |
| **`data/vmito-sync-report.json`** | `sync:vmito*` (kể cả `--dry-run`) | Sync mới ghi DB | **Biên bản** lần sync: `created` / `skipped` / `failed` từng slug, `matchId`, `hostEmail`, lý do skip. **Ghi đè** mỗi lần sync. |

**Hay nhầm:** chạy `npm run sync:vmito` (không `--fetch`) → **chỉ** cập nhật report + DB, **không** refresh `vmito-sessions.json`. Muốn cả hai file mới: `npm run sync:vmito:live:50`.

**Cấu trúc `vmito-sessions.json` (metadata đầu file):**

| Field | Ý nghĩa |
| :--- | :--- |
| `fetchedAt` | Thời điểm fetch |
| `provinceScope` | `["79","01"]` — phạm vi import |
| `requestedLimit` / `count` | Số kèo yêu cầu / số kèo lưu (sau lọc tỉnh) |
| `eligibleCount` | Số kèo `syncEligible: true` (đủ SĐT host + địa chỉ + lat/lng + province/city + body hợp lệ) |
| `unsupportedSkipped` | Số kèo Vmito bị bỏ vì ngoài HCM/Hà Nội (trong lần paginate) |
| `venueTimeDuplicatesSkipped` | Số kèo bỏ vì **trùng tên sân + trùng giờ** với kèo khác trong cùng fetch |
| `inactiveStatusSkipped` | Số kèo bỏ vì **FINISHED / CANCELLED** (đã qua hoặc hủy — không import) |
| `sessions[]` | Raw từ Vmito API |
| `spotDrafts[]` | Bản map SPOT + flags `supportedProvince`, `syncEligible`, `spotCreateBody` |

**Cấu trúc `vmito-sync-report.json`:**

| Field | Ý nghĩa |
| :--- | :--- |
| `dryRun` | `true` nếu `--dry-run` (không INSERT) |
| `created` / `skipped` / `failed` | Tổng hợp |
| `hostsCreated` | Shadow user mới |
| `hostSkillsApplied[]` | Skill upsert sau sync |
| `results[]` | Chi tiết từng kèo: `status`, `reason`, `matchId`, `hostEmail`, … |

### Cách lấy data

**Primary:** Vmito public API (không cần auth):

```
GET https://vmito.com/api/sessions/public?page=1&limit=50
→ { data: { data: Session[], total, page, limit, totalPages } }
```

Script paginate tới `--limit` (hoặc `VMITO_FETCH_LIMIT`). **~1789+ kèo** trên Vmito **toàn quốc**; pipeline **chỉ giữ TP.HCM + Hà Nội** khi build snapshot và khi sync.

**Phạm vi địa lý (Aug 2026 — đã chốt):**

| Tỉnh | Mã SPOT (`GET /geo/vn`) | Fallback quận nếu map thất bại |
| :--- | :--- | :--- |
| TP.HCM | `79` | `778` (Quận 7) |
| Hà Nội | `01` | `001` (Quận Ba Đình) |

**Nhận diện tỉnh** (trong `vmito-parser.js`):

1. `venue.city` / `customLocationCity` / địa chỉ / `externalSource` / mô tả (text “Hồ Chí Minh”, “Hà Nội”, …)
2. Tọa độ trong bounding box HCM hoặc Hà Nội (khi thiếu tên tỉnh)
3. Không xác định được → **bỏ qua** (không vào JSON khi fetch; skip khi sync file cũ)

**Map quận/huyện:** tên quận Vmito → mã `city` trong `vn-admin.json` (pre-2025). HCM: alias Quận 9 → Thủ Đức (`769`); normalize `đ`→`d`. Flag `cityResolved: false` nếu dùng fallback quận.

**Ưu tiên sync-eligible** (`syncEligible: true` trên `spotDrafts[]`):

- Thuộc **HCM hoặc Hà Nội**
- Có `hostPhone` VN hợp lệ
- Có `venueName`, **`venueAddress`**, **`latitude` + `longitude`**, `province`, `city`
- Status **`PREPARING` hoặc `IN_PROGRESS`** — **bỏ** `FINISHED` / `CANCELLED`
- Có title, venue, startsAt, courts

Fetch **chỉ lấy eligible** (không pad bằng kèo thiếu địa chỉ/tọa độ). Sync **skip** draft `syncEligible: false`.

Nếu không đủ `N` kèo eligible trong phạm vi 2 tỉnh → **bổ sung fallback** (vẫn phải thuộc HCM/Hà Nội) cho đủ `N` hoặc hết trang Vmito.

**Legacy (deprecated):** homepage RSC `initialSessions` (~12 rows) — `fetchVmitoListingsFromHomepage()`.

| Nguồn | Ghi chú |
| :--- | :--- |
| `/api/sessions/public` | Dùng mặc định; pagination `page` + `limit` (max ~100/page) |
| Homepage HTML | Chỉ ~12 session; không paginate |

