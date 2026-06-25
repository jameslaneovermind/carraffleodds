# CarRaffleOdds — Content Engine & Architecture: Build Spec

**Status:** build spec / project reference
**Audience:** this is a doc to hand to the project (Claude Code context, repo `/docs`, and the basis for the skill files).
**Companion docs:** the business plan (what to build & why), the marketing playbook (how to get traffic), this doc (how to produce the pages at scale safely).

**Stack assumption:** Next.js (App Router) hosted on Vercel, data pulled by scheduled GitHub Actions. If the stack differs, the principles hold; adjust the route/build specifics.

---

## 0. The one idea

Do **not** "run an LLM in a loop until you have 500 pages." That naive pump-out is exactly what Google's scaled-content enforcement demotes. The model is:

> **Compute at scale. Generate sparingly. Gate hard. And never generate the content that should be hand-crafted.**

Most of every data page is rendered **deterministically from data** (odds, specs, valuation, EV, schema) — unique by construction, impossible to flag as spun text, and exactly what AI answer engines extract. The LLM only writes the few **judgement** blocks (is this car worth its RRP, is the cash alt smarter, the operator-trust read). Your evergreen guides are written as **craft**, not generated. Every machine-made page passes a **content analyser gate** before it ships.

---

## 1. Three content modes (read this first — it organises everything)

The site has three distinct kinds of page. They have different lifespans, different production methods, and different risk profiles. Conflating them is the main way to get this wrong.

**Mode A — Durable hubs (the indexed unit; where authority and judgement prose live).**
Pages whose *query* is evergreen but whose *contents rotate*: car-model hubs, operator pages, intent hubs. These persist for years, accrue ranking authority, and are where the LLM judgement blocks belong because they're worth the spend. **Generated-and-gated, then long-lived.**

**Mode B — Per-competition lifecycle inventory (ephemeral).**
An individual live competition lives **days to weeks** — far shorter than the weeks Google needs to crawl, assess and rank a new URL. So a standalone per-comp page often dies before it can rank, and accumulating thousands of dead thin URLs triggers the exact "weakest link drags the domain" penalty we're avoiding. Therefore a competition is **inventory that flows through the durable hubs**, not its own money page. It has a defined lifecycle (Section 4). **Mostly rendered as cards/sections; thin-and-computed if it gets a URL at all.**

**Mode C — Hand-crafted pillar / evergreen clusters (craft, never pump-out).**
The how-it-works / about-style guides. The most durable content of all, the internal-linking backbone, and the top content type AI engines cite. These are **few, deep, AI-assisted but human-finished** — they must never go through the generation loop (Section 6).

The generation loop (Sections 2-3, 5) applies to Mode A's data + small prose blocks. The analyser gate applies to Modes A and B. Mode C is out of scope for both — it's editorial.

---

## 2. Two loops, two billing modes

Keep these separate; they're different jobs.

**Build loop (interactive, you at the keyboard, Claude Code on the Pro sub).**
Done once, refined occasionally: templates, page components, the skill files, the analyser, the pipeline. Craft work. Mode C writing also happens here (you + Claude, hand-finished).

**Factory loop (unattended, API pay-as-you-go in GitHub Actions).**
Runs on a schedule to fill/refresh Mode A pages and rotate Mode B inventory: pull data → generate the few prose blocks → analyse → store passing blocks. Use **Haiku** for cheap blocks, **Sonnet** only where quality matters, **batch API** (-50%) since it's not time-sensitive, and **prompt caching** (-90%) on the fixed system prompt / schema / rubric. Keep the API key **out** of the Claude Code environment so build work stays on the subscription.

---

## 3. The pipeline (the factory loop)

```
[scrape/ingest operator data]
        │
        ▼
   data/  (JSON or SQLite — source of truth, deterministic)
        │
        ▼
[for each DURABLE HUB or comp whose data is NEW or MATERIALLY changed]
        │
        ├─► generate prose blocks  (LLM: Haiku/Sonnet, cached system prompt, batched)
        │         │
        │         ▼
        ├─► CONTENT ANALYSER GATE  (template-ratio + n-gram dup + embedding dup)
        │         │
        │     pass │ fail
        │         │   └─► regenerate w/ nudge, or prune (don't ship)
        │         ▼
        └─► content/  (committed JSON/MDX, keyed by entity — generated ONCE, reused)
        │
        ▼
[close-out step]  ended comps → result page or 301 → parent hub  (Section 4)
        │
        ▼
[next build / ISR] → Next.js renders deterministic data + pre-vetted prose → Vercel
```

