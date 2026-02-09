/**
 * ============================================
 * SCRAPER TEMPLATE — Copy this for new sites
 * ============================================
 *
 * Steps:
 * 1. Copy this file to src/scrapers/{site-slug}.ts
 * 2. Replace all TODO comments with real implementation
 * 3. Register in src/scrapers/run-all.ts
 * 4. Add site row to Supabase sites table
 * 5. Test: npx tsx src/scrapers/run-all.ts --site={site-slug}
 */

import { BrowserContext, Page } from 'playwright';
import {
  BaseScraper,
  ScrapedRaffle,
  ScraperResult,
  QuickUpdateResult,
} from './base';
import { parsePriceToPence, extractSlugFromUrl } from '../lib/utils';

// ============================================
// Types for this scraper
// ============================================

interface ListingCard {
  title: string;
  url: string;
  imageUrl?: string;
  ticketPrice?: number;   // pence
  percentSold?: number;   // 0-100
  cashAlternative?: number; // pence
}

// ============================================
// Scraper Implementation
// ============================================

export class TemplateScraper extends BaseScraper {
  // TODO: Update these three properties
  name = 'Site Display Name';
  siteSlug = 'site-slug';        // Must match sites table
  baseUrl = 'https://example.com';

  // TODO: Set the listing page URL
  private listingUrl = 'https://example.com/competitions';

  // ==========================================
  // Full Scrape — listing + detail pages
  // ==========================================

  async scrape(context: BrowserContext): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const raffles: ScrapedRaffle[] = [];

    try {
      // 1. Get listing page cards
      const cards = await this.scrapeListingPage(context);
      console.log(`[${this.name}] Found ${cards.length} competition cards`);

      // 2. Visit each detail page
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const slug = extractSlugFromUrl(card.url);
        console.log(`[${this.name}] [${i + 1}/${cards.length}] Scraping: ${slug}`);

        try {
          const raffle = await this.scrapeDetailPage(context, card);
          if (raffle) raffles.push(raffle);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[${this.name}] Error on ${slug}: ${msg}`);
          errors.push(`${slug}: ${msg}`);

          // Fallback: build raffle from listing card data
          const fallback = this.buildRaffleFromCard(card);
          if (fallback) raffles.push(fallback);
        }

        await this.delay(1500); // Rate limiting
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Fatal: ${msg}`);
      console.error(`[${this.name}] Fatal error: ${msg}`);
    }

