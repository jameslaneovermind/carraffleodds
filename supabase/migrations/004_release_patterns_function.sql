-- supabase/migrations/004_release_patterns_function.sql
-- Counts raffles per site and day of week (UTC) for the "when sites release" chart.
-- Called via supabase.rpc('get_release_patterns').
-- Counting here, not in the app, keeps the result at about (sites × 7) rows; the
-- REST API returns at most 1,000 rows per request and drops the rest without an error.
-- Requires: raffles.created_at, raffles.site_id, sites.active

CREATE OR REPLACE FUNCTION get_release_patterns()
RETURNS TABLE(
  name text,
  slug text,
  day_of_week int,
  competition_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.name::text AS name,
    s.slug::text AS slug,
    -- 0 = Sunday … 6 = Saturday, the same numbering as JavaScript's getUTCDay()
    EXTRACT(DOW FROM (r.created_at AT TIME ZONE 'UTC'))::int AS day_of_week,
    COUNT(r.id)::int AS competition_count
  FROM raffles r
  JOIN sites s ON r.site_id = s.id
  WHERE r.created_at IS NOT NULL
    AND s.active = true
  GROUP BY s.name, s.slug, 3
  ORDER BY s.slug, 3;
$$;
