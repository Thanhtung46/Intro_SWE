# SPOT Backend — API Reference

Tài liệu dành cho **Frontend** (web / mobile / admin) và **Tester**. Toàn bộ nội dung chi tiết (request/response/lỗi/curl) đã được tách theo domain trong [`api/`](./api/) — mỗi file ≤300 dòng. File này chỉ là mục lục + quy ước chung.

| | |
| :--- | :--- |
| Base URL (local) | `http://localhost:3000` |
| Content-Type | `application/json` |
| Auth hiện tại | Access JWT trên protected routes (`Authorization: Bearer …`); refresh qua `POST /auth/refresh` |
| Alias | `/auth`↔`/api/auth`, `/users`↔`/api/users`, `/matches`↔`/api/matches`, `/groups`↔`/api/groups`, `/tournaments`↔`/api/tournaments`, `/geo`↔`/api/geo`, `/notifications`↔`/api/notifications`, `/reviews`↔`/api/reviews`, `/venues`↔`/api/venues`, `/bookings`↔`/api/bookings`, `/referee`↔`/api/referee`, `/owner`↔`/api/owner`, `/admin`↔`/api/admin` |

**Khuyến nghị FE:** dùng prefix `/api/…`.

## Mục lục

| # | Domain | File |
| :--- | :--- | :--- |
| 1 | Quick start, quy ước chung, enums & rules, system endpoints | [`api/00-conventions.md`](./api/00-conventions.md) |
| 2 | Luồng nghiệp vụ (đăng ký/đăng nhập, host/join kèo, groups, tournaments) | [`api/01-business-flows.md`](./api/01-business-flows.md) |
| 3 | Auth — register / role / OTP | [`api/02-auth-register.md`](./api/02-auth-register.md) |
| 4 | Auth — login / refresh / me / forgot-reset password | [`api/03-auth-login.md`](./api/03-auth-login.md) |
| 5 | Matchmaking (kèo) | [`api/04-matchmaking.md`](./api/04-matchmaking.md) |
| 6 | Groups (hội) | [`api/05-groups.md`](./api/05-groups.md) |
| 7 | Tournaments (giải đấu) | [`api/06-tournaments.md`](./api/06-tournaments.md) |
| 8 | Users / Profile (public + own) | [`api/07-users-profile.md`](./api/07-users-profile.md) |
| 9 | Notifications | [`api/08-notifications.md`](./api/08-notifications.md) |
| 10 | Reviews | [`api/09-reviews.md`](./api/09-reviews.md) |
| 11 | JWT & FE integration | [`api/10-fe-integration.md`](./api/10-fe-integration.md) |
| 12 | Testing — checklist + smoke scripts | [`api/11-testing.md`](./api/11-testing.md) |
| 13 | Admin Console endpoints | [`api/12-admin-console.md`](./api/12-admin-console.md) |
| 14 | Owner Console endpoints (Venue Owner) | [`api/13-owner-console.md`](./api/13-owner-console.md) |
| 15 | Venues & Booking | [`api/14-venues-booking.md`](./api/14-venues-booking.md) |
| 16 | Referee — onboarding, certifications, Job Board | [`api/15-referee-onboarding.md`](./api/15-referee-onboarding.md) |
| 17 | Referee — venue pool registration | [`api/16-referee-venue-registration.md`](./api/16-referee-venue-registration.md) |
| 18 | Referee — assignments, schedule, earnings, booking integration | [`api/17-referee-assignments.md`](./api/17-referee-assignments.md) |
| 19 | Chưa có / sắp làm | [`api/18-roadmap.md`](./api/18-roadmap.md) |

Khi thêm endpoint mới: cập nhật file domain tương ứng ở trên (request / response / lỗi / curl / checklist), không thêm nội dung chi tiết vào file này.

## Liên kết

- Setup & Docker: [`README.md`](../README.md)
- Ghi chú agent / schema: [`CLAUDE.md`](../CLAUDE.md)
- Product locks: [`MATCHMAKING_PLAN.md`](./MATCHMAKING_PLAN.md), [`GROUP_PLAN.md`](./GROUP_PLAN.md), [`TOURNAMENT_PLAN.md`](./TOURNAMENT_PLAN.md), [`REFEREE_PLAN.md`](./REFEREE_PLAN.md)
