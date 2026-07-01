# Competition Draw Calendar Design

## Goal

A dedicated `/draws` page showing all car competition draws in the next 14 days, grouped by date, giving users a clear entry-planning tool. Paired with a nav restructure to keep the header uncluttered as the site grows.

---

## Nav restructure

Current nav has 9 items — the three prize-category shortcuts (Cars, Cash, Tech) and Skill Comps are cut from the primary nav. All remain accessible via the main `/raffles` page filters and the `/competitions` route respectively; they don't need top-level placement.

**New `NAV_ITEMS` in `src/components/layout/header.tsx`:**

```ts
const NAV_ITEMS = [
  { href: '/raffles', label: 'Raffles' },
  { href: '/draws', label: 'Draws' },
  { href: '/ending-soon', label: 'Ending Soon' },
  { href: '/sites', label: 'Sites' },
  { href: '/guides', label: 'Guides' },
  { href: '/insights', label: 'Insights' },
];
```

6 items. Clean, uncluttered, and `Draws` gets proper top-level visibility.

---

## Page: `/draws`

**File:** `src/app/draws/page.tsx`
**Type:** Async server component
**Revalidation:** `export const revalidate = 3600`

### Data query

Fetch from Supabase:

```ts
const now = new Date().toISOString();
const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

supabase
  .from('raffles')
  .select('id, title, end_date, prize_value, ticket_price, percent_sold, total_tickets, tickets_sold, url, car_make, car_model, car_year, site:sites(id, name, slug, affiliate_url, competition_model)')
  .eq('prize_type', 'car')
  .in('status', ['active', 'ending_soon'])
  .gt('end_date', now)
  .lte('end_date', twoWeeks)
  .order('end_date', { ascending: true })
```

After fetch: filter out `site.competition_model === 'spot_the_ball'` (BOTB — no fixed draw date). Consistent with existing category page pattern.

### Grouping logic

Group draws by UK calendar date. Labels:
- Same day as today → **"Today"**
- Next calendar day → **"Tomorrow"**
- All others → **"Wednesday 2 July"**, **"Thursday 3 July"**, etc. (full weekday + date + month, no year)

Days with no draws are skipped entirely. Grouping computed server-side using `Intl.DateTimeFormat` with `Europe/London` timezone.

### Page structure

```
<h1> Upcoming Car Draws
<p>  X draws in the next 14 days · Updated hourly

[If draws today]
Today's draws section — amber highlight, urgency framing

[Per date group]
<h2> Wednesday 2 July  [3 draws]
  DrawCard
  DrawCard
  DrawCard

[If no draws at all]
Empty state
```

---

## DrawCard component

**File:** `src/components/draws/draw-card.tsx`

Renders one raffle. Layout:

```
┌─────────────────────────────────────────────────┐
│ [Site badge]                    Draws in 3 days  │
│                                                  │
│ 2024 Porsche 911 GT3                             │
│ £75,000 prize                                    │
│                                                  │
│ £2.99/ticket                                     │
│ ████████████░░░░░  62% sold (31,000/50,000)      │
│                                                  │
│                          [Enter now →]           │
└─────────────────────────────────────────────────┘
```

**Progress bar colour:**
- < 50% sold → `bg-emerald-500` (green — plenty of space)
- 50–80% sold → `bg-amber-400` (amber — filling)
- > 80% sold → `bg-red-500` (red — nearly full)

**"Draws in X" label:**
- Draws today → `"Draws today"` in red bold
- Draws tomorrow → `"Draws tomorrow"` in amber
- Otherwise → `"Draws in N days"` in slate

**"Enter now →" button:** links to `raffle.url` (the specific raffle page on the operator site). Opens in new tab with `rel="noopener noreferrer"`.

**Car title:** `{car_year} {car_make} {car_model}` if all three present; fall back to `raffle.title`.

**Prize value:** formatted from pence to `£X,XXX` using existing `formatCurrency` utility.

---

## Today's draws section

If any draws are grouped under "Today", render them in an amber-tinted section:

```tsx
<div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 mb-8">
  <div className="flex items-center gap-2 mb-4">
    <span className="text-amber-600 font-semibold">Today</span>
    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
      Closing today — enter before midnight
    </span>
  </div>
  {/* DrawCards */}
</div>
```

---

## Empty state

```tsx
<div className="text-center py-16 text-slate-500">
  <p className="text-lg font-medium text-slate-700 mb-2">No car draws in the next 14 days</p>
  <p className="text-sm mb-6">New competitions are added hourly — check back soon.</p>
  <Link href="/raffles/cars" className="text-blue-600 hover:underline text-sm">
    Browse all active car competitions →
  </Link>
</div>
```

---

## Cross-links to `/draws`

### Home page (`src/app/page.tsx`)
Add a "Upcoming car draws" stat card to the existing data stats grid linking to `/draws`. Copy: "Next draw" with the nearest draw date or count.

### Insights — Best Time to Enter (`src/app/insights/best-time-to-enter/page.tsx`)
Add a callout before the methodology box:
> "The last day sees the biggest rush. See which car draws are coming up — and when to enter."
> [View upcoming draws →]

### Insights — When Sites Release (`src/app/insights/when-sites-release/page.tsx`)
Add a callout at the bottom of the prose:
> "Know when sites launch new competitions. For what's drawing soon, see the draw calendar."
> [View upcoming draws →]

### Guide: Free Entry (`content/guides/free-entry-car-competitions.mdx`)
Add `free-entry-car-competitions` already has `relatedSites` — add `/draws` as an inline link in the relevant paragraph about timing.

### Site review pages (`src/app/sites/[slug]/page.tsx`)
No changes needed — the `FreeEntryCard` already links to the guide. Site review pages are dense enough; a draws link would add noise without much value here.

---

## Sitemap

Add to `src/app/sitemap.ts`:

```ts
{
  url: `${SITE_URL}/draws`,
  lastModified: now,
  changeFrequency: 'hourly' as const,
  priority: 0.8,
},
```

---

## Metadata

```ts
export const metadata: Metadata = {
  title: 'Upcoming Car Competition Draw Dates',
  description: 'See every UK car competition draw in the next 14 days — sorted by date so you can plan your entries before they close.',
  alternates: { canonical: '/draws' },
};
```

---

## Non-goals

- No filtering on the draws page (cars only — filtering would dilute the planning focus)
- No countdown timers (client-side JS, adds complexity; "draws today/in N days" is sufficient)
- No prize types other than cars
- No draws beyond 14 days
- No iCal / calendar export
