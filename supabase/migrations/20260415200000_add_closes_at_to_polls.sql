-- Add closes_at column to polls for timed auto-close
ALTER TABLE polls ADD COLUMN closes_at timestamptz;

-- Update votes_insert RLS to block votes after closes_at and on closed polls
DROP POLICY IF EXISTS "votes_insert" ON votes;
CREATE POLICY "votes_insert" ON votes FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = votes.poll_id
        AND polls.status = 'open'
        AND (polls.closes_at IS NULL OR polls.closes_at > now())
    )
  );
