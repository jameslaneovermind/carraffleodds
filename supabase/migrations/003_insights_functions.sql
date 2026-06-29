-- supabase/migrations/003_insights_functions.sql
-- Aggregates raffle_snapshots into a sell-through curve (days before end → avg % sold).
-- Called via supabase.rpc('get_timing_analysis').
-- Requires: raffle_snapshots.percent_sold, raffles.end_date

CREATE OR REPLACE FUNCTION get_timing_analysis()
RETURNS TABLE(
  days_before_end int,
  avg_percent_sold numeric,
  sample_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    FLOOR(
      EXTRACT(EPOCH FROM (r.end_date::timestamptz - rs.snapshot_at)) / 86400
    )::int AS days_before_end,
    ROUND(AVG(rs.percent_sold)::numeric, 1) AS avg_percent_sold,
    COUNT(rs.id)::int AS sample_count
  FROM raffle_snapshots rs
  JOIN raffles r ON rs.raffle_id = r.id
  WHERE r.end_date IS NOT NULL
    AND rs.snapshot_at < r.end_date::timestamptz
    AND EXTRACT(EPOCH FROM (r.end_date::timestamptz - rs.snapshot_at)) / 86400
        BETWEEN 0 AND 60
  GROUP BY 1
  HAVING COUNT(rs.id) >= 50
  ORDER BY 1 DESC;
$$;
