# CON-1 + CON-6: Site Review Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/sites` and `/sites/[slug]` pages for all 8 tracked car raffle operators, with MDX-based human-written prose, a live raffle widget (top 5 ending soonest), ownership disclosures, a "Sites" nav link, and a `/about-our-reviews` methodology page.

**Architecture:** MDX files in `content/reviews/` hold typed frontmatter + prose body; `next-mdx-remote/rsc` compiles them at build time (SSG/ISR). The only runtime Supabase call is the raffle widget on each review page — a server component fetching the top 5 raffles for that site ordered by `end_date ASC`. No per-raffle pages are created; all raffle CTAs link out to the operator's site via `source_url`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, `next-mdx-remote` (new install), `@supabase/supabase-js` (existing), `gray-matter` (new install for frontmatter parsing in the listing page).

## Global Constraints

- Money stored as integer pence in DB; format to £ only at display layer — use existing `formatPence()` from `src/lib/utils.ts`
- No mock or hardcoded raffle data ever — if Supabase returns zero raffles, show empty state
- No per-raffle generated pages — every raffle CTA links to `raffle.source_url` (the operator's site)
- No editorial quality ranking on the `/sites` listing — sorted by `yearsEstablished` ascending (oldest first)
- MDX prose stubs are clearly marked `[DRAFT — HUMAN REVIEW REQUIRED]`; no prose is auto-generated
- All new routes use SSR/ISR server components; no client components except where interaction is required
- `revalidate = 60` on review pages (live widget needs fresh data); `/sites` listing is fully static
- Vocabulary: use "site" for operator, "raffle" for individual competition — no synonyms in code or UI
- SITE_URL constant: `'https://www.carraffleodds.com'` — match existing usage

---

## File Map

**New files to create:**

| File | Purpose |
|------|---------|
| `content/reviews/botb.mdx` | BOTB review prose + frontmatter |
| `content/reviews/elite-competitions.mdx` | Elite Competitions review |
| `content/reviews/llf-games.mdx` | LLF Games review |
| `content/reviews/7-days-performance.mdx` | 7 Days Performance review |
| `content/reviews/dream-car-giveaways.mdx` | Dream Car Giveaways review |
| `content/reviews/rev-comps.mdx` | Rev Comps review |
| `content/reviews/lucky-day.mdx` | Lucky Day Competitions review |
| `content/reviews/click-competitions.mdx` | Click Competitions review |
| `src/lib/reviews.ts` | MDX loader: reads files, parses frontmatter, exports typed `SiteReviewMeta` |
| `src/components/sites/RaffleWidget.tsx` | Server component: fetches + renders top 5 raffles for a site |
| `src/components/sites/SiteCard.tsx` | Card for `/sites` listing grid |
| `src/app/sites/page.tsx` | `/sites` listing — static, no Supabase |
| `src/app/sites/[slug]/page.tsx` | `/sites/[slug]` review page — ISR, one Supabase call |
| `src/components/json-ld.tsx` | **Modified** — add `ReviewJsonLd` export |
| `src/app/about-our-reviews/page.tsx` | `/about-our-reviews` methodology page (CON-6) |

**Modified files:**

| File | Change |
|------|--------|
| `src/components/layout/header.tsx` | Add "Sites" nav item |
| `src/components/layout/footer.tsx` | Add "Sites" and "About Our Reviews" links |
| `package.json` | Add `next-mdx-remote`, `gray-matter` |

---

## Task 1: Install dependencies + MDX loader

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/lib/reviews.ts`
- Create: `content/reviews/` (directory + 8 stub MDX files)

**Interfaces:**
- Produces:
  ```typescript
  // src/lib/reviews.ts
  export interface SiteReviewMeta {
    name: string
    slug: string
    trustpilotScore: number
    trustpilotCount: string
    yearsEstablished: number
    companiesHouseNumber: string
    voluntaryCode: boolean
    parentCompany?: string
    parentSiblings?: string[]
    logoUrl: string
    affiliateUrl: string
    tagline: string
    metaDescription: string
  }

  export interface SiteReview {
    meta: SiteReviewMeta
    content: string // raw MDX body for next-mdx-remote
  }

  export async function getAllReviews(): Promise<SiteReview[]>
  export async function getReview(slug: string): Promise<SiteReview | null>
  export function getAllSlugs(): string[]
  ```

- [ ] **Step 1: Install packages**

```bash
cd /path/to/project
npm install next-mdx-remote gray-matter
```

Expected output: package-lock.json updated, no errors.

- [ ] **Step 2: Create `content/reviews/` directory and 8 stub MDX files**

Create `content/reviews/botb.mdx`:

```mdx
---
name: "Best of the Best"
slug: "botb"
trustpilotScore: 4.9
trustpilotCount: "10,000+"
yearsEstablished: 1999
companiesHouseNumber: "03755182"
voluntaryCode: true
parentCompany: "Winvia Entertainment PLC"
parentSiblings: ["click-competitions", "rev-comps"]
logoUrl: "https://cdn.botb.com/images/logo.png"
affiliateUrl: "https://www.botb.com"
tagline: "The UK's longest-running car competition — Spot the Ball since 1999."
metaDescription: "Honest review of BOTB (Best of the Best): how Spot the Ball works, odds, prizes, and what to watch out for. Updated 2026."
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a placeholder. The prose below has not been written or approved for publication. Do not index or share this page until the content has been completed and reviewed.

BOTB has been running car competitions longer than any other UK operator. Founded in 1999, originally in airports, now fully online. Their flagship product — Spot the Ball — is a skill-based competition, not a random draw.

<!-- TODO: Human author to complete this review using docs/research/botb.md -->
```

Create `content/reviews/elite-competitions.mdx`:

```mdx
---
name: "Elite Competitions"
slug: "elite-competitions"
trustpilotScore: 4.0
trustpilotCount: "15,800+"
yearsEstablished: 2006
companiesHouseNumber: "05775614"
voluntaryCode: false
logoUrl: ""
affiliateUrl: "https://www.elitecompetitions.co.uk"
tagline: "Fixed-odds draws with live Tuesday, Wednesday, and Friday results."
metaDescription: "Honest review of Elite Competitions: how it works, Trustpilot rating, draw schedule, and what to consider before entering. Updated 2026."
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a placeholder. The prose below has not been written or approved for publication. Do not index or share this page until the content has been completed and reviewed.

Elite Competitions has been running since 2006. Trustpilot score of 4 stars from 15,800+ reviews. Draws run on Tuesdays, Wednesdays, and Fridays at 9PM.

<!-- TODO: Human author to complete this review using docs/research/elite-competitions.md -->
```

Create `content/reviews/llf-games.mdx`:

```mdx
---
name: "LLF Games"
slug: "llf-games"
trustpilotScore: 4.9
trustpilotCount: "1,187+"
yearsEstablished: 2008
companiesHouseNumber: "06477563"
voluntaryCode: false
logoUrl: ""
affiliateUrl: "https://www.llfgames.com"
tagline: "Rare, modified, and classic car competitions — connected to the Living Life Fast YouTube channel."
metaDescription: "Honest review of LLF Games: rare and modified car competitions, how draws work, trust signals, and concerns to be aware of. Updated 2026."
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a placeholder. The prose below has not been written or approved for publication. Do not index or share this page until the content has been completed and reviewed.

LLF Games specialises in rare, modified, and classic cars — a niche that no other UK competition site covers in the same depth.

<!-- TODO: Human author to complete this review using docs/research/llf-games.md -->
```

Create `content/reviews/7-days-performance.mdx`:

```mdx
---
name: "7 Days Performance"
slug: "7-days-performance"
trustpilotScore: 4.6
trustpilotCount: "4,200+"
yearsEstablished: 2018
companiesHouseNumber: "11215119"
voluntaryCode: true
logoUrl: ""
affiliateUrl: "https://www.7daysperformance.co.uk"
tagline: "Performance and supercar competitions with a live Monday 8PM draw every week."
metaDescription: "Honest review of 7 Days Performance: how competitions work, Monday draws, prize range, trust signals, and things to consider. Updated 2026."
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a placeholder. The prose below has not been written or approved for publication. Do not index or share this page until the content has been completed and reviewed.

7 Days Performance has run weekly draws every Monday at 8PM since 2018. They focus on performance cars — BMWs, Audis, supercars — and guarantee a winner every week.

<!-- TODO: Human author to complete this review using docs/research/7-days-performance.md -->
```

Create `content/reviews/dream-car-giveaways.mdx`:

```mdx
---
name: "Dream Car Giveaways"
slug: "dream-car-giveaways"
trustpilotScore: 4.0
trustpilotCount: "8,200+"
yearsEstablished: 2018
companiesHouseNumber: "11320154"
voluntaryCode: true
parentCompany: "Jumbo Interactive"
logoUrl: ""
affiliateUrl: "https://www.dreamcargiveaways.co.uk"
tagline: "One of the UK's largest competition platforms, now part of ASX-listed Jumbo Interactive."
metaDescription: "Honest review of Dream Car Giveaways: how competitions work, prize range, Jumbo Interactive ownership, trust signals, and concerns. Updated 2026."
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a placeholder. The prose below has not been written or approved for publication. Do not index or share this page until the content has been completed and reviewed.

Dream Car Giveaways was founded in 2018 by Marcus Hickling and the Andrews brothers, all automotive enthusiasts. In October 2025 it was acquired by Jumbo Interactive, an ASX-listed Australian company, for approximately £53.9 million.

<!-- TODO: Human author to complete this review using docs/research/dream-car-giveaways.md -->
```

Create `content/reviews/rev-comps.mdx`:

```mdx
---
name: "Rev Comps"
slug: "rev-comps"
trustpilotScore: 4.85
trustpilotCount: "8,500+"
yearsEstablished: 2019
companiesHouseNumber: "11981806"
voluntaryCode: false
parentCompany: "Winvia Entertainment PLC"
parentSiblings: ["botb", "click-competitions"]
logoUrl: ""
affiliateUrl: "https://www.revcomps.com"
tagline: "Family-run competitions with live ball-machine draws on Mondays and Thursdays."
metaDescription: "Honest review of Rev Comps: ball machine draws, 6,300+ vehicle winners, prize range, Winvia acquisition, and concerns. Updated 2026."
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a placeholder. The prose below has not been written or approved for publication. Do not index or share this page until the content has been completed and reviewed.

Rev Comps was founded in 2019 by Peter and Robert Savage (father and son) in Paignton, Devon. They're being acquired by Winvia Entertainment PLC for £11.8 million, with completion expected around July 2026.

<!-- TODO: Human author to complete this review using docs/research/rev-comps.md -->
```

Create `content/reviews/lucky-day.mdx`:

```mdx
---
name: "Lucky Day Competitions"
slug: "lucky-day"
trustpilotScore: 4.0
trustpilotCount: "3,330+"
yearsEstablished: 2019
companiesHouseNumber: "NI659574"
voluntaryCode: false
logoUrl: ""
affiliateUrl: "https://www.luckydaycompetitions.com"
tagline: "Northern Ireland-based competitions known for agricultural prizes and live Facebook draws."
metaDescription: "Honest review of Lucky Day Competitions: how draws work, agricultural prize niche, trust signals, and things to consider. Updated 2026."
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a placeholder. The prose below has not been written or approved for publication. Do not index or share this page until the content has been completed and reviewed.

Lucky Day Competitions is run by Ace Competitions Limited, incorporated in Northern Ireland in 2019. They're notable for agricultural and farming equipment prizes — a niche no other tracked site covers.

<!-- TODO: Human author to complete this review using docs/research/lucky-day-competitions.md -->
```

Create `content/reviews/click-competitions.mdx`:

```mdx
---
name: "Click Competitions"
slug: "click-competitions"
trustpilotScore: 4.75
trustpilotCount: "4,463+"
yearsEstablished: 2020
companiesHouseNumber: "12550861"
voluntaryCode: false
parentCompany: "Winvia Entertainment PLC"
parentSiblings: ["botb", "rev-comps"]
logoUrl: ""
affiliateUrl: "https://www.clickcompetitions.co.uk"
tagline: "Affordable tickets, fast payouts, and live draws on Tuesdays, Wednesdays, and Saturdays."
metaDescription: "Honest review of Click Competitions: how draws work, ticket prices, Winvia ownership, Trustpilot rating, and what to consider. Updated 2026."
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a placeholder. The prose below has not been written or approved for publication. Do not index or share this page until the content has been completed and reviewed.

Click Competitions launched in 2020 and was acquired by Winvia Entertainment PLC in April 2025, joining BOTB under the same public company umbrella.

<!-- TODO: Human author to complete this review using docs/research/click-competitions.md -->
```

- [ ] **Step 3: Create `src/lib/reviews.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const REVIEWS_DIR = path.join(process.cwd(), 'content/reviews');

export interface SiteReviewMeta {
  name: string;
  slug: string;
  trustpilotScore: number;
  trustpilotCount: string;
  yearsEstablished: number;
  companiesHouseNumber: string;
  voluntaryCode: boolean;
  parentCompany?: string;
  parentSiblings?: string[];
  logoUrl: string;
  affiliateUrl: string;
  tagline: string;
  metaDescription: string;
}

export interface SiteReview {
  meta: SiteReviewMeta;
  content: string;
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(REVIEWS_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace('.mdx', ''));
}

export function getReview(slug: string): SiteReview | null {
  const filePath = path.join(REVIEWS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { meta: data as SiteReviewMeta, content };
}

export function getAllReviews(): SiteReview[] {
  return getAllSlugs()
    .map((slug) => getReview(slug))
    .filter((r): r is SiteReview => r !== null)
    .sort((a, b) => a.meta.yearsEstablished - b.meta.yearsEstablished);
}
```

- [ ] **Step 4: Verify the loader works**

```bash
node -e "
const matter = require('gray-matter');
const fs = require('fs');
const raw = fs.readFileSync('content/reviews/botb.mdx', 'utf8');
const { data } = matter(raw);
console.log(data.name, data.slug, data.yearsEstablished);
"
```

Expected output: `Best of the Best botb 1999`

- [ ] **Step 5: Commit**

```bash
git add content/reviews/ src/lib/reviews.ts package.json package-lock.json
git commit -m "feat: add MDX review stubs and typed loader (CON-1 task 1)"
```

---

## Task 2: `RaffleWidget` server component

**Files:**
- Create: `src/components/sites/RaffleWidget.tsx`

**Interfaces:**
- Consumes:
  - `createBrowserClient()` from `src/lib/supabase.ts`
  - `Raffle` type from `src/lib/types.ts`
  - `formatPence`, `formatOdds` from `src/lib/utils.ts`
  - `RaffleCard` from `src/components/raffle-card.tsx` — reuse directly; props: `{ raffle: Raffle }`
- Produces:
  ```typescript
  // src/components/sites/RaffleWidget.tsx
  export async function RaffleWidget({ siteSlug }: { siteSlug: string }): Promise<JSX.Element>
  ```

- [ ] **Step 1: Create `src/components/sites/` directory and `RaffleWidget.tsx`**

```tsx
// src/components/sites/RaffleWidget.tsx
import { createBrowserClient } from '@/lib/supabase';
import { RaffleCard } from '@/components/raffle-card';
import type { Raffle } from '@/lib/types';

interface RaffleWidgetProps {
  siteSlug: string;
}

async function getLiveRaffles(siteSlug: string): Promise<Raffle[]> {
  const supabase = createBrowserClient();

  const { data: siteRow } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', siteSlug)
    .single();

  if (!siteRow) return [];

  const { data: raffles } = await supabase
    .from('raffles')
    .select('*, site:sites(id, name, slug, url, logo_url, trust_score, trustpilot_rating, trustpilot_reviews, affiliate_url, competition_model, has_affiliate, active, created_at, updated_at)')
    .eq('site_id', siteRow.id)
    .in('status', ['active', 'ending_soon'])
    .order('end_date', { ascending: true })
    .limit(5);

  return (raffles ?? []) as Raffle[];
}

export async function RaffleWidget({ siteSlug }: RaffleWidgetProps) {
  const raffles = await getLiveRaffles(siteSlug);

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Live Competitions</h2>
      {raffles.length === 0 ? (
        <p className="text-slate-500 text-sm border border-slate-200 rounded-xl p-6 text-center">
          No live competitions right now — check back soon.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {raffles.map((raffle) => (
            <RaffleCard key={raffle.id} raffle={raffle} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Check TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors related to `RaffleWidget.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/sites/RaffleWidget.tsx
git commit -m "feat: add RaffleWidget server component — top 5 live raffles by site (CON-1 task 2)"
```

---

## Task 3: `SiteCard` component + `/sites` listing page

**Files:**
- Create: `src/components/sites/SiteCard.tsx`
- Create: `src/app/sites/page.tsx`

**Interfaces:**
- Consumes:
  - `SiteReviewMeta`, `getAllReviews()` from `src/lib/reviews.ts`
- Produces:
  ```typescript
  // SiteCard props
  interface SiteCardProps { meta: SiteReviewMeta }
  export function SiteCard({ meta }: SiteCardProps): JSX.Element

  // /sites page: server component, no props
  export default async function SitesPage(): Promise<JSX.Element>
  ```

- [ ] **Step 1: Create `src/components/sites/SiteCard.tsx`**

```tsx
// src/components/sites/SiteCard.tsx
import Link from 'next/link';
import { ExternalLink, Star } from 'lucide-react';
import type { SiteReviewMeta } from '@/lib/reviews';

interface SiteCardProps {
  meta: SiteReviewMeta;
}

export function SiteCard({ meta }: SiteCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <p className="text-xs text-slate-400 mb-1">Est. {meta.yearsEstablished}</p>
        <h2 className="text-lg font-semibold text-slate-900 leading-snug">{meta.name}</h2>
        <p className="text-sm text-slate-500 mt-1">{meta.tagline}</p>
      </div>

      {/* Trust signals */}
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1 text-amber-600 font-medium">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {meta.trustpilotScore.toFixed(1)}
        </span>
        <span className="text-slate-400 text-xs">{meta.trustpilotCount} reviews</span>
        {meta.voluntaryCode && (
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
            Voluntary Code
          </span>
        )}
      </div>

      {/* CTA */}
      <div className="mt-auto flex gap-2">
        <Link
          href={`/sites/${meta.slug}`}
          className="flex-1 text-center text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-100 transition-colors"
        >
          Read review →
        </Link>
        <a
          href={meta.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-slate-500 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors"
          aria-label={`Visit ${meta.name}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/sites/page.tsx`**

```tsx
// src/app/sites/page.tsx
import type { Metadata } from 'next';
import { getAllReviews } from '@/lib/reviews';
import { SiteCard } from '@/components/sites/SiteCard';
import { BreadcrumbJsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'UK Car Raffle Sites — Operator Reviews & Comparisons',
  description:
    'Independent reviews of every major UK car raffle and competition site. We cover Trustpilot ratings, how draws work, ownership, and what to watch out for.',
  alternates: {
    canonical: '/sites',
  },
};

export default function SitesPage() {
  const reviews = getAllReviews(); // sorted by yearsEstablished ASC

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://www.carraffleodds.com' },
          { name: 'Sites', url: 'https://www.carraffleodds.com/sites' },
        ]}
      />

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          UK Car Raffle Sites
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          Independent reviews of every major UK car competition operator — how they work, what
          real entrants say, and what to consider before buying tickets.
        </p>
        <p className="text-sm text-slate-400 mt-2">
          Listed by year established. We earn commission from some of these sites — it doesn't affect what we say about them.{' '}
          <a href="/about-our-reviews" className="text-blue-500 hover:text-blue-600 underline">
            About our reviews
          </a>
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reviews.map((review) => (
          <SiteCard key={review.meta.slug} meta={review.meta} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/sites/SiteCard.tsx src/app/sites/page.tsx
git commit -m "feat: add SiteCard component and /sites listing page (CON-1 task 3)"
```

---

## Task 4: `/sites/[slug]` review page + JSON-LD

**Files:**
- Create: `src/app/sites/[slug]/page.tsx`
- Modify: `src/components/json-ld.tsx` (add `ReviewJsonLd`)

**Interfaces:**
- Consumes:
  - `getReview(slug)`, `getAllSlugs()`, `SiteReviewMeta` from `src/lib/reviews.ts`
  - `RaffleWidget` from `src/components/sites/RaffleWidget.tsx`
  - `BreadcrumbJsonLd` from `src/components/json-ld.tsx`
  - `MDXRemote` from `next-mdx-remote/rsc`
- Produces: Next.js route `/sites/[slug]` with ISR revalidate 60s

- [ ] **Step 1: Add `ReviewJsonLd` to `src/components/json-ld.tsx`**

Append to the end of the file (after the existing `FaqJsonLd` export):

```tsx
/**
 * Review schema — for /sites/[slug] operator review pages.
 * itemReviewed = the operator site; reviewRating = Trustpilot score (attributed clearly).
 */
export function ReviewJsonLd({
  siteName,
  siteUrl,
  trustpilotScore,
  reviewUrl,
}: {
  siteName: string;
  siteUrl: string;
  trustpilotScore: number;
  reviewUrl: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Review',
        itemReviewed: {
          '@type': 'Organization',
          name: siteName,
          url: siteUrl,
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: trustpilotScore,
          bestRating: 5,
          worstRating: 1,
          description: 'Trustpilot community rating — not an editorial score from CarRaffleOdds',
        },
        author: {
          '@type': 'Organization',
          name: 'CarRaffleOdds',
          url: SITE_URL,
        },
        url: reviewUrl,
      }}
    />
  );
}
```

- [ ] **Step 2: Create `src/app/sites/[slug]/page.tsx`**

```tsx
// src/app/sites/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Star, Shield, Building2 } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getReview, getAllSlugs } from '@/lib/reviews';
import { RaffleWidget } from '@/components/sites/RaffleWidget';
import { BreadcrumbJsonLd, ReviewJsonLd } from '@/components/json-ld';

export const revalidate = 60;

const SITE_URL = 'https://www.carraffleodds.com';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const review = getReview(params.slug);
  if (!review) return {};
  return {
    title: `${review.meta.name} Review 2026 — Is It Legit?`,
    description: review.meta.metaDescription,
    alternates: { canonical: `/sites/${params.slug}` },
  };
}

export default function SiteReviewPage({ params }: PageProps) {
  const review = getReview(params.slug);
  if (!review) notFound();

  const { meta, content } = review;
  const chUrl = `https://find-and-update.company-information.service.gov.uk/company/${meta.companiesHouseNumber}`;
  const reviewUrl = `${SITE_URL}/sites/${meta.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Sites', url: `${SITE_URL}/sites` },
          { name: meta.name, url: reviewUrl },
        ]}
      />
      <ReviewJsonLd
        siteName={meta.name}
        siteUrl={meta.affiliateUrl}
        trustpilotScore={meta.trustpilotScore}
        reviewUrl={reviewUrl}
      />

      {/* Site header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <nav className="text-xs text-slate-400 mb-2">
            <Link href="/sites" className="hover:text-slate-600">Sites</Link>
            {' / '}
            <span className="text-slate-600">{meta.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{meta.name} Review</h1>
        </div>
        <a
          href={meta.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg px-4 py-2.5 hover:bg-blue-700 transition-colors mt-6"
        >
          Visit site
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Trust bar */}
      <div className="flex flex-wrap gap-4 items-center mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
        {/* Trustpilot */}
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-slate-800">{meta.trustpilotScore.toFixed(1)}</span>
          <span className="text-slate-500">Trustpilot ({meta.trustpilotCount} reviews)</span>
        </div>

        {/* Est. */}
        <div className="text-slate-500">
          Est. <span className="font-medium text-slate-700">{meta.yearsEstablished}</span>
        </div>

        {/* Voluntary Code badge */}
        {meta.voluntaryCode && (
          <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Voluntary Code</span>
          </div>
        )}

        {/* Companies House */}
        <a
          href={chUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs"
        >
          <Building2 className="h-3.5 w-3.5" />
          CH {meta.companiesHouseNumber}
        </a>
      </div>

      {/* Prose */}
      <article className="prose-custom space-y-4">
        <MDXRemote source={content} />
      </article>

      {/* Raffle widget */}
      <RaffleWidget siteSlug={meta.slug} />

      {/* Footer note */}
      <p className="mt-10 text-xs text-slate-400 border-t border-slate-100 pt-6">
        We may earn commission if you buy tickets via links on this page — it doesn't affect what we say.{' '}
        <Link href="/about-our-reviews" className="underline hover:text-slate-600">
          About our reviews
        </Link>
        . Last research update: June 2026.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript and build**

```bash
npx tsc --noEmit
```

Expected: no errors.

```bash
npm run build
```

Expected: build succeeds; 8 `/sites/[slug]` pages generated.

- [ ] **Step 4: Commit**

```bash
git add src/app/sites/[slug]/page.tsx src/components/json-ld.tsx
git commit -m "feat: add /sites/[slug] review page with MDX prose and raffle widget (CON-1 task 4)"
```

---

## Task 5: Nav + footer update

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/footer.tsx`

**Interfaces:**
- Consumes: existing `NAV_ITEMS` array pattern in header; existing footer link lists
- Produces: "Sites" appears in both desktop and mobile nav; "Sites" and "About Our Reviews" appear in footer

- [ ] **Step 1: Update `src/components/layout/header.tsx`**

Add `{ href: '/sites', label: 'Sites' }` to the `NAV_ITEMS` array, after the `'Skill Comps'` entry:

Current:
```typescript
const NAV_ITEMS = [
  { href: '/raffles', label: 'All Raffles' },
  { href: '/ending-soon', label: 'Ending Soon' },
  { href: '/raffles/cars', label: 'Cars' },
  { href: '/raffles/cash', label: 'Cash' },
  { href: '/raffles/tech', label: 'Tech' },
  { href: '/competitions', label: 'Skill Comps' },
];
```

Replace with:
```typescript
const NAV_ITEMS = [
  { href: '/raffles', label: 'All Raffles' },
  { href: '/ending-soon', label: 'Ending Soon' },
  { href: '/raffles/cars', label: 'Cars' },
  { href: '/raffles/cash', label: 'Cash' },
  { href: '/raffles/tech', label: 'Tech' },
  { href: '/competitions', label: 'Skill Comps' },
  { href: '/sites', label: 'Sites' },
];
```

- [ ] **Step 2: Update `src/components/layout/footer.tsx`**

In the "Learn" section, add "Sites" and "About Our Reviews". Current Learn section:
```tsx
<div>
  <h3 className="text-sm font-semibold text-slate-800 mb-3">Learn</h3>
  <ul className="space-y-2">
    <li><Link href="/about" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">About</Link></li>
    <li><Link href="/how-it-works" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">How It Works</Link></li>
    <li><Link href="/ending-soon" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Ending Soon</Link></li>
  </ul>
</div>
```

Replace with:
```tsx
<div>
  <h3 className="text-sm font-semibold text-slate-800 mb-3">Learn</h3>
  <ul className="space-y-2">
    <li><Link href="/about" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">About</Link></li>
    <li><Link href="/how-it-works" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">How It Works</Link></li>
    <li><Link href="/sites" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Site Reviews</Link></li>
    <li><Link href="/about-our-reviews" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">About Our Reviews</Link></li>
    <li><Link href="/ending-soon" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Ending Soon</Link></li>
  </ul>
</div>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run dev server and visually verify nav**

```bash
npm run dev
```

Open `http://localhost:3000` in browser. Confirm:
- "Sites" appears in desktop nav bar
- "Sites" appears in mobile nav menu
- "Sites" link in nav is active/highlighted when on `/sites`
- Footer "Learn" section contains "Site Reviews" and "About Our Reviews" links

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/header.tsx src/components/layout/footer.tsx
git commit -m "feat: add Sites link to nav and footer (CON-1 task 5)"
```

---

## Task 6: `/about-our-reviews` methodology page (CON-6)

**Files:**
- Create: `src/app/about-our-reviews/page.tsx`

**Interfaces:**
- Consumes: `BreadcrumbJsonLd` from `src/components/json-ld.tsx`
- Produces: static server component at `/about-our-reviews`

- [ ] **Step 1: Create `src/app/about-our-reviews/page.tsx`**

```tsx
// src/app/about-our-reviews/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'About Our Reviews — How We Research UK Car Raffle Sites',
  description:
    'How CarRaffleOdds researches and reviews UK car competition sites — Companies House records, Trustpilot, live draw observation, and community forums. All reviews are human-written.',
  alternates: {
    canonical: '/about-our-reviews',
  },
};

const SITE_URL = 'https://www.carraffleodds.com';

export default function AboutOurReviewsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'About Our Reviews', url: `${SITE_URL}/about-our-reviews` },
        ]}
      />

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
        About Our Reviews
      </h1>
      <p className="text-lg text-slate-600 mb-10">
        How we research UK car raffle and competition sites — and what we will and won't say.
      </p>

      <div className="prose-custom space-y-8">
        <section>
          <h2>What our reviews cover</h2>
          <p>
            Each site review on CarRaffleOdds covers how the operator works, what real entrants
            say, trust signals, and — importantly — what to watch out for. We don't write
            promotional copy. If a site has concerns worth knowing about, we say so.
          </p>
          <p>
            Every review addresses: competition model (fixed-odds, Spot the Ball, or unlimited),
            ticket prices, draw schedule, free entry route, prize range, draw transparency,
            Trustpilot evidence, ownership and company registration, and responsible gambling
            provision.
          </p>
        </section>

        <section>
          <h2>How we research</h2>
          <p>We use several sources for each review:</p>
          <ul>
            <li>
              <strong>Companies House:</strong> Registered company name, number, incorporation
              date, directors, and shareholder structure. This is a public register maintained by
              the UK government — the most reliable source for legal entity information.
            </li>
            <li>
              <strong>Trustpilot:</strong> Rating and review count, positive and negative themes,
              and whether Trustpilot has flagged any account for improper review collection.
            </li>
            <li>
              <strong>The operator's own website and terms:</strong> Competition model, ticket
              limits, free entry routes, draw methodology, and responsible gambling provisions.
            </li>
            <li>
              <strong>DCMS Voluntary Code of Good Practice:</strong> Whether a site has signed
              the government's voluntary code for prize draw operators (May 2026). Signing is not
              legally binding, but it indicates a commitment to consumer protections including
              spending caps and clearer free entry routes.
            </li>
            <li>
              <strong>Community forums and press coverage:</strong> MoneySavingExpert, PistonHeads,
              Reddit, and industry press for independent perspectives on real winner experiences
              and any concerns that don't surface in official channels.
            </li>
          </ul>
        </section>

        <section>
          <h2>Who writes the reviews</h2>
          <p>
            All reviews are written by a human — not generated by AI. CarRaffleOdds is a small
            independent site, not a content farm. The prose you read on each site review page
            reflects research that has been read, assessed, and written by a person, not
            auto-produced from a template.
          </p>
          <p>
            We use AI tools to assist with research (collating Companies House data, summarising
            Trustpilot themes) but the editorial judgements — what to highlight, what to
            flag, how to describe a site fairly — are ours.
          </p>
        </section>

        <section>
          <h2>Affiliate disclosure</h2>
          <p>
            We may earn a commission when you click through from a review and purchase tickets.
            This is a standard affiliate arrangement and it does not affect what we write.
            We display the same information and cover the same concerns whether or not we have
            an affiliate relationship with a site.
          </p>
          <p>
            Listings on the{' '}
            <Link href="/sites" className="text-blue-600 hover:text-blue-700 underline">
              Sites page
            </Link>{' '}
            are sorted by year established — not by commission rate. The same principle applies
            to the main raffle comparison: we never reorder or hide listings based on whether
            we earn from a site.
          </p>
        </section>

        <section>
          <h2>What we won't do</h2>
          <ul>
            <li>Write fake urgency ("Only 3 tickets left!" or countdown resets)</li>
            <li>Misrepresent odds, prize values, or draw outcomes</li>
            <li>Conceal negative information about a site we have an affiliate deal with</li>
            <li>Rank sites by quality in a way that could be read as a guarantee or endorsement</li>
            <li>Auto-publish reviews — every page is approved by a human before it goes live</li>
          </ul>
        </section>

        <section>
          <h2>How often reviews are updated</h2>
          <p>
            We aim to update site reviews when ownership, regulatory status, or Trustpilot
            standings change significantly. Each review page carries a "Last research update"
            date at the foot. If you spot something out of date, email us at{' '}
            <a
              href="mailto:hello@carraffleodds.com"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              hello@carraffleodds.com
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Run dev server and verify page renders**

```bash
npm run dev
```

Visit `http://localhost:3000/about-our-reviews`. Confirm:
- Page renders with correct heading
- All sections display with prose-custom styling (matching `how-it-works` page)
- "Sites page" link in the affiliate disclosure section works

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/about-our-reviews/page.tsx
git commit -m "feat: add /about-our-reviews methodology page (CON-6)"
```

---

## Task 7: Final build + sitemap check

**Files:**
- Modify: `src/app/sitemap.ts` (add `/sites`, `/sites/[slug]`, `/about-our-reviews`)

**Interfaces:**
- Consumes: `getAllSlugs()` from `src/lib/reviews.ts`

- [ ] **Step 1: Update `src/app/sitemap.ts`**

The sitemap is a synchronous function. `getAllSlugs()` from `src/lib/reviews.ts` is also synchronous (uses `fs.readdirSync`). Add the import and the new entries.

Replace the top of the file and the `return` statement. Full updated file:

```typescript
import { MetadataRoute } from 'next';
import { ALL_CATEGORIES } from '@/lib/constants';
import { getAllSlugs } from '@/lib/reviews';

const SITE_URL = 'https://www.carraffleodds.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Core pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/raffles`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/ending-soon`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/sites`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about-our-reviews`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/responsible-gambling`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = ALL_CATEGORIES.map((cat) => ({
    url: `${SITE_URL}/raffles/${cat.slug}`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  }));

  // Site review pages
  const siteReviewPages: MetadataRoute.Sitemap = getAllSlugs().map((slug) => ({
    url: `${SITE_URL}/sites/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...siteReviewPages];
}
```

- [ ] **Step 3: Full production build**

```bash
npm run build
```

Expected output includes:
- `○ /sites` (static)
- `● /sites/botb` (ISR) and all other 7 slugs
- `○ /about-our-reviews` (static)
- No TypeScript errors
- No build failures

- [ ] **Step 4: Verify sitemap output**

```bash
npm run build && npm run start &
curl http://localhost:3000/sitemap.xml | grep '/sites'
```

Expected: `/sites`, `/sites/botb`, `/sites/elite-competitions`, etc. all present.

Kill the local server after verification.

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: no new lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat: add /sites routes to sitemap (CON-1 task 7)"
```

---

## Done — what's next for the human

The infrastructure is complete. Eight stub MDX files live in `content/reviews/`. Each is clearly marked `[DRAFT — HUMAN REVIEW REQUIRED]` and links to the corresponding research notes in `docs/research/`.

**To publish a review:**
1. Open `content/reviews/<slug>.mdx`
2. Write the prose using `docs/research/<slug>.md` as your source
3. Update the `metaDescription` frontmatter field
4. Remove the `[DRAFT — HUMAN REVIEW REQUIRED]` warning block
5. Deploy (Vercel will pick it up automatically on push to main)

**Before any page goes live:** remove the draft warning block. It's there to prevent accidental indexing of placeholder content.
