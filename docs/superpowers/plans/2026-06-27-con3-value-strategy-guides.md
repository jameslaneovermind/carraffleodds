# CON-3: Value/Strategy Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create 5 MDX guide files (1 pillar + 4 spokes) covering the value/strategy angle of UK car competitions, plus update existing CON-2 guides with cross-links.

**Architecture:** All infrastructure is already in place from CON-2: `src/lib/guides.ts`, `src/app/guides/[slug]/page.tsx`, `src/components/json-ld.tsx` (with `FaqJsonLd` and `ArticleJsonLd`), `src/components/AuthorByline.tsx`. This plan creates only MDX content files and updates existing ones. No code changes except adding cross-link slugs to existing guide frontmatter.

**Tech Stack:** MDX with gray-matter frontmatter, `next-mdx-remote/rsc`, Next.js App Router.

## Global Constraints

- All MDX files live in `content/guides/` — exact slugs must match the `slug:` frontmatter field and the filename exactly.
- MDX files MUST use JSX comments `{/* */}` — NOT HTML comments `<!-- -->` (next-mdx-remote rejects HTML comments and breaks the build).
- Money in copy is always £-prefixed; use UK spelling throughout.
- Every page carries a `> **[DRAFT — HUMAN REVIEW REQUIRED]**` banner at the top of the MDX body. A human removes it before the page is considered published (CLAUDE.md rule 7).
- `lastUpdated: "2026-06-27"` on all five new files.
- No mock or hardcoded raffle data (CLAUDE.md rule 1).
- No fake urgency, no misrepresentation of odds or prize values (CLAUDE.md rule 10).
- Responsible gambling resources (GamCare, BeGambleAware, 0808 8020 133) MUST appear in the budget guide.
- Affiliate disclosure footer on every new guide.
- `npm run build` and `npm run lint` must pass clean after every task.
- `relatedGuides` slugs that don't yet exist will silently not render (filtered by `getGuide()` returning null). This is intentional and safe — do not stub missing guides.
- The `AuthorByline` component is already wired into `src/app/guides/[slug]/page.tsx` — no changes to the page component required.

---

## File Map

| File | Action | Task |
|------|--------|------|
| `content/guides/are-car-competitions-worth-it.mdx` | Create | 1 |
| `content/guides/how-car-competition-odds-work.mdx` | Create | 2 |
| `content/guides/best-time-to-enter-car-competition.mdx` | Create | 3 |
| `content/guides/cash-alternative-or-the-car.mdx` | Create | 4 |
| `content/guides/how-much-to-spend-on-car-competitions.mdx` | Create | 5 |
| `content/guides/are-car-competitions-legit.mdx` | Modify (add cross-links) | 6 |
| `content/guides/what-happens-when-you-win.mdx` | Modify (add cross-links) | 6 |
| `content/guides/free-entry-car-competitions.mdx` | Modify (add cross-links) | 6 |

---

## How "tests" work for content tasks

There are no unit tests for MDX content. The test cycle for each task is:

1. Run `npm run build` — catches frontmatter parse errors, broken MDX JSX, type mismatches, lint failures
2. Run `npm run dev` and open `http://localhost:3000/guides/<slug>` — verify the page renders with correct title, AuthorByline, prose, FAQ section, and related links

Both steps must pass before committing. The build test catches the majority of real bugs (missing required frontmatter fields, HTML comment syntax, broken JSX).

---

## Task 1: Pillar guide — Are Car Competitions Worth It?

**Files:**
- Create: `content/guides/are-car-competitions-worth-it.mdx`

**Interfaces:**
- Produces: `/guides/are-car-competitions-worth-it` page
- Consumed by: Tasks 2–5 via `relatedGuides` back-references; Task 6 cross-links

- [ ] **Step 1: Create the MDX file**

Create `content/guides/are-car-competitions-worth-it.mdx` with the exact content below:

