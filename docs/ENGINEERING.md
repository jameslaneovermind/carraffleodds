# Engineering Backlog

The aggregator's technical work, ordered by priority. Each item is written to drop straight into a Linear ticket. Effort: **S** ≈ a session or two, **M** ≈ a week of hours, **L** ≈ multiple weeks.

Priority order is deliberate (see DECISIONS.md): **observability → correctness → quality → performance → polish.** Don't jump ahead — you can't fix what you can't see, and polish is bottomless.

---

## Tier 1 — Observability (do first)

### ENG-1 · Scraper observability via a personal Sentry project
**What:** Create a new **personal** Sentry project (free tier — not the work account) and wire it into the scraper process on the DigitalOcean droplet. Capture: (a) unhandled exceptions per scraper, (b) a custom "run failed/degraded" event when a site returns zero raffles or when missing-image rate exceeds a threshold, (c) tag every event by `site` so you can see which scraper breaks most. Keep writing the existing `scrape_logs` rows too — that's the historical record; Sentry is the active alert.
**Why:** Right now failures are silent. You don't know your real failure rate, which sites break, or whether missing images are a scraper bug or a source change. Every other item below is guesswork until this exists.
**Acceptance:**
- New personal Sentry project created; DSN stored as an env var on the droplet (not committed).
- Sentry SDK initialised in the scraper entrypoint; unhandled rejections and the orchestrator's per-site try/catch both report.
- A deliberately broken scraper produces a Sentry alert tagged with the site.
- A zero-result run and a high-missing-image run each raise a distinct event.
- Confirmed: no work accounts/SSO involved; personal billing/email only.
**Effort:** S–M

---

## Tier 2 — Correctness

### ENG-2 · Reliable stale-raffle cleanup
**What:** Ensure raffles whose `end_date` has passed are flipped out of live status and removed from all listings (home, `/raffles`, `/ending-soon`, site pages). Audit the daily cleanup job: confirm it runs, flips `status` correctly (`drawn`/`sold_out`), and that every listing query filters on live status + future `end_date`. Take a `raffle_snapshots` row before retiring a raffle.
**Why:** Showing ended raffles is the bug that most directly damages trust and SEO — a comparison site listing dead comps looks unmaintained to users and Google. Content (site pages) will display live raffles, so this must be solid first.
**Acceptance:**
- No listing surface shows a raffle past its `end_date`.
- Cleanup job is scheduled, observable (logs a run, alerts on failure via ENG-1), and idempotent.
- Snapshot captured before status flip.
**Effort:** S–M

### ENG-4 · Scraper reliability pass (data-driven)
**What:** Using the failure data from ENG-1, fix the scrapers that break most often. Likely includes resilience to source-site markup changes, better selectors, retry/backoff, and graceful partial results. Respect each site politely (rate limits, realistic delays; Playwright stealth only where genuinely needed). Per existing notes: BOTB is the hardest (heavy anti-bot, spot-the-ball/unlimited — handle separately); RevComps had stability issues — check current state.
**Why:** Coverage and freshness are the core value. A scraper that silently half-works quietly degrades the whole site.
**Acceptance:**
- The top offenders from Sentry run green on consecutive scheduled runs.
- Partial failures degrade gracefully (write what succeeded, report the rest) rather than wiping a site's data.
- A scraper that can't get data writes nothing and alerts — never fabricates (see CLAUDE.md rule 1).
**Effort:** M (ongoing)

---

## Tier 3 — Quality

### ENG-3 · Fix missing images
**What:** Diagnose and fix raffles rendering without an image. With ENG-1 in place, determine whether it's a scrape-time extraction failure, a specific site's markup change, hotlink/lazy-load/CORS issues, or missing source images. Fix at the scrape layer where possible; add a tasteful fallback (branded placeholder, not a broken-image icon) for genuinely image-less raffles.
**Why:** The car image is the emotional hook and the first thing the eye hits on a card — missing images hurt conversion and look broken. But it's a quality bug, not a blind-spot, so it comes after observability and correctness, and is far easier to fix with ENG-1 data than by guessing.
**Acceptance:**
- Missing-image rate (now visible via ENG-1) drops to a low, known baseline.
- Remaining image-less raffles show a clean branded placeholder.
- New scrapes are checked for image presence; failures are logged/tagged.
**Effort:** S–M

---

## Tier 4 — Performance

### ENG-5 · Targeted performance / Core Web Vitals
**What:** Improve load times with a mobile-first focus (78% of traffic is mobile). Prioritise: image optimisation/lazy-loading (overlaps ENG-3), `next/image` everywhere, SSR/streaming for above-the-fold, trimming client JS, font loading. Measure with Lighthouse/PageSpeed and Search Console's Core Web Vitals; fix what's red.
**Why:** Core Web Vitals are a ranking factor and lift everything published — worth doing before heavy content investment, but it's optimisation, not breakage, so it sits below correctness/quality.
**Acceptance:**
- Mobile Lighthouse performance in a good band; CWV "good" in Search Console for key templates.
- LCP image optimised on home, `/raffles`, `/sites/[slug]`.
**Effort:** M

---

## Tier 5 — Design polish (mostly deferred)

The style guide is a large backlog of aspirational UX (command palette, bento grid, dark mode, rich animation). **Most of it is nice-to-have and explicitly deferred.** Only pull an item up if it affects SEO, conversion, or trust. Candidate small wins if/when time allows:

### ENG-6 · Trust-signal & clarity polish (opportunistic)
**What:** Small, high-trust touches that matter in a scam-adjacent niche: clear "last updated" freshness stamp, obvious affiliate disclosure, clean empty/loading states (skeletons not spinners), legible data hierarchy on cards. Skip the heavier flourishes for now.
**Why:** Trust and clarity convert and reassure; decorative motion and dark mode don't move the needle yet.
**Acceptance:** freshness stamp live; no bare spinners; disclosure visible; cards readable on mobile.
**Effort:** S

> Everything else in the style guide (Cmd+K, bento grid, dark-mode pass, animation system) → **deferred** until content proves out and there's reason to invest in polish.
