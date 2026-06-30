# Free Entry Guide — Per-Site Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded address table in the free entry guide with a live TS-config-backed component, and surface the same per-site free entry details on each site review page.

**Architecture:** A typed TS config (`src/lib/free-entry.ts`) is the single source of truth for per-site free entry data. Two components read from it: `FreeEntrySitesTable` renders all sites in the guide page via MDXRemote's `components` prop; `FreeEntryCard` renders a single site's details in each site review page after the existing `RaffleWidget`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, next-mdx-remote/rsc, Vitest

## Global Constraints

- No mock or hardcoded raffle data — static config for free entry details is permitted
- Vocabulary: "site" not "operator"; "raffle" not "competition" in code and routes
- All components use Tailwind; no inline styles
- `FreeEntrySite.lastVerified` format is always `'YYYY-MM'` (e.g. `'2026-06'`)
- BOTB has `isFreeEntryAvailable: false` — render exemption note, not address
- Slug values must exactly match review MDX filenames: `elite-competitions`, `rev-comps`, `dream-car-giveaways`, `click-competitions`, `lucky-day`, `7-days-performance`, `llf-games`, `botb`
- Human review gate: verify all postal addresses against each site's current T&Cs before deploying to production

---

### Task 1: Data layer — `src/lib/free-entry.ts`

**Files:**
- Create: `src/lib/free-entry.ts`
- Create: `src/lib/__tests__/free-entry.test.ts`

**Interfaces:**
- Produces: `FreeEntrySite` interface, `FREE_ENTRY_SITES: FreeEntrySite[]`, `getFreeEntryForSite(slug: string): FreeEntrySite | undefined`, `formatVerified(yyyyMm: string): string`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/free-entry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getFreeEntryForSite, FREE_ENTRY_SITES, formatVerified } from '../free-entry';

describe('getFreeEntryForSite', () => {
  it('returns the correct site for a known slug', () => {
    const site = getFreeEntryForSite('rev-comps');
    expect(site).toBeDefined();
    expect(site?.siteName).toBe('Rev Comps');
  });

  it('returns undefined for an unknown slug', () => {
    expect(getFreeEntryForSite('unknown-site')).toBeUndefined();
  });

  it('returns BOTB with isFreeEntryAvailable false', () => {
    const botb = getFreeEntryForSite('botb');
    expect(botb?.isFreeEntryAvailable).toBe(false);
  });
});

describe('FREE_ENTRY_SITES', () => {
  it('has an entry for all 8 tracked sites', () => {
    const slugs = FREE_ENTRY_SITES.map(s => s.siteSlug);
    expect(slugs).toContain('elite-competitions');
    expect(slugs).toContain('rev-comps');
    expect(slugs).toContain('dream-car-giveaways');
    expect(slugs).toContain('click-competitions');
    expect(slugs).toContain('lucky-day');
    expect(slugs).toContain('7-days-performance');
    expect(slugs).toContain('llf-games');
    expect(slugs).toContain('botb');
  });

  it('all entries have a lastVerified date in YYYY-MM format', () => {
    for (const site of FREE_ENTRY_SITES) {
      expect(site.lastVerified).toMatch(/^\d{4}-\d{2}$/);
    }
  });
});

