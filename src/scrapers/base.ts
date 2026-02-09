import { Browser, BrowserContext, Page } from 'playwright';
import { classifyPrizeType, classifyCarCategory, parseCashFromTitle, calculateRaffleMetrics } from '../lib/utils';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Base Scraper Types & Interface
// ============================================

export interface ScrapedRaffle {
  externalId: string;
  title: string;
  carMake?: string;
  carModel?: string;
  carYear?: number;
  carVariant?: string;
  prizeValue?: number;        // pence
  cashAlternative?: number;   // pence
  additionalCash?: number;    // pence
  imageUrl?: string;
  sourceUrl: string;
  ticketPrice?: number;       // pence
  totalTickets?: number;
  ticketsSold?: number;
  percentSold?: number;
  endDate?: Date;
  drawType?: string;
}

export interface ScraperResult {
  siteName: string;
  siteSlug: string;
  raffles: ScrapedRaffle[];
  errors: string[];
  duration: number;           // ms
}

export interface QuickUpdateResult {
  siteName: string;
  siteSlug: string;
  updates: Array<{
    externalId: string;
    percentSold?: number;
    ticketPrice?: number;
    status?: string;
  }>;
  errors: string[];
  duration: number;
}

export abstract class BaseScraper {
  abstract name: string;
  abstract siteSlug: string;
  abstract baseUrl: string;

  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;

  /**
   * Full deep scrape — visits listing + detail pages.
   */
  abstract scrape(context: BrowserContext): Promise<ScraperResult>;

  /**
   * Quick listing-only scrape — just updates % sold, price, status.
   */
  abstract quickUpdate(context: BrowserContext): Promise<QuickUpdateResult>;

