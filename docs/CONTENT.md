# Content Backlog

The long-lived content workstream. This is the strategic bet (DECISIONS.md): after the aggregator is trustworthy, focus the hour on durable, hand-written content and watch whether organic + AI-citation traffic lifts.

> Supersedes the earlier "content engine spec." The generation pipeline, analyser gate, and per-raffle pages are cancelled. What survives is below.

---

## Approach (read before writing anything)

**Two kinds of indexable content, both durable, neither generated in bulk:**

1. **Site review pages** (`/sites/[slug]`) — a hand-written review of a raffle site (is it legit, how it works, trust signals, who it suits) with a **live raffle widget** underneath pulling that site's current raffles from scraped data. Written once; the data refreshes itself. The prose is not generated.

2. **Pillar guides** (`/guides/...` or similar) — evergreen explainers grouped into clusters. Few, deep, hand-written (AI-assisted draft, human-finished). These never go stale, are the internal-linking backbone, and are the top content type AI engines cite.

**What we do NOT build:** per-raffle pages, mass-generated pages, anything run through an LLM-in-a-loop. (CLAUDE.md rules 3–6.)

**The voice is the moat.** The existing `/how-it-works` and `/about` pages are the reference standard — honest, plain, no hype, openly explains the affiliate model, responsible-play aware, reads like a real car person wrote it. Protect it. Use the `writing-voice` skill; lead each section with a direct answer (AEO); add a real named author for E-E-A-T.

**Quality over quantity, always.** A handful of authoritative guides beats fifty thin ones — and thin/duplicative content is the exact Google risk we're avoiding. If you can't make a page genuinely useful and distinct, don't publish it.

---

## Backlog

Effort: **S** ≈ one page in a session or two, **M** ≈ a cluster over a couple of weeks.

### CON-1 · Site review pages (`/sites/[slug]`)
**What:** Hand-write a review for each tracked site, rendered on the existing `/sites/[slug]` route, with the live raffle widget below. Cover: what the site is, how its model works (fixed-odds vs spot-the-ball/unlimited), trust signals (Companies House, Trustpilot, Voluntary Code signatory, payout history, live/recorded draws, free-entry route), who it suits, honest pros/cons. Start with the biggest/most-searched sites.
**Why:** Highest commercial-intent informational query in the niche ("is [site] legit", "[site] review", "[site] odds"). Routes already exist. Doubles as a trust layer competitors do generically — we can do it better per site.
**Acceptance:** review prose is hand-written and on-voice; live widget shows that site's current raffles; trust signals are accurate and dated; affiliate disclosure present; one direct-answer opening line per section; named author.
**Effort:** S per site (M for the set)

### CON-2 · Trust/legal pillar cluster
**What:** A pillar guide + supporting spokes on the highest-anxiety questions: are UK car competitions legal / are they gambling; are car raffles a scam (how to spot a legit site); how the free postal entry route works (how to enter for free); what happens when you win a car (tax, claiming, delivery); do people actually win these (ties to payout verification).
**Why:** Highest-intent informational searches, lowest-competition for an honest source, prime AI-citation material, and exactly where our honest voice wins outright.
**Acceptance:** pillar + ≥3 spokes, interlinked and linking to relevant site pages; answer-first; FAQ schema; on-voice; compliance-checked (COMPLIANCE.md).
**Effort:** M

### CON-3 · Value/strategy pillar cluster
**What:** Guides on the decision-making angle: are car competitions worth it / a waste of money; cash alternative vs the car (which to take); when's the best time to enter (the undersold-near-close insight); how to work out your real odds; how much do people spend / setting a budget.
**Why:** This is our differentiator as prose — the enthusiast-with-a-spreadsheet angle CompWatch and generic listers don't have. Reinforces the value/EV data the site already computes.
**Acceptance:** pillar + spokes, interlinked; uses our real value/EV framing; answer-first; on-voice; responsible-play framing intact.
**Effort:** M

### CON-4 · Commercial cluster (after the Phase 2 decision point)
**What:** "Best car competition sites UK [year]", head-to-heads ("BOTB vs Dream Car Giveaways vs RevComps"), "cheapest / sub-£1 entries". Overlaps and links heavily to the CON-1 site pages.
**Why:** Commercial intent that feeds affiliate clicks; ranks and gets cited; natural hub for the site reviews.
**Acceptance:** honest comparisons (never ranked by commission — CLAUDE.md rule 2); current-year freshness; links to site pages; disclosure present.
**Effort:** M

### CON-5 · Enthusiast cluster (later)
**What:** Car-specific guides — "win a [desirable car]" pages that aggregate live raffles for that model, "is the prize car actually worth the claimed RRP" (our valuation methodology as a public explainer), dream-car roundups.
**Why:** Nobody else can write these with real automotive judgement — the clearest expression of the founder edge.
**Acceptance:** genuine automotive depth (real market valuation, not the operator's headline RRP); links to relevant live raffles/site pages; on-voice.
**Effort:** M

### CON-6 · Author & methodology page (do alongside CON-1/CON-2)
**What:** A real named author identity with genuine automotive credibility, and a short methodology page explaining how we value cars and compute odds/EV.
**Why:** E-E-A-T and AI-citation strength; the honest "small independent project" framing already helps — this builds on it.
**Acceptance:** named author with bio applied to content; methodology page live and linked from guides.
**Effort:** S

---

## AEO bar (apply to every content page)
- Answer-first: open each section with a tight 40–60 word direct answer.
- FAQPage / Article (and Product/Offer where relevant) JSON-LD.
- Visible "last updated"; current-year signals in titles.
- Named author; link to the methodology page.
- Cite our own data; show the working on valuation/EV.
- Ensure AI crawlers are allowed in robots.txt (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended).
