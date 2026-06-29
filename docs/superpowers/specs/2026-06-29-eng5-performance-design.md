# ENG-5: Targeted Performance / Core Web Vitals — Design Spec

**Date:** 2026-06-29
**Ticket:** ENG-5 (Phase 2, Tier 4 — Performance)
**Effort:** M (~3–4 hrs implementation)
**Scope:** Option A — targeted quick wins: priority images + Framer Motion removal

---

## Goal

Improve mobile Lighthouse performance score and Core Web Vitals on the three key templates (home, `/raffles`, `/sites/[slug]`), with a mobile-first focus (78% of traffic). Two changes cover the highest-impact, lowest-risk wins available in the current codebase.

---

## Baseline (to be recorded before any changes)

Run Lighthouse in mobile mode on:
- `/` (home)
- `/raffles`
- `/sites/botb`

Record for each: Performance score, LCP, TBT, CLS. These are the "before" numbers. No code changes at this stage.

---

## Change 1: Priority images (LCP fix)

### Problem
`next/image` defaults to `loading="lazy"` and no `fetchpriority` attribute. The first raffle card images — almost certainly the LCP element on home and `/raffles` — are not discovered by the browser until layout completes. This delays LCP significantly on mobile.

### Fix
Add an optional `priority?: boolean` prop to `RaffleCard` and `SkillCompCard`. Pass `priority={index < 3}` in `RaffleGrid` and `SkillCompGrid` when mapping cards.

When `priority={true}`, `next/image` emits:
- `<link rel="preload" as="image">` in the `<head>` (browser discovers image immediately)
- `fetchpriority="high"` on the `<img>` element
- Removes `loading="lazy"`

No visual change. No behaviour change.

### Files
- `src/components/raffle-card.tsx` — add `priority?: boolean` prop, pass to `<Image>`
- `src/components/raffle-grid.tsx` — pass `priority={index < 3}` in map
- `src/components/skill-comp-card.tsx` — add `priority?: boolean` prop, pass to `<Image>`
- `src/components/skill-comp-grid.tsx` — pass `priority={index < 3}` in map

---

## Change 2: Framer Motion removal (bundle reduction + server component promotion)

### Problem
Framer Motion (~30KB gzipped) is imported in exactly 3 files for stagger animations and a progress bar fill. Its presence in `raffle-grid.tsx` is the sole reason `RaffleGrid` is a `'use client'` component — causing the entire grid shell to hydrate on the client despite having no interactive behaviour of its own.

### Fix: `raffle-grid.tsx`
- Remove `'use client'` directive and `framer-motion` import
- Replace `motion.div` stagger with a CSS animation
- `RaffleGrid` becomes a server component; the grid shell no longer ships JS or hydrates

### Fix: `skill-comp-grid.tsx`
- Same treatment as `raffle-grid.tsx`

### Fix: `progress-bar.tsx`
- Replace `motion.div` width tween with a plain `div` using `transition: width 600ms ease-out`
- Check whether `'use client'` can be removed after Framer Motion is gone

### Fix: Remove package
After all three files are updated, remove `framer-motion` from `package.json` and run `npm install`. Verify with `grep -r "framer-motion" src` — must return nothing.

### CSS animation (shared)
Add to `globals.css`:
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Add to `tailwind.config.ts` (or inline as a utility):
```ts
animation: {
  'fade-in-up': 'fadeInUp 350ms ease-out both',
}
```

Card wrapper in the grid:
```tsx
<div
  className="animate-fade-in-up"
  style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
>
```

Cap the delay at index 8 (≤480ms) so late cards don't animate in noticeably late on long lists.

---

## Verification

### Per-task (after each change, before commit)
- `npm run build` — no errors
- `npm run lint` — clean
- `npm run dev` + visual check: animations present, images load, no layout shifts

### Final (after all tasks)
- Re-run Lighthouse on the same three pages; compare to baseline
- `grep -r "framer-motion" src` — returns nothing
- `npm test` — 24 tests passing
- Confirm `priority` on first 3 cards in both grids

---

## Acceptance criteria (from ENG-5 spec)
- Mobile Lighthouse performance score in a good band (targeting 75+, ideally 90+)
- LCP improved on home and `/raffles` vs baseline
- No visual regressions on any of the three templates

---

## Out of scope
- Client boundary surgery on `RaffleCard` (pushing `'use client'` deeper) — meaningful complexity for modest extra gain
- Font loading changes — `next/font/google` already optimal
- Full Lighthouse audit across all pages — reassess after these two changes if scores are still poor