  /**
   * Rate limiting — wait between requests.
   */
  protected async delay(ms: number = 1500): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Navigate to a page with retries.
   */
  protected async navigateWithRetry(
    page: Page,
    url: string,
    options: { maxRetries?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {}
  ): Promise<boolean> {
    const { maxRetries = 3, waitUntil = 'domcontentloaded' } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.goto(url, { waitUntil, timeout: 30000 });
        return true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[${this.name}] Navigation attempt ${attempt}/${maxRetries} failed for ${url}: ${msg}`);
        if (attempt < maxRetries) {
          await this.delay(2000 * attempt);
        }
      }
    }
    return false;
  }

  /**
   * Safe text extraction from a page element.
   */
  protected async safeText(page: Page, selector: string): Promise<string | null> {
    try {
      const el = await page.$(selector);
      if (!el) return null;
      const text = await el.textContent();
      return text?.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Safe attribute extraction from a page element.
   */
  protected async safeAttr(page: Page, selector: string, attr: string): Promise<string | null> {
    try {
      const el = await page.$(selector);
      if (!el) return null;
      return await el.getAttribute(attr);
    } catch {
      return null;
    }
  }
}

// ============================================
// Database Persistence — Upsert scraped data
// ============================================

/**
 * Persist a full scrape result to the database.
 * Upserts raffles (insert new, update existing) based on site_id + external_id.
 */
export async function persistScrapeResult(
  result: ScraperResult,
  supabase: SupabaseClient
): Promise<{ itemsNew: number; itemsUpdated: number }> {
  // Get site ID
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', result.siteSlug)
    .single();

  if (siteError || !site) {
    throw new Error(`Site not found for slug "${result.siteSlug}": ${siteError?.message}`);
  }

  let itemsNew = 0;
  let itemsUpdated = 0;

  for (const raffle of result.raffles) {
    // Skip free entries (£0.00 ticket price)
    if (raffle.ticketPrice != null && raffle.ticketPrice <= 0) {
      continue;
    }

    // Classify
    const prizeType = classifyPrizeType(raffle.title);
    const carCategory = prizeType === 'car' || prizeType === 'motorcycle'
      ? classifyCarCategory(raffle.title, raffle.carMake, raffle.carModel)
      : null;

    // Parse cash values from title if not provided
    const titleCash = parseCashFromTitle(raffle.title);
    const cashAlternative = raffle.cashAlternative ?? titleCash.cashAlternative;
    const additionalCash = raffle.additionalCash ?? titleCash.additionalCash;

    // Calculate metrics
    const metrics = calculateRaffleMetrics({
      prizeValue: raffle.prizeValue ?? null,
      cashAlternative: cashAlternative ?? null,
      totalTickets: raffle.totalTickets ?? null,
      ticketPrice: raffle.ticketPrice ?? null,
      ticketsSold: raffle.ticketsSold ?? null,
      endDate: raffle.endDate ?? null,
    });

    const row = {
      site_id: site.id,
      external_id: raffle.externalId,
      title: raffle.title,
      prize_type: prizeType,
      car_make: raffle.carMake || null,
      car_model: raffle.carModel || null,
      car_year: raffle.carYear || null,
      car_variant: raffle.carVariant || null,
      car_category: carCategory,
      prize_value: raffle.prizeValue || null,
      cash_alternative: cashAlternative,
      additional_cash: additionalCash,
      image_url: raffle.imageUrl || null,
      source_url: raffle.sourceUrl,
      ticket_price: raffle.ticketPrice || null,
      total_tickets: raffle.totalTickets || null,
      tickets_sold: raffle.ticketsSold || null,
      tickets_remaining: metrics.tickets_remaining,
      percent_sold: raffle.percentSold ?? metrics.percent_sold,
      odds_ratio: metrics.odds_ratio,
      value_per_pound: metrics.value_per_pound,
      expected_value: metrics.expected_value,
      end_date: raffle.endDate?.toISOString() || null,
      draw_type: raffle.drawType || null,
      status: metrics.status,
      last_scraped_at: new Date().toISOString(),
    };

    // Check if exists
    const { data: existing } = await supabase
      .from('raffles')
      .select('id')
      .eq('site_id', site.id)
      .eq('external_id', raffle.externalId)
      .single();

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
    } else {
      // Insert new
      const { error } = await supabase
        .from('raffles')
        .insert(row);

      if (error) {
        console.error(`[persist] Failed to insert raffle ${raffle.externalId}: ${error.message}`);
      } else {
        itemsNew++;
      }
    }
  }

  return { itemsNew, itemsUpdated };
}

/**
 * Persist quick update results — only updates % sold, price, status.
 */
export async function persistQuickUpdate(
  result: QuickUpdateResult,
  supabase: SupabaseClient
): Promise<number> {
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', result.siteSlug)
    .single();

  if (!site) return 0;

  let updated = 0;

  for (const update of result.updates) {
    const updateData: Record<string, unknown> = {
      last_scraped_at: new Date().toISOString(),
    };

    if (update.percentSold != null) updateData.percent_sold = update.percentSold;
    if (update.ticketPrice != null) updateData.ticket_price = update.ticketPrice;
    if (update.status) updateData.status = update.status;

    const { error } = await supabase
      .from('raffles')
      .update(updateData)
      .eq('site_id', site.id)
      .eq('external_id', update.externalId);

    if (!error) updated++;
  }

  return updated;
}

/**
 * Log a scrape run to the scrape_logs table.
 */
export async function logScrapeRun(
  siteSlug: string,
  result: {
    status: 'success' | 'partial' | 'failed';
    itemsFound: number;
    itemsNew: number;
    itemsUpdated: number;
    errorMessage?: string;
    durationMs: number;
  },
  supabase: SupabaseClient
): Promise<void> {
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', siteSlug)
    .single();

  if (!site) return;

  await supabase.from('scrape_logs').insert({
    site_id: site.id,
    started_at: new Date(Date.now() - result.durationMs).toISOString(),
    completed_at: new Date().toISOString(),
    status: result.status,
    items_found: result.itemsFound,
    items_new: result.itemsNew,
    items_updated: result.itemsUpdated,
    error_message: result.errorMessage || null,
    duration_ms: result.durationMs,
  });
}
