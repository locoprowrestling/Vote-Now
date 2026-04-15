CREATE OR REPLACE VIEW text_response_counts AS
  WITH normalized AS (
    SELECT
      tr.id,
      tr.poll_id,
      regexp_replace(btrim(tr.response), '\s+', ' ', 'g') AS response,
      lower(regexp_replace(btrim(tr.response), '\s+', '', 'g')) AS normalized_response,
      tr.created_at
    FROM text_responses tr
  ),
  ranked AS (
    SELECT
      normalized.*,
      count(*) OVER (
        PARTITION BY normalized.poll_id, normalized.normalized_response
      ) AS response_count,
      min(normalized.created_at) OVER (
        PARTITION BY normalized.poll_id, normalized.normalized_response
      ) AS first_response_at,
      row_number() OVER (
        PARTITION BY normalized.poll_id, normalized.normalized_response
        ORDER BY
          length(normalized.response) DESC,
          CASE WHEN normalized.response ~ '\s' THEN 0 ELSE 1 END,
          normalized.created_at ASC,
          normalized.id ASC
      ) AS representative_rank
    FROM normalized
    WHERE normalized.normalized_response <> ''
  )
  SELECT
    ranked.poll_id,
    ranked.normalized_response,
    ranked.response AS display_response,
    ranked.response_count,
    ranked.first_response_at
  FROM ranked
  WHERE ranked.representative_rank = 1;

GRANT SELECT ON text_response_counts TO anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'text_responses'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE text_responses';
  END IF;
END $$;
