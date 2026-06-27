# CON-2: Trust/Legal Pillar Cluster — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a pillar + 5 spoke guide pages answering the highest-anxiety questions upstream of every conversion on the site, under a new `/guides/` section.

**Architecture:** MDX files in `content/guides/`, a synchronous loader in `src/lib/guides.ts` (mirrors `src/lib/reviews.ts`), a static `/guides` index page, and ISR guide detail pages at `revalidate = 86400`. Brand-attributed content (no individual author). FAQ + Article JSON-LD on every guide page.

**Tech stack:** Next.js App Router, TypeScript, `next-mdx-remote/rsc`, `gray-matter`, Tailwind, existing `BreadcrumbJsonLd` + `ArticleJsonLd` + `FAQJsonLd` (new) components.

---

## Global Constraints

- No mock or hardcoded raffle data anywhere (CLAUDE.md rule 1)
- No per-raffle generated pages (CLAUDE.md rule 3)
- No auto-published content — human approves prose before banner is removed (CLAUDE.md rule 7)
- All public copy must pass the compliance checklist in `docs/COMPLIANCE.md`: 18+ framing, no fake urgency, accurate odds statements, responsible-play framing, affiliate disclosure where applicable
- Voice must match the house standard in `.claude/skills/writing-voice` — honest, plain, answer-first, no hype
- Money is stored as integer pence; format to £ only at display layer
- Brand attribution: `author: { "@type": "Organization", name: "CarRaffleOdds" }` in JSON-LD — no named individual byline
- All guide pages interlink: pillar → all spokes, each spoke → pillar + 2–3 sibling spokes + relevant `/sites/[slug]` pages
- `revalidate = 86400` on all `[slug]` guide pages (daily ISR — guides don't change like raffle data)
- `/guides` index is fully static (no `revalidate`, no Supabase)

---

## Pages

### Pillar
| Field | Value |
|-------|-------|
| URL | `/guides/are-car-competitions-legit` |
| MDX file | `content/guides/are-car-competitions-legit.mdx` |
| Title tag | `Are Car Competitions Legit? The Complete UK Guide (2026)` |
| Meta description | `Are UK car competitions legit, legal, and worth entering? We break down how they actually work, what the law says, how to spot a scam, and what happens when someone wins.` |
| Role | High-level overview of all five sub-topics. Each section gives a short direct answer and links to the relevant spoke for depth. |

### Spokes
| Slug | Title tag | Intent |
|------|-----------|--------|
| `are-car-competitions-legal` | `Are UK Car Competitions Legal? How the Law Works (2026)` | Legality, Gambling Commission regulation, free entry requirement, prize draw vs lottery distinction |
| `are-car-competitions-a-scam` | `Are Car Competitions a Scam? How to Check a UK Site (2026)` | Red flags, how to verify Companies House / Trustpilot / draw evidence, what the Voluntary Code means |
| `free-entry-car-competitions` | `How to Enter Car Competitions for Free: The Postal Entry Guide (2026)` | Postal entry mechanics — how to write the postcard, where to send it, what counts, what to expect |
| `what-happens-when-you-win` | `What Happens When You Win a Car Competition? (2026)` | Identity verification, prize delivery, cash alternative, tax status, what to do first |
| `do-people-actually-win` | `Do People Actually Win Car Competitions? (2026)` | Winner verification — how to check, what evidence exists, how to read a live draw |

### Index
| Field | Value |
|-------|-------|
| URL | `/guides` |
| Title tag | `Car Competition Guides — CarRaffleOdds` |
| Meta description | `Honest guides to UK car competitions: are they legal, how free entry works, what happens when you win, and how to spot a legitimate site.` |
| Role | Static listing of all published guides. Cards with title + description + link. No Supabase. |

---

## MDX Frontmatter Schema

```typescript
interface GuidesMeta {
  title: string;          // H1 text (not the title tag — the page heading)
  slug: string;           // matches filename, used in URLs and cross-links
  metaTitle: string;      // <title> tag (includes year signal)
  metaDescription: string;
  lastUpdated: string;    // "June 2026" — rendered on page and in Article JSON-LD
  faqItems: Array<{ question: string; answer: string }>; // 3–5 items; used for FAQPage JSON-LD and visible FAQ section
  relatedGuides: string[];   // slugs of 2–3 sibling guides to link at the bottom
  relatedSites: string[];    // slugs of relevant /sites/[slug] pages to link at the bottom
}
```

---

## src/lib/guides.ts

Synchronous loader — mirrors `src/lib/reviews.ts` exactly, substituting the `GuidesMeta` type and `content/guides/` directory.

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const GUIDES_DIR = path.join(process.cwd(), 'content/guides');

export interface GuideMeta {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  lastUpdated: string;
  faqItems: Array<{ question: string; answer: string }>;
  relatedGuides: string[];
  relatedSites: string[];
}

export interface Guide {
  meta: GuideMeta;
  content: string;
}

export function getAllGuideSlugs(): string[] {
  return fs.readdirSync(GUIDES_DIR)
    .filter(f => f.endsWith('.mdx'))
    .map(f => f.replace(/\.mdx$/, ''));
}

export function getGuide(slug: string): Guide | null {
  const filePath = path.join(GUIDES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
  return { meta: data as GuideMeta, content };
}

export function getAllGuides(): Guide[] {
  return getAllGuideSlugs()
    .map(slug => getGuide(slug))
    .filter((g): g is Guide => g !== null);
}
```

**Critical:** All three functions are synchronous (`fs.readdirSync`, `fs.readFileSync`). Do NOT declare them `async`. Do NOT use `await` when calling them in pages.

---

## src/app/guides/page.tsx

Fully static — no `revalidate`, no Supabase, no `async` needed.

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllGuides } from '@/lib/guides';
import { BreadcrumbJsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Car Competition Guides — CarRaffleOdds',
  description: 'Honest guides to UK car competitions: are they legal, how free entry works, what happens when you win, and how to spot a legitimate site.',
  alternates: { canonical: '/guides' },
};

export default function GuidesPage() {
  const guides = getAllGuides();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://www.carraffleodds.com' },
        { name: 'Guides', url: 'https://www.carraffleodds.com/guides' },
      ]} />
      <h1>Car Competition Guides</h1>
      <p>Honest answers to the questions people actually ask before entering a UK car competition.</p>
      <ul>
        {guides.map(g => (
          <li key={g.meta.slug}>
            <Link href={`/guides/${g.meta.slug}`}>{g.meta.title}</Link>
            <p>{g.meta.metaDescription}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Styling: match the `/sites` listing page layout — max-w-3xl, clean list of cards with title + description + arrow link.

---

## src/app/guides/[slug]/page.tsx

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getGuide, getAllGuideSlugs, getAllGuides } from '@/lib/guides';
import { getReview } from '@/lib/reviews';
import { BreadcrumbJsonLd, ArticleJsonLd, FAQJsonLd } from '@/components/json-ld';

export const revalidate = 86400;

const SITE_URL = 'https://www.carraffleodds.com';

interface PageProps { params: { slug: string } }

export async function generateStaticParams() {
  return getAllGuideSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const guide = getGuide(params.slug);
  if (!guide) return {};
  return {
    title: guide.meta.metaTitle,
    description: guide.meta.metaDescription,
    alternates: { canonical: `/guides/${params.slug}` },
  };
}

export default function GuidePage({ params }: PageProps) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const { meta, content } = guide;
  const guideUrl = `${SITE_URL}/guides/${meta.slug}`;

  // Resolve related guide metadata for display
  const relatedGuideData = meta.relatedGuides
    .map(slug => getGuide(slug))
    .filter((g): g is NonNullable<typeof g> => g !== null);

  // Resolve related site metadata for display
  const relatedSiteData = meta.relatedSites
    .map(slug => getReview(slug))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Guides', url: `${SITE_URL}/guides` },
        { name: meta.title, url: guideUrl },
      ]} />
      <ArticleJsonLd
        title={meta.metaTitle}
        url={guideUrl}
        lastUpdated={meta.lastUpdated}
      />
      <FAQJsonLd items={meta.faqItems} />

      {/* Breadcrumb nav */}
      <nav className="text-xs text-slate-400 mb-4">
        <Link href="/guides" className="hover:text-slate-600">Guides</Link>
        {' / '}
        <span className="text-slate-600">{meta.title}</span>
      </nav>

      {/* Prose */}
      <article className="prose-custom">
        <MDXRemote source={content} />
      </article>

      {/* FAQ — visible on page, mirrors FAQJsonLd */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
        <dl className="space-y-4">
          {meta.faqItems.map(({ question, answer }) => (
            <div key={question}>
              <dt className="font-semibold text-slate-800">{question}</dt>
              <dd className="text-slate-600 mt-1 text-sm">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Related guides */}
      {relatedGuideData.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Related guides</h2>
          <ul className="space-y-2">
            {relatedGuideData.map(g => (
              <li key={g.meta.slug}>
                <Link href={`/guides/${g.meta.slug}`} className="text-blue-600 hover:underline">
                  {g.meta.title} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related site reviews */}
      {relatedSiteData.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Sites we've reviewed</h2>
          <ul className="space-y-2">
            {relatedSiteData.map(r => (
              <li key={r.meta.slug}>
                <Link href={`/sites/${r.meta.slug}`} className="text-blue-600 hover:underline">
                  {r.meta.name} review →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Last updated */}
      <p className="mt-10 text-xs text-slate-400 border-t border-slate-100 pt-6">
        Last updated: {meta.lastUpdated}. Information correct to best of our knowledge — verify before acting on it.
      </p>
    </div>
  );
}
```

---

## src/components/json-ld.tsx additions

Append two new components (do not rewrite the file):

**ArticleJsonLd:**
```tsx
export function ArticleJsonLd({ title, url, lastUpdated }: {
  title: string; url: string; lastUpdated: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    url,
    dateModified: lastUpdated,
    author: { '@type': 'Organization', name: 'CarRaffleOdds' },
    publisher: { '@type': 'Organization', name: 'CarRaffleOdds', url: 'https://www.carraffleodds.com' },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
```

**FAQJsonLd:**
```tsx
export function FAQJsonLd({ items }: { items: Array<{ question: string; answer: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
```

---

## MDX stub format (all 6 files)

Each stub must use JSX comments `{/* */}` — NOT HTML comments `<!-- -->` (next-mdx-remote rejects those).

```mdx
---
title: "[Page H1 here]"
slug: "[slug]"
metaTitle: "[Title tag with year]"
metaDescription: "[Meta description]"
lastUpdated: "June 2026"
faqItems:
  - question: "[Question 1]"
    answer: "[Answer 1]"
  - question: "[Question 2]"
    answer: "[Answer 2]"
  - question: "[Question 3]"
    answer: "[Answer 3]"
relatedGuides:
  - "[sibling-slug-1]"
  - "[sibling-slug-2]"
relatedSites:
  - "[site-slug-1]"
  - "[site-slug-2]"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a stub. Do not remove this banner until prose has been written and approved.

{/* TODO: Human author to write review prose here */}
```

---

## Nav and footer updates

**Header (`src/components/layout/header.tsx`):** Add `{ href: '/guides', label: 'Guides' }` to `NAV_ITEMS` after `'Sites'`.

**Footer (`src/components/layout/footer.tsx`):** Add a "Guides" section (or add to existing "Learn" section) with links to all 6 guide pages by title.

---

## Sitemap update (`src/app/sitemap.ts`)

Import `getAllGuideSlugs` from `@/lib/guides`. Add:
- `/guides` — weekly, priority 0.7
- Each `/guides/[slug]` — monthly, priority 0.6

---

## Content stubs — frontmatter values

### Pillar: `are-car-competitions-legit.mdx`
- title: "Are Car Competitions Legit?"
- faqItems: "Are car competitions legal in the UK?", "Can you enter for free?", "Do people actually win?", "How do I know if a site is trustworthy?"
- relatedGuides: all five spokes
- relatedSites: botb, elite-competitions, dream-car-giveaways

### `are-car-competitions-legal.mdx`
- title: "Are UK Car Competitions Legal?"
- faqItems: "Are car competitions gambling?", "Why don't they need a Gambling Commission licence?", "What is the free entry requirement?", "Could the law change?"
- relatedGuides: are-car-competitions-legit, are-car-competitions-a-scam, free-entry-car-competitions
- relatedSites: botb, 7-days-performance

### `are-car-competitions-a-scam.mdx`
- title: "Are Car Competitions a Scam? How to Check a UK Site"
- faqItems: "How can I tell if a car competition is legitimate?", "What is the DCMS Voluntary Code?", "What should I check on Companies House?", "Are live draws actually random?"
- relatedGuides: are-car-competitions-legit, are-car-competitions-legal, do-people-actually-win
- relatedSites: botb, rev-comps, elite-competitions

### `free-entry-car-competitions.mdx`
- title: "How to Enter Car Competitions for Free"
- faqItems: "Can you really enter car competitions for free?", "How do I write a postal entry?", "Do free entries have the same odds as paid ones?", "Which sites accept free postal entries?"
- relatedGuides: are-car-competitions-legit, are-car-competitions-legal, what-happens-when-you-win
- relatedSites: botb, elite-competitions, click-competitions

### `what-happens-when-you-win.mdx`
- title: "What Happens When You Win a Car Competition?"
- faqItems: "Do I pay tax if I win a car?", "Can I take cash instead of the car?", "How long does it take to receive the prize?", "What ID do I need to claim?"
- relatedGuides: are-car-competitions-legit, do-people-actually-win, free-entry-car-competitions
- relatedSites: rev-comps, dream-car-giveaways, botb

### `do-people-actually-win.mdx`
- title: "Do People Actually Win Car Competitions?"
- faqItems: "How can I verify that real people win?", "What is a live draw and how does it work?", "Where can I see past winners?", "Are repeat winners a red flag?"
- relatedGuides: are-car-competitions-legit, are-car-competitions-a-scam, what-happens-when-you-win
- relatedSites: rev-comps, botb, elite-competitions

---

## Acceptance criteria

- `/guides` index lists all 6 guides, static, no Supabase
- All 6 `/guides/[slug]` pages build at SSG with ISR revalidate=86400
- Each page has: BreadcrumbJsonLd, ArticleJsonLd, FAQJsonLd, visible FAQ section, related guides, related site links, last updated line
- All stubs use JSX comments (not HTML comments)
- `getAllGuides()`, `getGuide()`, `getAllGuideSlugs()` are synchronous — no async, no await at call sites
- Nav shows "Guides" link; footer lists all guides
- Sitemap includes `/guides` and all 6 `/guides/[slug]` entries
- `npm run build` and `npm run lint` pass clean
- All pages carry [DRAFT] banner until human approves prose
