/**
 * Lucky Day Competitions Scraper
 * Site: https://www.luckydaycompetitions.com
 *
 * WooCommerce site. Listing page at /all-competitions/ shows ALL competitions.
 * Cards have rich data: price, total tickets, remaining count, end dates.
 * Product URLs: /product/{slug}/
 * Images on www.luckydaycompetitions.com.
 *
 * Ticket data format: "Tickets remaining 98% 588/597"
 *   → remaining% = 98, remaining = 588, total = 597
 *   → percentSold = 100 - 98 = 2
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
// Types
// ============================================

interface ListingCard {
  title: string;
  url: string;
  imageUrl?: string;
  ticketPrice?: number;     // pence
  totalTickets?: number;
  ticketsRemaining?: number;
  percentSold?: number;     // 0-100
  endDateText?: string;
}

// ============================================
// Skip patterns
// ============================================

const SKIP_TITLE_PATTERNS = [
  /gift voucher/i,
];

// ============================================
// Scraper
// ============================================

export class LuckyDayCompetitionsScraper extends BaseScraper {
  name = 'Lucky Day Competitions';
  siteSlug = 'lucky-day-competitions';
  baseUrl = 'https://www.luckydaycompetitions.com';

  private listingUrl = 'https://www.luckydaycompetitions.com/all-competitions/';

  private static readonly DETAIL_PAGE_TIMEOUT_MS = 45_000;

  // ==========================================
  // Full Scrape
  // ==========================================

  async scrape(context: BrowserContext): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const raffles: ScrapedRaffle[] = [];

    try {
      const cards = await this.scrapeListingPage(context);
      console.log(`[${this.name}] Found ${cards.length} competition cards`);

      // Listing page has most data; visit detail pages for cash alternative
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const slug = extractSlugFromUrl(card.url);
        console.log(`[${this.name}] [${i + 1}/${cards.length}] Scraping: ${slug}`);

        try {
          const raffle = await Promise.race([
            this.scrapeDetailPage(context, card),
            new Promise<null>((_, reject) =>
              setTimeout(
                () => reject(new Error('Detail page timed out')),
                LuckyDayCompetitionsScraper.DETAIL_PAGE_TIMEOUT_MS,
              ),
            ),
          ]);
          if (raffle) raffles.push(raffle);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[${this.name}] Error on ${slug}: ${msg}`);
          errors.push(`${slug}: ${msg}`);

          // Fallback from listing data (already very rich)
          const fallback = this.buildRaffleFromCard(card);
          if (fallback) raffles.push(fallback);
        }

        await this.delay(800);
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
  // Quick Update
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
  // Listing Page
  // ==========================================

  private async scrapeListingPage(context: BrowserContext): Promise<ListingCard[]> {
    const page = await context.newPage();

    try {
      const ok = await this.navigateWithRetry(page, this.listingUrl);
      if (!ok) throw new Error(`Failed to load listing page: ${this.listingUrl}`);

      // Wait for product cards
      await page.waitForSelector('a[href*="/product/"]', { timeout: 15000 }).catch(() => {});

      // Scroll to load all
      await this.scrollToLoadAll(page);

      // Extract raw link data from page
      const rawCards = await page.evaluate(() => {
        const results: Array<{
          url: string;
          text: string;
          imageUrl: string;
        }> = [];

        const seen = new Set<string>();
        const links = document.querySelectorAll('li a[href*="/product/"]');

        links.forEach((el) => {
          const a = el as HTMLAnchorElement;
          const href = a.href;

          if (seen.has(href)) return;
          seen.add(href);

          // Skip "Enter Now" / "Quick Buy" standalone buttons
          const text = (a.innerText || '').trim();
          if (!text || text === 'Enter Now' || text === 'Quick Buy' || text === 'Read More') return;

          const img = a.querySelector('img') as HTMLImageElement | null;

          results.push({
            url: href,
            text,
            imageUrl: img ? img.src : '',
          });
        });

        return results;
      });

      return rawCards
        .map(c => this.parseListingCard(c))
        .filter((c): c is ListingCard => !!c && !!c.title)
        .filter(c => !SKIP_TITLE_PATTERNS.some(p => p.test(c.title)))
        .filter(c => c.ticketPrice !== undefined && c.ticketPrice > 0); // Skip free entries
    } finally {
      await page.close();
    }
  }

  private parseListingCard(raw: {
    url: string;
    text: string;
    imageUrl: string;
  }): ListingCard | null {
    const lines = raw.text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    // Price: "£1.97" or "£0.97" — first line starting with £
    let ticketPrice: number | undefined;
    const priceLine = lines.find(l => /^£[\d.]+$/.test(l));
    if (priceLine) {
      ticketPrice = parsePriceToPence(priceLine) ?? undefined;
    }

    // Tickets remaining: "Tickets remaining 98% 588/597" or just "98% 588/597"
    let totalTickets: number | undefined;
    let ticketsRemaining: number | undefined;
    let percentSold: number | undefined;

    // Look for the "XXX/XXX" pattern (remaining/total)
    const ticketLine = lines.find(l => /\d+\/\d+/.test(l));
    if (ticketLine) {
      const ratioMatch = ticketLine.match(/(\d+)\s*\/\s*(\d+)/);
      if (ratioMatch) {
        ticketsRemaining = parseInt(ratioMatch[1], 10);
        totalTickets = parseInt(ratioMatch[2], 10);
        const ticketsSold = totalTickets - ticketsRemaining;
        percentSold = totalTickets > 0 ? Math.round((ticketsSold / totalTickets) * 100) : 0;
      }
    }

    // If we didn't get percent from ratio, try the "Tickets remaining XX%" text
    if (percentSold === undefined) {
      const remainingLine = lines.find(l => /tickets remaining\s+\d+%/i.test(l));
      if (remainingLine) {
        const pctMatch = remainingLine.match(/(\d+)%/);
        if (pctMatch) {
          const remainingPct = parseInt(pctMatch[1], 10);
          percentSold = 100 - remainingPct;
        }
      }
    }

    // End date: "Ends Tue 10th Feb" or "Ends Sun 1st Mar"
    let endDateText: string | undefined;
    const endLine = lines.find(l => /^ends\s/i.test(l));
    if (endLine) endDateText = endLine;

    // Title: extract from the URL slug since the card text is messy
    // Actually, better to find the title from the text — it's usually the last substantive line
    // that isn't price, tickets, buttons, etc.
    const skipLinePatterns = [
      /^£[\d.]+$/,
      /tickets remaining/i,
      /^\d+%/,
      /^\d+\/\d+/,
      /^quick buy$/i,
      /^enter now$/i,
      /^read more$/i,
      /^ends\s/i,
      /^every ticket wins$/i,
      /^win for free!$/i,
      /^less than \d+% left$/i,
      /^just launched$/i,
      /^😮/,
      /^😲/,
      /^⏱️/,
    ];

    // Title: first line that isn't a skip pattern and has enough substance
    const titleCandidates = lines.filter(l =>
      !skipLinePatterns.some(p => p.test(l)) && l.length > 3
    );

    // The title is typically at the very start or is the first meaningful line
    const title = titleCandidates[0] || '';

    if (!title) return null;

    return {
      title,
      url: raw.url,
      imageUrl: raw.imageUrl || undefined,
      ticketPrice,
      totalTickets,
      ticketsRemaining,
      percentSold,
      endDateText,
    };
  }

  // ==========================================
  // Detail Page
  // ==========================================

  private async scrapeDetailPage(
    context: BrowserContext,
    card: ListingCard,
  ): Promise<ScrapedRaffle | null> {
    const page = await context.newPage();

    try {
      const ok = await this.navigateWithRetry(page, card.url);
      if (!ok) return this.buildRaffleFromCard(card);

      await page.waitForSelector('h1, .product_title', { timeout: 10000 }).catch(() => {});

      const pageData = await page.evaluate(() => {
        const body = document.body.innerText;

        // Title
        const h1 = document.querySelector('h1, .product_title');
        const title = h1 ? (h1.textContent || '').trim() : '';

        // Cash alternative
        const cashMatch = body.match(/cash\s*alternative[:\s]*£([\d,]+)/i);
        const cashAltStr = cashMatch ? '£' + cashMatch[1] : null;

        // Prize value
        const prizeMatch = body.match(/(?:prize|rrp|value)[:\s]*£([\d,]+)/i);
        const prizeStr = prizeMatch ? '£' + prizeMatch[1] : null;

        // Image
        const mainImg = document.querySelector('.woocommerce-product-gallery img, .product-image img, img.wp-post-image') as HTMLImageElement | null;
        const imageUrl = mainImg?.src || null;

        // Total tickets from detail (backup)
        const ticketMatch = body.match(/(?:max|total)\s*(?:entries|tickets)[:\s]*([\d,]+)/i);
        const totalTicketsStr = ticketMatch ? ticketMatch[1] : null;

        return {
          title,
          cashAltStr,
          prizeStr,
          imageUrl,
          totalTicketsStr,
        };
      });

      const externalId = extractSlugFromUrl(card.url);
      if (!externalId) return null;

      // Cash alternative
      const cashAlternative = pageData.cashAltStr
        ? parsePriceToPence(pageData.cashAltStr) ?? undefined
        : undefined;

      // Prize value
      const prizeValue = pageData.prizeStr
        ? parsePriceToPence(pageData.prizeStr) ?? undefined
        : undefined;

      const totalTickets = card.totalTickets
        || (pageData.totalTicketsStr
          ? parseInt(pageData.totalTicketsStr.replace(/[^0-9]/g, ''), 10)
          : undefined);

      const ticketsSold = totalTickets && card.ticketsRemaining !== undefined
        ? totalTickets - card.ticketsRemaining
        : undefined;

      return {
        externalId,
        title: pageData.title || card.title,
        sourceUrl: card.url,
        imageUrl: pageData.imageUrl || card.imageUrl,
        ticketPrice: card.ticketPrice,
        totalTickets,
        ticketsSold,
        percentSold: card.percentSold,
        cashAlternative,
        prizeValue,
        endDate: this.parseRelativeDate(card.endDateText),
        drawType: 'live_draw',
      };
    } finally {
      await page.close();
    }
  }

  // ==========================================
  // Fallback
  // ==========================================

  private buildRaffleFromCard(card: ListingCard): ScrapedRaffle | null {
    const externalId = extractSlugFromUrl(card.url);
    if (!externalId) return null;

    const ticketsSold = card.totalTickets && card.ticketsRemaining !== undefined
      ? card.totalTickets - card.ticketsRemaining
      : undefined;

    return {
      externalId,
      title: card.title,
      sourceUrl: card.url,
      imageUrl: card.imageUrl,
      ticketPrice: card.ticketPrice,
      totalTickets: card.totalTickets,
      ticketsSold,
      percentSold: card.percentSold,
      endDate: this.parseRelativeDate(card.endDateText),
      drawType: 'live_draw',
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  /**
   * Parse relative end date.
   * "Ends Tue 10th Feb" → Date
   * "Ends Sun 1st Mar" → Date
   */
  private parseRelativeDate(text?: string): Date | undefined {
    if (!text) return undefined;

    const match = text.match(
      /(?:mon|tue|wed|thu|fri|sat|sun)\w*\s+(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/i
    );

    if (!match) return undefined;

    const day = parseInt(match[1], 10);
    const monthAbbr = match[2].toLowerCase();
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const month = monthMap[monthAbbr];
    if (month === undefined) return undefined;

    const now = new Date();
    let year = now.getFullYear();
    const candidate = new Date(year, month, day, 21, 0, 0, 0);
    if (candidate < now) year++;

    return new Date(year, month, day, 21, 0, 0, 0);
  }

  /** Scroll to load lazy content */
  private async scrollToLoadAll(page: Page): Promise<void> {
    let previousHeight = 0;
    for (let i = 0; i < 15; i++) {
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      if (currentHeight === previousHeight) break;
      previousHeight = currentHeight;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.delay(600);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
}
