# ENG-2: Reliable Stale-Raffle Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate stale expired raffles from all listing pages and fix three data integrity bugs in the scraper/cleanup pipeline.

**Architecture:** Four targeted changes across six files — add `end_date` guards to page queries, protect terminal raffle statuses from scraper overwrites, fix snapshot ordering in the cleanup function, and wire cleanup into the full-scrape cycle instead of a once-daily cron.

**Tech Stack:** Next.js App Router (server components), Supabase JS client, node-cron, TypeScript/tsx.

## Global Constraints

- No mock or hardcoded raffle data anywhere.
- Money stays as integer pence in all DB interactions; format to £ only at display layer.
- Terminal raffle statuses are `'drawn'` and `'cancelled'` — never overwrite these from the scraper.
- Non-terminal statuses are `'active'`, `'ending_soon'`, `'sold_out'` — scraper may update these.
- `revalidate = 300` on page components must remain — do not change ISR settings.
- No new npm dependencies.

---

## File Map

| File | Change |
|------|--------|
| `src/app/page.tsx` | Add `end_date > now` guard to raffle query |
| `src/app/raffles/page.tsx` | Add `end_date > now` guard to raffle query |
| `src/app/raffles/[category]/page.tsx` | Add `end_date > now` guard to raffle query |
| `src/app/competitions/page.tsx` | Add `end_date > now` guard to raffle query |
| `src/app/about/page.tsx` | Add `end_date > now` guard to count query |
| `src/scrapers/base.ts` | Fetch status in existence check; omit `status` from update when terminal |
| `src/scrapers/run-all.ts` | Reorder snapshot before flip; add `ending_soon` promotion step |
| `scripts/scraper-service.ts` | Add startup cleanup; run cleanup after full scrape; remove 3am cron |

---

## Task 1: Page query `end_date` guards

Add `.gt('end_date', new Date().toISOString())` to every raffle listing and count query that currently relies on `status` alone.

**Files:**
- Modify: `src/app/page.tsx:27`
- Modify: `src/app/raffles/page.tsx:27`
- Modify: `src/app/raffles/[category]/page.tsx:45`
- Modify: `src/app/competitions/page.tsx:25`
- Modify: `src/app/about/page.tsx:22`

**Interfaces:**
- Produces: All five page queries now exclude raffles where `end_date` is in the past.

- [ ] **Step 1: Edit `src/app/page.tsx`**

  Current (line 25–27):
  ```typescript
  const { data: raffles } = await supabase
    .from('raffles')
    .select('*, site:sites(id, name, slug, url, logo_url, competition_model)')
    .eq('status', 'active')
    .order('end_date', { ascending: true, nullsFirst: false });
  ```

  Replace with:
  ```typescript
  const { data: raffles } = await supabase
    .from('raffles')
    .select('*, site:sites(id, name, slug, url, logo_url, competition_model)')
    .eq('status', 'active')
    .gt('end_date', new Date().toISOString())
    .order('end_date', { ascending: true, nullsFirst: false });
  ```

- [ ] **Step 2: Edit `src/app/raffles/page.tsx`**

  Find the raffle query (around line 25–28). Current pattern:
  ```typescript
    .eq('status', 'active')
    .order('end_date', { ascending: true, nullsFirst: false });
  ```

  Add between those two lines:
  ```typescript
    .eq('status', 'active')
    .gt('end_date', new Date().toISOString())
    .order('end_date', { ascending: true, nullsFirst: false });
  ```

- [ ] **Step 3: Edit `src/app/raffles/[category]/page.tsx`**

  Find the raffle query (around line 43–46). Current pattern:
  ```typescript
    .eq('status', 'active')
    .order('end_date', { ascending: true, nullsFirst: false });
  ```

  Add between those two lines:
  ```typescript
    .eq('status', 'active')
    .gt('end_date', new Date().toISOString())
    .order('end_date', { ascending: true, nullsFirst: false });
  ```

- [ ] **Step 4: Edit `src/app/competitions/page.tsx`**

  Find the raffle query (around line 23–27). Current pattern:
  ```typescript
    .eq('status', 'active')
    .order('end_date', { ascending: true, nullsFirst: false });
  ```

  Add between those two lines:
  ```typescript
    .eq('status', 'active')
    .gt('end_date', new Date().toISOString())
    .order('end_date', { ascending: true, nullsFirst: false });
  ```

- [ ] **Step 5: Edit `src/app/about/page.tsx`**

  Current count query (lines 20–23):
  ```typescript
  const { count: raffleCount } = await supabase
    .from('raffles')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'ending_soon']);
  ```

  Replace with:
  ```typescript
  const { count: raffleCount } = await supabase
    .from('raffles')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'ending_soon'])
    .gt('end_date', new Date().toISOString());
  ```