    return {
      siteName: this.name,
      siteSlug: this.siteSlug,
      raffles,
      errors,
      duration: Date.now() - start,
    };
  }

  // ==========================================
  // Quick Update — listing page only
  // ==========================================

  async quickUpdate(context: BrowserContext): Promise<QuickUpdateResult> {
    const start = Date.now();
    const errors: string[] = [];
    const updates: QuickUpdateResult['updates'] = [];

    try {
      const cards = await this.scrapeListingPage(context);

      for (const card of cards) {
        const externalId = extractSlugFromUrl(card.url);
        if (!externalId) continue;

        updates.push({
          externalId,
          percentSold: card.percentSold,
          ticketPrice: card.ticketPrice,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
    }

    return {
      siteName: this.name,
      siteSlug: this.siteSlug,
      updates,
      errors,
      duration: Date.now() - start,
    };
  }

  // ==========================================
  // Listing Page — extract competition cards
  // ==========================================

  private async scrapeListingPage(context: BrowserContext): Promise<ListingCard[]> {
    const page = await context.newPage();

    try {
      const ok = await this.navigateWithRetry(page, this.listingUrl);
      if (!ok) throw new Error(`Failed to load listing page: ${this.listingUrl}`);

      // TODO: Wait for competition cards to load
      // await page.waitForSelector('.competition-card', { timeout: 15000 });

      // TODO: If the page uses lazy loading, scroll to trigger it:
      // await this.scrollToLoadAll(page);

      // TODO: Extract card data from the listing page
      const cards = await page.evaluate(() => {
        const items: Array<{
          title: string;
          url: string;
          imageUrl?: string;
          priceText?: string;
          percentText?: string;
          cashText?: string;
        }> = [];

        // TODO: Replace with actual selectors
        // document.querySelectorAll('.competition-card').forEach((el) => {
        //   items.push({
        //     title: el.querySelector('.title')?.textContent?.trim() ?? '',
        //     url: (el.querySelector('a') as HTMLAnchorElement)?.href ?? '',
        //     imageUrl: (el.querySelector('img') as HTMLImageElement)?.src,
        //     priceText: el.querySelector('.price')?.textContent?.trim(),
        //     percentText: el.querySelector('.sold')?.textContent?.trim(),
        //     cashText: el.querySelector('.cash-alt')?.textContent?.trim(),
        //   });
        // });

        return items;
      });

      // Parse raw text into typed values
      return cards
        .filter((c) => c.title && c.url)
        .map((c) => ({
          title: c.title,
          url: c.url,
          imageUrl: c.imageUrl,
          ticketPrice: c.priceText ? parsePriceToPence(c.priceText) ?? undefined : undefined,
          percentSold: c.percentText
            ? parseFloat(c.percentText.replace(/[^0-9.]/g, ''))
            : undefined,
          cashAlternative: c.cashText ? parsePriceToPence(c.cashText) ?? undefined : undefined,
        }));
    } finally {
      await page.close();
    }
  }

  // ==========================================
  // Detail Page — extract full raffle data
  // ==========================================

  private async scrapeDetailPage(
    context: BrowserContext,
    card: ListingCard
  ): Promise<ScrapedRaffle | null> {
    const page = await context.newPage();

    try {
      const ok = await this.navigateWithRetry(page, card.url);
      if (!ok) return this.buildRaffleFromCard(card);

      // TODO: Wait for detail content to load
      // await page.waitForSelector('.competition-detail', { timeout: 10000 });

      // --- Extract data from detail page ---

      // Title (clean up from page title or heading)
      const rawTitle = await page.title();
      const title = rawTitle
        // TODO: Remove site name suffix, e.g.:
        // .replace(/ [-–|] Site Name.*$/i, '')
        .trim() || card.title;

      // TODO: Extract total tickets
      // const totalTicketsText = await this.safeText(page, '.total-tickets');
      // const totalTickets = totalTicketsText
      //   ? parseInt(totalTicketsText.replace(/[^0-9]/g, ''), 10)
      //   : undefined;
      const totalTickets: number | undefined = undefined;

      // TODO: Extract percent sold
      // const percentText = await this.safeText(page, '.percent-sold');
      // const percentSold = percentText
      //   ? parseFloat(percentText.replace(/[^0-9.]/g, ''))
      //   : card.percentSold;
      const percentSold = card.percentSold;

      // TODO: Extract tickets sold (if available separately from %)
      let ticketsSold: number | undefined;
      if (totalTickets && percentSold != null) {
        ticketsSold = Math.round((percentSold / 100) * totalTickets);
      }

      // TODO: Extract ticket price from detail page
      // const priceText = await this.safeText(page, '.ticket-price');
      // const ticketPrice = priceText ? parsePriceToPence(priceText) : card.ticketPrice;
      const ticketPrice = card.ticketPrice;

      // TODO: Extract cash alternative
      // const cashText = await this.safeText(page, '.cash-alternative');
      // const cashAlternative = cashText ? parsePriceToPence(cashText) : card.cashAlternative;
      const cashAlternative = card.cashAlternative;

      // TODO: Extract end date
      // const dateText = await this.safeText(page, '.draw-date');
      // const endDate = dateText ? this.parseDate(dateText) : undefined;
      const endDate: Date | undefined = undefined;

      // TODO: Extract draw type
      // const drawType = await this.safeText(page, '.draw-type');
      const drawType: string | undefined = undefined;

      // TODO: Extract hero image (prefer exterior shot)
      // const imageUrl = await this.safeAttr(page, '.hero-image img', 'src')
      //   ?? card.imageUrl;
      const imageUrl = card.imageUrl;

      const externalId = extractSlugFromUrl(card.url);
      if (!externalId) return null;

      return {
        externalId,
        title,
        sourceUrl: card.url,
        imageUrl,
        ticketPrice,
        totalTickets,
        ticketsSold,
        percentSold,
        cashAlternative,
        endDate,
        drawType,
      };
    } finally {
      await page.close();
    }
  }

  // ==========================================
  // Fallback — build raffle from card data only
  // ==========================================

  private buildRaffleFromCard(card: ListingCard): ScrapedRaffle | null {
    const externalId = extractSlugFromUrl(card.url);
    if (!externalId) return null;

    return {
      externalId,
      title: card.title,
      sourceUrl: card.url,
      imageUrl: card.imageUrl,
      ticketPrice: card.ticketPrice,
      percentSold: card.percentSold,
      cashAlternative: card.cashAlternative,
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  /**
   * Scroll down the page to trigger lazy-loaded content.
   */
  private async scrollToLoadAll(page: Page): Promise<void> {
    let previousHeight = 0;
    for (let i = 0; i < 20; i++) {
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      if (currentHeight === previousHeight) break;
      previousHeight = currentHeight;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.delay(800);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * TODO: Add any site-specific date parsing.
   * Common patterns:
   *   "Draw Tomorrow 10pm" → tomorrow at 22:00
   *   "15/02/2025"         → new Date(2025, 1, 15)
   *   "Competition closes in X Days Y Hours" → relative from now
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private parseDate(text: string): Date | undefined {
    // TODO: Implement
    return undefined;
  }
}
