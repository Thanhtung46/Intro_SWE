# API Reference — Not Yet Implemented

Part of the SPOT backend API reference — see [../API.md](../API.md) for the full index.

Everything else in this reference (auth, matchmaking, groups, tournaments, venue/booking, referee, admin/owner console, notifications, reviews) is implemented. Remaining gaps:

| Item | Status |
| :--- | :--- |
| Refresh-token rotate / Redis JWT blacklist | Not implemented — refresh re-issues tokens, old refresh token stays valid until TTL |
| Logout endpoint | Not implemented |
| FCM / push device tokens | Not implemented |
| Payment gateway (booking) | Not implemented — non-prod stand-in: `POST /bookings/:id/dev/mark-paid` |

Khi thêm endpoint mới, cập nhật file domain tương ứng (request / response / lỗi / curl / checklist) chứ không phải file này.
