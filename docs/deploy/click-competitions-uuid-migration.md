# Click Competitions: UUID Migration Note

The scraper previously keyed `external_id` on URL slugs; it now uses the UUID from the API `id` field. On first deploy, the old slug-keyed rows (same competitions) will remain active as duplicates producing duplicate listings until their `end_date` expires.

## One-time cleanup SQL

Run this **BEFORE** the first full scrape after deploy, not after.

```sql
DELETE FROM raffles
WHERE site_id = (SELECT id FROM sites WHERE slug = 'click-competitions')
  AND status IN ('active', 'ending_soon');
```

> **Warning:** Run this BEFORE the first full scrape after deploy, not after.
> Running it after will delete the freshly-scraped UUID-keyed rows.
