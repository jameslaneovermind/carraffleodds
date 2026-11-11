
$8c5b1d68-606f-576e-b923-24fdbc7e7c5d$b48cb8ec-4fe5-497f-a4db-0ef6ca98963c *$1038bbe9-5bc8-4612-8a26-5f134affb71b22222B$5c91888c-32da-59ba-bce7-60014411209eJÕ¤Ó×ÐËùËÊ	N
L
$340a7aee-f832-5318-a744-ffe7207a5b45$fd9f6352-d566-5ebc-bed2-a8b8e2702448²Ü=
Õ=# Fix plan: count every raffle in the "when sites release" chart

## Problem

The "When Do Sites Release New Competitions?" insights page shows, for each site, how many raffles were first seen on each day of the week. Today it counts about 8% of them. The page asks the database for every raffle and adds them up itself, but the database's public API hands back at most 1,000 rows per request and reports no error when it drops the rest. Measured on the live database on 2026-11-11: 12,385 raffles exist, 1,000 came back. Which 1,000 is arbitrary, so the per-site totals and the day-of-week pattern on the page are wrong, and some sites may be missing altogether.

## Why now

## The Linear issue (JAM-25) filed this as a future risk, safe while there were about 482 live raffles. Reproduction showed it is already happening: the chart counts raffles of every status, including ended ones, which are never deleted. The page states it is "based on all competitions tracked since February 2026" and its prose quotes proportions from this data, so the site is currently publishing figures it cannot stand behind (hard rule 10: never misrepresent).

## Who cares

Readers of `/insights/when-sites-release`, who use the pattern to decide when to look for newly opened raffles. And the site's credibility: independence and honest data are the product.

## Where this sits

Until Ticket BUG-1, copied from Linear JAM-25. The chart came from the CON-4 insights work (`docs/superpowers/plans/2026-06-29-con4-insights.md`), which already solved the same problem for the sell-through timing chart by counting in the database.

## Scope and done

- In scope: the release-patterns chart only.
- Done means: the page's per-site totals and day-of-week counts equal what the database holds for active sites, however many raffles there are.
- Technical headline: move the counting into a Postgres function called over RPC, exactly as the timing chart already does, so the app receives about (sites Ã— 7) summary rows instead of every raffle.

## Reproduction

- Branch: `bug-1-release-patterns-truncation` (pushed; commit `3cd6476`).
- Failing test: `src/lib/__tests__/insights-release-patterns.test.ts`, "getReleasePatterns with more raffles than the API row cap" (2 tests). Run with `npx vitest run src/lib/__tests__/insights-release-patterns.test.ts`. It uses a fake client that caps table reads at 1,000 rows, with 2,500 fixture rows across two sites; today only 1,000 are counted and the second site is missing.

## Decisions already made

- **Count in the database, not with a bigger limit.** The issue's quick fix, `.limit(5000)`, was tested against the live API and still returns 1,000 rows: the cap is a server-side project setting. Rejected.
- **Not client-side paging.** Paging with `.range()` would work but means 13+ requests today and grows with the table. The repository already has the database-function pattern (`get_timing_analysis`), so follow it.
- **Count raffles of every status.** The page says "all competitions tracked", and the method note defines a release as the first time the scraper saw a raffle. So drawn, sold-out and cancelled raffles stay in the count, as they are in today's query.

## Assumptions

- **Your call â€” the two neighbouring charts are left out of this fix.** The same flaw affects the market-breakdown chart (3,003 matching rows, so it is truncated now) and probably the site-comparison table (2,996 rows before its extra filters; not measured after them). I recommend one follow-up Bug Ticket covering both, so this fix stays small and reviewable. Say so if you would rather widen this one.
- **Your call â€” the page's hand-written prose may need a touch-up after the fix.** It says Lucky Day "clusters its releases heavily around Wednesday â€” roughly half". That was written against truncated data. I recommend you re-read the prose against the corrected chart once it is live and edit it yourself if the claim no longer holds; this plan does not change prose (rules 5 and 7).
- The migration is applied by hand in the Supabase SQL editor, as `003` was (the CON-4 plan records there is no Supabase CLI in this project). The implementing agent does not apply it; you do.
- The function's rows keep the existing field name `competition_count`, because that is the shape `groupReleasePatternRows` and its tests already take. Renaming it to match the site/raffle vocabulary is a separate cleanup.
- If the RPC fails, the function keeps today's behaviour and returns an empty list, which the page renders as "No data available yet". No fallback data (hard rule 1).

## Implementation

1. **New migration `supabase/migrations/004_release_patterns_function.sql`** defining the contract below, written in the same style as `003_insights_functions.sql` (`CREATE OR REPLACE`, `LANGUAGE sql`, `STABLE`, `SECURITY DEFINER`).

   Contract â€” `get_release_patterns()`, no arguments, returns one row per site and day that has at least one raffle:

   | column | type | meaning |
   | --- | --- | --- |
   | `name` | text | `sites.name` |
   | `slug` | text | `sites.slug` |
   | `day_of_week` | int | 0 = Sunday â€¦ 6 = Saturday, taken from `raffles.created_at` in UTC |
   | `competition_count` | int | number of raffles for that site first seen on that day |

   Required behaviour: includes only raffles whose site has `active = true`, and only raffles with a non-null `created_at`; no status filter. Invariant: `day_of_week` must match JavaScript's `getUTCDay()` on the same timestamp, which is what the page's method note describes and what the current code computes.

2. **`src/lib/insights.ts`, `getReleasePatterns`**: replace the table read and in-app counting with a call to `rpc('get_release_patterns')`, passing its rows to the existing `groupReleasePatternRows`. Return type and the empty-list-on-error behaviour are unchanged. `groupReleasePatternRows`, the widget, and the page are not touched.

3. **`docs/DATA-MODEL.md`**: one line noting that the release-patterns chart is served by `get_release_patterns()`, next to wherever `get_timing_analysis()` is described; if that function is not documented there, add both in one short note.

## Scope fence

- No change to `getMarketBreakdown`, `getSiteComparisonData`, or `getInsightsMetadata`.
- No change to page prose, UI, or the chart's meaning.
- No change to the project's API row cap setting.
- No renaming of `competition_count`.

## Tests and verification

- The two reproduction tests pass without editing their assertions. The fake client in that file already answers `rpc('get_release_patterns')` with the contract's row shape.
- The existing `groupReleasePatternRows` tests in `src/lib/__tests__/insights.test.ts` still pass; `npm run test` and `npm run lint` are clean.
- The SQL cannot be exercised by the unit tests, so the pull request description includes a read-only check query for you to run in the SQL editor after applying the migration: the function's summed `competition_count` must equal a direct count of raffles with a non-null `created_at` on active sites.

## After it ships

- **Target:** production Supabase project and `https://www.carraffleodds.com/insights/when-sites-release`.
- **Order matters:** apply `004` in the SQL editor before merging. The function is additive and safe to apply early; merging first would make the chart show "No data available yet" until it exists.
- **Deployment evidence:** `select * from get_release_patterns() limit 5;` returns rows in the SQL editor, and the Vercel deployment for the merge commit is live.
- **Outcome evidence:** the "total competitions" figures on the page add up to roughly 12,000 across sites (minus any inactive sites), not 1,000. The page revalidates hourly, so allow up to an hour or redeploy.
- **Safety:** applying SQL to production and any prose edit are yours to do; nothing is applied or published automatically.
  