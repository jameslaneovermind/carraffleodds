# ENG-1: Sentry Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sentry to the scraper service so failures are visible in a dashboard and systemic issues trigger a single email alert.

**Architecture:** Sentry is wired into three points: (1) process-level exception handlers in `scraper-service.ts`, (2) a pure quality-metrics helper that computes data completeness rates from raw scraper results, and (3) the orchestrator in `run-all.ts` which fires per-scraper warnings and a post-run aggregate error event if ≥2 scrapers fail. A Sentry Cron Monitor check-in after each full scrape catches the "service went dark" scenario without any extra infrastructure.

**Tech Stack:** `@sentry/node` v8, TypeScript, vitest (already installed at `^3.2.6`)

## Global Constraints

- **Personal Sentry account only** — not the work account. Free tier. DSN stored as `SENTRY_DSN` in `/opt/carraffleodds/.env` on the droplet, never committed.
- **No Sentry events from quick updates** — only full scrape runs are instrumented.
- **No performance tracing** — `tracesSampleRate: 0` in init.
- **Healthy runs produce zero Sentry events** — only failures generate events.
- **Thresholds (exact values — do not change):** image null rate `> 0.80`, price null rate `> 0.50`, other-type rate `> 0.60`. Alert fires when `≥ 2` scrapers breach any threshold or return zero results on the same full scrape run.
- **`classifyPrizeType` returns `'other'` as its fallback** — not `'unknown'`. Use `'other'` in all comparisons.
- Money is integer pence throughout — not relevant to this feature but do not introduce currency formatting.
- Run `npm test` after every task to verify existing tests still pass.

---

## File map

| File | Change |
|------|--------|
| `package.json` | Add `@sentry/node` dependency |
| `src/lib/sentry.ts` | **New** — `initSentry(dsn)` helper |
| `src/lib/__tests__/sentry.test.ts` | **New** — tests for init guard |
| `src/scrapers/quality-metrics.ts` | **New** — pure `computeQualityMetrics` function |
| `src/scrapers/__tests__/quality-metrics.test.ts` | **New** — tests for quality metrics |
| `scripts/scraper-service.ts` | Add init call, captureException in handlers, cron check-in |
| `src/scrapers/run-all.ts` | Add captureException in catch, quality warnings, aggregate check |

---

### Task 1: Install @sentry/node and Sentry init helper

**Files:**
- Modify: `package.json`
- Create: `src/lib/sentry.ts`
- Create: `src/lib/__tests__/sentry.test.ts`

**Interfaces:**
- Produces: `initSentry(dsn: string | undefined): void` — called by Task 3

- [ ] **Step 1: Install the package**

```bash
npm install @sentry/node@^8
```

Expected: `package.json` gains `"@sentry/node": "^8.x.x"` under `dependencies`.

- [ ] **Step 2: Write the failing tests**

Create `src/lib/__tests__/sentry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { initSentry } from '../sentry';

describe('initSentry', () => {
  it('does not throw when DSN is undefined', () => {
    expect(() => initSentry(undefined)).not.toThrow();
  });

  it('does not throw when DSN is an empty string', () => {
    expect(() => initSentry('')).not.toThrow();
  });
});
```

- [ ] **Step 3: Run to verify they fail**

```bash
npm test -- --reporter=verbose src/lib/__tests__/sentry.test.ts
```

Expected: FAIL — `Cannot find module '../sentry'`

- [ ] **Step 4: Create `src/lib/sentry.ts`**

```typescript
import * as Sentry from '@sentry/node';
import os from 'os';

export function initSentry(dsn: string | undefined): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: 'production',
    serverName: os.hostname(),
    tracesSampleRate: 0,
  });
}
```

- [ ] **Step 5: Run to verify they pass**

```bash
npm test -- --reporter=verbose src/lib/__tests__/sentry.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/sentry.ts src/lib/__tests__/sentry.test.ts
git commit -m "feat(eng-1): add Sentry init helper"
```

---

### Task 2: Quality metrics pure function and tests

**Files:**
- Create: `src/scrapers/quality-metrics.ts`
- Create: `src/scrapers/__tests__/quality-metrics.test.ts`