- [ ] **Step 6: Verify TypeScript compiles**

  ```bash
  npm run build
  ```

  Expected: build succeeds with no type errors. If you see a Supabase type error on `.gt('end_date', ...)`, confirm the column name is `end_date` (it is — check `supabase/migrations/001_initial.sql`).

- [ ] **Step 7: Verify manually in Supabase SQL editor**

  Run this to confirm no past-end_date raffles appear with the new filter:
  ```sql
  SELECT id, title, end_date, status
  FROM raffles
  WHERE status IN ('active', 'ending_soon')
    AND end_date > now()
  ORDER BY end_date ASC
  LIMIT 10;
  ```

  Compare with the old query (without the `end_date > now()` clause) — the new one should return fewer or equal rows.

- [ ] **Step 8: Commit**

  ```bash
  git add src/app/page.tsx src/app/raffles/page.tsx "src/app/raffles/[category]/page.tsx" src/app/competitions/page.tsx src/app/about/page.tsx
  git commit -m "fix: exclude expired raffles from all listing and count queries"
  ```

---

## Task 2: Protect terminal raffle status in `persistScrapeResult`

Prevent the scraper from flipping a `'drawn'` or `'cancelled'` raffle back to `'active'` by omitting `status` from the update payload when the existing DB record is already in a terminal state.

**Files:**
- Modify: `src/scrapers/base.ts` (around line 237–250)

**Interfaces:**
- Consumes: existing raffle row from DB, `row` object built in Task 2 (no change to its shape)
- Produces: `persistScrapeResult` now preserves terminal statuses on update

- [ ] **Step 1: Update the existence check to also fetch `status`**

  Current (around line 237–239):
  ```typescript
  // Check if exists
  const { data: existing } = await supabase
    .from('raffles')
    .select('id')
    .eq('site_id', site.id)
    .eq('external_id', raffle.externalId)
    .single();
  ```

  Replace with:
  ```typescript
  // Check if exists
  const { data: existing } = await supabase
    .from('raffles')
    .select('id, status')
    .eq('site_id', site.id)
    .eq('external_id', raffle.externalId)
    .single();
  ```

- [ ] **Step 2: Conditionally omit `status` from the update when terminal**

  Current update block (around line 244–251):
  ```typescript
  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('raffles')
      .update(row)
      .eq('id', existing.id);

    if (error) {
      console.error(`[persist] Failed to update raffle ${raffle.externalId}: ${error.message}`);
    } else {
      itemsUpdated++;
    }
  ```

  Replace with:
  ```typescript
  if (existing) {
    const TERMINAL_STATUSES = ['drawn', 'cancelled'];
    const { status: _omit, ...rowWithoutStatus } = row;
    const updateRow = TERMINAL_STATUSES.includes(existing.status ?? '')
      ? rowWithoutStatus
      : row;

    const { error } = await supabase
      .from('raffles')
      .update(updateRow)
      .eq('id', existing.id);

    if (error) {
      console.error(`[persist] Failed to update raffle ${raffle.externalId}: ${error.message}`);
    } else {
      itemsUpdated++;
    }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npm run build
  ```

  Expected: no type errors. The `_omit` prefix suppresses the unused-variable lint warning.

- [ ] **Step 4: Verify manually**

  In Supabase SQL editor, mark one test raffle as drawn:
  ```sql
  -- Note the external_id and site slug before this
  UPDATE raffles SET status = 'drawn' WHERE id = '<a real id>';
  ```

  Then run the scraper for that site:
  ```bash
  npx tsx src/scrapers/run-all.ts --site=<site-slug>
  ```

  Then confirm status is still `'drawn'`:
  ```sql
  SELECT id, external_id, status FROM raffles WHERE id = '<the id>';
  ```

  After verifying, you can revert the test row if needed:
  ```sql
  UPDATE raffles SET status = 'active' WHERE id = '<the id>';
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/scrapers/base.ts
  git commit -m "fix: preserve terminal raffle status when scraper re-encounters drawn/cancelled raffles"
  ```

---

## Task 3: Reorder snapshot and add `ending_soon` promotion in `cleanupExpiredRaffles`

Fix two bugs in `cleanupExpiredRaffles()` in `src/scrapers/run-all.ts`:
1. Take the snapshot BEFORE marking raffles as drawn (so retiring raffles get a final snapshot).
2. Add a step that promotes `active` raffles ending within 48 hours to `ending_soon`.

**Files:**
- Modify: `src/scrapers/run-all.ts:254–296`

**Interfaces:**
- Produces: rewritten `cleanupExpiredRaffles()` with three steps in correct order

