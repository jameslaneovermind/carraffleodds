# CON-2: Trust/Legal Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/guides` section with a static index and 6 guide pages (1 pillar + 5 spokes) answering the highest-anxiety questions about UK car competitions, using MDX for content and matching the existing site review architecture.

**Architecture:** MDX files in `content/guides/`, a synchronous loader in `src/lib/guides.ts` (mirrors `src/lib/reviews.ts` exactly), a static `/guides` index page, and ISR `[slug]` detail pages at `revalidate = 86400`. `FaqJsonLd` already exists in `json-ld.tsx` — reuse it. Only `ArticleJsonLd` is new.

**Tech Stack:** Next.js 14 App Router, TypeScript, `next-mdx-remote/rsc`, `gray-matter` (already installed), Tailwind, shadcn/ui.

## Global Constraints

- All loader functions (`getAllGuideSlugs`, `getGuide`, `getAllGuides`) MUST be synchronous — `fs.readdirSync` / `fs.readFileSync`. Never declare them `async`. Never `await` them at call sites.
- MDX stubs MUST use JSX comments `{/* */}` — NOT HTML comments `<!-- -->` (next-mdx-remote rejects HTML comments and will break the build).
- No mock or hardcoded raffle data anywhere (CLAUDE.md rule 1).
- All stub pages carry `> **[DRAFT — HUMAN REVIEW REQUIRED]**` banner — a human must approve and remove the banner before the page is considered published.
- `revalidate = 86400` on `/guides/[slug]` (daily ISR). `/guides` index has no revalidate (fully static).
- Brand attribution in JSON-LD: `author: { "@type": "Organization", name: "CarRaffleOdds" }` — no individual byline.
- `FaqJsonLd` already exists in `src/components/json-ld.tsx` with prop `faqs: { question: string; answer: string }[]`. Use it — do NOT create a duplicate component.
- `npm run build` and `npm run lint` must pass clean at the end of every task.

---

## File Map

| File | Action | Task |
|------|--------|------|
| `content/guides/are-car-competitions-legit.mdx` | Create | 1 |
| `content/guides/are-car-competitions-legal.mdx` | Create | 1 |
| `content/guides/are-car-competitions-a-scam.mdx` | Create | 1 |
| `content/guides/free-entry-car-competitions.mdx` | Create | 1 |
| `content/guides/what-happens-when-you-win.mdx` | Create | 1 |
| `content/guides/do-people-actually-win.mdx` | Create | 1 |
| `src/lib/guides.ts` | Create | 1 |
| `src/components/json-ld.tsx` | Modify (append `ArticleJsonLd`) | 2 |
| `src/app/guides/page.tsx` | Create | 3 |
| `src/app/guides/[slug]/page.tsx` | Create | 4 |
| `src/components/layout/header.tsx` | Modify (add Guides nav item) | 5 |
| `src/components/layout/footer.tsx` | Modify (add Guides links) | 5 |
| `src/app/sitemap.ts` | Modify (add guide URLs) | 5 |

---

## Task 1: Guide loader + MDX stubs

**Files:**
- Create: `src/lib/guides.ts`
- Create: `content/guides/are-car-competitions-legit.mdx`
- Create: `content/guides/are-car-competitions-legal.mdx`
- Create: `content/guides/are-car-competitions-a-scam.mdx`
- Create: `content/guides/free-entry-car-competitions.mdx`
- Create: `content/guides/what-happens-when-you-win.mdx`
- Create: `content/guides/do-people-actually-win.mdx`

**Interfaces:**
- Produces:
  - `getAllGuideSlugs(): string[]`
  - `getGuide(slug: string): Guide | null`
  - `getAllGuides(): Guide[]`
  - `GuideMeta` interface
  - `Guide` interface
- These are consumed by Tasks 3 and 4.

- [ ] **Step 1: Create `src/lib/guides.ts`**

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
  return fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace('.mdx', ''));
}