describe('formatVerified', () => {
  it('formats YYYY-MM as "Month YYYY" in en-GB locale', () => {
    expect(formatVerified('2026-06')).toBe('June 2026');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- free-entry
```

Expected: failures — `free-entry` module not found.

- [ ] **Step 3: Implement `src/lib/free-entry.ts`**

```ts
export interface FreeEntrySite {
  siteSlug: string;
  siteName: string;
  isFreeEntryAvailable: boolean;
  postalAddress: string | null;
  entryDeadlineDays: number | null;
  skillQuestionFormat: string | null;
  emailEntry: boolean;
  lastVerified: string; // 'YYYY-MM'
  notes: string | null;
}

export const FREE_ENTRY_SITES: FreeEntrySite[] = [
  {
    siteSlug: 'elite-competitions',
    siteName: 'Elite Competitions',
    isFreeEntryAvailable: true,
    postalAddress: 'Unit 6, 7 & 8 Turing Court, Hawking Place, Bispham, Blackpool, FY2 0QW',
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    emailEntry: false,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: 'rev-comps',
    siteName: 'Rev Comps',
    isFreeEntryAvailable: true,
    postalAddress: 'Northfield House, Shurdington Road, Bentham, Cheltenham, GL51 4UA',
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    emailEntry: false,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: 'dream-car-giveaways',
    siteName: 'Dream Car Giveaways',
    isFreeEntryAvailable: true,
    postalAddress: 'DCG Ltd, PO Box 2050, Pershore, WR10 9FA',
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    emailEntry: false,
    lastVerified: '2026-06',
    notes: 'Allows multiple entries per stamp on a sliding scale — cheaper competitions give more entries per stamp. Check T&Cs for the current scale.',
  },
  {
    siteSlug: 'click-competitions',
    siteName: 'Click Competitions',
    isFreeEntryAvailable: true,
    postalAddress: null,
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    emailEntry: false,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: 'lucky-day',
    siteName: 'Lucky Day Competitions',
    isFreeEntryAvailable: true,
    postalAddress: '72 Tievecrom Road, Forkhill, Newry, Co. Down, BT35 9RX',
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    emailEntry: false,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: '7-days-performance',
    siteName: '7 Days Performance',
    isFreeEntryAvailable: true,
    postalAddress: null,
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    emailEntry: false,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: 'llf-games',
    siteName: 'LLF Games',
    isFreeEntryAvailable: true,
    postalAddress: 'LLF Games Ltd, Tayfield House, 38 Poole Road, Westbourne, Bournemouth, BH4 9DW',
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    emailEntry: false,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: 'botb',
    siteName: 'BOTB',
    isFreeEntryAvailable: false,
    postalAddress: null,
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    emailEntry: false,
    lastVerified: '2026-06',
    notes: "BOTB's Spot the Ball is a skill competition. It operates under the prize competition exemption rather than prize draw rules, so the free entry requirement doesn't apply. No postal entry is available.",
  },
];

export function getFreeEntryForSite(slug: string): FreeEntrySite | undefined {
  return FREE_ENTRY_SITES.find(s => s.siteSlug === slug);
}

export function formatVerified(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-').map(Number);
  return new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- free-entry
```

Expected: 7 tests passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/free-entry.ts src/lib/__tests__/free-entry.test.ts
git commit -m "feat: add free-entry data config and helpers"
```

---

### Task 2: Guide component + guide page wiring

**Files:**
- Create: `src/components/free-entry-sites-table.tsx`
- Modify: `src/app/guides/[slug]/page.tsx` — add `FreeEntrySitesTable` import and pass it to `MDXRemote` `components` prop
- Modify: `content/guides/free-entry-car-competitions.mdx` — replace hardcoded address table with `<FreeEntrySitesTable />`

**Interfaces:**
- Consumes: `FREE_ENTRY_SITES`, `formatVerified` from `@/lib/free-entry`
- Produces: `FreeEntrySitesTable` (no props) — referenced by name in MDX

- [ ] **Step 1: Create `src/components/free-entry-sites-table.tsx`**

```tsx
import Link from 'next/link';
import { FREE_ENTRY_SITES, formatVerified } from '@/lib/free-entry';

export function FreeEntrySitesTable() {
  const sites = FREE_ENTRY_SITES.filter(s => s.isFreeEntryAvailable);

  return (
    <div className="not-prose mt-4 space-y-3">
      {sites.map(site => (
        <div key={site.siteSlug} className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={`/sites/${site.siteSlug}`}
                className="font-semibold text-slate-900 hover:text-blue-600 text-sm"
              >
                {site.siteName}
              </Link>
              <p className="text-sm text-slate-600 mt-1 break-words">
                {site.postalAddress ?? (
                  <span className="italic text-slate-400">
                    Address not confirmed — check current T&amp;Cs
                  </span>
                )}
              </p>
            </div>
            <span className="shrink-0 text-xs text-slate-400 whitespace-nowrap">
              Verified {formatVerified(site.lastVerified)}
            </span>
          </div>
          {(site.entryDeadlineDays !== null || site.skillQuestionFormat || site.notes) && (
            <dl className="mt-3 space-y-1 text-xs text-slate-500">
              {site.entryDeadlineDays !== null && (
                <div className="flex gap-2">
                  <dt className="font-medium shrink-0">Deadline:</dt>
                  <dd>
                    {site.entryDeadlineDays} day{site.entryDeadlineDays !== 1 ? 's' : ''} before draw
                  </dd>
                </div>
              )}
              {site.skillQuestionFormat && (
                <div className="flex gap-2">
                  <dt className="font-medium shrink-0">Skill question:</dt>
                  <dd>{site.skillQuestionFormat}</dd>
                </div>
              )}
              {site.notes && (
                <div className="flex gap-2">
                  <dt className="font-medium shrink-0">Notes:</dt>
                  <dd>{site.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      ))}
      <p className="text-xs text-slate-400 mt-2">
        BOTB&apos;s Spot the Ball is a skill competition — the free entry requirement does not apply.
        Always verify addresses against each site&apos;s current T&amp;Cs before posting.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app/guides/[slug]/page.tsx`**

Add import near the top of the file alongside the other component imports:

```tsx
import { FreeEntrySitesTable } from '@/components/free-entry-sites-table';
```

Change the `MDXRemote` call on line 76 from:

```tsx
<MDXRemote source={content} />
```

to:

```tsx
<MDXRemote source={content} components={{ FreeEntrySitesTable }} />
```

- [ ] **Step 3: Update `content/guides/free-entry-car-competitions.mdx`**

Replace lines 52–66 (the "## Postal addresses" section through and including the trailing "Always verify..." paragraph) with:

```mdx
## Postal addresses — verify before sending

<FreeEntrySitesTable />
```

The section immediately before should be the end of the "How to write a postal entry" section, and immediately after should be `## What happens to your entry`. The result:

```
...check the T&Cs.

**Do not send cash, cheques, or payment of any kind.** The postal entry is a free entry — payment alongside it would change the legal structure.

## Postal addresses — verify before sending

<FreeEntrySitesTable />

## What happens to your entry
```

- [ ] **Step 4: Verify the build passes**

```bash
npm run build
```

Expected: Builds cleanly. No TypeScript errors. MDXRemote compiles the `<FreeEntrySitesTable />` tag using the injected component.

- [ ] **Step 5: Commit**

```bash
git add src/components/free-entry-sites-table.tsx src/app/guides/[slug]/page.tsx content/guides/free-entry-car-competitions.mdx
git commit -m "feat: replace guide address table with FreeEntrySitesTable component"
```

---

### Task 3: Site review component + review page wiring

**Files:**
- Create: `src/components/free-entry-card.tsx`
- Modify: `src/app/sites/[slug]/page.tsx` — add import + `<FreeEntryCard siteSlug={meta.slug} />` after `<RaffleWidget>`

**Interfaces:**
- Consumes: `getFreeEntryForSite`, `formatVerified` from `@/lib/free-entry`
- Props: `{ siteSlug: string }`

- [ ] **Step 1: Create `src/components/free-entry-card.tsx`**

```tsx
import Link from 'next/link';
import { getFreeEntryForSite, formatVerified } from '@/lib/free-entry';

interface FreeEntryCardProps {
  siteSlug: string;
}

export function FreeEntryCard({ siteSlug }: FreeEntryCardProps) {
  const site = getFreeEntryForSite(siteSlug);
  if (!site) return null;

  if (!site.isFreeEntryAvailable) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Free entry</h2>
        <div className="rounded-xl border border-slate-200 p-5 text-sm text-slate-600">
          <p>{site.notes}</p>
          <p className="mt-3 text-xs text-slate-400">
            <Link href="/guides/free-entry-car-competitions" className="hover:underline">
              How free entry works at other sites →
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Free entry</h2>
      <div className="rounded-xl border border-slate-200 p-5 text-sm">
        <p className="text-slate-600 mb-4">
          You can enter by post for free — equal odds to paid tickets. Send a handwritten postcard
          or plain paper in an envelope with your name, address, phone number, email, the
          competition name, and the answer to the skill question where applicable.
        </p>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Postal address
            </dt>
            <dd className="text-slate-800">
              {site.postalAddress ?? (
                <span className="italic text-slate-400">
                  Verify against current T&amp;Cs before posting
                </span>
              )}
            </dd>
          </div>
          {site.entryDeadlineDays !== null && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Entry deadline
              </dt>
              <dd className="text-slate-800">
                {site.entryDeadlineDays} day{site.entryDeadlineDays !== 1 ? 's' : ''} before draw close
              </dd>
            </div>
          )}
          {site.skillQuestionFormat && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Skill question
              </dt>
              <dd className="text-slate-800">{site.skillQuestionFormat}</dd>
            </div>
          )}
          {site.notes && (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                Notes
              </dt>
              <dd className="text-slate-800">{site.notes}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
          Verified {formatVerified(site.lastVerified)} · Always check current T&amp;Cs before posting.{' '}
          <Link href="/guides/free-entry-car-competitions" className="hover:underline">
            Full free entry guide →
          </Link>
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Update `src/app/sites/[slug]/page.tsx`**

Add import alongside the other component imports at the top:

```tsx
import { FreeEntryCard } from '@/components/free-entry-card';
```

After the `<RaffleWidget siteSlug={meta.slug} />` line (currently line 120), add:

```tsx
{/* Free entry details */}
<FreeEntryCard siteSlug={meta.slug} />
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: Builds cleanly with no TypeScript errors across all 8 site review pages.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: All tests pass including the `free-entry` suite from Task 1.

- [ ] **Step 5: Commit**

```bash
git add src/components/free-entry-card.tsx src/app/sites/[slug]/page.tsx
git commit -m "feat: add FreeEntryCard to site review pages"
```
