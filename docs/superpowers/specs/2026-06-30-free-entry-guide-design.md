# Free Entry Guide — Per-Site Details Design

## Goal

Upgrade the existing `/guides/free-entry-car-competitions` guide to replace its hardcoded markdown address table with a live component backed by a typed TS config. Surface the same per-site free entry details on each individual site review page (`/sites/[slug]`), creating a consistent cross-linking pattern between the guide and the site reviews.

## Architecture

Single source of truth: `src/lib/free-entry.ts` exports a typed array of per-site records and a lookup helper. Two new components read from it — one renders all sites (guide page), the other renders a single site (review pages).

No new routes. No DB changes. No migrations.

## Data model

`src/lib/free-entry.ts`:

```ts
export interface FreeEntrySite {
  siteSlug: string;        // matches sites.slug in DB and review MDX filenames
  siteName: string;
  postalAddress: string | null;  // null = not found / verify against T&Cs
  entryDeadlineDays: number | null; // days before draw close; null = not confirmed
  skillQuestionFormat: string | null; // plain description, not the answer
  emailEntry: boolean;
  lastVerified: string;    // 'YYYY-MM' — displayed as "Verified June 2026"
  notes: string | null;    // site-specific caveats
}

export const FREE_ENTRY_SITES: FreeEntrySite[] = [ /* see Data population */ ]

export function getFreeEntryForSite(slug: string): FreeEntrySite | undefined {
  return FREE_ENTRY_SITES.find(s => s.siteSlug === slug)
}
```

`lastVerified` drives a visible caveat on both the guide and site review: "Verified [month] — always check the site's T&Cs before posting."

## Data population

Initial values from the existing guide MDX and public T&Cs research. All marked `lastVerified: '2026-06'`. Fields marked `null` need manual verification before publish.

| siteSlug | postalAddress | entryDeadlineDays | skillQuestionFormat | emailEntry |
|---|---|---|---|---|
| `elite-competitions` | Unit 6, 7 & 8 Turing Court, Hawking Place, Bispham, Blackpool, FY2 0QW | null | null | false |
| `rev-comps` | Northfield House, Shurdington Road, Bentham, Cheltenham, GL51 4UA | null | null | false |
| `dream-car-giveaways` | DCG Ltd, PO Box 2050, Pershore, WR10 9FA | null | Sliding scale entries per stamp based on ticket price | false |
| `click-competitions` | null | null | null | false |
| `lucky-day` | 72 Tievecrom Road, Forkhill, Newry, Co. Down, BT35 9RX | null | null | false |
| `7-days-performance` | null | null | null | false |
| `llf-games` | LLF Games Ltd, Tayfield House, 38 Poole Road, Westbourne, Bournemouth, BH4 9DW | null | null | false |
| `botb` | null | null | Spot the Ball skill question (exempt from free entry requirement) | false |

BOTB is included in the config with a note explaining the exemption, so the site review page can render an honest "free entry doesn't apply here" explanation rather than silently rendering nothing.

## Components

### `src/components/free-entry-sites-table.tsx`

Used in the guide page. Renders all sites from `FREE_ENTRY_SITES` as a responsive card grid or table. Each card shows:
- Site name (linked to `/sites/[slug]` review)
- Postal address (or "Address not confirmed — check T&Cs" if null)
- Entry deadline if known
- Skill question format if applicable
- Email entry flag
- "Verified [month]" label

### `src/components/free-entry-card.tsx`

Used in site review pages. Takes `siteSlug: string` prop. Looks up via `getFreeEntryForSite()`. Renders a contained panel with the same fields as above. For BOTB, renders a short explanation of the skill-question exemption instead of an address. Returns null only if the slug has no entry at all in the config (shouldn't happen for any tracked site).

## Page changes

### Guide page (`content/guides/free-entry-car-competitions.mdx`)

Replace the existing markdown address table with a `<FreeEntrySitesTable />` component tag. All prose stays as-is — it was written to be human-finished and is already in good shape.

The `[slug]/page.tsx` renderer already uses `MDXRemote` from `next-mdx-remote/rsc`. Pass `FreeEntrySitesTable` in the `components` prop.

### Site review page (`src/app/sites/[slug]/page.tsx`)

Add `<FreeEntryCard siteSlug={meta.slug} />` after the existing `<RaffleWidget siteSlug={meta.slug} />`. Import `getFreeEntryForSite` at the top to check whether data exists before rendering (avoids a visible gap for any future unlisted site).

Add a section heading "Free entry" above the card so the section is clearly labelled.

## Non-goals

- No admin UI for updating the data
- No DB column on the `sites` table
- No per-site sub-pages (single guide page only)
- No auto-verification of addresses against live T&Cs
- No email entry functionality (display only)

## Human review gate

Per CLAUDE.md rule 6, the guide is AI-assisted but human-finished. Before deploying:
1. Verify all postal addresses against each site's current T&Cs
2. Fill in any `null` deadline and skill question fields where findable
3. Review the MDX prose — it was drafted in a previous session and is ready for a human edit pass
4. Approve before pushing to production