**Interfaces:**
- Consumes: `ScrapedRaffle` from `./base`; `classifyPrizeType` from `../lib/utils`
- Produces: `QualityMetrics` interface and `computeQualityMetrics(raffles: ScrapedRaffle[]): QualityMetrics` — imported by Task 4

- [ ] **Step 1: Write the failing tests**

Create `src/scrapers/__tests__/quality-metrics.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeQualityMetrics } from '../quality-metrics';
import type { ScrapedRaffle } from '../base';

function makeRaffle(overrides: Partial<ScrapedRaffle> = {}): ScrapedRaffle {
  return {
    externalId: 'test-id',
    title: 'Win BMW M3',
    sourceUrl: 'https://example.com/product/win-bmw-m3/',
    ...overrides,
  };
}

describe('computeQualityMetrics', () => {
  it('returns all zeros for an empty array', () => {
    expect(computeQualityMetrics([])).toEqual({
      imageNullRate: 0,
      priceNullRate: 0,
      otherTypeRate: 0,
    });
  });

  it('imageNullRate: 4 of 5 missing → 0.8', () => {
    const raffles = [
      makeRaffle({ imageUrl: 'https://example.com/img.jpg' }),
      makeRaffle({ imageUrl: undefined }),
      makeRaffle({ imageUrl: undefined }),
      makeRaffle({ imageUrl: undefined }),
      makeRaffle({ imageUrl: undefined }),
    ];
    expect(computeQualityMetrics(raffles).imageNullRate).toBe(0.8);
  });

  it('imageNullRate: all images present → 0', () => {
    const raffles = [
      makeRaffle({ imageUrl: 'https://example.com/a.jpg' }),
      makeRaffle({ imageUrl: 'https://example.com/b.jpg' }),
    ];
    expect(computeQualityMetrics(raffles).imageNullRate).toBe(0);
  });

  it('priceNullRate: 1 of 2 missing → 0.5', () => {
    const raffles = [
      makeRaffle({ ticketPrice: 500 }),
      makeRaffle({ ticketPrice: undefined }),
    ];
    expect(computeQualityMetrics(raffles).priceNullRate).toBe(0.5);
  });

  it('otherTypeRate: unrecognised title classifies as other', () => {
    const raffles = [
      makeRaffle({ title: 'Win BMW M3' }),          // → 'car'
      makeRaffle({ title: 'xyzzy mystery prize' }),  // → 'other'
    ];
    expect(computeQualityMetrics(raffles).otherTypeRate).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm test -- --reporter=verbose src/scrapers/__tests__/quality-metrics.test.ts
```

Expected: FAIL — `Cannot find module '../quality-metrics'`

- [ ] **Step 3: Create `src/scrapers/quality-metrics.ts`**

```typescript
import { classifyPrizeType } from '../lib/utils';
import type { ScrapedRaffle } from './base';

export interface QualityMetrics {
  imageNullRate: number;
  priceNullRate: number;
  otherTypeRate: number;
}

export function computeQualityMetrics(raffles: ScrapedRaffle[]): QualityMetrics {
  if (raffles.length === 0) {
    return { imageNullRate: 0, priceNullRate: 0, otherTypeRate: 0 };
  }
  const total = raffles.length;
  return {
    imageNullRate: raffles.filter(r => !r.imageUrl).length / total,
    priceNullRate: raffles.filter(r => !r.ticketPrice).length / total,
    otherTypeRate: raffles.filter(r => classifyPrizeType(r.title) === 'other').length / total,
  };
}
```

- [ ] **Step 4: Run to verify they pass**

```bash
npm test -- --reporter=verbose src/scrapers/__tests__/quality-metrics.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Run the full suite to confirm no regressions**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/scrapers/quality-metrics.ts src/scrapers/__tests__/quality-metrics.test.ts
git commit -m "feat(eng-1): add quality metrics helper with tests"
```

---

### Task 3: Wire Sentry into scraper-service.ts

**Files:**
- Modify: `scripts/scraper-service.ts`