- [ ] **Step 1: Replace the entire `cleanupExpiredRaffles` function**

  Current function (lines 254–296). Replace the entire function body with:

  ```typescript
  export async function cleanupExpiredRaffles(): Promise<void> {
    console.log('[Cleanup] Running raffle cleanup...');
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // Step 1: Snapshot all currently active/ending_soon raffles BEFORE any status change.
    // This captures a final odds record for raffles that are about to be marked drawn.
    const { data: activeRaffles } = await supabase
      .from('raffles')
      .select('id, tickets_sold, percent_sold, ticket_price')
      .in('status', ['active', 'ending_soon']);

    if (activeRaffles && activeRaffles.length > 0) {
      const snapshots = activeRaffles.map(r => ({
        raffle_id: r.id,
        tickets_sold: r.tickets_sold,
        percent_sold: r.percent_sold,
        ticket_price: r.ticket_price,
      }));

      const { error: snapError } = await supabase
        .from('raffle_snapshots')
        .insert(snapshots);

      if (snapError) {
        console.error('[Cleanup] Snapshot error:', snapError.message);
      } else {
        console.log(`[Cleanup] Saved ${snapshots.length} snapshots`);
      }
    }

    // Step 2: Mark expired raffles as drawn.
    const { data: drawn, error: drawnError } = await supabase
      .from('raffles')
      .update({ status: 'drawn' })
      .lt('end_date', now)
      .in('status', ['active', 'ending_soon'])
      .select('id');

    if (drawnError) {
      console.error('[Cleanup] Error marking drawn:', drawnError.message);
    } else {
      console.log(`[Cleanup] Marked ${drawn?.length ?? 0} raffles as drawn`);
    }

    // Step 3: Promote active raffles ending within 48 hours to ending_soon.
    const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: promoted, error: promotedError } = await supabase
      .from('raffles')
      .update({ status: 'ending_soon' })
      .eq('status', 'active')
      .gt('end_date', now)
      .lte('end_date', fortyEightHoursFromNow)
      .select('id');

    if (promotedError) {
      console.error('[Cleanup] Error promoting ending_soon:', promotedError.message);
    } else {
      console.log(`[Cleanup] Promoted ${promoted?.length ?? 0} raffles to ending_soon`);
    }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build
  ```

  Expected: no errors.

- [ ] **Step 3: Run cleanup manually and inspect output**

  ```bash
  npx tsx src/scrapers/run-all.ts --cleanup
  ```

  Expected output (exact numbers will vary):
  ```
  [Cleanup] Running raffle cleanup...
  [Cleanup] Saved N snapshots
  [Cleanup] Marked X raffles as drawn
  [Cleanup] Promoted Y raffles to ending_soon
  ```

  Then verify in Supabase SQL editor:
  ```sql
  -- Should be 0 rows: no active/ending_soon raffle with end_date in the past
  SELECT id, title, end_date, status
  FROM raffles
  WHERE status IN ('active', 'ending_soon')
    AND end_date < now();

  -- Should show raffles ending within 48h as ending_soon
  SELECT id, title, end_date, status
  FROM raffles
  WHERE end_date > now()
    AND end_date <= now() + interval '48 hours'
  ORDER BY end_date ASC;
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/scrapers/run-all.ts
  git commit -m "fix: snapshot before status flip and add ending_soon promotion in cleanupExpiredRaffles"
  ```

---

## Task 4: Wire cleanup into full-scrape cycle; remove standalone 3am cron

Replace the once-daily 3am cleanup cron with two cleanup invocations: one at service startup (before the first full scrape), and one at the end of each full scrape run.

**Files:**
- Modify: `scripts/scraper-service.ts`

**Interfaces:**
- Consumes: `cleanupExpiredRaffles()` from `src/scrapers/run-all.ts` (already imported, no change)
- Produces: cleanup runs on startup and after every full scrape; 3am cron removed

- [ ] **Step 1: Add `'Startup Cleanup'` to `JOB_TIMEOUT_MS`**

  Current (lines 62–66):
  ```typescript
  const JOB_TIMEOUT_MS: Record<string, number> = {
    'Full Scrape': 45 * 60 * 1000,
    'Quick Update': 20 * 60 * 1000,
    'Daily Cleanup': 5 * 60 * 1000,
  };
  ```

  Replace with:
  ```typescript
  const JOB_TIMEOUT_MS: Record<string, number> = {
    'Full Scrape': 45 * 60 * 1000,
    'Quick Update': 20 * 60 * 1000,
    'Cleanup': 5 * 60 * 1000,
  };
  ```

