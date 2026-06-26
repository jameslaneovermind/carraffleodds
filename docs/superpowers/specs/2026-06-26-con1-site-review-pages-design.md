# CON-1: Site Review Pages Design

**Ticket:** CON-1  
**Date:** 2026-06-26

---

## What we're building

A `/sites` listing page and individual `/sites/[slug]` review pages for all 8 tracked car raffle operators. Each review page has: a trust bar, human-written prose (MDX), a live raffle widget showing the top 5 raffles ending soonest for that site, and an ownership disclosure where applicable. Nav gets a "Sites" link.

This is a **human-reviewed content feature** — the code is built by agents, but the prose MDX files are written/edited by the human before any page goes live. CLAUDE.md rule 4 and 5 apply strictly.

---

## Architecture

### File structure

```
content/reviews/
  botb.mdx
  dream-car-giveaways.mdx
  rev-comps.mdx
  elite-competitions.mdx
  click-competitions.mdx
  lucky-day.mdx
  llf-games.mdx
  7-days-performance.mdx

src/app/sites/
  page.tsx                    — /sites listing
  [slug]/
    page.tsx                  — individual review

src/components/sites/
  RaffleWidget.tsx            — live raffle widget (top 5 ending soonest)
  SiteCard.tsx                — card used on /sites listing
```

### MDX setup

- `@next/mdx` (or `next-mdx-remote` — see below) with TypeScript support
- No dynamic MDX loading from a CMS — files live in `content/reviews/` in the repo
- Each `.mdx` file exports a `metadata` object with typed frontmatter fields (see below)
- MDX is compiled at build time (SSG); the raffle widget is the only runtime Supabase call

**Package choice:** Use `next-mdx-remote/rsc` (already battle-tested with App Router). Avoids needing to eject from Next.js config. If `@next/mdx` is already in the repo, use that instead — check first.

### MDX frontmatter schema (typed)

```typescript
interface SiteReviewMeta {
  name: string              // Display name: "Best of the Best"
  slug: string              // DB/route slug: "botb"
  trustpilotScore: number   // e.g. 4.9
  trustpilotCount: string   // e.g. "10,000+"
  yearsEstablished: number  // e.g. 1999
  companiesHouseNumber: string // e.g. "03755182"
  voluntaryCode: boolean    // DCMS Voluntary Code signatory
  parentCompany?: string    // e.g. "Winvia Entertainment PLC" — omit if independent
  parentSiblings?: string[] // e.g. ["botb", "rev-comps"] — slugs of sibling sites under same parent
  logoUrl: string           // path or URL
  affiliateUrl: string      // link-out URL for CTA button
  tagline: string           // one sentence shown on listing card
}
```

### Data flow

```
build time:
  MDX files → next-mdx-remote compiles prose + metadata → static pages

request time (ISR, ~60s revalidate):
  /sites/[slug] → Supabase query:
    SELECT * FROM raffles
    WHERE site_id = (SELECT id FROM sites WHERE slug = ?)
      AND status IN ('active', 'ending_soon')
    ORDER BY end_date ASC
    LIMIT 5
  → RaffleWidget renders top 5 ending soonest
```

---

## Routes

### `/sites` (listing page)

- `src/app/sites/page.tsx` — server component, statically generated
- Reads all MDX files from `content/reviews/` at build time; sorts by `yearsEstablished` ascending (oldest first — neutral, no quality implication)
- Renders a grid of `<SiteCard />` components
- No Supabase call — purely static

**SiteCard content:**
- Site logo
- Site name
- Trustpilot stars + review count
- Years established
- `tagline` from frontmatter
- "Read review →" link

### `/sites/[slug]` (individual review)

- `src/app/sites/[slug]/page.tsx` — server component
- Loads the matching MDX file by slug
- One Supabase query for live raffles (top 5 ending soonest)
- Renders in order:
  1. Site header (name, logo, "Visit site →" affiliate CTA)
  2. Trust bar
  3. Prose (from MDX body)
  4. Ownership disclosure (if `parentCompany` present in frontmatter)
  5. Live raffle widget (`<RaffleWidget />`)

---

## Components

### `<RaffleWidget />`

Server component (or async RSC). Props: `siteSlug: string`.

- Fetches top 5 raffles ending soonest via Supabase typed client
- Renders same card/row style as the main raffle listing (reuse existing raffle card component if one exists; check `src/components/` before building new)
- If 0 raffles: shows "No live raffles right now — check back soon" empty state
- Each raffle links out via `affiliateUrl` (not a per-raffle generated page — CLAUDE.md rule 3)

### `<SiteCard />`

Client or server component. Props: `meta: SiteReviewMeta`. Renders a card for the `/sites` listing.

### Trust bar (inline in review page, not a shared component)

Renders: Trustpilot score + count, years established ("Est. 1999"), Voluntary Code badge (if `voluntaryCode: true`), Companies House number (small text, links to `find-and-update.company-information.service.gov.uk/company/[number]`).