**Critical rule: generate prose once, store it, reuse it.** Only regenerate when the underlying data materially changes. Never regenerate prose on every build — it's expensive, non-deterministic, and prose that randomly churns is itself an SEO smell.

---

## 4. Page architecture & programmatic designs

The durable hub is the primary indexed unit. The per-comp page is **not** the money page — it's lifecycle inventory.

### 4a. Durable backbone pages (Mode A — these get indexed, ranked, and carry the prose)

Routes use dynamic segments rendered from data, statically pre-rendered via `generateStaticParams` (ISR where data changes intraday):

- **Car-model hubs** — `app/cars/[make]/[model]/page.tsx` → "Win a BMW M3: live competitions, odds, best value." The query is evergreen, searched repeatedly, and for popular cars there's almost always *some* live comp to slot in. Never stale because contents rotate.
- **Operator pages** — `app/operators/[operator]/page.tsx` → trust read + that operator's live comps. Operators persist for years; "is BOTB legit / BOTB odds" is a permanent, high-intent query.
- **Intent hubs** — `app/ending-soon/`, "best value car competitions this week," "cheapest car competition entry." Query evergreen, contents rotate, recency is the point.

### 4b. Per-competition lifecycle (Mode B — inventory, not a money page)

- **While live:** rendered as a card/section *inside* the hubs above. If it gets a detail URL at all, keep it **thin and computed** — do not spend judgement-block generation on a page that may die in a week.
- **When it closes**, one of two clean exits (this is the close-out cron step):
  - **Graduate to a result page** — "Who won the [X] / [X] competition result." Captures post-draw search **and verifies payouts**, which is your trust moat and the thing CompWatch's generic listings don't do. Keep these.
  - **301-redirect** to its durable parent (model hub or operator page) and drop from the sitemap, when there's nothing worth keeping. Truly removed = 410.

This is why staleness inverts into an advantage: rotating live data through durable URLs means your "last updated" is genuinely recent every day — exactly what Perplexity and the AI engines reward.

### 4c. Page anatomy (applies to hub and result pages)

Mark each block **[D]** deterministic-from-data or **[L]** LLM-generated:

1. **[D] Odds/value hero** — ticket price, "1 in X if you enter now," % sold, honest countdown (no fake reset).
2. **[D] Spec + real-market-value table** — your independent market value of the *actual* car, not the operator's headline RRP. Core differentiator.
3. **[D] EV / cost-per-entry block** — expected value, true cost per entry, value score.
4. **[L] Cash-alt verdict** — is the cash alternative the smarter take? (judgement grounded in the [D] numbers).
5. **[D] Operator trust panel** — free-entry verified, 18+, Voluntary Code status, Trustpilot, Companies House, payout history.
6. **[L] The read** — honest enthusiast take.
7. **[D] FAQ + FAQPage schema** — answer-first, machine-extractable.
8. **[D] Comparison strip** — vs similar live comps (internal links, more uniqueness).

Most blocks are **[D]**. The LLM writes two short blocks. That's the safety margin. **Design quality is a ranking/conversion asset** in a scam-adjacent niche — build the template once, properly (use the frontend-design approach), mobile-first (78% of traffic is mobile).

### 4d. Operational requirement

Hubs must never show an ended comp as "live/ending soon." So: ISR or scheduled rebuilds frequent enough to keep live data current, plus the close-out cron that pulls ended comps and fires the result/301 logic. It's a cron job, not a hard problem.

---

## 5. Pillar / evergreen clusters (Mode C — craft, not pump-out)

The existing `/how-it-works` and `/about` pages are the **reference standard** for this mode: honest, plain, no hype, openly explains the affiliate model and responsible play, reads like a real person who knows cars wrote it. That voice is the moat — it's what E-E-A-T rewards, what makes AI engines comfortable citing you, and what a generated-at-scale competitor cannot fake. **Protect it; do not dilute it.**

**Why pillar content matters:** most durable content of all (never stale), the internal-linking backbone that passes authority *to* the Mode A hubs (hub-and-spoke), and the top content type AI answer engines cite for "how does X work / is X legit / what's best."

**The clusters (build pillar + supporting spokes, all interlinking):**

