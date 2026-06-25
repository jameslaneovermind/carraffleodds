# CarRaffleOdds

Independent UK car raffle comparison site. We scrape live competition data from major UK raffle sites and present it in one filterable, comparable place — odds, ticket price, % sold, value — so people can make informed decisions. We don't run raffles or sell tickets. Revenue is affiliate commission on click-throughs.

**Live:** https://carraffleodds.com
**Stack:** Next.js (App Router) + TypeScript + Tailwind/shadcn · Supabase (Postgres) · Playwright/cheerio scrapers on a DigitalOcean droplet · Vercel hosting.

---

## How this documentation is organised

There are three kinds of doc here. Read them in this order the first time.

**1. Orientation (read first)**
- **`README.md`** (this file) — what the project is and where everything lives.
- **`CLAUDE.md`** (repo root) — how to work in this repo, and the hard rules that must never be broken. The agent reads this every session.
- **`docs/DECISIONS.md`** — the settled calls and *why*, so we don't re-litigate them.

**2. Reference (consult as needed)**
- **`docs/DATA-MODEL.md`** — the canonical data schema and the derived-metric formulas.
- **`docs/COMPLIANCE.md`** — the legal/ethical guardrails for a gambling-adjacent UK site. Check before writing public copy or listing a new site.

**3. The plan (what to actually do)**
- **`docs/ROADMAP.md`** — the sequenced plan across all workstreams, with "done enough to move on" signals. Start here when deciding what to work on.
- **`docs/ENGINEERING.md`** — the engineering backlog (ticket-ready).
- **`docs/CONTENT.md`** — the content approach + content backlog (ticket-ready).
- **`docs/GROWTH.md`** — the marketing/growth backlog (ticket-ready).

**Skills** live in `.claude/skills/`. These are procedures the agent uses for recurring tasks (writing a scraper, adding a site, writing a guide), separate from the reference docs above. See `CLAUDE.md` for how docs vs skills differ.

---

## How we work

This is a one-person side project with roughly an hour a day to spend. The working loop is: docs describe initiatives → initiatives become Linear tickets → work through them one at a time, guided by `ROADMAP.md`.

Three workstreams, tracked separately in Linear:
- **Engineering** — the aggregator: scrapers, data, reliability, performance.
- **Content** — long-lived, hand-written pages: site reviews and pillar guides.
- **Growth** — email, community, AEO measurement.

The current phase is **engineering-first**: get the aggregator trustworthy and observable before building content on top of it. See `ROADMAP.md`.

---

## Quickstart (local dev)

> Grounding note: confirm these against the real repo — paths and scripts below reflect the documented structure and may have drifted.

```bash
git clone <repo>
cd carraffleodds
npm install
cp .env.local.example .env.local   # fill in Supabase keys + scrape secret
npm run dev                          # Next.js dev server
```

Scrapers run on the DigitalOcean droplet, not locally by default. To run one against live sites for dev, use the seed/scrape script (see `docs/ENGINEERING.md` and the `write-scraper` skill). **Never** add mock data — a failing scraper shows "no data," not fake records.

---

## Repo layout (documented; verify against real repo)

```
/                         README.md, CLAUDE.md
/docs                     ROADMAP, ENGINEERING, CONTENT, GROWTH, DATA-MODEL, COMPLIANCE, DECISIONS
/.claude/skills           site-domain, writing-voice, write-scraper, add-site, write-content
/src/app                  Next.js pages (home, /raffles, /ending-soon, /sites/[slug], /about)
/src/components           raffle-card, raffle-grid, filters, layout, …
/src/lib                  supabase client, types, utils (odds/value calcs)
/src/scrapers             base + per-site scrapers + run-all orchestrator
/supabase/migrations      schema
```

---

## A note on this being a personal project

This is personal, separate from work. Keep it that way at the account level: personal email, personal billing, and separate accounts for everything (Sentry, analytics, Anthropic API, email tool, hosting). Don't wire any of it through work SSO, work orgs, or work billing. It's trivial now and a headache to untangle later. See `docs/DECISIONS.md`.
