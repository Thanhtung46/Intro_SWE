-- Track whether the user finished Register Step 2 (role selection).

ALTER TABLE schema_auth.users
  ADD COLUMN IF NOT EXISTS role_selected_at TIMESTAMP NULL;