- **Trust / legal** (highest-anxiety, highest-intent): are car competitions legal / are they gambling; are car raffles a scam; how to spot a legit site; how the free postal entry route works; what happens when you win a car (tax, claiming, delivery); do people actually win these (→ payout verification, ties to trust moat).
- **Value / strategy** (your differentiator as prose): are car competitions worth it / a waste of money; cash alternative vs the car; when's the best time to enter (undersold-near-close); how to work out your real odds; how much do people spend.
- **Commercial** (feeds affiliate, overlaps operator hubs): best car competition sites UK [year]; the head-to-heads (BOTB vs Dream Car Giveaways vs RevComps); is [operator] legit / review; cheapest / sub-£1 entries.
- **Enthusiast** (nobody else can write these): "win a [desirable car]" guides (double as model hubs); is the prize car actually worth the claimed RRP (your valuation methodology as a public explainer — unique and very citable); dream-car roundups.
- **Glossary / definitions** (cheap, fast, disproportionate AEO payoff): "1 in X odds," "percentage sold / sell-through," "guaranteed draw," "prize competition vs lottery vs free draw."

**Discipline — this is the opposite of the per-comp engine:**
- Do **not** run pillar content through the generation loop. AI for research, outline, first draft, FAQ extraction, schema — *you* supply voice and judgement (which operator pays out, real valuations, the honest verdict).
- A handful of genuinely authoritative guides beats fifty thin ones. Quality over quantity is the strategy, not a platitude. Mass-generated pillar content is precisely the scaled-content risk and throws away the one advantage that's working.
- Pillar pages live under a `/guides/` (or `/learn/`) hub and link down to model hubs, operator pages and categories; those link back up. That interlinking is what makes the hubs rank.

---

## 6. Repo layout (where everything lives)

```
/
├── app/
│   ├── cars/[make]/[model]/page.tsx     # DURABLE model hub (Mode A, primary)
│   ├── operators/[operator]/page.tsx    # DURABLE operator page (Mode A)
│   ├── ending-soon/page.tsx             # intent hub (Mode A)
│   ├── results/[slug]/page.tsx          # graduated result pages (Mode B exit)
│   ├── raffles/cars/[slug]/page.tsx     # thin live-comp detail IF used (Mode B)
│   └── guides/[slug]/page.tsx           # pillar/evergreen (Mode C)
├── components/
│   ├── ModelHubPage.tsx OperatorPage.tsx ResultPage.tsx
│   ├── OddsHero.tsx SpecTable.tsx EVBlock.tsx
│   ├── CashAltVerdict.tsx OperatorTrustPanel.tsx FaqSchema.tsx
├── data/                                # SOURCE OF TRUTH (deterministic)
│   └── comps.json                       # or SQLite / Turso / Supabase if large/live
├── content/
│   ├── blocks/{entityId}.json           # GENERATED prose, committed, reused
│   └── guides/{slug}.mdx                # HAND-WRITTEN pillar content (Mode C)
├── scripts/
│   ├── pull-data.ts  generate-blocks.ts  analyse.ts  build-content.ts
│   └── close-out.ts                     # ended comps → result/301
├── .claude/
│   ├── CLAUDE.md                        # project rules, points at skills
│   └── skills/
│       ├── site-domain.md  writing-voice.md  page-spec-car.md
│       ├── uniqueness-rules.md  aeo.md  pillar-writing.md
└── .github/workflows/content.yml        # scheduled factory loop + close-out
```

Data store: committed JSON or local SQLite is ideal for build-time static generation (fast, free, crawler-friendly). Move to a free hosted DB (Turso/Supabase) only if the dataset is large or needs intraday live reads.

---

## 7. The skill files (spec)

Create in `.claude/skills/`. Tight, example-driven. They keep the factory loop consistent and are reusable in Claude Code.

