-- Additive only: existing reports stay unowned. Never backfill from the first user.
ALTER TABLE routing_history ADD COLUMN IF NOT EXISTS owner_user_id text;
CREATE INDEX IF NOT EXISTS routing_history_owner_idx ON routing_history (owner_user_id);
CREATE TABLE IF NOT EXISTS staff_reviewers (
  user_id text PRIMARY KEY,
  approved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE staff_case_reset_logs ADD COLUMN IF NOT EXISTS reviewer text;
