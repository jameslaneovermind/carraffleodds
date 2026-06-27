# CON-3: Value/Strategy Pillar Cluster — Design Spec

## Goal

Build a pillar guide + 4 spoke guides on the decision-making angle: are car competitions worth it, how odds actually work, the best time to enter, cash alt vs car, and budgeting. This is the cluster that makes the site's data useful — explaining what the numbers mean and how to act on them.

## Architecture

Same pattern as CON-2. Five MDX files in `content/guides/`, rendered by the existing `/guides/[slug]` route. No new infrastructure needed.

**Files to create:**
- `content/guides/are-car-competitions-worth-it.mdx` — pillar
- `content/guides/how-car-competition-odds-work.mdx` — spoke 1
- `content/guides/best-time-to-enter-car-competition.mdx` — spoke 2
- `content/guides/cash-alternative-or-the-car.mdx` — spoke 3
- `content/guides/how-much-to-spend-on-car-competitions.mdx` — spoke 4

Each file uses identical frontmatter shape to existing guides (title, slug, metaTitle, metaDescription, lastUpdated, faqItems, relatedGuides, relatedSites). No schema changes.

## Global Constraints

- **Voice:** writing-voice skill throughout. Answer-first (40–60 word direct answer opening each section). Plain English, honest, no hype.
- **No mock data.** Any figures cited must be real (from scrapers, operator sites, or publicly verifiable sources) or clearly framed as illustrative examples.
- **Responsible gambling framing** on every page, mandatory on the budget guide. Never imply entering fixes money problems. Always 18+.
- **No fake urgency.** The "best time to enter" guide explains real odds mechanics — not manufactured FOMO.
- **Affiliate disclosure** on any page linking to operator sites.
- **lastUpdated: "2026-06-27"** on all five files.

## Page Specs

---

### Pillar: Are Car Competitions Worth It?

**Slug:** `are-car-competitions-worth-it`  
**metaTitle:** `Are Car Competitions Worth It? The Honest Maths (2026)`  
**metaDescription:** `Are UK car competitions worth entering? We run the expected value, explain the real odds, and give an honest answer — including when they're better value than a lottery ticket.`

**Content outline:**

1. **Direct answer (intro):** Mathematically, the expected return is below £1 per £1 spent — so they're not "worth it" in a pure investment sense. But that's the wrong frame. They're entertainment with a realistic chance of winning something life-changing. The question is whether the entry price feels fair for the entertainment and chance you're getting.

2. **The maths** — brief, non-technical. Prize ÷ (total tickets × ticket price) = how many pence of prize you're buying per penny spent. Most draws sit at 20–60p per £1. National lottery is around 45p per £1. Car competitions are in the same ballpark, with a much bigger top prize. Link to `/methodology` for the formula.

3. **When they're better value** — undersold draws (real odds better than the headline), draws near close with price drops. Link to spoke 2 (best time to enter).

4. **The cash alternative reality** — stated prize values are often at or above market. The cash alt is usually 60–80% of that. Both figures go into our value score. Link to spoke 3 (cash alt vs car).

5. **Responsible framing** — enter with what you'd spend on any entertainment (cinema, a meal out). If you're chasing losses or spending more than you intended, stop. Link to spoke 4 (how much to spend).

6. **Conclusion** — for the right person, entering a well-chosen draw at a fair price is a reasonable entertainment spend with a chance of something extraordinary. For that to be true you need to choose well — which is what this site is for.