- [ ] **Step 2: Run cleanup at end of `fullScrape()` and update `dailyCleanup` to `cleanup`**

  Current `fullScrape` and `dailyCleanup` functions (lines 104–122):
  ```typescript
  async function fullScrape(): Promise<void> {
    await runWithLock('Full Scrape', async () => {
      const b = await ensureBrowser();
      await runAllScrapers({ browser: b, concurrency: 3 });
    });
  }

  async function quickUpdate(): Promise<void> {
    await runWithLock('Quick Update', async () => {
      const b = await ensureBrowser();
      await runAllScrapers({ quick: true, browser: b, concurrency: 2 });
    });
  }

  async function dailyCleanup(): Promise<void> {
    await runWithLock('Daily Cleanup', async () => {
      await cleanupExpiredRaffles();
    });
  }
  ```

  Replace with:
  ```typescript
  async function fullScrape(): Promise<void> {
    await runWithLock('Full Scrape', async () => {
      const b = await ensureBrowser();
      await runAllScrapers({ browser: b, concurrency: 3 });
      await cleanupExpiredRaffles();
    });
  }

  async function quickUpdate(): Promise<void> {
    await runWithLock('Quick Update', async () => {
      const b = await ensureBrowser();
      await runAllScrapers({ quick: true, browser: b, concurrency: 2 });
    });
  }

  async function cleanup(): Promise<void> {
    await runWithLock('Cleanup', async () => {
      await cleanupExpiredRaffles();
    });
  }
  ```

- [ ] **Step 3: Remove the 3am daily cron from `startSchedule()`**

  Current `startSchedule` (lines 128–150):
  ```typescript
  function startSchedule(): void {
    console.log('[Service] Setting up cron schedules...');

    // Full scrape every 3 hours: 0 */3 * * *
    cron.schedule('0 */3 * * *', () => {
      fullScrape();
    }, { timezone: 'Europe/London' });

    // Quick update every 20 minutes: */20 * * * *
    cron.schedule('*/20 * * * *', () => {
      quickUpdate();
    }, { timezone: 'Europe/London' });

    // Daily cleanup at 3:00 AM: 0 3 * * *
    cron.schedule('0 3 * * *', () => {
      dailyCleanup();
    }, { timezone: 'Europe/London' });

    console.log('[Service] Schedules active:');
    console.log('  - Full scrape:   every 3 hours (concurrency 3, timeout 45m)');
    console.log('  - Quick update:  every 20 minutes (concurrency 2, timeout 20m)');
    console.log('  - Daily cleanup: 3:00 AM London time');
  }
  ```

  Replace with:
  ```typescript
  function startSchedule(): void {
    console.log('[Service] Setting up cron schedules...');

    // Full scrape every 3 hours — cleanup runs at the end of each full scrape
    cron.schedule('0 */3 * * *', () => {
      fullScrape();
    }, { timezone: 'Europe/London' });

    // Quick update every 20 minutes
    cron.schedule('*/20 * * * *', () => {
      quickUpdate();
    }, { timezone: 'Europe/London' });

    console.log('[Service] Schedules active:');
    console.log('  - Full scrape:   every 3 hours (concurrency 3, timeout 45m; cleanup runs after each)');
    console.log('  - Quick update:  every 20 minutes (concurrency 2, timeout 20m)');
  }
  ```

- [ ] **Step 4: Run startup cleanup before the initial full scrape**

  Current `main()` startup sequence (lines 184–213):
  ```typescript
  // Launch browser
  await ensureBrowser();

  // Run initial full scrape on startup
  console.log('[Service] Running initial full scrape...');
  await fullScrape();

  // Start cron schedule
  startSchedule();
  ```

  Replace with:
  ```typescript
  // Launch browser
  await ensureBrowser();

  // Clean up stale raffles immediately on startup, before waiting for the first full scrape
  console.log('[Service] Running startup cleanup...');
  await cleanup();

  // Run initial full scrape on startup (cleanup will also run at the end of this)
  console.log('[Service] Running initial full scrape...');
  await fullScrape();

  // Start cron schedule
  startSchedule();
  ```

- [ ] **Step 5: Verify TypeScript compiles**

  ```bash
  npm run build
  ```

  Expected: no errors. If `dailyCleanup` is referenced anywhere else, rename those references to `cleanup`.

- [ ] **Step 6: Verify lint passes**

  ```bash
  npm run lint
  ```

  Expected: no errors.

- [ ] **Step 7: Commit**

  ```bash
  git add scripts/scraper-service.ts
  git commit -m "fix: run cleanup on startup and after each full scrape; remove standalone 3am cron"
  ```

---

## Task 5: Commit the spec and plan documents

- [ ] **Step 1: Commit docs**

  ```bash
  git add docs/superpowers/
  git commit -m "docs: add ENG-2 design spec and implementation plan"
  ```

---

## Verification Checklist (run after all tasks)

- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] Running `npx tsx src/scrapers/run-all.ts --cleanup` produces all three log lines (snapshots, drawn, ending_soon) with no errors
- [ ] SQL confirms no `active` or `ending_soon` raffle has `end_date < now()` after cleanup runs
- [ ] SQL confirms raffles ending within 48h are `ending_soon`
- [ ] A raffle manually set to `'drawn'` in the DB stays `'drawn'` after the scraper runs for that site
