# Competition Draw Calendar + Nav Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/draws` page listing all upcoming car competition draw dates in the next 14 days grouped by UK calendar date, pair it with a nav restructure that gives Draws top-level visibility, and add cross-links from the home page and two insights pages.

**Architecture:** Four tasks: (1) update the nav, (2) add a pure grouping utility with tests + DrawCard component, (3) build the server-rendered `/draws` page and add it to the sitemap, (4) add cross-links on home page and two insights pages. No new database tables; all data comes from existing `raffles` + `sites` tables via the typed Supabase client.

**Tech Stack:** Next.js 14 App Router (async server components), TypeScript, Tailwind CSS, Supabase (`createBrowserClient` from `@/lib/supabase`), `formatPence` from `@/lib/utils`, Vitest for unit tests, `next/link`, `lucide-react`.

## Global Constraints

- Money is stored in pence; always format with `formatPence` from `@/lib/utils` — never divide by 100 inline.
- Use `source_url` (not `url`) for the "Enter now" link — this is the actual field name on the `Raffle` type. The spec mistakenly says `raffle.url`; the real field is `source_url`.
- Use `formatPence` (not `formatCurrency`) — that is the correct export name from `@/lib/utils`.
- BOTB (`competition_model === 'spot_the_ball'`) must always be filtered out — it has no fixed draw date.
- No mock or hardcoded data — empty state if no draws available.
- No per-raffle generated pages — the "Enter now" button links directly to `raffle.source_url` (external, opens in new tab).
- 18+ framing and responsible gambling link must appear at the page footer.
- UK locale throughout: `en-GB` for display formatting, `Europe/London` timezone for all date grouping logic.
- `export const revalidate = 3600` on the `/draws` page.
- Progress bar colour thresholds (exact): `< 50%` → `bg-emerald-500`, `50–80%` → `bg-amber-400`, `> 80%` → `bg-red-500`.

---

### Task 1: Nav restructure

**Files:**
- Modify: `src/components/layout/header.tsx`

**Interfaces:**
- Produces: 6-item `NAV_ITEMS` array visible in all pages

- [ ] **Step 1: Read the current NAV_ITEMS**

  Read `src/components/layout/header.tsx` and locate the `NAV_ITEMS` constant. It currently has 9 items.

- [ ] **Step 2: Replace NAV_ITEMS with 6-item version**

  Find the `NAV_ITEMS` array in `src/components/layout/header.tsx` and replace it exactly with:

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

  Items being removed from the nav (pages still exist, just no longer top-level): `/raffles/cars`, `/raffles/cash`, `/raffles/tech`, `/competitions`. No other changes to `header.tsx`.

