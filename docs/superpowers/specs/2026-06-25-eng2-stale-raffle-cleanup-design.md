# ENG-2: Reliable stale-raffle cleanup — Design spec

**Date:** 2026-06-25  
**Ticket:** ENG-2  
**Status:** Approved, ready for implementation

---

## Problem

Expired raffles remain visible to users for up to ~27 hours after their `end_date`. Additionally, the cleanup machinery has several bugs that cause data integrity issues. Five distinct issues were identified in the audit.

---

## Audit findings

### Issue 1: Page queries lack `end_date` guard
Four pages query `status = 'active'` with no `end_date` filter:
- `src/app/page.tsx` (home)
- `src/app/raffles/page.tsx`
- `src/app/raffles/[category]/page.tsx`
- `src/app/competitions/page.tsx`

`src/app/about/page.tsx` counts with `in('status', ['active', 'ending_soon'])` — produces inflated counts.

`src/app/ending-soon/page.tsx` is already correct.

### Issue 2: `persistScrapeResult` re-activates drawn raffles
`calculateRaffleMetrics()` (`src/lib/utils.ts:148`) only returns `'active' | 'ending_soon' | 'sold_out'` — never `'drawn'`. Every upsert in `persistScrapeResult` sets `status: metrics.status` unconditionally. A raffle still listed on the source site after cleanup gets flipped back to `'active'` on the next scrape.

### Issue 3: Snapshot taken after status flip
`cleanupExpiredRaffles()` in `src/scrapers/run-all.ts` marks expired raffles as `'drawn'` first, then snapshots active raffles. Retiring raffles are already gone from the active set when the snapshot runs — they never get a final odds record in `raffle_snapshots`.

### Issue 4: No proactive `ending_soon` promotion
`ending_soon` is only set when a scraper happens to run and `calculateRaffleMetrics` sees < 48h remaining. No function proactively promotes `active` → `ending_soon` between scrapes.

### Issue 5: Cleanup only runs at 3am, no startup run
Single daily cron `'0 3 * * *'` in `scripts/scraper-service.ts`. If the service restarts, stale raffles remain live until 3am. Worst-case window: ~27h.

---

## Chosen approach: Fix all issues in application code (Option B)

No new infrastructure. All fixes land in existing files.

---

## Design

### 1. Page query fixes

Add `.gt('end_date', new Date().toISOString())` to all affected page queries.

**Files:**
- `src/app/page.tsx`
- `src/app/raffles/page.tsx`
- `src/app/raffles/[category]/page.tsx`
- `src/app/competitions/page.tsx`
- `src/app/about/page.tsx` (count query)

**Behaviour:** Expired raffles stop showing as soon as the ISR cache revalidates (every 300s). No DB changes required for this fix.

### 2. Terminal status protection in `persistScrapeResult`

**File:** `src/scrapers/base.ts`

Before the upsert, fetch the existing record's status for the given `(site_id, external_id)` key. If it is `'drawn'` or `'cancelled'`, omit `status` from the update payload. Otherwise, include `status: metrics.status` as today.

Terminal statuses: `'drawn'`, `'cancelled'`.
Non-terminal statuses (may be updated by scraper): `'active'`, `'ending_soon'`, `'sold_out'`.

This pre-fetch adds one SELECT per scraped raffle. Acceptable at current scale; can be batched if scrape count grows significantly.

### 3. Cleanup function reorder + `ending_soon` promotion

**File:** `src/scrapers/run-all.ts` — `cleanupExpiredRaffles()`

New execution order:
1. **Snapshot** all currently `active` and `ending_soon` raffles (captures final odds before any status change).
2. **Mark drawn:** Update raffles where `end_date < now()` and `status IN ('active', 'ending_soon')` → `'drawn'`.
3. **Promote ending_soon:** Update raffles where `end_date` is between `now()` and `now() + 48h` and `status = 'active'` → `'ending_soon'`.

Step 3 makes `ending_soon` authoritative in the DB regardless of when the scraper last ran.

### 4. Cleanup frequency + startup run

**File:** `scripts/scraper-service.ts`

- **Startup:** Call `cleanupExpiredRaffles()` once at service start, before the first scrape cycle.
- **Post-full-scrape:** Call `cleanupExpiredRaffles()` at the end of each full scrape run (every 3h). The full scrape already has a completion hook — attach cleanup there.
- **Remove:** The standalone 3am daily cron for cleanup. It becomes redundant.

Worst-case stale window after this change: one full scrape interval (~3h), typically much less.

---

## What this does NOT change

- `calculateRaffleMetrics()` in `src/lib/utils.ts` — no change; it still computes `ending_soon` correctly for use during scrapes. The DB promotion is additive, not a replacement.
- Schema — no migrations needed.
- The quick-update cycle (every 20 min) — does not run cleanup; that's intentional to keep it fast.
- `ending-soon/page.tsx` — already correct, no change.

---

## Success criteria

- Expired raffles (past `end_date`) never appear on any listing page.
- A raffle marked `'drawn'` stays `'drawn'` after the next scrape, even if still listed on the source site.
- Every retiring raffle has a final snapshot in `raffle_snapshots`.
- Raffles within 48h of `end_date` are reliably shown as `ending_soon` regardless of scrape timing.
- After a service restart, stale raffles are cleaned up before the first page request serves data.
