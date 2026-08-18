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