**FAQs:**
- Are car competitions worth it financially? (No, EV < 1 — same as lottery. But the prize ceiling is much higher for the same entry price.)
- Are they better value than the lottery? (On value score, some are. On odds of winning anything, lottery is better. On top prize per £1 spent, car competitions win.)
- Is it gambling? (Legally no — they use a free entry route or skill question to avoid Gambling Act classification. But treat your spend like gambling: budget it, don't chase.)
- Which car competitions are best value? (Filter by value score on the homepage. Higher score = more prize value per £1 spent.)

**relatedGuides:** how-car-competition-odds-work, best-time-to-enter-car-competition, cash-alternative-or-the-car, how-much-to-spend-on-car-competitions  
**relatedSites:** botb, dream-car-giveaways, rev-comps, elite-competitions

---

### Spoke 1: How Car Competition Odds Actually Work

**Slug:** `how-car-competition-odds-work`  
**metaTitle:** `How Car Competition Odds Work — Real vs Headline Odds (2026)`  
**metaDescription:** `Car competition odds aren't always what they seem. Here's how to read the real odds, why undersold draws are better value, and why BOTB has no fixed odds.`

**Content outline:**

1. **Direct answer:** For fixed-ticket draws, odds = 1 in [total tickets]. One ticket, one entry. The wrinkle is that total tickets is the cap — if only half have sold and the draw is guaranteed on a date, your real odds are 1 in [tickets sold], not 1 in the cap.

2. **Fixed-odds model explained** — the most common type. Cap of e.g. 10,000 tickets. Draw guaranteed on the draw date regardless of sell-through. Headline odds: 1 in 10,000. If 4,000 sold: real odds 1 in 4,000. This is the number that matters.

3. **The % sold column** — what it means on our site, how to use it. Low % sold + guaranteed draw date = better value. High % sold + close to draw date = last chance but headline odds closer to real odds.

4. **Spot-the-ball / unlimited entry (BOTB)** — no fixed cap. You're competing against everyone who enters, and entry volume varies. We don't show 1-in-X for BOTB because there's no reliable figure. Their edge is the skill element: a better guess is genuinely more likely to win.

5. **Multiple tickets** — buying N tickets gives N-in-X odds, not a N× improvement (unless X is very small). Illustrative example: 5 tickets in a 10,000-ticket draw = 1 in 2,000. Still long.

6. **Quick comparison** — car competition odds vs premium bonds, national lottery, scratchcards. Car competitions: better prize ceiling, similar or worse odds of winning anything.

**FAQs:**
- What are the odds of winning a car competition? (Varies: typically 1 in 2,000 to 1 in 500,000 depending on ticket cap. Filter by total tickets on our site.)
- Do more entries improve your odds? (Yes, linearly. 10 tickets in a 10,000-draw = 1 in 1,000.)
- What does % sold mean? (The proportion of the ticket cap already sold. Lower % sold + guaranteed draw = better real odds than headline.)
- Why doesn't BOTB show odds? (Spot-the-ball has no fixed entry cap — it's skill-based, so odds depend on how many people enter and how good their guess is.)

**relatedGuides:** are-car-competitions-worth-it, best-time-to-enter-car-competition, are-car-competitions-legal  
**relatedSites:** botb, rev-comps, dream-car-giveaways

---

### Spoke 2: When's the Best Time to Enter a Car Competition?

**Slug:** `best-time-to-enter-car-competition`  
**metaTitle:** `Best Time to Enter a Car Competition — When Odds Are Best (2026)`  
**metaDescription:** `Timing matters in car competitions. Here's when real odds are best, when prices often drop, and how to use sell-through data to find better value draws.`

**Content outline:**

1. **Direct answer:** For guaranteed draws, the best time is when sell-through is low relative to the draw date. A draw guaranteed next Friday with 20% sold gives 5× better real odds than the same draw fully sold out. Use the % sold column and draw date together.

2. **The undersold-draw insight** — the core of the site's value. Fixed guaranteed draw + low sell-through = real odds much better than the headline. Walk through a concrete example: 5,000-ticket draw, £5 per ticket, draw in 7 days, 1,200 tickets sold. Real odds: 1 in 1,200, not 1 in 5,000. Expected value: prize ÷ (1,200 × £5) rather than prize ÷ (5,000 × £5).

3. **Price drops near draw close** — some operators reduce ticket prices to shift remaining stock. This improves value further (lower price, same prize). Worth checking the "ending soon" section. But: don't mistake FOMO marketing for genuine value. The draw being near close doesn't help if it's already 95% sold.

4. **Auto-draw vs live draw** — auto-draws happen at a fixed date/time regardless. Live draws are sometimes contingent on sell-through, which means an undersold live draw may get extended. Guaranteed auto-draws are the safer bet for the undersold strategy.

