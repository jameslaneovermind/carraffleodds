# Roadmap

The sequenced plan across all three workstreams. Use this to decide what to work on; the workstream docs (ENGINEERING / CONTENT / GROWTH) hold the detail and become Linear tickets. Items are referenced by ID (ENG-1, CON-1, GRO-1, …).

**The shape:** get the aggregator *trustworthy and observable* → build long-lived content on top → amplify it. Engineering is never "100% done" (the polish backlog is bottomless); each phase has a "done enough to move on" signal instead.

**Budget reality:** ~1 hour/day, one person. One ticket at a time. Don't run phases in parallel — finish the move-on signal before shifting focus.

---

## Phase 0 — See what's happening (do this first, ~1 week)

You can't prioritise what you can't see. Stand up observability before fixing anything.

- **ENG-1 · Scraper observability (personal Sentry on the droplet)**

**Move-on signal:** a scraper failure, a zero-result run, or a spike in missing images now reaches you automatically, tagged by site. You know your actual failure rate instead of guessing.

---

## Phase 1 — Make the data trustworthy (~2–4 weeks)

A comparison site that shows wrong or dead data loses trust with users and Google, and any content built on top inherits the bugs.

- **ENG-2 · Reliable stale-raffle cleanup** (ended raffles leave listings correctly)
- **ENG-3 · Fix missing images** (now diagnosable with Phase 0 in place)
- **ENG-4 · Scraper reliability pass** (the sites that Sentry shows break most)

**Move-on signal:** listings only show genuinely live raffles, cards reliably have images, and scrapers run green most days. The aggregator is something you'd be happy for Google and a new user to judge.

---

## Phase 2 — Build long-lived content (the actual bet, ongoing — this is where most hours go for a couple of months)

The thing we're testing: does focusing on durable, hand-written content lift organic + AI-citation traffic? Start with the highest-intent, lowest-effort wins.

- **CON-1 · Site review pages** (`/sites/[slug]`) — hand-written reviews + live raffle widget. Highest-intent ("is BOTB legit"), and routes already exist.
- **CON-2 · Trust/legal pillar cluster** — "are car competitions legal / a scam", "how the free entry route works", "what happens when you win". Highest-intent informational queries.
- **CON-3 · Value/strategy pillar cluster** — "are they worth it", "cash vs car", "best time to enter". Our differentiator as prose.
- **ENG-5 · Targeted performance / Core Web Vitals** — slot in here; it's a ranking factor that lifts everything published. Mobile-first (78% of traffic).

**Move-on signal (decision point, ~8–10 weeks in):** check whether organic impressions/clicks and AI-citation referrals are climbing on the new content. If yes → keep going, add CON-4/CON-5, start Phase 3. If flat → reassess before pouring in more hours (this is the honest go/no-go from the business plan).

---

## Phase 3 — Amplify (only once there's good content to amplify)

- **GRO-1 · Email list** — capture + weekly "best value / ending soon" digest. The one platform-proof asset.
- **GRO-2 · AEO measurement** — the free manual citation log; confirm which content AI engines cite.
- **GRO-3 · Light community seeding** — genuine, disclosed Reddit/forum contributions where you actually add value. Low time, never automated.
- **CON-4 / CON-5 · Commercial + enthusiast clusters** — head-to-heads, "best sites" roundups, car-specific guides.

**Move-on signal:** an engaged email list growing weekly, measurable AI citations, and content compounding in search. This is where you'd reconsider bigger bets (and only here would anything like programmatic depth even be back on the table — with evidence, per DECISIONS.md).

---

## Explicitly deferred / not doing now
- Programmatic per-raffle pages — **cancelled** (DECISIONS.md), not deferred.
- Most of the style-guide polish (command palette, bento grid, dark mode, rich animations) — nice-to-have; only the SEO/conversion-relevant slices (ENG-3 images, ENG-5 performance) are scheduled.
- Paid ads — off the table at this budget (COMPLIANCE.md §6).
- Short-form/faceless video — skip at launch (marketing playbook).
- PostHog user analytics — useful but later; not before content exists to analyse.

---

## How to read this with Linear
Each ENG/CON/GRO item is written ticket-ready in its workstream doc (title, what, why, acceptance, effort). Create them as Linear issues, tag by workstream, and order your backlog to match the phases above. Revisit this roadmap at each move-on signal.
