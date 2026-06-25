# CLAUDE.md

Operating manual for AI coding agents (Claude Code, Cursor) working in this repo. Read this every session. The hard rules below are not suggestions — they encode decisions made deliberately (see `docs/DECISIONS.md`). If a task seems to require breaking one, stop and flag it rather than working around it.

---

## What this project is

An independent UK car raffle **comparison** site. We scrape live data from raffle **sites** and present individual **raffles** for comparison. We link out to the source site (via affiliate links) for the actual purchase — we are not a raffle operator. Revenue is affiliate commission. One-person side project, ~1 hour/day.

Read `README.md` for orientation, `docs/ROADMAP.md` for what to work on, `docs/DATA-MODEL.md` and `docs/COMPLIANCE.md` for reference.

---

## Vocabulary (use these exact terms everywhere)

- **site** — a raffle operator we track (BOTB, Dream Car Giveaways, etc.). DB table: `sites`. Routes: `/sites/[slug]`.
- **raffle** — an individual competition on a site. DB table: `raffles`.
- Do **not** introduce synonyms ("operator", "competition", "draw") in code, schema, routes, or UI copy. One vocabulary, applied consistently.
- **Money is stored as integer pence** throughout (`ticket_price`, `prize_value`, `cash_alternative`). Format to £ only at the display layer.

---

## Hard rules (never break these)

**Data integrity**
1. **No mock or hardcoded data, ever.** No sample raffle arrays, no fallback fake records. The only source of raffle data is the scrapers writing to Supabase. If a scraper fails, the UI shows an empty/"no data" state — never invented data. This rule killed the previous build; it is non-negotiable.
2. **Never reorder or hide listings based on affiliate relationship.** Show the same data and ranking whether or not we earn commission from a site. Independence is the product.

**Page architecture (decided — see DECISIONS.md)**
3. **No programmatic / generated per-raffle pages.** Individual raffles do not get their own generated, indexable pages. We link out to the source site for individual raffles. (Cut for maintenance burden + Google scaled-content risk + the fact that raffles die before they can rank.)
4. **No mass-generated content of any kind.** We do not run an "LLM-in-a-loop" page generator. All indexable content is either (a) hand-written by a human, or (b) a hand-written page with a live data widget on it (see rule 5).
5. **Site review pages (`/sites/[slug]`) are hand-written reviews with a live raffle widget** — the prose is written once by a human; the live raffles underneath refresh from scraped data. The prose is not generated.
6. **Pillar/guide content is AI-assisted but human-finished.** The agent may research, outline, and draft; a human edits and approves before publish. Never auto-publish.

**Publishing & sending**
7. **A human approves everything that goes public.** Never auto-publish content, never auto-post to Reddit/forums/social, never auto-send email. Automation may draft, monitor, and report; it must not press "publish/post/send".

**Accounts & secrets (personal project)**
8. **Keep the `ANTHROPIC_API_KEY` out of the Claude Code environment.** Build/interactive work runs on the Claude subscription; the API key belongs only in automation scripts. A stray key env var silently switches Claude Code to per-token billing.
9. **This is a personal project — keep all accounts separate from work.** Personal Sentry, analytics, API, email, hosting; personal billing and email. Never wire anything through work accounts/SSO/orgs.

**Tone & compliance**
10. **18+, honest, responsible.** No fake urgency (no resetting countdowns, no fabricated "selling fast"), never misrepresent odds or prize values, always keep the responsible-gambling framing. Consult `docs/COMPLIANCE.md` before writing any public-facing copy or listing a new site.

---

## Stack & conventions

- **Next.js App Router + TypeScript.** Server components / SSR for all indexable pages (SEO matters).
- **Tailwind + shadcn/ui** for UI; **Framer Motion** for animation (used sparingly — see the style guide).
- **Supabase (Postgres)** is the datastore. Use the typed client in `src/lib/supabase.ts`. Schema in `supabase/migrations` and documented in `docs/DATA-MODEL.md`.
- **Scrapers** in `src/scrapers/`: `cheerio` for static sites, `Playwright` for JS-heavy/protected sites. They run on a DigitalOcean droplet via cron, not Vercel cron. See the `write-scraper` skill.
- **Derived metrics** (odds, value-per-pound, expected value) live in `src/lib/utils.ts` — one implementation, imported everywhere. Don't recompute inline. Formulas in `docs/DATA-MODEL.md`.

## Commands (verify against real repo)

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # lint + typecheck
npm run scrape:<site># run a single scraper against live site (dev)
npm run scrape:all   # orchestrator (normally cron-driven on the droplet)
```

## Skills

Recurring procedures live in `.claude/skills/`. Use them; don't reinvent the steps each time.
- `site-domain` — domain facts + the guardrails above, loaded for most tasks.
- `writing-voice` — the house voice, for any prose.
- `write-scraper` — building/fixing a scraper.
- `add-site` — onboarding a new raffle site end to end.
- `write-content` — writing a site review or pillar guide.

**Docs vs skills:** docs are *reference and reasoning* (what's true, why we chose it). Skills are *procedures* (when doing task X, follow these steps). Keep them separate; don't duplicate one into the other.

## Working on tickets (superpowers workflow)

All ticket work runs through the superpowers skill system. Follow this order every time:

1. **Before any implementation** — run `superpowers:brainstorming` to explore intent and requirements.
2. **Before writing code** — run `superpowers:writing-plans` to produce a written plan; run `superpowers:test-driven-development` to write tests first.
3. **If a bug or unexpected behaviour** — run `superpowers:systematic-debugging` before proposing any fix.
4. **Before claiming done** — run `superpowers:verification-before-completion` to confirm it actually works.
5. **When implementation is complete** — run `superpowers:requesting-code-review`, then `superpowers:finishing-a-development-branch`.

Load the relevant project skill alongside these (`site-domain` + whichever of `write-scraper / add-site / write-content` fits the ticket). Tickets live in Linear; each one lists which skills to load.

## When unsure

If a request conflicts with a hard rule, or a doc seems out of date versus the code, stop and surface it rather than guessing. A flagged question costs a minute; a confidently-wrong build costs an afternoon.