**Interfaces:**
- Consumes: `initSentry` from `../src/lib/sentry` (Task 1); `* as Sentry` from `@sentry/node`

**Note:** No automated tests for this task — Sentry calls are side effects. Verification is done manually in the deployment step by observing that a deliberate exception appears in the Sentry dashboard.

- [ ] **Step 1: Add imports at the top of `scripts/scraper-service.ts`**

After the existing imports, add:

```typescript
import * as Sentry from '@sentry/node';
import { initSentry } from '../src/lib/sentry';
```

- [ ] **Step 2: Call initSentry inside `main()`, after env validation**

Find this block inside `main()`:

```typescript
  if (!hasUrl || !hasKey) {
    console.error('[Service] Missing environment variables!');
    console.error('  Need: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
```

Add immediately after it:

```typescript
  initSentry(process.env.SENTRY_DSN);
```

- [ ] **Step 3: Update the uncaughtException handler**

Find:

```typescript
process.on('uncaughtException', (error) => {
  console.error('[Service] Uncaught exception:', error.message);
  // Don't exit — let PM2 decide
});
```

Replace with:

```typescript
process.on('uncaughtException', (error) => {
  Sentry.captureException(error);
  console.error('[Service] Uncaught exception:', error.message);
  // Don't exit — let PM2 decide
});
```

- [ ] **Step 4: Update the unhandledRejection handler**

Find:

```typescript
process.on('unhandledRejection', (reason) => {
  console.error('[Service] Unhandled rejection:', reason);
});
```

Replace with:

```typescript
process.on('unhandledRejection', (reason) => {
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
  console.error('[Service] Unhandled rejection:', reason);
});
```

- [ ] **Step 5: Add cron check-in to `fullScrape()`**

Find the existing function:

```typescript
async function fullScrape(): Promise<void> {
  await runWithLock('Full Scrape', async () => {
    const b = await ensureBrowser();
    await runAllScrapers({ browser: b, concurrency: 3 });
    await cleanupExpiredRaffles();
  });
}
```

Replace with:

```typescript
async function fullScrape(): Promise<void> {
  const checkInId = Sentry.captureCheckIn(
    { monitorSlug: 'scraper-full-run', status: 'in_progress' },
    {
      schedule: { type: 'crontab', value: '0 */3 * * *' },
      checkinMargin: 30,
      maxRuntime: 45,
      timezone: 'Europe/London',
    }
  );
  try {
    await runWithLock('Full Scrape', async () => {
      const b = await ensureBrowser();
      await runAllScrapers({ browser: b, concurrency: 3 });
      await cleanupExpiredRaffles();
    });
    Sentry.captureCheckIn({ monitorSlug: 'scraper-full-run', status: 'ok', checkInId });
  } catch {
    Sentry.captureCheckIn({ monitorSlug: 'scraper-full-run', status: 'error', checkInId });
  }
}
```

`runWithLock` catches all errors internally and never re-throws, so the `catch` branch is defensive. The heartbeat's job is "did the job trigger and run?" — not "did every scraper succeed?" — individual scraper failures are captured separately in Task 4.

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add scripts/scraper-service.ts
git commit -m "feat(eng-1): wire Sentry init, exception capture, and cron check-in into scraper service"
```

---

### Task 4: Wire Sentry events into run-all.ts

**Files:**
- Modify: `src/scrapers/run-all.ts`

**Interfaces:**
- Consumes: `* as Sentry` from `@sentry/node`; `computeQualityMetrics, QualityMetrics` from `./quality-metrics` (Task 2)

**Context:** The orchestrator runs scrapers in batches of up to `concurrency` (3 for full scrapes). A shared `outcomes` array is populated within each batch's `Promise.all` callbacks — safe because Node.js's event loop is single-threaded. The aggregate check runs once after all batches complete, only for full scrapes.

- [ ] **Step 1: Add imports to `src/scrapers/run-all.ts`**

After the existing imports add:

```typescript
import * as Sentry from '@sentry/node';
import { computeQualityMetrics } from './quality-metrics';
```

- [ ] **Step 2: Add ScraperOutcome interface and checkAggregateFailures function**

Add after the imports, before `getAllScrapers()`:

```typescript
interface ScraperOutcome {
  name: string;
  siteSlug: string;
  zeroResults: boolean;
  qualityFailure: boolean;
  qualityDetail: string;
}

