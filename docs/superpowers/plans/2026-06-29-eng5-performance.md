# ENG-5: Targeted Performance / Core Web Vitals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve mobile Lighthouse performance and LCP on the home, `/raffles`, and `/sites/[slug]` templates via two targeted changes: priority images on above-the-fold cards, and Framer Motion removal (replaced with CSS).

**Architecture:** Two independent changes applied sequentially. Change 1 adds an optional `priority` prop to both card components and passes it from their grid parents. Change 2 replaces `framer-motion` with a CSS `@keyframes` animation in all three files that import it, then removes the package entirely. After Change 2, `RaffleGrid` and `SkillCompGrid` lose their `'use client'` directive and become server components.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `next/image`.

## Global Constraints

- No mock or hardcoded raffle data (CLAUDE.md rule 1).
- `npm run build` and `npm run lint` must pass clean after every task.
- `npm test` must pass (24 tests) throughout — these changes touch no tested code paths.
- Visual check in `npm run dev` after each task: animations still present, no broken images, no layout shifts.
- Do not introduce `'use client'` on any file that doesn't currently have it.
- `framer-motion` must not appear in any `src/` file after Task 7.

---

## File Map

| File | Action | Task |
|------|--------|------|
| `src/components/raffle-card.tsx` | Modify — add `priority` prop | 2 |
| `src/components/raffle-grid.tsx` | Modify — pass `priority`, later remove Framer Motion + `'use client'` | 2, 4 |
| `src/components/skill-comp-card.tsx` | Modify — add `priority` prop | 3 |
| `src/components/skill-comp-grid.tsx` | Modify — pass `priority`, later remove Framer Motion + `'use client'` | 3, 5 |
| `src/app/globals.css` | Modify — add `@keyframes fadeInUp` + `.animate-fade-in-up` | 4 |
| `src/components/progress-bar.tsx` | Modify — remove Framer Motion + `'use client'` | 6 |
| `package.json` | Modify — uninstall `framer-motion` | 7 |

---

## How "tests" work for these tasks

There are no unit tests to write — these are performance and styling changes on client components. The test cycle for each task is:

1. `npm run build` — catches TypeScript errors, broken imports, type mismatches
2. `npm run lint` — ESLint clean
3. `npm run dev` + visual check in browser — verify animations render, images load, no layout shift
4. `npm test` — 24 existing tests must remain passing throughout

The build check catches the vast majority of real mistakes. Run it after every task.

---

## Task 1: Lighthouse baseline

**Files:** None modified. Record-only.

**Why first:** Establishes the "before" scores we compare against at the end. No code changes at this stage.

- [ ] **Step 1: Build production and start local server**

```bash
npm run build && npm run start
```

Leave the server running on `http://localhost:3000`.

- [ ] **Step 2: Run Lighthouse on home**

Open Chrome → `http://localhost:3000` → DevTools (F12) → Lighthouse tab → select "Mobile" device → uncheck all categories except "Performance" → Analyze.

Record: **Performance score**, **LCP**, **TBT**, **CLS**.

- [ ] **Step 3: Run Lighthouse on /raffles**

`http://localhost:3000/raffles` → same settings.

Record the same four metrics.

- [ ] **Step 4: Run Lighthouse on /sites/botb**

`http://localhost:3000/sites/botb` → same settings.

Record the same four metrics.

- [ ] **Step 5: Save baseline**

Create a temporary note (scratch paper is fine — do not commit) with all 12 numbers. You'll compare at the end in Task 8.

Stop the server (`Ctrl+C`).

---

## Task 2: Priority images — RaffleCard + RaffleGrid

**Files:**
- Modify: `src/components/raffle-card.tsx`
- Modify: `src/components/raffle-grid.tsx`

**Interfaces:**
- `RaffleCard` gains `priority?: boolean` (default `false`)
- `RaffleGrid` passes `priority={index < 3}` when mapping

- [ ] **Step 1: Update RaffleCard interface and Image prop**

In `src/components/raffle-card.tsx`, make these two edits:

Change the interface (currently at line 14):
```tsx
interface RaffleCardProps {
  raffle: Raffle;
  priority?: boolean;
}
```

Change the function signature (currently `export function RaffleCard({ raffle }: RaffleCardProps)`):
```tsx
export function RaffleCard({ raffle, priority = false }: RaffleCardProps) {
```

Add `priority` to the `<Image>` component inside the `imgState !== 'failed'` branch. The existing Image currently has `unoptimized={imgState === 'unoptimized'}`. Add the priority prop after it:
```tsx
<Image
  src={raffle.image_url}
  alt={raffle.title}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  unoptimized={imgState === 'unoptimized'}
  priority={priority && imgState === 'optimized'}
  onError={() => {
    setImgState((prev) => (prev === 'optimized' ? 'unoptimized' : 'failed'));
  }}
/>
```