export function getGuide(slug: string): Guide | null {
  const filePath = path.join(GUIDES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { meta: data as GuideMeta, content };
}

export function getAllGuides(): Guide[] {
  return getAllGuideSlugs()
    .map((slug) => getGuide(slug))
    .filter((g): g is Guide => g !== null);
}
```

- [ ] **Step 2: Create `content/guides/are-car-competitions-legit.mdx`**

```mdx
---
title: "Are Car Competitions Legit?"
slug: "are-car-competitions-legit"
metaTitle: "Are Car Competitions Legit? The Complete UK Guide (2026)"
metaDescription: "Are UK car competitions legit, legal, and worth entering? We break down how they actually work, what the law says, how to spot a scam, and what happens when someone wins."
lastUpdated: "June 2026"
faqItems:
  - question: "Are car competitions legal in the UK?"
    answer: "Yes. UK car competitions operate legally under the Gambling Act 2005 by including either a free entry route or a genuine skill question. They don't need a Gambling Commission licence because they're classed as prize draws, not gambling."
  - question: "Can you enter for free?"
    answer: "Yes — most operators must accept a free postal entry (handwritten postcard or letter) with equal odds to paid entries. BOTB's Spot the Ball is exempt because it's a skill competition. Check each site's terms for the postal address and rules."
  - question: "Do people actually win?"
    answer: "Yes. Most operators publish winner lists with names, photos, and draw recordings. Sites like Rev Comps publish over 6,300 vehicle winners with evidence. Live draws on Facebook and YouTube let you watch the result in real time."
  - question: "How do I know if a site is trustworthy?"
    answer: "Check Companies House registration, Trustpilot score and review volume, whether they stream live draws, and whether they've signed the DCMS Voluntary Code of Good Practice. See our site reviews for a breakdown of each operator."
relatedGuides:
  - "are-car-competitions-legal"
  - "are-car-competitions-a-scam"
  - "free-entry-car-competitions"
  - "what-happens-when-you-win"
  - "do-people-actually-win"
relatedSites:
  - "botb"
  - "elite-competitions"
  - "dream-car-giveaways"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a stub. Do not remove this banner until prose has been written and approved.

{/* TODO: Human author to write pillar prose here. Cover: legality overview, free entry overview, how to spot a legitimate site, what happens when you win, whether people actually win. Each section should give a short direct answer (40–60 words) and link to the relevant spoke guide for depth. Reference docs/research/ files for facts. */}
```

- [ ] **Step 3: Create `content/guides/are-car-competitions-legal.mdx`**

```mdx
---
title: "Are UK Car Competitions Legal?"
slug: "are-car-competitions-legal"
metaTitle: "Are UK Car Competitions Legal? How the Law Works (2026)"
metaDescription: "UK car competitions are legal under the Gambling Act 2005 — but only if they include a genuine free entry route or skill question. Here's exactly how the law works."
lastUpdated: "June 2026"
faqItems:
  - question: "Are car competitions gambling under UK law?"
    answer: "No — if they include a genuine free entry route or a real skill question. That means they're classed as prize draws, not lotteries or gambling, and don't need a Gambling Commission licence."
  - question: "Why don't car competition sites need a Gambling Commission licence?"
    answer: "Because they're structured as prize promotions rather than gambling. The Gambling Act 2005 defines gambling as paying for a chance to win. Remove the payment requirement (free entry route) or the chance element (skill question) and it falls outside the definition."
  - question: "What is the free entry requirement?"
    answer: "Operators who charge for entries must accept an alternative free entry with equal odds — typically a handwritten postcard. This is the legal mechanism that keeps them outside gambling regulation."
  - question: "Could the law change?"
    answer: "Possibly. DCMS published a report in June 2025 recommending Gambling Commission regulation for the prize draw sector. The government hasn't acted yet, but statutory regulation remains a live policy question."
relatedGuides:
  - "are-car-competitions-legit"
  - "are-car-competitions-a-scam"
  - "free-entry-car-competitions"
relatedSites:
  - "botb"
  - "7-days-performance"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a stub. Do not remove this banner until prose has been written and approved.

{/* TODO: Human author to write prose here. Cover: prize draw vs lottery distinction under Gambling Act 2005, free entry route requirement, skill question route (BOTB), what the DCMS voluntary code is, the June 2025 DCMS report and potential future regulation. Answer-first per section. */}
```

- [ ] **Step 4: Create `content/guides/are-car-competitions-a-scam.mdx`**

```mdx
---
title: "Are Car Competitions a Scam? How to Check a UK Site"
slug: "are-car-competitions-a-scam"
metaTitle: "Are Car Competitions a Scam? How to Check a UK Site (2026)"
metaDescription: "Most UK car competitions are legitimate — but not all. Here's exactly how to verify a site: Companies House, Trustpilot, live draws, the DCMS Voluntary Code, and red flags to watch for."
lastUpdated: "June 2026"
faqItems:
  - question: "How can I tell if a car competition is legitimate?"
    answer: "Check: Companies House registration (active, not dissolved), Trustpilot score and review volume, whether draws are streamed live, whether winners are published with names and evidence, and whether the site is signed up to the DCMS Voluntary Code of Good Practice."
  - question: "What is the DCMS Voluntary Code?"
    answer: "A code of good practice for prize draw operators, published by the government in May 2026. Signatories commit to transparent draws, responsible gambling measures, and accurate marketing. Not all operators have signed it — check our site reviews."
  - question: "What should I check on Companies House?"
    answer: "Confirm the company is active (not dissolved), has been trading for a reasonable period, and that the registered address matches what's on the site. Accounts filed on time are a positive signal."
  - question: "Are live draws actually random?"
    answer: "Most operators use Google's random number generator or a certified third-party RNG, with ticket numbers visible during the draw. Rev Comps uses a physical ball machine. A site that won't show you the draw mechanism is a red flag."
relatedGuides:
  - "are-car-competitions-legit"
  - "are-car-competitions-legal"
  - "do-people-actually-win"
relatedSites:
  - "botb"
  - "rev-comps"
  - "elite-competitions"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a stub. Do not remove this banner until prose has been written and approved.

{/* TODO: Human author to write prose here. Cover: how to check Companies House, what Trustpilot volume means vs score, live draw verification, what the Voluntary Code covers, red flags (no winners page, no draw video, no CH number, no free entry route). Answer-first per section. */}
```

- [ ] **Step 5: Create `content/guides/free-entry-car-competitions.mdx`**

```mdx
---
title: "How to Enter Car Competitions for Free"
slug: "free-entry-car-competitions"
metaTitle: "How to Enter Car Competitions for Free: The Postal Entry Guide (2026)"
metaDescription: "You can enter most UK car competitions for free by post — equal odds to paid entries. Here's exactly how to write a postal entry, where to send it, and what to expect."
lastUpdated: "June 2026"
faqItems:
  - question: "Can you really enter car competitions for free?"
    answer: "Yes — most paid-entry operators must accept a free postal entry with equal odds under the Gambling Act 2005. The exception is skill competitions like BOTB's Spot the Ball, which are exempt from the free entry requirement."
  - question: "How do I write a postal entry?"
    answer: "Write a plain postcard by hand (not printed) with: the competition name, your full name, address, contact number, email, and the answer to the skill question if there is one. Check the site's T&Cs for their exact requirements — they vary."
  - question: "Do free entries have the same odds as paid ones?"
    answer: "Yes — legally they must. One free entry = one paid entry in the draw. Some sites allow multiple postal entries per competition; check the T&Cs for the limit."
  - question: "Which sites accept free postal entries?"
    answer: "All the fixed-odds sites we track accept postal entries: Elite Competitions (Blackpool), Rev Comps (Cheltenham), Dream Car Giveaways (Pershore PO Box), Click Competitions (Norwich), Lucky Day (Newry), 7 Days Performance, and LLF Games (Bournemouth). Check each review for the current address."
relatedGuides:
  - "are-car-competitions-legit"
  - "are-car-competitions-legal"
  - "what-happens-when-you-win"
relatedSites:
  - "elite-competitions"
  - "click-competitions"
  - "rev-comps"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a stub. Do not remove this banner until prose has been written and approved.

{/* TODO: Human author to write prose here. Cover: the legal basis for free entry (Gambling Act 2005), exact postal entry format (handwritten postcard), what information to include, postal addresses for each site (verify against current site T&Cs before publishing), how many entries allowed, what happens to late/invalid entries. Answer-first per section. Include a reminder that BOTB Spot the Ball has no free entry. */}
```

- [ ] **Step 6: Create `content/guides/what-happens-when-you-win.mdx`**

```mdx
---
title: "What Happens When You Win a Car Competition?"
slug: "what-happens-when-you-win"
metaTitle: "What Happens When You Win a Car Competition? (2026)"
metaDescription: "Won a car competition? Here's exactly what to expect: identity verification, how to claim, tax status, cash alternatives, and how long delivery takes."
lastUpdated: "June 2026"
faqItems:
  - question: "Do I pay tax if I win a car competition?"
    answer: "No — prize winnings from UK competitions are not subject to income tax or capital gains tax. The prize is yours tax-free. If you sell the car later, normal CGT rules may apply to any profit above the prize value."
  - question: "Can I take cash instead of the car?"
    answer: "Almost always yes. All the operators we track offer a cash alternative, typically at a discount to the car's RRP. The cash is tax-free. Most winners take the cash — it's usually the more practical option."
  - question: "How long does it take to receive the prize?"
    answer: "It varies by operator. Rev Comps and Dream Car Giveaways regularly document delivery within a week. Cash prizes can be faster — Dream Car Giveaways reports same-day payment in some cases. Budget 1–4 weeks for vehicle delivery."
  - question: "What ID do I need to claim?"
    answer: "Expect to provide photo ID (passport or driving licence), proof of address, and confirm you meet the eligibility requirements (18+, UK resident). Some operators require a notarised affidavit for higher-value prizes."
relatedGuides:
  - "are-car-competitions-legit"
  - "do-people-actually-win"
  - "free-entry-car-competitions"
relatedSites:
  - "rev-comps"
  - "dream-car-giveaways"
  - "botb"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a stub. Do not remove this banner until prose has been written and approved.

{/* TODO: Human author to write prose here. Cover: what happens immediately after the draw (phone call / email), identity verification process, cash alternative (how much, how paid), car delivery timeline and logistics, tax status (HMRC position on prize winnings), what to do if you want to sell the car. Answer-first per section. Use real documented examples from winner stories where possible. */}
```

- [ ] **Step 7: Create `content/guides/do-people-actually-win.mdx`**

```mdx
---
title: "Do People Actually Win Car Competitions?"
slug: "do-people-actually-win"
metaTitle: "Do People Actually Win Car Competitions? (2026)"
metaDescription: "Yes — but the evidence varies a lot by operator. Here's how to verify winners are real, what a legitimate live draw looks like, and which sites have the most transparent winner records."
lastUpdated: "June 2026"
faqItems:
  - question: "How can I verify that real people win?"
    answer: "Look for: named winners with photos or videos, live draw recordings where ticket numbers are visible, and independent verification (PromoVeritas for BOTB, published RNG certificates for others). Rev Comps publishes over 6,300 named vehicle winners."
  - question: "What is a live draw and how does it work?"
    answer: "A live draw is a video broadcast (Facebook, YouTube, Instagram) where the winning ticket is selected in real time. Most operators use Google's RNG with ticket numbers visible on screen. Rev Comps uses a physical ball machine. The recording stays available so you can verify the result."
  - question: "Where can I see past winners?"
    answer: "Most operators have a Winners page on their site. Rev Comps has the most comprehensive public archive (6,300+ vehicles with names and photos). BOTB publishes weekly winner announcements with PromoVeritas verification letters. Quality and completeness varies significantly by operator."
  - question: "Are repeat winners a red flag?"
    answer: "Not necessarily — mathematically it's possible to win multiple times if draws are genuinely independent. It's worth noting, but one person winning twice doesn't make a site illegitimate. The key question is whether you can verify each draw independently."
relatedGuides:
  - "are-car-competitions-legit"
  - "are-car-competitions-a-scam"
  - "what-happens-when-you-win"
relatedSites:
  - "rev-comps"
  - "botb"
  - "elite-competitions"
---

> **[DRAFT — HUMAN REVIEW REQUIRED]** This page is a stub. Do not remove this banner until prose has been written and approved.

{/* TODO: Human author to write prose here. Cover: how to find and evaluate winner evidence on each site, what a live draw recording shows, what PromoVeritas verification means, winner archive quality comparison across operators, the Rev Comps ball machine, how to check if a specific draw result is real. Answer-first per section. */}
```

- [ ] **Step 8: Verify the loader works**

Run:
```bash
node -e "const { getAllGuideSlugs, getGuide, getAllGuides } = require('./src/lib/guides.ts'); console.log(getAllGuideSlugs());"
```

Expected output (TypeScript won't run directly with node, so use build check instead):
```bash
npm run build 2>&1 | grep -E "(error|Error|guides)" | head -20
```

Expected: no TypeScript errors mentioning `guides.ts`. The build will fail on missing route (not yet created) — that's fine at this step, just check the loader itself has no type errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/guides.ts content/guides/
git commit -m "feat: add guide MDX stubs and synchronous loader (CON-2 task 1)"
```

---

## Task 2: ArticleJsonLd component

**Files:**
- Modify: `src/components/json-ld.tsx` (append only — do NOT rewrite the file)

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `ArticleJsonLd({ title, url, lastUpdated }: { title: string; url: string; lastUpdated: string })` — consumed by Task 4

**Critical note:** `FaqJsonLd` already exists in this file with the signature `FaqJsonLd({ faqs }: { faqs: { question: string; answer: string }[] })`. Do NOT create a new FAQ component. Do NOT rename or modify `FaqJsonLd`.

- [ ] **Step 1: Read `src/components/json-ld.tsx` to find the end of the file**

Confirm `FaqJsonLd` exists and note its prop name (`faqs`, not `items`). Note the last line of the file.

- [ ] **Step 2: Append `ArticleJsonLd` to the end of `src/components/json-ld.tsx`**

Add after the closing `}` of `ReviewJsonLd`:

```tsx
/**
 * Article schema — for /guides/[slug] content pages.
 * Signals article type and modification date to search engines.
 */
export function ArticleJsonLd({
  title,
  url,
  lastUpdated,
}: {
  title: string;
  url: string;
  lastUpdated: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        url,
        dateModified: lastUpdated,
        author: {
          '@type': 'Organization',
          name: 'CarRaffleOdds',
          url: SITE_URL,
        },
        publisher: {
          '@type': 'Organization',
          name: 'CarRaffleOdds',
          url: SITE_URL,
        },
      }}
    />
  );
}
```

- [ ] **Step 3: Run lint to verify no type errors**

```bash
npm run lint 2>&1 | grep -E "(error|Error)" | grep "json-ld"
```

Expected: no output (no errors in json-ld.tsx).

- [ ] **Step 4: Commit**

```bash
git add src/components/json-ld.tsx
git commit -m "feat: add ArticleJsonLd component for guide pages (CON-2 task 2)"
```

---

## Task 3: `/guides` index page

**Files:**
- Create: `src/app/guides/page.tsx`

**Interfaces:**
- Consumes: `getAllGuides(): Guide[]` from `src/lib/guides.ts` (Task 1)
- Consumes: `BreadcrumbJsonLd` from `src/components/json-ld.tsx`

- [ ] **Step 1: Create `src/app/guides/page.tsx`**

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getAllGuides } from '@/lib/guides';
import { BreadcrumbJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';

export const metadata: Metadata = {
  title: 'Car Competition Guides — CarRaffleOdds',
  description:
    'Honest guides to UK car competitions: are they legal, how free entry works, what happens when you win, and how to spot a legitimate site.',
  alternates: {
    canonical: '/guides',
  },
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Guides', url: `${SITE_URL}/guides` },
        ]}
      />

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          Car Competition Guides
        </h1>
        <p className="text-lg text-slate-600">
          Honest answers to the questions people actually ask before entering a UK car competition.
        </p>
      </div>

      <ul className="space-y-4">
        {guides.map((guide) => (
          <li key={guide.meta.slug}>
            <Link
              href={`/guides/${guide.meta.slug}`}
              className="flex items-start justify-between gap-4 p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group"
            >
              <div>
                <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {guide.meta.title}
                </p>
                <p className="text-sm text-slate-500 mt-1">{guide.meta.metaDescription}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 mt-0.5 group-hover:text-blue-500 transition-colors" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Run build and verify `/guides` generates**

```bash
npm run build 2>&1 | grep -E "guides"
```

Expected output includes:
```
○ /guides
```

- [ ] **Step 3: Commit**

```bash
git add src/app/guides/page.tsx
git commit -m "feat: add /guides index page (CON-2 task 3)"
```

---

## Task 4: `/guides/[slug]` detail page

**Files:**
- Create: `src/app/guides/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getAllGuideSlugs()`, `getGuide(slug)` from `src/lib/guides.ts` (Task 1)
- Consumes: `getReview(slug)` from `src/lib/reviews.ts` (existing)
- Consumes: `BreadcrumbJsonLd`, `FaqJsonLd`, `ArticleJsonLd` from `src/components/json-ld.tsx`
  - `FaqJsonLd` prop is `faqs` (not `items`) — `faqs={guide.meta.faqItems}`
  - `ArticleJsonLd` from Task 2

- [ ] **Step 1: Create `src/app/guides/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getGuide, getAllGuideSlugs } from '@/lib/guides';
import { getReview } from '@/lib/reviews';
import { BreadcrumbJsonLd, ArticleJsonLd, FaqJsonLd } from '@/components/json-ld';

export const revalidate = 86400;

const SITE_URL = 'https://www.carraffleodds.com';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
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

  const relatedGuideData = meta.relatedGuides
    .map((slug) => getGuide(slug))
    .filter((g): g is NonNullable<typeof g> => g !== null);

  const relatedSiteData = meta.relatedSites
    .map((slug) => getReview(slug))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Guides', url: `${SITE_URL}/guides` },
          { name: meta.title, url: guideUrl },
        ]}
      />
      <ArticleJsonLd
        title={meta.metaTitle}
        url={guideUrl}
        lastUpdated={meta.lastUpdated}
      />
      <FaqJsonLd faqs={meta.faqItems} />

      {/* Breadcrumb nav */}
      <nav className="text-xs text-slate-400 mb-6">
        <Link href="/guides" className="hover:text-slate-600">
          Guides
        </Link>
        {' / '}
        <span className="text-slate-600">{meta.title}</span>
      </nav>

      {/* Prose */}
      <article className="prose-custom space-y-4">
        <MDXRemote source={content} />
      </article>

      {/* FAQ — visible on page, mirrors FaqJsonLd */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Frequently asked questions</h2>
        <dl className="space-y-5">
          {meta.faqItems.map(({ question, answer }) => (
            <div key={question} className="border-b border-slate-100 pb-5 last:border-0">
              <dt className="font-semibold text-slate-800">{question}</dt>
              <dd className="text-slate-600 mt-1 text-sm leading-relaxed">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Related guides */}
      {relatedGuideData.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Related guides</h2>
          <ul className="space-y-2">
            {relatedGuideData.map((g) => (
              <li key={g.meta.slug}>
                <Link
                  href={`/guides/${g.meta.slug}`}
                  className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                >
                  {g.meta.title} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related site reviews */}
      {relatedSiteData.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Sites we&apos;ve reviewed</h2>
          <ul className="space-y-2">
            {relatedSiteData.map((r) => (
              <li key={r.meta.slug}>
                <Link
                  href={`/sites/${r.meta.slug}`}
                  className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                >
                  {r.meta.name} review →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Last updated */}
      <p className="mt-10 text-xs text-slate-400 border-t border-slate-100 pt-6">
        Last updated: {meta.lastUpdated}. Information is correct to the best of our knowledge — verify before acting on it.{' '}
        <Link href="/about-our-reviews" className="underline hover:text-slate-600">
          About our reviews
        </Link>
        .
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Run build and verify all 6 guide slugs generate**

```bash
npm run build 2>&1 | grep "guides"
```

Expected output includes all 7 lines (index + 6 slugs):
```
○ /guides
● /guides/[slug]
  ├ /guides/are-car-competitions-legit
  ├ /guides/are-car-competitions-legal
  ├ /guides/are-car-competitions-a-scam
  ├ /guides/free-entry-car-competitions
  ├ /guides/what-happens-when-you-win
  └ /guides/do-people-actually-win
```

- [ ] **Step 3: Run lint**

```bash
npm run lint 2>&1 | grep -E "(error|Error)" | head -20
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/app/guides/
git commit -m "feat: add /guides/[slug] detail page with FAQ, related guides, and related sites (CON-2 task 4)"
```

---

## Task 5: Nav, footer, and sitemap

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/footer.tsx`
- Modify: `src/app/sitemap.ts`

**Interfaces:**
- Consumes: `getAllGuideSlugs()` from `src/lib/guides.ts` (Task 1) — for sitemap only

- [ ] **Step 1: Add "Guides" to `src/components/layout/header.tsx`**

Find the `NAV_ITEMS` array (currently ends with `{ href: '/sites', label: 'Sites' }`). Add one item after it:

```tsx
const NAV_ITEMS = [
  { href: '/raffles', label: 'All Raffles' },
  { href: '/ending-soon', label: 'Ending Soon' },
  { href: '/raffles/cars', label: 'Cars' },
  { href: '/raffles/cash', label: 'Cash' },
  { href: '/raffles/tech', label: 'Tech' },
  { href: '/competitions', label: 'Skill Comps' },
  { href: '/sites', label: 'Sites' },
  { href: '/guides', label: 'Guides' },
];
```

- [ ] **Step 2: Add guide links to footer "Learn" section in `src/components/layout/footer.tsx`**

The footer currently has a "Learn" column. Add 3 guide links into it (the most important/broad ones — the pillar + two high-intent spokes). Keep the column from getting too long; the full list lives at `/guides`.

Find the Learn `<ul>` and add after the existing items:

```tsx
<li><Link href="/guides" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Competition Guides</Link></li>
<li><Link href="/guides/are-car-competitions-legit" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Are They Legit?</Link></li>
<li><Link href="/guides/free-entry-car-competitions" className="text-sm text-slate-500 hover:text-blue-500 transition-colors">Free Entry Guide</Link></li>
```

- [ ] **Step 3: Update `src/app/sitemap.ts` to include guide pages**

Add `getAllGuideSlugs` import and two new entries in the return array. The current import line is:
```typescript
import { getAllSlugs } from '@/lib/reviews';
```

Change to:
```typescript
import { getAllSlugs } from '@/lib/reviews';
import { getAllGuideSlugs } from '@/lib/guides';
```

Then add a guides index entry to `staticPages`:
```typescript
{
  url: `${SITE_URL}/guides`,
  lastModified: now,
  changeFrequency: 'weekly' as const,
  priority: 0.7,
},
```

And add a `guidePages` block and include it in the return:
```typescript
const guidePages: MetadataRoute.Sitemap = getAllGuideSlugs().map((slug) => ({
  url: `${SITE_URL}/guides/${slug}`,
  lastModified: now,
  changeFrequency: 'monthly' as const,
  priority: 0.6,
}));

return [...staticPages, ...categoryPages, ...siteReviewPages, ...guidePages];
```

- [ ] **Step 4: Run build to confirm everything generates cleanly**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds, 7 new guide-related lines visible (`/guides` + 6 slugs), no errors.

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: exits with code 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/header.tsx src/components/layout/footer.tsx src/app/sitemap.ts
git commit -m "feat: add Guides nav link, footer links, and sitemap entries (CON-2 task 5)"
```

---

## Acceptance checklist (verify before declaring done)

- [ ] `npm run build` passes with no errors — all 7 guide URLs in build output
- [ ] `npm run lint` exits 0
- [ ] `/guides` lists all 6 guides, is fully static (no `revalidate`)
- [ ] All 6 `/guides/[slug]` pages have `revalidate = 86400`
- [ ] Each detail page renders: breadcrumb JSON-LD, Article JSON-LD, FAQ JSON-LD, visible FAQ section, related guides section, related sites section, last updated line
- [ ] `FaqJsonLd` is called with `faqs={meta.faqItems}` — not `items`
- [ ] All MDX stubs use `{/* JSX comments */}` — no `<!-- HTML comments -->`
- [ ] All stubs carry `[DRAFT — HUMAN REVIEW REQUIRED]` banner
- [ ] Nav shows "Guides" link; footer Learn section includes Competition Guides link
- [ ] Sitemap includes `/guides` (weekly, 0.7) and all 6 `/guides/[slug]` entries (monthly, 0.6)
