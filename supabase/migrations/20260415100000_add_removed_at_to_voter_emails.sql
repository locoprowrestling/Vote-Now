ALTER TABLE voter_emails
  ADD COLUMN IF NOT EXISTS removed_at timestamptz DEFAULT null;