5. **What to avoid** — entering the same draw for weeks hoping the price drops (you may miss a better value draw elsewhere). Entering right as a draw goes viral on social media (sell-through spikes, odds worsen fast).

6. **How to use the site** — value score + % sold + draw date together tell the story. Sort by value score, filter for draws ending soon, check % sold. That combination finds the undersold guaranteed draws.

**FAQs:**
- When is the best time to enter a car competition? (When sell-through is low and the draw date is fixed — real odds are much better than the headline.)
- Do car competition prices drop near the end? (Sometimes. Some operators discount unsold tickets near close. Check the ending-soon section, but verify it's a genuine price drop not FOMO marketing.)
- What is % sold in car competitions? (The proportion of the ticket cap already claimed. Lower = better real odds on a guaranteed-draw-date competition.)
- Is it better to enter early or late? (Early if you want the most entry options. Late if you're hunting undersold guaranteed draws with better real odds.)

**relatedGuides:** are-car-competitions-worth-it, how-car-competition-odds-work  
**relatedSites:** rev-comps, dream-car-giveaways, elite-competitions, lucky-day-competitions

---

### Spoke 3: Cash Alternative or the Car — Which Should You Take?

**Slug:** `cash-alternative-or-the-car`  
**metaTitle:** `Cash Alternative or the Car? How to Decide if You Win (2026)`  
**metaDescription:** `Win a car competition and face the cash alternative choice? Here's how to think about it: the typical gap, tax implications, depreciation, and what most winners actually do.`

**Content outline:**

1. **Direct answer:** The cash alternative is typically 60–80% of the stated car value and is tax-free either way. Take the cash if you'd sell the car anyway — you avoid the hassle and the dealer margin. Take the car if it's genuinely one you want, plan to keep it, and the gap isn't enormous.

2. **How cash alternatives are set** — operators typically offer 60–80% of their stated RRP. The stated RRP is often at or above list price. So the cash alt is often a fair reflection of what you'd net if you sold the car privately. Worked example with realistic figures.

3. **Tax implications** — both cash and car are tax-free for UK winners. No income tax, no CGT on the gift itself. If you sell the car and make a gain over the initial value (unlikely but possible for limited editions), that gain could be taxable. Caveat: verify with a tax adviser for your situation.

4. **The car you'd actually drive** — if it's a car you'd own for 3+ years, the total cost of ownership calculation changes. You avoid the purchase price, not just the cash alt value. For a £45,000 car, keeping it for 5 years means depreciation is spread across your ownership — the maths can favour taking the car.

5. **Depreciation reality** — most cars lose 20–40% in year one. For high-demand models with waiting lists (some Porsches, limited-edition vehicles), the gap narrows or inverts. For common models, sell it quickly if you're going to sell at all.

6. **Additional cash prizes** — some draws include a cash bonus (e.g. "£45,000 BMW + £10,000 cash"). This is on top of the car, not instead. Read the terms.

7. **What most winners do** — anecdotally, a significant proportion take the cash. No industry-wide data exists, but operators' social posts suggest the majority of winners do take the car for draws where the car is genuinely desirable.

**FAQs:**
- Should I take the cash alternative if I win a car competition? (If you'd sell the car, take the cash — simpler, faster, similar net value. If it's a car you want, take the car.)
- Is the cash alternative tax-free? (Yes. Both cash and car prizes are tax-free for UK winners. Consult a tax adviser if you plan to sell the car immediately for a gain.)
- How much is a typical cash alternative? (60–80% of the stated prize value. A £50,000 car might have a £30,000–£40,000 cash alternative.)
- Can you negotiate the cash alternative? (Usually no — it's fixed in the terms. Some operators have been known to discuss it, but don't rely on it.)

**relatedGuides:** are-car-competitions-worth-it, what-happens-when-you-win  
**relatedSites:** botb, dream-car-giveaways, rev-comps, seven-days-performance

---

### Spoke 4: How Much Should You Spend on Car Competitions?

**Slug:** `how-much-to-spend-on-car-competitions`  
**metaTitle:** `How Much to Spend on Car Competitions — Budgeting Guide (2026)`  
**metaDescription:** `How much should you spend on UK car competitions? Here's how to set a sensible budget, understand expected value, and keep it as entertainment — not a money strategy.`

**Content outline:**

1. **Direct answer:** Budget car competitions as entertainment spend — the same way you'd budget a cinema trip, a meal out, or a football match ticket. A monthly budget of £10–£30 buys meaningful entries across several draws without any financial risk. If you're spending more than you planned, or chasing a win to cover costs, stop.

2. **Expected value as a budget anchor** — on average, every £1 spent returns roughly 20–60p in expected prize value (depending on the draw). That's a real cost for the chance at a life-changing prize. Knowing this doesn't make it a bad decision — entertainment has costs — but it means treating it like lottery spend, not investment.

3. **Spreading entries vs concentrating** — entering one ticket in each of five draws gives five separate chances. Entering five tickets in one draw improves your odds for that draw but removes the variety. Neither is mathematically better overall; spreading is psychologically better (more draws to follow).

4. **Using value score to stretch the budget** — higher value score draws give more prize value per £1 spent. Filtering by value score and entering those draws makes the same budget work harder. Sort the homepage by value score.

5. **Signs you're spending too much** — entering draws you don't remember; buying more tickets after a near-miss; spending money you needed for something else; feeling anxious when you don't win. These are warning signs, not just for car competitions but any form of gambling-adjacent entertainment.

6. **Resources** — GamCare (gamcare.org.uk), BeGambleAware (begambleaware.org), National Gambling Helpline: 0808 8020 133. These resources exist for anyone who needs support with gambling behaviour — car competitions are in the same territory.

7. **The free entry route** — if you want to follow draws without spending money, the free postal entry is a legal right on most draws (BOTB excepted). You get equal odds. See the free entry guide.

**FAQs:**
- How much should I spend on car competitions per month? (Treat it as entertainment spend — whatever you'd comfortably lose with no regret, typically £10–£50/month for a regular entrant.)
- Is entering car competitions a good investment? (No. Expected return is below £1 per £1 spent. It's entertainment with a chance of winning, not an investment strategy.)
- Can I enter for free? (Yes — most operators must accept a free postal entry with equal odds. See our free entry guide for addresses and format.)
- What if I'm spending too much? (Contact GamCare (gamcare.org.uk) or the National Gambling Helpline: 0808 8020 133. Free, confidential support.)

**relatedGuides:** are-car-competitions-worth-it, free-entry-car-competitions, how-car-competition-odds-work  
**relatedSites:** botb, elite-competitions, lucky-day-competitions

---

## Interlinking Map

```
are-car-competitions-worth-it (pillar)
  ├── how-car-competition-odds-work
  ├── best-time-to-enter-car-competition
  ├── cash-alternative-or-the-car
  └── how-much-to-spend-on-car-competitions

CON-2 cross-links:
  are-car-competitions-worth-it → are-car-competitions-legit (and vice versa)
  how-much-to-spend → free-entry-car-competitions
  cash-alternative-or-the-car → what-happens-when-you-win

/methodology → how-car-competition-odds-work (and vice versa)
```

## AEO Requirements (all five pages)

- `FaqJsonLd` with the FAQs listed above
- `ArticleJsonLd` with `lastUpdated: "2026-06-27"` and James Lane as author
- `BreadcrumbJsonLd` (Home → Guides → [title])
- `AuthorByline` component (already in place from CON-6)
- Answer-first: every H2 section opens with a direct 40–60 word answer
- Visible "last updated" via AuthorByline

## Compliance Checklist

- [ ] 18+ framing present (budget/worth-it guides especially)
- [ ] Responsible gambling resources cited in the budget guide (GamCare, BeGambleAware, helpline number)
- [ ] No fake urgency — the best-time guide explains real mechanics, not manufactured scarcity
- [ ] Affiliate disclosure on any page with operator links
- [ ] No misrepresentation of odds or prize values — all figures framed as examples or sourced
- [ ] No implication that entering will fix financial problems