```mdx
---
title: "Are Car Competitions Worth It?"
slug: "are-car-competitions-worth-it"
metaTitle: "Are Car Competitions Worth It? The Honest Maths (2026)"
metaDescription: "Are UK car competitions worth entering? We run the expected value, explain the real odds, and give an honest answer — including when they're better value than a lottery ticket."
lastUpdated: "2026-06-27"
faqItems:
  - question: "Are car competitions worth it financially?"
    answer: "No, in a pure investment sense — the expected return is below £1 per £1 spent, the same as the National Lottery. But the prize ceiling is much higher for the same entry price: a £5 ticket at a car worth £40,000 gives you a 1-in-X shot at something transformative. Whether that trade-off is worth it depends on how you treat the spend."
  - question: "Are car competitions better value than the lottery?"
    answer: "On value score (prize per £1 of total ticket revenue), some are competitive with or better than the lottery. On odds of winning anything at all, the lottery is better — car competition odds are longer. On prize size per £1 of entry, car competitions often win. It depends which axis you care about."
  - question: "Are car competitions gambling?"
    answer: "Legally, no — UK car competitions use a free entry route or skill question to avoid Gambling Act classification. But the spending pattern can feel similar, so treat your budget the same way: a fixed entertainment amount you can afford to lose."
  - question: "Which car competitions are best value?"
    answer: "Filter by value score on the homepage — higher means more prize value per £1 at the ticket cap. Then check % sold and draw date: a draw with low sell-through and a guaranteed close date has better real odds than the headline suggests."
relatedGuides:
  - "how-car-competition-odds-work"
  - "best-time-to-enter-car-competition"
  - "cash-alternative-or-the-car"
  - "how-much-to-spend-on-car-competitions"
  - "are-car-competitions-legit"
relatedSites:
  - "botb"
  - "dream-car-giveaways"
  - "rev-comps"
  - "elite-competitions"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]**

Financially, car competitions are not worth it in a pure investment sense — the expected return per £1 spent is below £1. But that's the wrong frame. They're entertainment with a realistic chance of winning something life-changing. The question is whether the entry price feels fair for what you're getting: the chance, the experience of following a draw, and the genuine possibility of a car turning up at your door.

## The maths

Prize ÷ (total tickets × ticket price) = the raw value score. Most draws sit between 0.2 and 0.6, meaning every £1 of tickets buys roughly 20–60p of expected prize value. That's in the same range as the National Lottery, which returns around 45p per £1.

The difference is the prize ceiling. A £1 lottery ticket gives you a share of a draw with 45 million tickets. A £5 car competition ticket gives you 1 in — say — 5,000 at a £40,000 car. Longer odds of winning anything, but a much better shot at a specific, life-changing prize for a small outlay.

We calculate this for every draw on the site. The value score in our listings reflects it — higher is better. See the [full methodology](/methodology) for the exact formula.

## When car competitions are better value

The value score is calculated against the ticket cap — the maximum that could sell. Your real odds depend on how many have actually sold when the draw happens.

A guaranteed draw with 30% of tickets sold doesn't mean 1 in 10,000. It means 1 in 3,000. For the same prize and the same entry price, that's a meaningfully better position. The trick is finding draws where sell-through is low relative to the guaranteed draw date — that's the main thing our data helps with. More on how to spot them: [When's the best time to enter?](/guides/best-time-to-enter-car-competition)

## The cash alternative reality

Prize values on competition sites are the operator's stated RRP, which is often at or slightly above the car's market price. What matters to you if you win is the cash alternative, which is typically 60–80% of that headline figure.

So a £50,000 prize might carry a £35,000 cash option. The value score uses whichever figure is available from the operator. For a full breakdown of how to think about the choice: [Cash alternative or the car — which should you take?](/guides/cash-alternative-or-the-car)

## Responsible framing

Car competitions aren't an investment strategy. The expected return is below £1 per £1 spent — the same economic reality as the lottery. Budget for them accordingly: what you'd comfortably spend on entertainment without changing your financial situation.

If you're entering to recoup losses, or spending more than planned, those are warning signs. For a budgeting framework: [How much should you spend on car competitions?](/guides/how-much-to-spend-on-car-competitions)

## The honest answer

For the right person entering the right draw at a fair price, it's a reasonable entertainment spend with a non-trivial chance of winning something extraordinary. For that to be true, you need to:

1. Choose draws with a high value score — more prize per £1 spent
2. Watch % sold and draw dates to find undersold guaranteed draws
3. Budget it as entertainment, not a financial plan

That's what the site is built to help with.

---

*18+ only. Always read the operator's terms before entering. We may earn commission from links to competition sites — it doesn't affect our data or rankings. [About our reviews](/about-our-reviews).*
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: no errors, page `/guides/are-car-competitions-worth-it` included in static output.

- [ ] **Step 3: Verify page renders in dev**

```bash
npm run dev
```

Open `http://localhost:3000/guides/are-car-competitions-worth-it`. Verify:
- Title "Are Car Competitions Worth It?" renders in h1
- AuthorByline shows "By James Lane · Car enthusiast & founder · Updated June 2027" (date from lastUpdated)
- Draft banner visible at top
- FAQ section shows all 4 questions
- Related guides section shows the linked guides that exist (how-car-competition-odds-work won't exist yet — that's fine, it's filtered to null)
- Footer affiliate disclosure present

- [ ] **Step 4: Commit**

```bash
git add content/guides/are-car-competitions-worth-it.mdx
git commit -m "Add pillar guide: Are Car Competitions Worth It? (CON-3)"
```

---

## Task 2: Spoke 1 — How Car Competition Odds Work

**Files:**
- Create: `content/guides/how-car-competition-odds-work.mdx`

**Interfaces:**
- Produces: `/guides/how-car-competition-odds-work` page
- Referenced by: Task 1's `relatedGuides`, Task 3's `relatedGuides`

- [ ] **Step 1: Create the MDX file**

Create `content/guides/how-car-competition-odds-work.mdx`:

```mdx
---
title: "How Car Competition Odds Work"
slug: "how-car-competition-odds-work"
metaTitle: "How Car Competition Odds Work — Real vs Headline Odds (2026)"
metaDescription: "Car competition odds aren't always what they seem. Here's how to read the real odds, why undersold draws are better value, and why BOTB has no fixed odds."
lastUpdated: "2026-06-27"
faqItems:
  - question: "What are the odds of winning a car competition?"
    answer: "It varies significantly by draw. Headline odds run from roughly 1 in 2,000 (small draws with low ticket caps) to 1 in 500,000 or more for mass-market draws. Filter by total tickets on our site to compare. The real odds also depend on how many tickets have sold — in an undersold guaranteed draw, your real odds are far better than the headline."
  - question: "Do more tickets improve your odds?"
    answer: "Yes, linearly. 5 tickets in a 10,000-ticket draw = 1 in 2,000. 10 tickets = 1 in 1,000. There's no special advantage for bulk buying beyond any per-ticket discount the operator offers — the improvement is straightforwardly proportional."
  - question: "What does % sold mean in car competitions?"
    answer: "The proportion of the ticket cap that has been claimed. In a guaranteed draw (one that happens on a fixed date regardless of sell-through), lower % sold means your real odds are better than the headline — the draw will happen with fewer tickets in it. Combined with the draw date, it's the key figure for spotting value."
  - question: "Why doesn't BOTB show odds?"
    answer: "BOTB's flagship Spot the Ball is a skill competition with no fixed entry cap. The number of entrants varies each week, and a more accurate guess is genuinely more likely to win. Without a fixed cap, a 1-in-X figure would be misleading. We show the entry price and draw model instead."
relatedGuides:
  - "are-car-competitions-worth-it"
  - "best-time-to-enter-car-competition"
  - "are-car-competitions-legal"
relatedSites:
  - "botb"
  - "rev-comps"
  - "dream-car-giveaways"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]**

For fixed-ticket draws, your odds are one in the total ticket count — one ticket, one entry, one chance. But the number that actually matters isn't the cap: it's how many tickets have sold when the draw happens.

## Fixed-ticket draws

Most UK car competitions run a fixed-odds model. A ticket cap is set — say, 10,000 — with a guaranteed draw date and one winner drawn at random. Buy one ticket, your odds are 1 in 10,000. Buy five, it's 5 in 10,000, or 1 in 2,000.

The headline odds are calculated against the cap. But draws are rarely sold out. If a 10,000-ticket draw is 40% sold on its guaranteed draw date, only 4,000 tickets are in the draw. Your real odds: 1 in 4,000, not 1 in 10,000.

That's a substantial difference for the same entry price. The % sold column in our listings is the key figure for spotting this.

## Reading the % sold column

Combined with the draw date, % sold tells you:

- **High % sold, draw date soon:** real odds close to headline — most tickets are in
- **Low % sold, draw date guaranteed and soon:** real odds far better than headline — undersold guaranteed draw
- **Low % sold, draw date weeks away:** could sell significantly before close — headline odds are more likely

The last case requires judgment. A draw 10% sold with eight weeks to close will likely sell more. The same draw with four days to close probably won't hit the cap. We show both figures so you can make that call. More on the timing angle: [When's the best time to enter?](/guides/best-time-to-enter-car-competition)

## Multiple tickets

Buying more tickets improves your odds linearly, not multiplicatively. Five tickets in a 10,000-ticket draw = 5 in 10,000 = 1 in 2,000. Some operators offer bundle pricing (cheaper per ticket in volume), which improves value at the same odds multiple — but the underlying probability maths is the same.

## BOTB: spot-the-ball has no fixed odds

BOTB's main competition is a skill event. You mark where you think the ball is in an edited photograph. A panel of judges selects the position they consider most likely to be correct. There is no fixed ticket cap, and a more accurate guess is genuinely more likely to win.

We don't show "1 in X" for BOTB because no reliable figure exists — it would vary week to week with entry volumes. What we show is the entry price and competition model. See our [BOTB review](/sites/botb) for how the draw works in practice.

## Comparing car competitions with other options

| | Typical odds of winning | Top prize |
|---|---|---|
| UK National Lottery jackpot | 1 in 45,057,474 | Variable (£millions) |
| Premium Bonds | Variable (~3.3% annual rate) | £1 million |
| Car competition (fixed-odds) | 1 in 2,000 to 1 in 500,000 | £20,000 to £200,000+ |

Car competitions have worse odds of winning anything compared to scratchcards or EuroMillions secondary prizes, but a meaningfully better prize ceiling per pound of entry for smaller draws. Whether that trade-off makes sense: [Are car competitions worth it?](/guides/are-car-competitions-worth-it)

For the legal structure that makes these odds possible without a gambling licence: [Are car competitions legal?](/guides/are-car-competitions-legal)

---

*18+ only. [About our reviews](/about-our-reviews). We may earn commission from operator links — it doesn't affect our data.*
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: clean build, `/guides/how-car-competition-odds-work` in static output.

- [ ] **Step 3: Verify page renders in dev**

Open `http://localhost:3000/guides/how-car-competition-odds-work`. Verify:
- H1 "How Car Competition Odds Work" renders
- AuthorByline present
- Draft banner visible
- Table renders correctly (Tailwind prose styles)
- FAQ section shows all 4 questions
- Related guides section shows `are-car-competitions-worth-it` (now exists), `best-time-to-enter-car-competition` (not yet — filtered fine)

- [ ] **Step 4: Commit**

```bash
git add content/guides/how-car-competition-odds-work.mdx
git commit -m "Add spoke guide: How Car Competition Odds Work (CON-3)"
```

---

## Task 3: Spoke 2 — Best Time to Enter a Car Competition

**Files:**
- Create: `content/guides/best-time-to-enter-car-competition.mdx`

**Interfaces:**
- Produces: `/guides/best-time-to-enter-car-competition` page
- Referenced by: Tasks 1 and 2's `relatedGuides`

- [ ] **Step 1: Create the MDX file**

Create `content/guides/best-time-to-enter-car-competition.mdx`:

```mdx
---
title: "When's the Best Time to Enter a Car Competition?"
slug: "best-time-to-enter-car-competition"
metaTitle: "Best Time to Enter a Car Competition — When Odds Are Best (2026)"
metaDescription: "Timing matters in car competitions. Here's when real odds are best, when prices often drop, and how to use sell-through data to find better value draws."
lastUpdated: "2026-06-27"
faqItems:
  - question: "When is the best time to enter a car competition?"
    answer: "For guaranteed draws (fixed date regardless of sell-through), the best time is when % sold is low relative to the draw date. A draw guaranteed next Friday with 20% of tickets sold gives real odds of 1 in the sold count — far better than the headline odds against the full cap. % sold plus draw date is the key combination."
  - question: "Do car competition prices drop near the end?"
    answer: "Sometimes. Some operators reduce ticket prices near the close deadline to shift unsold inventory. That improves value — same prize, lower entry cost. Worth checking the ending-soon section, but verify it's a genuine price drop rather than standard FOMO marketing."
  - question: "What is % sold in a car competition?"
    answer: "The proportion of the ticket cap that has been claimed. In a guaranteed-date draw, this tells you how many tickets will actually be in the draw. If 20% are sold and the draw is guaranteed tomorrow, real odds are 1 in 20% of the cap — not 1 in the full cap."
  - question: "Is it better to enter early or late?"
    answer: "Late, if you're hunting undersold guaranteed draws — that's when you can see whether real odds are better than the headline. Early, if you want the widest choice of draws before popular ones sell out. Neither is universally right; it depends on which draws you're looking at."
relatedGuides:
  - "are-car-competitions-worth-it"
  - "how-car-competition-odds-work"
relatedSites:
  - "rev-comps"
  - "dream-car-giveaways"
  - "elite-competitions"
  - "lucky-day-competitions"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]**

For guaranteed draws, the best time is when sell-through is low relative to the draw date. Not early, not late — when the combination of % sold and closing date puts your real odds well below what the headline suggests.

## The undersold draw insight

This is the main thing our data is built to surface. Consider a draw: 10,000 tickets at £5 each, prize worth £40,000, draw guaranteed in seven days. If 2,000 tickets have sold, your real odds are 1 in 2,000 — not 1 in 10,000. Expected prize value per ticket: £40,000 ÷ 2,000 = £20 of expected prize for a £5 entry.

Now compare that draw at 9,000 tickets sold: real odds 1 in 9,000, expected prize value of £4.44 per £5 ticket. Same draw, same entry price, very different value proposition.

The % sold column combined with the draw date tells you which situation you're in. Low sell-through, guaranteed close date, short time remaining: real odds are significantly better than the headline.

## Auto-draw vs live draw

This only applies reliably to **auto-draws** — draws that happen at a fixed date and time regardless of how many tickets have sold. An auto-draw guaranteed next Friday will happen next Friday with whatever tickets are in.

**Live draws** work differently. Some operators hold the draw once all tickets are sold, or extend the deadline if sell-through is low. An undersold live draw may just mean it hasn't closed yet — the draw will eventually have more tickets in it. Always check whether the draw date is a hard guarantee or contingent on sell-through.

## Price drops near close

Some operators reduce ticket prices on draws approaching their deadline with significant unsold inventory. Lower price, same prize = better value score per ticket. It's worth checking the ending-soon section if you're working to a budget.

What doesn't improve your odds: a draw trending on social media, selling fast, or being "popular." When a draw goes viral, sell-through spikes and real odds worsen quickly. Headline odds stay the same; the underlying pool of entries grows. That's the opposite of what you're looking for.

## What to avoid

Entering because a draw is going fast. Fast sell-through means the undersold window is closing, not opening.

Waiting on a specific draw hoping the price drops. If the draw date is near and sell-through is already high, you're not finding a bargain — you're late. A better-value draw elsewhere may have already closed.

## How to use the site

1. Sort by **value score** — highest means most prize per £1 at the ticket cap
2. Filter for **ending soon** — narrows to draws resolving in the near term
3. Check **% sold** — low % + guaranteed draw + short time remaining = the undersold opportunity

That combination reliably surfaces draws where sell-through hasn't caught up with the guaranteed close date. For the underlying maths: [How car competition odds work](/guides/how-car-competition-odds-work).

---

*18+ only. Always verify whether a draw date is a hard guarantee before entering. [About our reviews](/about-our-reviews). We may earn commission from operator links — it doesn't affect our data.*
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: clean build, new page included.

- [ ] **Step 3: Verify page renders in dev**

Open `http://localhost:3000/guides/best-time-to-enter-car-competition`. Verify:
- H1 renders correctly
- AuthorByline present
- Draft banner visible
- All 4 FAQs render
- Related guides show `are-car-competitions-worth-it` and `how-car-competition-odds-work` (both now exist)

- [ ] **Step 4: Commit**

```bash
git add content/guides/best-time-to-enter-car-competition.mdx
git commit -m "Add spoke guide: Best Time to Enter a Car Competition (CON-3)"
```

---

## Task 4: Spoke 3 — Cash Alternative or the Car?

**Files:**
- Create: `content/guides/cash-alternative-or-the-car.mdx`

**Interfaces:**
- Produces: `/guides/cash-alternative-or-the-car` page
- Referenced by: Task 1's `relatedGuides`; existing `what-happens-when-you-win.mdx` will link here after Task 6

- [ ] **Step 1: Create the MDX file**

Create `content/guides/cash-alternative-or-the-car.mdx`:

```mdx
---
title: "Cash Alternative or the Car — Which Should You Take?"
slug: "cash-alternative-or-the-car"
metaTitle: "Cash Alternative or the Car? How to Decide if You Win (2026)"
metaDescription: "Win a car competition and face the cash alternative choice? Here's the typical gap, tax implications, when to take cash vs car, and what most winners actually do."
lastUpdated: "2026-06-27"
faqItems:
  - question: "Should I take the cash alternative if I win a car competition?"
    answer: "If you'd sell the car anyway, take the cash — it's simpler, arrives faster, and gives you a similar net amount without the hassle of selling. If it's a car you'd genuinely drive for several years, taking the car may be worth more to you than the cash alt figure."
  - question: "Is the cash alternative tax-free?"
    answer: "Yes. Both cash and car prizes are tax-free for UK winners at the point of winning — no income tax, no capital gains tax. If you subsequently sell the car at a profit above its initial value, normal CGT rules could apply to that gain. Verify with a tax adviser if this is a concern."
  - question: "How much is a typical cash alternative?"
    answer: "Typically 60–80% of the stated prize value. A £50,000 car might carry a £32,000–£40,000 cash alternative. The stated prize value is the operator's claimed RRP, which may be at or above market price — so the cash alt is often close to what you'd net selling the car privately in the near term."
  - question: "Can you negotiate the cash alternative?"
    answer: "Usually no — it's set in the terms and is not negotiable. Some winners have reportedly discussed it with operators, but this is not standard and should not be assumed. Read the terms for the specific competition before entering."
relatedGuides:
  - "are-car-competitions-worth-it"
  - "what-happens-when-you-win"
relatedSites:
  - "botb"
  - "dream-car-giveaways"
  - "rev-comps"
  - "seven-days-performance"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]**

Take the cash if you'd sell the car anyway — you skip the hassle and get a similar net amount without the wait. Take the car if it's one you genuinely want, plan to keep for several years, and the cash figure feels low for the trade.

## How cash alternatives are set

Operators set the cash alternative at a fraction of the stated prize value, typically 60–80%. The stated prize value is the operator's claimed RRP — often at or slightly above list price. So the cash alt is often close to what you'd net selling the car privately soon after winning, without the effort.

A £50,000 stated prize with a 70% cash alternative = £35,000. A private dealer might offer £38,000–£42,000 for the same car, but you'd need to find the buyer, arrange the handover, and wait for the payment. Once you account for the time and friction, the cash alt gap narrows further.

## Tax

Both options are tax-free at the point of winning. Prize winnings from UK competitions are not subject to income tax or capital gains tax. If you subsequently sell the car and it has increased in value above what you received it at, CGT could theoretically apply to the profit — but this is unusual in practice, since most cars depreciate. If you're in any doubt, verify with a qualified tax adviser.

## When to take the car

- It's a car you'd actually choose to own and drive for three or more years
- It's a limited-edition or high-demand model that holds or appreciates in value (some Porsches, AMG variants, special editions) — note this is the exception, not the rule
- The cash alt feels significantly below the car's value to you as a user

If you'd keep it for several years, the full value of not having to buy the car matters more than the cash alt figure. A £45,000 car you'd genuinely drive for five years is worth more to you than its £30,000 cash alternative.

## When to take the cash

- You'd sell the car anyway
- You need the liquidity
- The car isn't something you'd choose to own
- You're carrying debt where a lump sum has a higher effective return

Most winners take the cash. The practical reasons are obvious: no insurance to sort immediately, no delivery to arrange, no depreciation clock ticking from day one. Operators like Dream Car Giveaways and Rev Comps process cash payments quickly — some within 24 hours.

## Cash bonuses vs cash alternatives

Some draws advertise a cash bonus alongside the car: "£45,000 BMW + £10,000 cash." That £10,000 is in addition to the car — not an alternative to it. The cash alternative (if the competition has one) is a separate option to take money instead of the car. Read the terms carefully to distinguish which you're looking at.

## The RRP question

Operators set the stated prize value. It's worth knowing that this figure is sometimes at or above the car's current market price. The cash alternative percentage is applied to that stated value — so an inflated RRP produces an inflated cash alt figure in absolute terms, but the relativity is set by the operator, not the market.

Where we have both prize value and cash alternative from an operator's own listing, we show both. The cash alt is often a more honest proxy for what the prize is actually worth to a winner who takes the money.

For everything that happens after you win — identity verification, timelines, delivery: [What happens when you win a car competition?](/guides/what-happens-when-you-win)

---

*18+ only. Prize terms vary by operator and draw — always read the T&Cs before entering. Tax treatment above is general guidance; verify with a qualified adviser for your specific situation. [About our reviews](/about-our-reviews). We may earn commission from operator links — it doesn't affect our data.*
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: clean build, new page included.

- [ ] **Step 3: Verify page renders in dev**

Open `http://localhost:3000/guides/cash-alternative-or-the-car`. Verify:
- H1 "Cash Alternative or the Car — Which Should You Take?" renders
- AuthorByline present
- Draft banner visible
- All 4 FAQs render
- Related guides: `are-car-competitions-worth-it` (exists), `what-happens-when-you-win` (exists)

- [ ] **Step 4: Commit**

```bash
git add content/guides/cash-alternative-or-the-car.mdx
git commit -m "Add spoke guide: Cash Alternative or the Car (CON-3)"
```

---

## Task 5: Spoke 4 — How Much to Spend on Car Competitions

**Files:**
- Create: `content/guides/how-much-to-spend-on-car-competitions.mdx`

**Interfaces:**
- Produces: `/guides/how-much-to-spend-on-car-competitions` page
- Referenced by: Task 1's `relatedGuides`

- [ ] **Step 1: Create the MDX file**

Create `content/guides/how-much-to-spend-on-car-competitions.mdx`:

```mdx
---
title: "How Much Should You Spend on Car Competitions?"
slug: "how-much-to-spend-on-car-competitions"
metaTitle: "How Much to Spend on Car Competitions — Budgeting Guide (2026)"
metaDescription: "How much should you spend on UK car competitions? Here's how to set a sensible budget, understand expected value, and keep it as entertainment — not a money strategy."
lastUpdated: "2026-06-27"
faqItems:
  - question: "How much should I spend on car competitions per month?"
    answer: "Treat it as entertainment spend — whatever you'd comfortably write off without it affecting anything else. For regular entrants this is typically £10–£50/month. There's no single right number; the right number is the one you'd feel fine losing entirely."
  - question: "Is entering car competitions a good investment?"
    answer: "No. The expected return is below £1 per £1 spent — the same economic reality as the lottery. It's entertainment with a chance of winning, not a financial strategy. Budget it accordingly."
  - question: "Can I enter car competitions for free?"
    answer: "Yes — most operators must accept a free postal entry (handwritten postcard to their address) with equal odds to paid entries. The main exception is BOTB's Spot the Ball, which is a skill competition. See our free entry guide for addresses and the exact process."
  - question: "What if I think I'm spending too much on car competitions?"
    answer: "Contact GamCare (gamcare.org.uk) or the National Gambling Helpline on 0808 8020 133 — free, confidential support. These services cover gambling-adjacent spending of all kinds, including car competition habits."
relatedGuides:
  - "are-car-competitions-worth-it"
  - "free-entry-car-competitions"
  - "how-car-competition-odds-work"
relatedSites:
  - "botb"
  - "elite-competitions"
  - "lucky-day-competitions"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]**

Budget car competitions as entertainment spend — the same as you'd budget a cinema trip, a meal out, or a football match. A monthly budget of £10–£30 buys meaningful entries across several draws without material financial risk. If you're spending more than planned, or chasing a win to cover costs, those are signals to stop.

## Expected value as a budget anchor

Every £1 of tickets returns roughly 20–60p of expected prize value, depending on the draw. That's the real cost: 40–80p per £1 spent, in expectation. It's in the same range as the National Lottery — neither is an investment.

Knowing this doesn't make it a bad decision. Entertainment has costs. A cinema ticket costs £12–£15 and returns nothing. The difference here is the small possibility of a transformative outcome. The right budget is whatever you'd spend on entertainment without it changing anything in your financial life.

## Spreading vs concentrating entries

One ticket in each of five draws gives you five separate chances. Five tickets in one draw gives you better odds for that single draw, but no other shots. The expected prize value is identical either way.

Spreading is psychologically better for most people — five draws to follow, more variety, no single point of disappointment. Concentrating makes sense if you've identified a specific draw with unusually good value and want to press the advantage. More on finding those draws: [When's the best time to enter?](/guides/best-time-to-enter-car-competition)

## Using value score to stretch a fixed budget

Higher value score = more prize value per £1 spent at the ticket cap. If you're working within a fixed monthly budget, filtering by value score and entering the best-value draws extends what that budget covers. Sort by value score on the homepage, check % sold and draw date, prioritise draws where real odds look good relative to the headline.

## Signs your spending is getting out of hand

These patterns are worth recognising early:

- Entering draws you don't remember entering
- Buying more tickets after a near-miss to "stay in"
- Spending money you needed for something else
- Feeling anxious or disappointed when you don't win, rather than treating it as the expected outcome
- Increasing your spend because you feel "due" a win

None of these are unique to car competitions. If they resonate, the right response is to reduce spend or stop.

## The free entry route

If you want to follow draws without spending money, the free postal entry is a legal right on most UK car competitions. A handwritten postcard sent to the operator's address gets equal odds to a paid ticket. Entry volumes via post are low, so the odds aren't meaningfully worse — it's just slower and more effort.

See [How to Enter Car Competitions for Free](/guides/free-entry-car-competitions) for operator addresses and the exact process.

## If you need support

Free, confidential support is available if competition spending has become a concern:

- **GamCare:** [gamcare.org.uk](https://www.gamcare.org.uk)
- **BeGambleAware:** [begambleaware.org](https://www.begambleaware.org)
- **National Gambling Helpline:** 0808 8020 133 (free, available 24/7)

These services cover all forms of gambling-adjacent spending, including car competition habits. You don't need to identify as a gambler to use them.

---

*18+ only. [About our reviews](/about-our-reviews). We may earn commission from operator links — it doesn't affect our data.*
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: clean build, new page included.

- [ ] **Step 3: Verify page renders in dev**

Open `http://localhost:3000/guides/how-much-to-spend-on-car-competitions`. Verify:
- H1 renders correctly
- AuthorByline present
- Draft banner visible
- All 4 FAQs render, including the GamCare helpline number in the last FAQ answer
- Support resources section renders with GamCare, BeGambleAware, and helpline links
- Related guides: `are-car-competitions-worth-it` (exists), `free-entry-car-competitions` (exists), `how-car-competition-odds-work` (exists)

- [ ] **Step 4: Commit**

```bash
git add content/guides/how-much-to-spend-on-car-competitions.mdx
git commit -m "Add spoke guide: How Much to Spend on Car Competitions (CON-3)"
```

---

## Task 6: Cross-link CON-2 guides to CON-3 guides

**Files:**
- Modify: `content/guides/are-car-competitions-legit.mdx` (add CON-3 pillar to relatedGuides)
- Modify: `content/guides/what-happens-when-you-win.mdx` (add cash-alternative spoke to relatedGuides)
- Modify: `content/guides/free-entry-car-competitions.mdx` (add budget spoke to relatedGuides)

**Why:** The CON-2 guides were written before the CON-3 guides existed. Adding cross-links now completes the hub-and-spoke interlinking from both directions.

- [ ] **Step 1: Update `are-car-competitions-legit.mdx`**

Open `content/guides/are-car-competitions-legit.mdx`. In the frontmatter, find the `relatedGuides:` block and add `"are-car-competitions-worth-it"` as the first entry:

Current:
```yaml
relatedGuides:
  - "are-car-competitions-legal"
  - "are-car-competitions-a-scam"
  - "free-entry-car-competitions"
  - "what-happens-when-you-win"
  - "do-people-actually-win"
```

Updated:
```yaml
relatedGuides:
  - "are-car-competitions-worth-it"
  - "are-car-competitions-legal"
  - "are-car-competitions-a-scam"
  - "free-entry-car-competitions"
  - "what-happens-when-you-win"
  - "do-people-actually-win"
```

- [ ] **Step 2: Update `what-happens-when-you-win.mdx`**

Open `content/guides/what-happens-when-you-win.mdx`. Add `"cash-alternative-or-the-car"` to `relatedGuides`:

Current:
```yaml
relatedGuides:
  - "are-car-competitions-legit"
  - "do-people-actually-win"
  - "free-entry-car-competitions"
```

Updated:
```yaml
relatedGuides:
  - "are-car-competitions-legit"
  - "do-people-actually-win"
  - "free-entry-car-competitions"
  - "cash-alternative-or-the-car"
```

- [ ] **Step 3: Update `free-entry-car-competitions.mdx`**

Open `content/guides/free-entry-car-competitions.mdx`. Find the `relatedGuides:` block and add `"how-much-to-spend-on-car-competitions"`:

Current:
```yaml
relatedGuides:
  - "are-car-competitions-legit"
  - "are-car-competitions-legal"
  - "what-happens-when-you-win"
```

Updated:
```yaml
relatedGuides:
  - "are-car-competitions-legit"
  - "are-car-competitions-legal"
  - "what-happens-when-you-win"
  - "how-much-to-spend-on-car-competitions"
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 5: Verify cross-links render**

Open `http://localhost:3000/guides/are-car-competitions-legit`. Verify "Are Car Competitions Worth It?" appears in the Related Guides section.

Open `http://localhost:3000/guides/what-happens-when-you-win`. Verify "Cash Alternative or the Car" appears in the Related Guides section.

- [ ] **Step 6: Commit**

```bash
git add content/guides/are-car-competitions-legit.mdx content/guides/what-happens-when-you-win.mdx content/guides/free-entry-car-competitions.mdx
git commit -m "Wire CON-2 to CON-3 cross-links in guide frontmatter"
```

---

## Final verification

After all 6 tasks complete:

- [ ] Run `npm run build` from clean — must pass with no errors or warnings
- [ ] Run `npm run lint` — must pass clean
- [ ] Open each of the 5 new guide pages and verify: h1, AuthorByline, draft banner, prose, FAQ section, related guides, footer disclosure
- [ ] Check `/guides` index page to confirm all 5 new guides appear in the listing
- [ ] Confirm `are-car-competitions-worth-it` links resolve to the pillar from each spoke's related guides section