function checkAggregateFailures(outcomes: ScraperOutcome[]): void {
  const failures = outcomes.filter(o => o.zeroResults || o.qualityFailure);
  if (failures.length >= 2) {
    Sentry.captureMessage(
      `${failures.length} scrapers failed or have quality issues on this run`,
      {
        level: 'error',
        extra: {
          failures: failures.map(f => ({ site: f.siteSlug, reason: f.qualityDetail })),
        },
      }
    );
  }
}
```

- [ ] **Step 3: Declare the outcomes array in runAllScrapers**

Find:

```typescript
  console.log(`[Orchestrator] Running ${scrapers.length} scraper(s): ${scrapers.map(s => s.name).join(', ')}`);
```

Add immediately after it:

```typescript
  const outcomes: ScraperOutcome[] = [];
```

- [ ] **Step 4: Add captureException and outcome push in the per-scraper catch block**

Find the catch block (inside the `batch.map` callback):

```typescript
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const elapsed = Math.round((Date.now() - scraperStart) / 1000);
            console.error(`[${scraper.name}] Fatal error after ${elapsed}s: ${msg}`);

            await logScrapeRun(scraper.siteSlug, {
```

Replace with:

```typescript
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const elapsed = Math.round((Date.now() - scraperStart) / 1000);
            console.error(`[${scraper.name}] Fatal error after ${elapsed}s: ${msg}`);

            Sentry.captureException(error instanceof Error ? error : new Error(msg), {
              tags: { site: scraper.siteSlug },
            });

            if (!quick) {
              outcomes.push({
                name: scraper.name,
                siteSlug: scraper.siteSlug,
                zeroResults: true,
                qualityFailure: false,
                qualityDetail: `Fatal error: ${msg}`,
              });
            }

            await logScrapeRun(scraper.siteSlug, {
```

- [ ] **Step 5: Wire quality metrics and outcome tracking in the full scrape result block**

Find this block (inside `if (quick)` … `else` — the full scrape path):

```typescript
                  if (result.raffles.length > 0) {
                    const { itemsNew, itemsUpdated } = await persistScrapeResult(result, supabase);
                    console.log(`[${scraper.name}] Persisted: ${itemsNew} new, ${itemsUpdated} updated`);

                    await logScrapeRun(scraper.siteSlug, {
                      status: result.errors.length > 0 ? 'partial' : 'success',
                      itemsFound: result.raffles.length,
                      itemsNew,
                      itemsUpdated,
                      errorMessage: result.errors.join('; ') || undefined,
                      durationMs: result.duration,
                    }, supabase);
                  } else {
                    await logScrapeRun(scraper.siteSlug, {
                      status: 'failed',
                      itemsFound: 0,
                      itemsNew: 0,
                      itemsUpdated: 0,
                      errorMessage: result.errors.join('; ') || 'No raffles found',
                      durationMs: result.duration,
                    }, supabase);
                  }
```

Replace with:

```typescript
                  if (result.raffles.length > 0) {
                    const { itemsNew, itemsUpdated } = await persistScrapeResult(result, supabase);
                    console.log(`[${scraper.name}] Persisted: ${itemsNew} new, ${itemsUpdated} updated`);

                    const metrics = computeQualityMetrics(result.raffles);
                    const qualityIssues: string[] = [];

                    if (metrics.imageNullRate > 0.80) {
                      qualityIssues.push(`image null ${Math.round(metrics.imageNullRate * 100)}%`);
                      Sentry.captureMessage(`[${scraper.name}] High image null rate`, {
                        level: 'warning',
                        tags: { site: scraper.siteSlug },
                        extra: { imageNullRate: metrics.imageNullRate, total: result.raffles.length },
                      });
                    }
                    if (metrics.priceNullRate > 0.50) {
                      qualityIssues.push(`price null ${Math.round(metrics.priceNullRate * 100)}%`);
                      Sentry.captureMessage(`[${scraper.name}] High price null rate`, {
                        level: 'warning',
                        tags: { site: scraper.siteSlug },
                        extra: { priceNullRate: metrics.priceNullRate, total: result.raffles.length },
                      });
                    }
                    if (metrics.otherTypeRate > 0.60) {
                      qualityIssues.push(`unknown type ${Math.round(metrics.otherTypeRate * 100)}%`);
                      Sentry.captureMessage(`[${scraper.name}] High unknown prize_type rate`, {
                        level: 'warning',
                        tags: { site: scraper.siteSlug },
                        extra: { otherTypeRate: metrics.otherTypeRate, total: result.raffles.length },
                      });
                    }

                    outcomes.push({
                      name: scraper.name,
                      siteSlug: scraper.siteSlug,
                      zeroResults: false,
                      qualityFailure: qualityIssues.length > 0,
                      qualityDetail: qualityIssues.join('; '),
                    });

                    await logScrapeRun(scraper.siteSlug, {
                      status: result.errors.length > 0 ? 'partial' : 'success',
                      itemsFound: result.raffles.length,
                      itemsNew,
                      itemsUpdated,
                      errorMessage: result.errors.join('; ') || undefined,
                      durationMs: result.duration,
                    }, supabase);
                  } else {
                    Sentry.captureMessage(`[${scraper.name}] Returned zero results`, {
                      level: 'warning',
                      tags: { site: scraper.siteSlug },
                      extra: { errors: result.errors },
                    });

                    outcomes.push({
                      name: scraper.name,
                      siteSlug: scraper.siteSlug,
                      zeroResults: true,
                      qualityFailure: false,
                      qualityDetail: `Zero results${result.errors.length ? ': ' + result.errors[0] : ''}`,
                    });

                    await logScrapeRun(scraper.siteSlug, {
                      status: 'failed',
                      itemsFound: 0,
                      itemsNew: 0,
                      itemsUpdated: 0,
                      errorMessage: result.errors.join('; ') || 'No raffles found',
                      durationMs: result.duration,
                    }, supabase);
                  }
```

- [ ] **Step 6: Call checkAggregateFailures after all batches complete**

Find:

```typescript
  console.log(`\n[Orchestrator] ${mode} complete at ${new Date().toISOString()}\n`);
```

Add immediately before it:

```typescript
  if (!quick) {
    checkAggregateFailures(outcomes);
  }
```

- [ ] **Step 7: Run the full test suite**

```bash
npm test
```

Expected: all tests pass (existing lucky-day tests + quality-metrics tests + sentry tests)

- [ ] **Step 8: Commit**

```bash
git add src/scrapers/run-all.ts
git commit -m "feat(eng-1): wire Sentry quality warnings and aggregate failure alert into orchestrator"
```

---

## Deployment checklist (manual steps after all tasks are committed)

- [ ] **Push to origin**

```bash
git push origin main
```

- [ ] **Add SENTRY_DSN to droplet** (copy DSN from the Sentry project settings page)

```bash
ssh root@46.101.53.17
echo 'SENTRY_DSN=https://YOUR_KEY@oNNNNNN.ingest.sentry.io/NNNNNNN' >> /opt/carraffleodds/.env
```

- [ ] **Deploy**

```bash
cd /opt/carraffleodds
pm2 stop scraper
npm install
pm2 start scraper
pm2 logs scraper --lines 20 --nostream
```

- [ ] **Create Sentry Cron Monitor** (Sentry UI → Crons → Create Monitor)
  - Slug: `scraper-full-run`
  - Schedule: `0 */3 * * *`, Timezone: `Europe/London`
  - Check-in margin: 30 min, Max runtime: 45 min

- [ ] **Create Sentry Alert rule** (Sentry UI → Alerts → Create Alert → Issue Alert)
  - Condition: `The issue's level is equal to error`
  - Action: send email to personal address
  - No alert for `warning` level — dashboard only

- [ ] **Verify** — watch the next full scrape cycle in PM2 logs. Confirm Click Competitions fires a `warning`-level event in Sentry (it returns 0 results every run). Confirm no `error`-level alert fires (only one broken scraper).