- [ ] **Step 3: Build verification**

  ```bash
  npm run build
  ```

  Expected: clean build. Next.js does not error on an `href="/draws"` pointing to a route that doesn't exist yet.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/layout/header.tsx
  git commit -m "feat: restructure nav to 6 items, add Draws link"
  ```

---

### Task 2: Grouping utility + DrawCard component

**Files:**
- Create: `src/lib/draws.ts`
- Create: `src/lib/__tests__/draws.test.ts`
- Create: `src/components/draws/draw-card.tsx`

**Interfaces:**
- Consumes: `Raffle` from `@/lib/types`, `Site` from `@/lib/types`, `formatPence` from `@/lib/utils`
- Produces:
  - `DrawGroup` interface: `{ label: string; isoDate: string; draws: Raffle[] }` (consumed by Task 3)
  - `groupDrawsByDate(draws: Raffle[], now?: Date): DrawGroup[]` (consumed by Task 3)
  - `DrawCard` component: `export function DrawCard({ raffle }: DrawCardProps)` (consumed by Task 3)
  - `DrawRaffle` type: `Raffle & { site: Pick<Site, 'id' | 'name' | 'slug' | 'affiliate_url' | 'competition_model'> }` — define this in `draw-card.tsx` and re-export for use in Task 3

- [ ] **Step 1: Write the failing tests**

  Create `src/lib/__tests__/draws.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { groupDrawsByDate } from '../draws';
  import type { Raffle } from '../types';

  const makeRaffle = (endDate: string | null, id = endDate ?? 'null') =>
    ({ id, end_date: endDate } as unknown as Raffle);

  describe('groupDrawsByDate', () => {
    it('groups two raffles on the same UK day into one group', () => {
      const now = new Date('2026-07-01T10:00:00Z');
      const draws = [
        makeRaffle('2026-07-01T18:00:00Z', 'r1'),
        makeRaffle('2026-07-01T20:00:00Z', 'r2'),
        makeRaffle('2026-07-02T14:00:00Z', 'r3'),
      ];
      const groups = groupDrawsByDate(draws, now);
      expect(groups).toHaveLength(2);
      expect(groups[0].draws).toHaveLength(2);
      expect(groups[1].draws).toHaveLength(1);
    });

    it('labels today\'s group "Today"', () => {
      const now = new Date('2026-07-01T10:00:00Z');
      const draws = [makeRaffle('2026-07-01T18:00:00Z')];
      const groups = groupDrawsByDate(draws, now);
      expect(groups[0].label).toBe('Today');
    });

    it('labels tomorrow\'s group "Tomorrow"', () => {
      const now = new Date('2026-07-01T10:00:00Z');
      const draws = [makeRaffle('2026-07-02T14:00:00Z')];
      const groups = groupDrawsByDate(draws, now);
      expect(groups[0].label).toBe('Tomorrow');
    });

    it('labels later dates with weekday and date, no year', () => {
      // 2026-07-03 is a Friday
      const now = new Date('2026-07-01T10:00:00Z');
      const draws = [makeRaffle('2026-07-03T18:00:00Z')];
      const groups = groupDrawsByDate(draws, now);
      expect(groups[0].label).toBe('Friday 3 July');
    });

    it('sorts groups chronologically', () => {
      const now = new Date('2026-07-01T10:00:00Z');
      const draws = [
        makeRaffle('2026-07-03T18:00:00Z', 'r1'),
        makeRaffle('2026-07-01T18:00:00Z', 'r2'),
      ];
      const groups = groupDrawsByDate(draws, now);
      expect(groups[0].label).toBe('Today');
      expect(groups[1].label).toBe('Friday 3 July');
    });

    it('skips raffles with null end_date', () => {
      const now = new Date('2026-07-01T10:00:00Z');
      expect(groupDrawsByDate([makeRaffle(null)], now)).toHaveLength(0);
    });

    it('returns empty array for empty input', () => {
      expect(groupDrawsByDate([], new Date())).toEqual([]);
    });

    it('groups by UK date, not UTC (BST timezone test)', () => {
      // 23:00 UTC on 2026-07-01 = 00:00 BST on 2026-07-02 → belongs to July 2
      const now = new Date('2026-07-01T10:00:00Z');
      const draws = [makeRaffle('2026-07-01T23:00:00Z')];
      const groups = groupDrawsByDate(draws, now);
      expect(groups[0].isoDate).toBe('2026-07-02');
      expect(groups[0].label).toBe('Tomorrow');
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  npx vitest run src/lib/__tests__/draws.test.ts
  ```

  Expected: fails with `Cannot find module '../draws'` or similar.

- [ ] **Step 3: Implement `src/lib/draws.ts`**

  ```ts
  import type { Raffle } from '@/lib/types';

  export interface DrawGroup {
    label: string;
    isoDate: string; // YYYY-MM-DD in Europe/London
    draws: Raffle[];
  }

  function toUKDateKey(date: Date): string {
    // en-CA locale formats as YYYY-MM-DD — reliable cross-platform
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  export function groupDrawsByDate(
    draws: Raffle[],
    now: Date = new Date()
  ): DrawGroup[] {
    const todayKey = toUKDateKey(now);
    // +24h to get the next calendar day in London time
    const tomorrowKey = toUKDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));

    const grouped = new Map<string, Raffle[]>();
    for (const draw of draws) {
      if (!draw.end_date) continue;
      const key = toUKDateKey(new Date(draw.end_date));
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(draw);
    }

    const dayFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, groupDraws]) => {
        let label: string;
        if (key === todayKey) {
          label = 'Today';
        } else if (key === tomorrowKey) {
          label = 'Tomorrow';
        } else {
          label = dayFormatter.format(new Date(groupDraws[0].end_date!));
        }
        return { label, isoDate: key, draws: groupDraws };
      });
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npx vitest run src/lib/__tests__/draws.test.ts
  ```

  Expected: 8/8 passing.

  If the BST timezone test fails, verify the test assumption: July 2026 is in BST (UTC+1), so `23:00 UTC = 00:00 BST = midnight = start of July 2`. If tests run in a timezone where `en-CA` + `Europe/London` isn't available in the Node.js ICU data, the key format may differ — check with `console.log(toUKDateKey(new Date('2026-07-01T10:00:00Z')))`.

- [ ] **Step 5: Create the `src/components/draws/` directory and `draw-card.tsx`**

  Create `src/components/draws/draw-card.tsx`:

  ```tsx
  import Link from 'next/link';
  import { ExternalLink } from 'lucide-react';
  import { formatPence } from '@/lib/utils';
  import type { Raffle, Site } from '@/lib/types';

  export type DrawRaffle = Raffle & {
    site: Pick<Site, 'id' | 'name' | 'slug' | 'affiliate_url' | 'competition_model'>;
  };

  interface DrawCardProps {
    raffle: DrawRaffle;
  }

  function getDrawUrgency(endDate: string): { text: string; className: string } | null {
    const diffMs = new Date(endDate).getTime() - Date.now();
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffDays < 0) return null;
    if (diffDays < 1) return { text: 'Draws today', className: 'text-red-600 font-semibold' };
    if (diffDays === 1) return { text: 'Draws tomorrow', className: 'text-amber-600 font-medium' };
    return { text: `Draws in ${diffDays} days`, className: 'text-slate-500' };
  }

  export function DrawCard({ raffle }: DrawCardProps) {
    const pct = raffle.percent_sold ?? 0;
    const barColor =
      pct < 50 ? 'bg-emerald-500' : pct < 80 ? 'bg-amber-400' : 'bg-red-500';

    const carTitle =
      raffle.car_year && raffle.car_make && raffle.car_model
        ? `${raffle.car_year} ${raffle.car_make} ${raffle.car_model}`
        : raffle.title;

    const urgency = raffle.end_date ? getDrawUrgency(raffle.end_date) : null;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/sites/${raffle.site.slug}`}
            className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-1 hover:bg-slate-200 transition-colors shrink-0"
          >
            {raffle.site.name}
          </Link>
          {urgency && (
            <span className={`text-xs text-right ${urgency.className}`}>
              {urgency.text}
            </span>
          )}
        </div>

        <div>
          <p className="font-semibold text-slate-900 leading-snug">{carTitle}</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">
            {formatPence(raffle.prize_value)}
          </p>
        </div>

        <p className="text-sm text-slate-500">
          {formatPence(raffle.ticket_price)} per ticket
        </p>

        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{pct}% sold</span>
            {raffle.total_tickets != null && (
              <span>
                {(raffle.tickets_sold ?? 0).toLocaleString()} /{' '}
                {raffle.total_tickets.toLocaleString()}
              </span>
            )}
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        <a
          href={raffle.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Enter now
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }
  ```

- [ ] **Step 6: Build verification**

  ```bash
  npm run build
  ```

  Expected: clean build. If TypeScript errors on `raffle.source_url`, check that `source_url` is in `src/lib/types.ts` on the `Raffle` interface — it should be `source_url: string`.

- [ ] **Step 7: Commit**

  ```bash
  git add src/lib/draws.ts src/lib/__tests__/draws.test.ts src/components/draws/draw-card.tsx
  git commit -m "feat: add draw grouping utility and DrawCard component"
  ```

---

### Task 3: `/draws` page + sitemap

**Files:**
- Create: `src/app/draws/page.tsx`
- Modify: `src/app/sitemap.ts`

**Interfaces:**
- Consumes:
  - `DrawGroup`, `groupDrawsByDate` from `@/lib/draws`
  - `DrawCard`, `DrawRaffle` from `@/components/draws/draw-card`
  - `createBrowserClient` from `@/lib/supabase`
  - `BreadcrumbJsonLd` from `@/components/json-ld`
  - `Raffle`, `Site` from `@/lib/types`
- Produces: `/draws` route — async server component, `revalidate = 3600`

- [ ] **Step 1: Create `src/app/draws/page.tsx`**

  ```tsx
  import type { Metadata } from 'next';
  import Link from 'next/link';
  import { createBrowserClient } from '@/lib/supabase';
  import { groupDrawsByDate } from '@/lib/draws';
  import { DrawCard } from '@/components/draws/draw-card';
  import type { DrawRaffle } from '@/components/draws/draw-card';
  import { BreadcrumbJsonLd } from '@/components/json-ld';

  export const revalidate = 3600;

  const SITE_URL = 'https://www.carraffleodds.com';

  export const metadata: Metadata = {
    title: 'Upcoming Car Competition Draw Dates',
    description:
      'See every UK car competition draw in the next 14 days — sorted by date so you can plan your entries before they close.',
    alternates: { canonical: '/draws' },
  };

  async function getUpcomingDraws(): Promise<DrawRaffle[]> {
    const supabase = createBrowserClient();
    const now = new Date().toISOString();
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('raffles')
      .select(
        'id, title, end_date, prize_value, ticket_price, percent_sold, total_tickets, tickets_sold, source_url, car_make, car_model, car_year, site:sites(id, name, slug, affiliate_url, competition_model)'
      )
      .eq('prize_type', 'car')
      .in('status', ['active', 'ending_soon'])
      .gt('end_date', now)
      .lte('end_date', twoWeeks)
      .order('end_date', { ascending: true });

    if (error) {
      console.error('draws: fetch failed', error);
      return [];
    }

    return ((data ?? []) as DrawRaffle[]).filter(
      (r) => r.site?.competition_model !== 'spot_the_ball'
    );
  }

  export default async function DrawsPage() {
    const draws = await getUpcomingDraws();
    const groups = groupDrawsByDate(draws);
    const todayGroup = groups.find((g) => g.label === 'Today');
    const otherGroups = groups.filter((g) => g.label !== 'Today');

    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <BreadcrumbJsonLd
          items={[
            { name: 'Home', url: SITE_URL },
            { name: 'Upcoming Draws', url: `${SITE_URL}/draws` },
          ]}
        />

        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
          Upcoming Car Draws
        </h1>
        <p className="text-slate-500 mb-10">
          {draws.length > 0
            ? `${draws.length} car draw${draws.length === 1 ? '' : 's'} in the next 14 days · Updated hourly`
            : 'Updated hourly'}
        </p>

        {draws.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium text-slate-700 mb-2">
              No car draws in the next 14 days
            </p>
            <p className="text-sm mb-6">
              New competitions are added hourly — check back soon.
            </p>
            <Link href="/raffles/cars" className="text-blue-600 hover:underline text-sm">
              Browse all active car competitions →
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {todayGroup && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
                <div className="flex items-center gap-2 mb-5">
                  <h2 className="text-lg font-bold text-amber-900">Today</h2>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                    Closing today — enter before midnight
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {todayGroup.draws.map((draw) => (
                    <DrawCard key={draw.id} raffle={draw as DrawRaffle} />
                  ))}
                </div>
              </div>
            )}

            {otherGroups.map((group) => (
              <section key={group.isoDate}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-bold text-slate-900">{group.label}</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {group.draws.length} draw{group.draws.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.draws.map((draw) => (
                    <DrawCard key={draw.id} raffle={draw as DrawRaffle} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-10 border-t border-slate-100 pt-6">
          18+ only. Draw dates are as listed by each operator and may change.{' '}
          <Link href="/responsible-gambling" className="hover:underline">
            Responsible gambling guidance
          </Link>
          .
        </p>
      </div>
    );
  }
  ```

- [ ] **Step 2: Add `/draws` to the sitemap**

  In `src/app/sitemap.ts`, add a new entry to `staticPages` after the `/ending-soon` entry (after line 32). Insert:

  ```ts
  {
    url: `${SITE_URL}/draws`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  },
  ```

- [ ] **Step 3: Build verification**

  ```bash
  npm run build
  ```

  Expected: clean build. The `/draws` route appears in the output. If TypeScript complains about `source_url` not being in the Supabase select result type, add `as DrawRaffle[]` cast after `data ?? []`.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/draws/page.tsx src/app/sitemap.ts
  git commit -m "feat: add /draws page with 14-day draw calendar and sitemap entry"
  ```

---

### Task 4: Cross-links

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/insights/best-time-to-enter/page.tsx`
- Modify: `src/app/insights/when-sites-release/page.tsx`

**Interfaces:**
- Consumes: `allRaffles` from `getHomeData()` return value (already contains `prize_type` via `select('*', ...)`)
- Produces: three new callouts/stat cards linking to `/draws`

- [ ] **Step 1: Home page — add `upcomingCarDrawCount` to `getHomeData`**

  In `src/app/page.tsx`, inside `getHomeData()`, find the `now` variable and the `endingSoon` computation (around line 57). After computing `carRaffleCount` (line 83), add:

  ```ts
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingCarDrawCount = allRaffles.filter(
    (r) => r.prize_type === 'car' && r.end_date && new Date(r.end_date) <= twoWeeks
  ).length;
  ```

  Then add `upcomingCarDrawCount` to the return object (after `carRaffleCount`):

  ```ts
  return {
    // ... existing fields ...
    carRaffleCount,
    upcomingCarDrawCount,
  };
  ```

  Note: `allRaffles` is filtered to `active` status only (not `ending_soon`), so this count may be slightly lower than the count on `/draws` — that's acceptable for a stat card approximation.

- [ ] **Step 2: Home page — destructure and add the stat card**

  In `src/app/page.tsx`, in `HomePage`, add `upcomingCarDrawCount` to the destructure of `getHomeData()` (around line 100–111):

  ```ts
  const {
    totalRaffles,
    totalSites,
    lowestOdds,
    featured,
    endingSoon,
    siteList,
    totalPrizeValuePounds,
    totalTicketsMonitored,
    lastUpdated,
    carRaffleCount,
    upcomingCarDrawCount,
  } = await getHomeData();
  ```

  Then find the stats bar grid around line 166:

  ```tsx
  <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:max-w-2xl">
  ```

  Change it to `sm:grid-cols-4` and remove the `col-span-2` from the 3rd card (Best Odds), then add the 4th card:

  ```tsx
  <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:max-w-2xl">
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
      <p className="text-3xl font-bold text-white tabular-nums">{totalRaffles}</p>
      <p className="mt-1 text-sm text-slate-400">Active Raffles</p>
    </div>
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
      <p className="text-3xl font-bold text-white tabular-nums">{totalSites}</p>
      <p className="mt-1 text-sm text-slate-400">Sites Tracked</p>
    </div>
    {lowestOdds && (
      <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
        <p className="text-3xl font-bold text-emerald-400 tabular-nums">
          1 in {lowestOdds.toLocaleString()}
        </p>
        <p className="mt-1 text-sm text-slate-400">Best Odds Available</p>
      </div>
    )}
    <Link
      href="/draws"
      className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm hover:bg-white/10 transition-colors"
    >
      <p className="text-3xl font-bold text-white tabular-nums">{upcomingCarDrawCount}</p>
      <p className="mt-1 text-sm text-slate-400">Draws This Fortnight</p>
    </Link>
  </div>
  ```

  The `col-span-2 sm:col-span-1` is removed from card 3 (Best Odds) since the grid is now 4-column on sm and 2-column on mobile — all cards will naturally be 1-column each at every breakpoint.

  Make sure `Link` is already imported at the top of `page.tsx` (it is — it's imported for hero CTAs).

- [ ] **Step 3: `best-time-to-enter` — add callout before methodology box**

  In `src/app/insights/best-time-to-enter/page.tsx`, find the methodology div at line ~71:

  ```tsx
  {/* Methodology */}
  <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-600 mt-10">
  ```

  Insert this immediately before it:

  ```tsx
  <div className="rounded-xl bg-blue-50 border border-blue-100 p-5 text-sm mt-8 mb-6">
    <p className="text-slate-700 mb-2">
      The last day sees the biggest rush. If you want to get in before the surge, check which
      car draws are coming up in the next fortnight.
    </p>
    <Link href="/draws" className="text-blue-600 font-medium hover:underline">
      View upcoming car draws →
    </Link>
  </div>
  ```

  `Link` is already imported at the top of this file.

- [ ] **Step 4: `when-sites-release` — add callout before methodology box**

  In `src/app/insights/when-sites-release/page.tsx`, find the methodology div at line ~67:

  ```tsx
  <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-600">
  ```

  Insert this immediately before it:

  ```tsx
  <div className="rounded-xl bg-blue-50 border border-blue-100 p-5 text-sm mb-6">
    <p className="text-slate-700 mb-2">
      Know when sites launch new competitions. For what&apos;s drawing soon, see the draw calendar.
    </p>
    <Link href="/draws" className="text-blue-600 font-medium hover:underline">
      View upcoming car draws →
    </Link>
  </div>
  ```

  `Link` is already imported at the top of this file.

- [ ] **Step 5: Build verification**

  ```bash
  npm run build
  ```

  Expected: clean build. The `upcomingCarDrawCount` stat card will show `0` if no active car raffles have `end_date` within 14 days — that's correct data-driven behaviour.

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/page.tsx src/app/insights/best-time-to-enter/page.tsx src/app/insights/when-sites-release/page.tsx
  git commit -m "feat: add /draws cross-links on home page and insights pages"
  ```

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| NAV_ITEMS updated to 6 items with Draws | Task 1 |
| Draws grouped by UK calendar date | Task 2 |
| Labels: Today / Tomorrow / weekday+date | Task 2 |
| DrawCard: car title, site badge, prize value, ticket price | Task 2 |
| DrawCard: progress bar with correct colour thresholds | Task 2 |
| DrawCard: "Enter now" links to `source_url` | Task 2 |
| `/draws` page, async server component | Task 3 |
| Amber-tinted Today section with urgency label | Task 3 |
| Date group headers with draw count badge | Task 3 |
| Empty state with browse link | Task 3 |
| BOTB (`spot_the_ball`) filtered out | Task 3 |
| `revalidate = 3600` | Task 3 |
| Metadata + canonical | Task 3 |
| BreadcrumbJsonLd | Task 3 |
| `/draws` added to sitemap at priority 0.8, hourly | Task 3 |
| 18+/responsible gambling footer | Task 3 |
| Home page cross-link stat card | Task 4 |
| best-time-to-enter cross-link callout | Task 4 |
| when-sites-release cross-link callout | Task 4 |