- **`site-domain.md`** — what the site is, data model, operator list, and **hard guardrails**: free-entry framing, 18+ only, no fake urgency, never misrepresent odds/prizes, responsible-gambling tone, honest independence (never reorder by commission). Every generation reads this.
- **`writing-voice.md`** — the honest, no-hype, automotive-enthusiast voice, with **3-4 good/bad sentence pairs** (examples teach better than adjectives). Derive the samples from the existing how-it-works / about pages.
- **`page-spec-car.md`** — the Section 4c anatomy, [D] vs [L] tagged, with the exact schema to emit. Covers hub and result pages.
- **`uniqueness-rules.md`** — the scaled-content bar (Section 8): >=3 data-derived uniqueness blocks, >=50% page-specific content, banned patterns (template-swap phrasing, doorway intros, recommendations that never change). "Computed numbers count more than prose."
- **`aeo.md`** — answer-first 40-60 word lead per section; FAQPage/Product JSON-LD; visible "last updated"; cite your own data; allow AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended) in robots.txt.
- **`pillar-writing.md`** — the Mode C brief: this is craft, human-finished; voice rules; the cluster map; explicit instruction that pillar pages are NOT generated in the loop and NOT subject to the analyser, but ARE held to the voice and E-E-A-T bar.

Draft with Claude Code, then hand-sharpen `writing-voice.md` and `pillar-writing.md` (the parts only you can do well).

---

## 8. The content analyser (the gate — Modes A & B only)

Three cheap deterministic checks. No paid tooling. Run as `scripts/analyse.ts` inside the same Action that generates, so nothing machine-made ships ungated. (Mode C pillar content is editorial and exempt.)

**Check 1 — Template ratio (your "% unique" number).** Strip boilerplate shared across pages of that type; compute `page-specific tokens / total`. **Gate: >= 0.50.**

**Check 2 — Near-duplicate, lexical** (catches "same wording, different car"): shingle into word n-grams; Jaccard overlap vs every other page of that type (MinHash if large). **Gate: max pairwise Jaccard below ~0.7.**

**Check 3 — Semantic duplicate, embeddings** (catches "same meaning, reworded" — spun content): embed each page's [L] blocks; pairwise cosine. Local `sentence-transformers` (free) or a cheap embedding API. **Gate: max pairwise cosine below ~0.85.**

```
if templateRatio >= 0.50 and maxJaccard < J and maxCosine < C:
    write block → publish
else:
    regenerate with "make blocks X and Y more specific to THIS car/operator"
    if still failing after N tries: prune (thin pages drag the whole domain down)
```

Run this first against your *existing* pages — it grades what you already have before you generate anything new.

---

## 9. AEO requirements (bake into templates, not bolt on)

Your analytics already show AI engines sending traffic — treat as first-class.

- **Answer-first**: each section opens with a direct 40-60 word answer (retrieval weights the first ~200 words). Apply this to the existing pages too — lead each section with one tight answer sentence before the explanation.
- **Structured data**: FAQPage + Product/Offer JSON-LD per page; ItemList on comparison strips.
- **Freshness**: visible "last updated," current-year title signals, fast refresh on odds/% sold.
- **E-E-A-T / authorship**: pages are currently bylined only "CarRaffleOdds." Add a real named author identity with genuine automotive credibility — it measurably strengthens citations and the anti-AI-slop signal. The honest "small independent project" framing in `/about` already helps; build on it.
- **Cite your own data/methodology**: a named methodology/author page; show your working on valuation and EV.
- **Crawler access**: allow the AI bots in robots.txt.
- **Measure free**: GA4 referral tracking for chatgpt.com / perplexity.ai; a manual citation log (15-20 target queries weekly). No paid AEO tool at this scale.

---

## 10. Build order

1. **Analyser first** (`analyse.ts`) — self-contained, novel, and grades your existing pages immediately.
2. **Durable hub templates** (`ModelHubPage.tsx`, `OperatorPage.tsx`) with the [D]/[L] split and schema — these are the indexed unit.
3. **Close-out logic** (`close-out.ts`) — ended comps → result page or 301. Prevents the dead-URL pileup.
4. **The skill files** — draft with Claude Code; hand-sharpen voice + pillar.
5. **Generation script** (`generate-blocks.ts`) — Haiku/Sonnet, cached system prompt (skills), batched; writes to `content/blocks/`.
6. **Orchestrator + Action** — `build-content.ts` wires generate → analyse → store + close-out; `.github/workflows/content.yml` runs on a schedule.
7. **Pillar clusters** (Mode C) — start with the trust/legal cluster (highest intent); hand-written, AI-assisted, voice-led.
8. **Result pages + model-hub expansion** once the core proves out.

Decision rule throughout: if a block can be computed from data, compute it; spend an LLM call only on genuine judgement, and only on a durable page; gate everything machine-made before it ships; write the pillars by hand; never let prose churn build-to-build; never let an ephemeral comp become a permanent thin URL.
