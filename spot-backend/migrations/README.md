# Migrations

Canonical chain (squashed). Apply with `npm run migrate`.

| File | Contents |
| :--- | :--- |
| `001_schema_auth.sql` | `users`, `user_profiles`, view `user_prefs`, `otp_verifications` |
| `002_schema_notification.sql` | `notifications`, `reminder_jobs` |
| `003_schema_venue_booking_social.sql` | venues/fields, bookings, matches/participants + reminder FK |
| `004_schema_review.sql` | `reviews`, `review_replies` |

**Reset (destructive — wipes all app data on the target DB):**

```bash
node scripts/reset-and-migrate.js
```

Do this on every environment (Supabase / local) after pulling the squash, or schemas will disagree with `schema_migrations`.