Note: `priority && imgState === 'optimized'` — priority only applies on the first load attempt. The unoptimized fallback path doesn't need it.

- [ ] **Step 2: Update RaffleGrid to pass priority**

In `src/components/raffle-grid.tsx`, the current map renders `<RaffleCard raffle={raffle} />`. Add the priority prop:
```tsx
<RaffleCard raffle={raffle} priority={index < 3} />
```

The `motion.div` wrapper and Framer Motion import stay unchanged at this task — that's Task 4.

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 4: Verify lint passes**

```bash
npm run lint
```

Expected: no ESLint warnings or errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/raffle-card.tsx src/components/raffle-grid.tsx
git commit -m "Add priority prop to RaffleCard; pass to first 3 cards in RaffleGrid (ENG-5)"
```

---

## Task 3: Priority images — SkillCompCard + SkillCompGrid

**Files:**
- Modify: `src/components/skill-comp-card.tsx`
- Modify: `src/components/skill-comp-grid.tsx`

**Interfaces:**
- `SkillCompCard` gains `priority?: boolean` (default `false`)
- `SkillCompGrid` passes `priority={index < 3}` when mapping

- [ ] **Step 1: Update SkillCompCard interface and Image prop**

In `src/components/skill-comp-card.tsx`, change the interface (currently at line 13):
```tsx
interface SkillCompCardProps {
  raffle: Raffle;
  priority?: boolean;
}
```

Change the function signature:
```tsx
export function SkillCompCard({ raffle, priority = false }: SkillCompCardProps) {
```

Add `priority` to the `<Image>` component (same pattern as RaffleCard):
```tsx
<Image
  src={raffle.image_url}
  alt={raffle.title}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  unoptimized={imgState === 'unoptimized'}
  priority={priority && imgState === 'optimized'}
  onError={() => {
    setImgState((prev) => (prev === 'optimized' ? 'unoptimized' : 'failed'));
  }}
/>
```

- [ ] **Step 2: Update SkillCompGrid to pass priority**

In `src/components/skill-comp-grid.tsx`, update the card render inside the map:
```tsx
<SkillCompCard raffle={raffle} priority={index < 3} />
```

The `motion.div` wrapper stays unchanged — that's Task 5.

- [ ] **Step 3: Verify build and lint pass**

```bash
npm run build && npm run lint
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/skill-comp-card.tsx src/components/skill-comp-grid.tsx
git commit -m "Add priority prop to SkillCompCard; pass to first 3 cards in SkillCompGrid (ENG-5)"
```

---

## Task 4: CSS animation + replace Framer Motion in RaffleGrid

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/raffle-grid.tsx`

**Interfaces:**
- Adds `.animate-fade-in-up` CSS class (used by Tasks 4 and 5)
- `RaffleGrid` loses `'use client'` and `framer-motion` import — becomes a server component

- [ ] **Step 1: Add CSS animation to globals.css**

Append the following at the end of `src/app/globals.css`:

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 350ms ease-out both;
}
```

- [ ] **Step 2: Rewrite RaffleGrid without Framer Motion**

Replace the entire contents of `src/components/raffle-grid.tsx` with:

```tsx
import { RaffleCard } from './raffle-card';
import type { Raffle } from '@/lib/types';

interface RaffleGridProps {
  raffles: Raffle[];
}

export function RaffleGrid({ raffles }: RaffleGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {raffles.map((raffle, index) => (
        <div
          key={raffle.id}
          className={index < 9 ? 'animate-fade-in-up' : undefined}
          style={index < 9 ? { animationDelay: `${Math.min(index, 8) * 60}ms` } : undefined}
        >
          <RaffleCard raffle={raffle} priority={index < 3} />
        </div>
      ))}
    </div>
  );
}
```

Key changes vs the original:
- No `'use client'` directive
- No `framer-motion` import
- `motion.div` → plain `div` with `animate-fade-in-up` class and inline `animationDelay`
- Cards beyond index 8 get no class or style (no animation)
- `priority={index < 3}` already wired from Task 2 — this keeps it

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: clean build. Confirm `RaffleGrid` appears in the static output (it now renders as a server component).

- [ ] **Step 4: Verify lint passes**

```bash
npm run lint
```

- [ ] **Step 5: Visual check**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Cards fade in sequentially (stagger still visible)
- First 3 card images load without the lazy delay
- No layout shift

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/raffle-grid.tsx
git commit -m "Replace Framer Motion with CSS in RaffleGrid; promote to server component (ENG-5)"
```

---

## Task 5: Replace Framer Motion in SkillCompGrid

**Files:**
- Modify: `src/components/skill-comp-grid.tsx`