### Ownership disclosure

Conditionally rendered below the prose if `parentCompany` is set in frontmatter. Copy pattern:

> "Click Competitions is owned by Winvia Entertainment PLC (LSE: WVIA), which also operates [BOTB](/sites/botb). [Rev Comps](/sites/rev-comps) is expected to join the group in July 2026."

Written as MDX prose by the human author — not auto-generated from `parentSiblings`. The frontmatter flags are for the trust bar display only; the prose section handles the nuance.

---

## Navigation

`src/components/layout/header.tsx` — add "Sites" as a new nav item between existing items. Position: after the last existing link, before any utility links. The nav currently has: All Raffles, Ending Soon, Cars, Cash, Tech, Skill Comps.

Add: **Sites** → `/sites`

---

## The 8 sites

| Slug | Name | Established | Parent |
|------|------|-------------|--------|
| `botb` | Best of the Best | 1999 | Winvia Entertainment PLC |
| `elite-competitions` | Elite Competitions | 2006 | Independent |
| `llf-games` | LLF Games | 2008 | Independent |
| `7-days-performance` | 7 Days Performance | 2018 | Independent |
| `dream-car-giveaways` | Dream Car Giveaways | 2018 | Jumbo Interactive |
| `rev-comps` | Rev Comps | 2019 | Winvia Entertainment PLC (acquiring) |
| `lucky-day` | Lucky Day Competitions | 2019 | Independent |
| `click-competitions` | Click Competitions | 2020 | Winvia Entertainment PLC |

Research for all 8 sites is in `docs/research/`. The human author reads these before writing MDX prose.

---

## MDX content scope (what the human writes per review)

Each review prose covers these topics (not necessarily as explicit headings):

1. **How it works** — competition model (fixed-odds vs spot-the-ball), ticket prices, draw schedule and frequency, free entry route
2. **Prize range** — what kinds of prizes, cash alternatives
3. **Transparency and trust** — how draws are conducted, winner evidence, verification approach
4. **What it's good for** — who this operator suits (e.g. "petrolhead who wants rare cars", "casual entry at 97p", "someone who wants the most established name")
5. **Watch points** — honest coverage of any concerns (Trustpilot review flags, responsible gambling gaps, website security, ownership changes, repeat winner controversies). CLAUDE.md rule 10: honest, no fabricated urgency.
6. **Responsible gambling** — where applicable, flag if a site lacks visible RG messaging

Tone follows the `writing-voice` skill: direct, specific, honest. Not promotional.

---

## SEO metadata

Each review page sets:
- `<title>`: `{Site Name} Review 2026 — Is It Legit? | CarRaffleOdds`
- `<meta name="description">`: pulled from a `metaDescription` frontmatter field (human-written)
- Schema.org `Review` structured data: `itemReviewed` = the site, `reviewRating` drawn from Trustpilot score (not our editorial opinion — attribute clearly)

---

## Constraints (hard rules that apply)

1. **No mock data** in `RaffleWidget` — if Supabase returns 0 raffles, show empty state; never invent raffles.
2. **No per-raffle generated pages** — raffle widget links out to the operator's site via `affiliateUrl`. No `/raffles/[id]` pages created as part of this work.
3. **No auto-publishing** — MDX files are committed to the repo but pages are intentionally blank/stubbed until the human writes the prose and approves. Build the route and the MDX infrastructure; ship placeholder MDX files; the human fills them in.
4. **No editorial ranking** — the `/sites` listing is sorted by `yearsEstablished`; no "best", "top", "recommended" copy that implies quality ordering. Link to all 8 regardless of affiliate status.
5. **Ownership disclosed neutrally** — the Winvia/Jumbo relationships are facts stated plainly, not editorially weighted.

---

## CON-6 hook

ROADMAP notes CON-6 (author identity + methodology page) should go alongside CON-1. Minimum viable CON-6 deliverable: an `/about-our-reviews` page linked from each review page footer explaining how we research sites (Companies House, Trustpilot, live draw observation) and that reviews are human-written, not generated. This can be a static MDX page. CON-6 is in scope for the same implementation plan as CON-1.

---

## Out of scope (for this ticket)

- Ratings or editorial scores of our own (beyond Trustpilot display)
- User comments or review submission
- Per-raffle individual pages (CLAUDE.md rule 3)
- Automated MDX generation from research notes (CLAUDE.md rule 4)
- Any push to publish before human review

---

## Implementation order (suggested)

1. MDX infrastructure + typed frontmatter schema
2. `/sites/[slug]` route + layout (trust bar, prose slot, widget slot)
3. `RaffleWidget` component with Supabase query
4. `SiteCard` + `/sites` listing page
5. Nav update
6. Stub MDX files for all 8 sites (placeholder prose — clearly marked as draft)
7. `/about-our-reviews` static page (CON-6)
8. Human writes and approves MDX prose before any page goes live
