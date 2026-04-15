-- Extend the type check constraint to include 'text'
ALTER TABLE polls DROP CONSTRAINT IF EXISTS polls_type_check;
ALTER TABLE polls ADD CONSTRAINT polls_type_check
  CHECK (type IN ('prediction', 'favorite', 'custom', 'reaction', 'text'));

-- Text response storage (one row per session per poll)
CREATE TABLE text_responses (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references polls(id) on delete cascade,
  session_id text not null,
  response   text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, session_id)
);

CREATE INDEX text_responses_poll_id ON text_responses (poll_id);

ALTER TABLE text_responses ENABLE ROW LEVEL SECURITY;

-- Fans can insert a response to an open poll (one per session enforced by unique constraint)
CREATE POLICY "text_responses_insert" ON text_responses FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = text_responses.poll_id
        AND polls.status = 'open'
        AND (polls.closes_at IS NULL OR polls.closes_at > now())
    )
  );
