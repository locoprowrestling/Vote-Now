ALTER TABLE polls
  ADD COLUMN IF NOT EXISTS vote_reset_count integer NOT NULL DEFAULT 0;
