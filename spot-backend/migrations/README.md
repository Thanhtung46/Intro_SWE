# Migrations

Canonical chain. Apply with `npm run migrate` (skips filenames already in
`public.schema_migrations`). All files are idempotent (`IF NOT EXISTS` /
`CREATE OR REPLACE`).

| File | Schema | Depends on |
| :--- | :--- | :--- |
| `001_schema_auth.sql` | `users`, `user_profiles` + Settings prefs, view `user_prefs`, `otp_verifications` | — |
| `002_user_sport_skills.sql` | badminton / football skill ladders | 001 |
| `003_schema_notification.sql` | `notifications`, `reminder_jobs` | 001 |
| `004_schema_venue_booking_social.sql` | venues/fields, bookings, `schema_social.matches` + reminder FK | 001, 003 |
| `005_schema_review.sql` | `reviews`, `review_replies` | 001, 004 |
| `006_schema_matchmaking.sql` | pickup kèo: matches, courts, joins, guests, favorites, search fold + GIN, `province`/`city` | 001 |
| `007_schema_venue_images.sql` | `venue_images` — venue photo gallery (URL-only, FE uploads to storage) | 001, 004 |
| `008_notification_match_types.sql` | extend `notifications.type` — `MATCH_CANCELLED`, `MATCH_EXPIRED_UNDERFILLED` | 003 |
| `009_schema_match_host_reviews.sql` | pickup kèo host reviews (`schema_review.match_host_reviews`) | 001, 006 |
| `010_schema_groups.sql` | sport groups/clubs (`schema_groups`) | 001, 002, 006 (search fold) |
| `011_notification_group_types.sql` | group inbox notification types | 003, 010 |
| `012_schema_tournaments.sql` | tournaments (`schema_tournaments`) | 001, 002, 006 |
| `013_notification_tournament_types.sql` | tournament inbox notification types | 003, 012 |
| `014_schema_tournament_matches.sql` | tournament match fixtures + results | 012 |
| `015_schema_admin.sql` | `verification_requests`, `admin_audit_log`, `system_settings` + default policy seeds | 001 |
| `016_schema_referee.sql` | `referee_profiles`, `referee_venue_registrations`, `referee_assignments`; `bookings.hire_referee` | 004, 015 |
| `017_verification_document_kind.sql` | `verification_requests.document_kind` + partial unique index | 015 |
| `018_referee_reviews_notification.sql` | `referee_reviews`; notification type `REFEREE_INVITATION` | 016, 005, 003 |
| `019_referee_rating_half_steps.sql` | Referee rating `NUMERIC(2,1)` — 0.5–5.0 half-star steps | 018 |
| `020_referee_rating_notification.sql` | `referee_rating_jobs`; type `REFEREE_RATING_REQUEST` | 018, 016, 003 |
| `021_venue_admin_units.sql` | `venues.province` / `venues.city` (pre-2025 GSO) | 004 |
| `022_referee_venue_favorites.sql` | Job Board venue hearts (`referee_venue_favorites`) | 016, 004 |
| `023_venue_search_indexes.sql` | GIN trgm on `venues.name` / `address` for `GET /referee/board?q=` | 004, 006 |
| `024_notification_types_unified.sql` | Restore full `notifications.type` enum (018/020 had dropped match/group/tournament types) | 020, 013 |
| `025_schema_owner_ops.sql` | peak/off-peak field pricing, maintenance notes, owner revenue/review indexes | 004, 005, 007 |

`schema_social.matches` (booking-linked) is **not** `schema_matchmaking.matches` (pickup kèo). Keep both.

**Live DB after this squash:** `npm run migrate` records the new filenames and
re-runs `CREATE IF NOT EXISTS` (no data wipe). Leftover rows for old names
(`002_schema_notification.sql`, `003_schema_matchmaking.sql`, `004_match_search_fold.sql`,
`006_user_profile_prefs.sql`, …) stay in `schema_migrations` — do not delete them.

**Re-apply without renaming** (when `006` — or `004` for venue-location — is already recorded):

```bash
npm run apply:match-search    # scripts/sql/match-search-fold.sql
npm run apply:match-admin     # scripts/sql/match-admin-units.sql
npm run apply:homepage-card   # cover_url / avatar_url / favorites
npm run apply:venue-location  # scripts/sql/venue-location.sql — postgis, location, opening_hours/closing_hours split
```

**Reset (destructive — wipes all app data):**

```bash
npm run migrate:reset
```
