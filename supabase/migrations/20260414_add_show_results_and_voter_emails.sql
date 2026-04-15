-- Feature: per-poll toggle to show results to fans on the guest screen
ALTER TABLE polls ADD COLUMN show_results boolean NOT NULL DEFAULT false;

-- Feature: collect fan emails with mailing list opt-in (one row per session)
CREATE TABLE voter_emails (
  id           uuid primary key default gen_random_uuid(),
  session_id   text not null unique,
  email        text not null,
  mailing_list boolean not null default false,
  created_at   timestamptz not null default now()
);

ALTER TABLE voter_emails ENABLE ROW LEVEL SECURITY;

-- Fans can insert their own email; no reads exposed to anon
CREATE POLICY "voter_emails_insert" ON voter_emails FOR INSERT TO anon WITH CHECK (true);

GRANT INSERT ON voter_emails TO anon;
