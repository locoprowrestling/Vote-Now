ALTER TABLE polls ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Initialize existing polls: newest = 0, next = 1, etc. (matches current display order)
WITH ranked AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1) AS rn
  FROM polls
)
UPDATE polls SET sort_order = ranked.rn FROM ranked WHERE polls.id = ranked.id;