**Interfaces:**
- `SkillCompGrid` loses `'use client'` and `framer-motion` — becomes a server component
- Uses `.animate-fade-in-up` from globals.css (added in Task 4)

- [ ] **Step 1: Rewrite SkillCompGrid without Framer Motion**

Replace the entire contents of `src/components/skill-comp-grid.tsx` with:

```tsx
import { SkillCompCard } from './skill-comp-card';
import type { Raffle } from '@/lib/types';

interface SkillCompGridProps {
  raffles: Raffle[];
}

export function SkillCompGrid({ raffles }: SkillCompGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {raffles.map((raffle, index) => (
        <div
          key={raffle.id}
          className={index < 9 ? 'animate-fade-in-up' : undefined}
          style={index < 9 ? { animationDelay: `${Math.min(index, 8) * 60}ms` } : undefined}
        >
          <SkillCompCard raffle={raffle} priority={index < 3} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build and lint pass**

```bash
npm run build && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/skill-comp-grid.tsx
git commit -m "Replace Framer Motion with CSS in SkillCompGrid; promote to server component (ENG-5)"
```

---

## Task 6: Replace Framer Motion in ProgressBar

**Files:**
- Modify: `src/components/progress-bar.tsx`

**Interfaces:**
- `ProgressBar` loses `'use client'` and `framer-motion` — becomes a pure server component
- The fill width is rendered statically (no mount animation — the percentage is live data, static display is correct)

- [ ] **Step 1: Rewrite ProgressBar without Framer Motion**

Replace the entire contents of `src/components/progress-bar.tsx` with:

```tsx
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  percentSold: number;
  className?: string;
}

function getProgressColor(percent: number): string {
  if (percent >= 80) return 'bg-rose-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getProgressLabel(percent: number): string {
  if (percent >= 80) return 'Nearly gone';
  if (percent >= 50) return 'Selling fast';
  return 'Good odds';
}

export function ProgressBar({ percentSold, className }: ProgressBarProps) {
  const color = getProgressColor(percentSold);
  const label = getProgressLabel(percentSold);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium tabular-nums text-slate-700">{percentSold}% sold</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${Math.min(percentSold, 100)}%` }}
        />
      </div>
    </div>
  );
}
```

Key changes: no `'use client'`, no `framer-motion`. Width rendered statically from props. The label and percentage text are unchanged.

- [ ] **Step 2: Verify build and lint pass**

```bash
npm run build && npm run lint
```

- [ ] **Step 3: Visual check**

```bash
npm run dev
```

Open any page with raffle cards. Verify the progress bar renders correctly at the right fill % with the right colour.

- [ ] **Step 4: Commit**

```bash
git add src/components/progress-bar.tsx
git commit -m "Remove Framer Motion from ProgressBar; promote to server component (ENG-5)"
```

---

## Task 7: Remove framer-motion package

**Files:**
- Modify: `package.json` (via npm uninstall)

**Why:** After Tasks 4–6, `framer-motion` is no longer imported anywhere in `src/`. Keeping it in `package.json` means it's still included in the build. Removing it eliminates ~30KB gzipped from the client bundle.

- [ ] **Step 1: Verify framer-motion is not imported anywhere**

```bash
grep -r "framer-motion" src
```

Expected: no output. If any files appear, fix them before proceeding.

- [ ] **Step 2: Uninstall the package**

```bash
npm uninstall framer-motion
```

- [ ] **Step 3: Verify build still passes**

```bash
npm run build
```

Expected: clean build. The bundle output should be smaller (check the `chunks/` sizes in the build output vs earlier runs).

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: 24 tests passing.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "Remove framer-motion package (ENG-5)"
```

---

## Task 8: Final Lighthouse verification

**Files:** None modified.

**Why:** Confirm the changes had the intended effect. Compare against the baseline recorded in Task 1.

- [ ] **Step 1: Build production and start local server**

```bash
npm run build && npm run start
```

- [ ] **Step 2: Re-run Lighthouse on home, /raffles, /sites/botb**

Same process as Task 1: Chrome → DevTools → Lighthouse → Mobile → Performance only → Analyze.

Run all three pages.

- [ ] **Step 3: Compare to baseline**

Write down the "before" and "after" numbers side by side. Expected improvements:
- **LCP on home and /raffles**: should drop noticeably (priority images eliminate the lazy-load delay on the first card image)
- **TBT on home and /raffles**: should improve (Framer Motion JS removed from bundle)
- **Performance score**: net improvement, target 75+

If LCP did not improve on a page, check that `priority={true}` is reaching the Image component (add a temporary `console.log` in RaffleCard to verify).

- [ ] **Step 4: Commit final verification note**

No code to commit. If scores look good, done. If a page is still red, note it for follow-up (out of scope for this ticket — reassess per ROADMAP).
