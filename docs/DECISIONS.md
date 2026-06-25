# Decisions Log

Settled calls, newest first. Each entry records the decision and *why*, so neither a human nor the agent reopens it without new information. If you reverse one, add a new dated entry — don't edit the old one.

---

### 2026-06 · No programmatic per-raffle pages
**Decision:** Individual raffles do not get their own generated, indexable pages. We remain a link-out aggregator for individual raffles (compare on-site, click out to the source via affiliate link). All earlier design work proposing per-competition pages, a generation pipeline, an analyser gate, and a close-out cron is **cancelled**.
**Why:** Three problems stacked. (1) Maintenance — programmatic generation plus removal is ongoing effort that doesn't fit an hour a day. (2) Google risk — large volumes of similar generated pages are exactly what the scaled-content updates demote, and an aggregator that adds little beyond the source is the named target. (3) Payoff window — an individual raffle lives days to weeks, but Google takes weeks to crawl and rank a new page, so the page often dies before it can earn anything, leaving a pile of thin dead URLs that drag the domain.
**What we keep instead:** hand-written long-lived content — site review pages and pillar guides (see CONTENT.md). This is the bet we're now testing: does focusing on durable content lift organic + AI-citation traffic?

### 2026-06 · Supabase is the datastore (not committed JSON/SQLite)
**Decision:** Stay on Supabase (Postgres).
**Why:** Corrects an earlier suggestion to use committed JSON or local SQLite for build-time static generation. With ~9 sites and several thousand live raffles refreshed every few hours, the dataset is large and live — exactly the case where a real hosted DB is correct and committed files are wrong.

### 2026-06 · Engineering-first sequencing
**Decision:** Order of work is observability → correctness → quality → content → growth. Don't chase "engineering 100% done" (the design/polish backlog is effectively bottomless); get the aggregator *trustworthy and observable*, then build content on top.
**Why:** Content sits on the data. If raffles are wrong or scrapers fail silently, every page built on top inherits the bugs — and you can't prioritise fixes you can't see. Observability comes before even the bug fixes because it tells you which bugs actually matter.

### 2026-06 · Three workstreams; sales is not one yet
**Decision:** Track work as Engineering / Content / Growth in Linear. ROADMAP.md sequences across them. Sales is not a workstream — at this scale it's "reply to operators who email asking to be listed," handled ad hoc.
**Why:** Content and growth differ enough in cadence and skill that merging them hides sequencing. Sales has no recurring work to plan.

### 2026-06 · Observability via a NEW personal Sentry; PostHog separate and later
**Decision:** Set up a fresh personal Sentry project (free tier) for scraper/backend error tracking, wired into the DigitalOcean droplet. PostHog is a separate, later item for *user* analytics on the site.
**Why:** The work Sentry account is off-limits for a personal side project — keep them fully separate. Sentry (backend errors: "a scraper threw / a run returned zero / images came back null") and PostHog (user behaviour) answer different questions and shouldn't be conflated.

### 2026-06 · Unified vocabulary: sites + raffles
**Decision:** Use `sites` (operators) and `raffles` (individual competitions) everywhere — schema, code, routes, copy. Drop synonyms like "operator/competition/draw" from strategy docs.
**Why:** The existing schema and codebase already use sites/raffles. Aligning the strategy docs to the code (not the reverse) avoids a rename and keeps everything consistent.

### 2026-06 · Keep the existing build; layer on top
**Decision:** The current Next.js + Supabase aggregator stays. New strategy is additive (a content layer + reliability improvements), not a rewrite.
**Why:** The scraper-first discipline, no-mock-data rule, schema, and odds/value calculations are correct and hard-won. No reason to rebuild a working site.
