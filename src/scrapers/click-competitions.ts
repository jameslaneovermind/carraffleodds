/**
 * Click Competitions Scraper
 * Site: https://www.clickcompetitions.co.uk
 *
 * WordPress/WooCommerce site using Zap Competitions platform.
 * Listing page at /competitions/ is paginated.
 * Cards contain price, % sold, cash alternative, draw date text.
 * Detail pages contain total tickets and exact draw dates.
 * Images hosted on www.clickcompetitions.co.uk.
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
  ticketPrice?: number;       // pence
  percentSold?: number;       // 0-100
  cashAlternative?: number;   // pence
  drawDateText?: string;
  drawType?: string;
}

// ============================================
// Skip patterns
// ============================================

const SKIP_TITLE_PATTERNS = [
  /click credit/i,
  /site credit/i,
];

// ============================================
// Scraper
// ============================================

export class ClickCompetitionsScraper extends BaseScraper {
  name = 'Click Competitions';
  siteSlug = 'click-competitions';
  baseUrl = 'https://www.clickcompetitions.co.uk';

  private listingUrl = 'https://www.clickcompetitions.co.uk/competitions/';

  private static readonly DETAIL_PAGE_TIMEOUT_MS = 45_000;

  // ==========================================
  // Full Scrape
  // ==========================================

  async scrape(context: BrowserContext): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const raffles: ScrapedRaffle[] = [];

    try {
      const cards = await this.scrapeAllListingPages(context);
      console.log(`[${this.name}] Found ${cards.length} competition cards`);

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
                ClickCompetitionsScraper.DETAIL_PAGE_TIMEOUT_MS,
              ),
            ),
          ]);
          if (raffle) raffles.push(raffle);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[${this.name}] Error on ${slug}: ${msg}`);
          errors.push(`${slug}: ${msg}`);

          // Fallback from listing card data
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
      const cards = await this.scrapeAllListingPages(context);

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
  // Listing Pages (with pagination)
  // ==========================================

  private async scrapeAllListingPages(context: BrowserContext): Promise<ListingCard[]> {
    const allCards: ListingCard[] = [];
    let pageNum = 1;
    const maxPages = 5; // safety limit

    while (pageNum <= maxPages) {
      const url = pageNum === 1
        ? this.listingUrl
        : `${this.listingUrl}page/${pageNum}/`;

      const page = await context.newPage();
      try {
        const ok = await this.navigateWithRetry(page, url);
        if (!ok) {
          // If page 2+ fails, we've reached the end
          if (pageNum > 1) break;
          throw new Error(`Failed to load listing page: ${url}`);
        }

        // Check if we got a valid competitions page
        const hasCards = await page.$('a[href*="/competition/"]').then(el => !!el);
        if (!hasCards && pageNum > 1) break;

        // Dismiss cookie banner
        await this.dismissCookies(page);

        // Scroll to load lazy images
        await this.scrollToLoadAll(page);

        const cards = await this.extractListingCards(page);
        if (cards.length === 0 && pageNum > 1) break;

        allCards.push(...cards);
        console.log(`[${this.name}] Page ${pageNum}: ${cards.length} cards`);

        // Check if there's a next page
        const hasNext = await page.$('a.next').then(el => !!el);
        if (!hasNext) break;
      } finally {
        await page.close();
      }

      pageNum++;
      await this.delay(1000);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    return allCards.filter(c => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });
  }

  private async extractListingCards(page: Page): Promise<ListingCard[]> {
    const rawCards = await page.evaluate(() => {
      const results: Array<{
        title: string;
        url: string;
        imageUrl: string;
        text: string;
      }> = [];

      // Competition cards are list items with links to /competition/ URLs
      // Find all the card container links
      const links = document.querySelectorAll('li a[href*="/competition/"]');
      const seen = new Set<string>();

      links.forEach((el) => {
        const a = el as HTMLAnchorElement;
        const href = a.href;

        if (seen.has(href)) return;
        seen.add(href);

        // Skip "Enter Now" buttons — we want the main card link
        if (a.textContent?.trim() === 'Enter Now') return;

        const img = a.querySelector('img') as HTMLImageElement | null;
        const h2 = a.querySelector('h2');

        // Only process cards with a title
        const title = h2 ? h2.textContent?.trim() || '' : '';
        if (!title) return;

        results.push({
          title,
          url: href,
          imageUrl: img?.src || '',
          text: (a.innerText || '').trim(),
        });
      });

      return results;
    });

    return rawCards
      .filter(c => c.title && c.url)
      .filter(c => !SKIP_TITLE_PATTERNS.some(p => p.test(c.title)))
      .map(c => this.parseListingCard(c));
  }

  private parseListingCard(raw: {
    title: string;
    url: string;
    imageUrl: string;
    text: string;
  }): ListingCard {
    const lines = raw.text.split('\n').map(l => l.trim()).filter(Boolean);

    // Price: "£0.14Per Entry" or "£0.14 Per Entry"
    let ticketPrice: number | undefined;
    const priceLine = lines.find(l => /£[\d.]+\s*Per\s*Entry/i.test(l));
    if (priceLine) {
      const priceMatch = priceLine.match(/£([\d.]+)/);
      if (priceMatch) {
        ticketPrice = Math.round(parseFloat(priceMatch[1]) * 100);
      }
    }

    // Percent sold: "27% Sold"
    let percentSold: number | undefined;
    const percentLine = lines.find(l => /\d+%\s*Sold/i.test(l));
    if (percentLine) {
      const pMatch = percentLine.match(/(\d+)%/);
      if (pMatch) percentSold = parseInt(pMatch[1], 10);
    }

    // Cash alternative: "Cash Alternative: £25,000"
    let cashAlternative: number | undefined;
    const cashLine = lines.find(l => /cash alternative/i.test(l));
    if (cashLine) {
      const cashMatch = cashLine.match(/£([\d,]+)/);
      if (cashMatch) {
        cashAlternative = parsePriceToPence(`£${cashMatch[1]}`) ?? undefined;
      }
    }

    // Draw date text: "Draw Tomorrow", "Draw Sat 14th Feb", "Sold Out", "Draw Today"
    let drawDateText: string | undefined;
    const drawLine = lines.find(l =>
      /^draw\s/i.test(l) || /^sold out$/i.test(l)
    );
    if (drawLine) drawDateText = drawLine;

    // Draw type from tags
    let drawType: string | undefined;
    if (lines.some(l => /auto draw/i.test(l))) {
      drawType = 'auto_draw';
    } else {
      drawType = 'live_draw';
    }

    return {
      title: raw.title,
      url: raw.url,
      imageUrl: raw.imageUrl || undefined,
      ticketPrice,
      percentSold,
      cashAlternative,
      drawDateText,
      drawType,
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

        // Total tickets — look for various patterns
        // "Max Entries: 999,999" or "max entries = 999,999" or "Total Tickets: 999,999"
        const maxEntriesMatch = body.match(/(?:max(?:imum)?\s*entries|total\s*tickets)[:\s=]*([\d,]+)/i);
        const totalTicketsStr = maxEntriesMatch ? maxEntriesMatch[1] : null;

        // Draw date — "Draw Date: Saturday 14th February 2026 at 9pm"
        // or "Draw date: 14/02/2026"
        const drawDateMatch = body.match(/draw\s*date[:\s]*(.+?)(?:\n|$)/i);
        const drawDateStr = drawDateMatch ? drawDateMatch[1].trim() : null;

        // Cash alternative from body (in case listing didn't have it)
        const cashMatch = body.match(/cash\s*alternative[:\s]*£([\d,]+)/i);
        const cashAltStr = cashMatch ? '£' + cashMatch[1] : null;

        // Title
        const h1 = document.querySelector('h1, .product_title');
        const title = h1 ? (h1.textContent || '').trim() : '';

        // Image
        const mainImg = document.querySelector('.woocommerce-product-gallery img, .product-image img') as HTMLImageElement | null;
        const imageUrl = mainImg?.src || null;

        // Percent sold
        const percentMatch = body.match(/(\d+)%\s*sold/i);
        const percentStr = percentMatch ? percentMatch[1] : null;

        return {
          title,
          totalTicketsStr,
          drawDateStr,
          cashAltStr,
          imageUrl,
          percentStr,
        };
      });

      const externalId = extractSlugFromUrl(card.url);
      if (!externalId) return null;

      // Parse total tickets
      const totalTickets = pageData.totalTicketsStr
        ? parseInt(pageData.totalTicketsStr.replace(/[^0-9]/g, ''), 10)
        : undefined;

      // Parse draw date
      const endDate = pageData.drawDateStr
        ? this.parseDrawDate(pageData.drawDateStr)
        : this.parseRelativeDrawDate(card.drawDateText);

      // Cash alternative
      const cashAlternative = pageData.cashAltStr
        ? parsePriceToPence(pageData.cashAltStr) ?? undefined
        : card.cashAlternative;

      // Percent sold
      const percentSold = pageData.percentStr
        ? parseFloat(pageData.percentStr)
        : card.percentSold;

      // Tickets sold
      let ticketsSold: number | undefined;
      if (totalTickets && percentSold != null) {
        ticketsSold = Math.round((percentSold / 100) * totalTickets);
      }

      return {
        externalId,
        title: this.sanitizeTitle(pageData.title || card.title, card.url),
        sourceUrl: card.url,
        imageUrl: pageData.imageUrl || card.imageUrl,
        ticketPrice: card.ticketPrice,
        totalTickets,
        ticketsSold,
        percentSold,
        cashAlternative,
        endDate,
        drawType: card.drawType,
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

    return {
      externalId,
      title: this.sanitizeTitle(card.title, card.url),
      sourceUrl: card.url,
      imageUrl: card.imageUrl,
      ticketPrice: card.ticketPrice,
      percentSold: card.percentSold,
      cashAlternative: card.cashAlternative,
      endDate: this.parseRelativeDrawDate(card.drawDateText),
      drawType: card.drawType,
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async dismissCookies(page: Page): Promise<void> {
    try {
      const btn = await page.$('.iubenda-cs-accept-btn, [class*="cookie"] button, #cookie-accept');
      if (btn) {
        await btn.click();
        await this.delay(500);
      }
    } catch {
      // Cookie banner not found
    }
  }

  /**
   * Parse exact draw date from detail page.
   * "Saturday 14th February 2026 at 9pm"
   * "14/02/2026" or "14-02-2026"
   */
  private parseDrawDate(text: string): Date | undefined {
    try {
      // Try UK date format: dd/mm/yyyy
      const ukDateMatch = text.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
      if (ukDateMatch) {
        const day = parseInt(ukDateMatch[1], 10);
        const month = parseInt(ukDateMatch[2], 10) - 1;
        const year = parseInt(ukDateMatch[3], 10);
        return new Date(year, month, day, 21, 0); // Default 9pm
      }

      // Try long format: "Saturday 14th February 2026 at 9pm"
      const cleaned = text
        .replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+/i, '')
        .replace(/(\d+)(st|nd|rd|th)/i, '$1')
        .trim();

      const match = cleaned.match(
        /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i
      );

      if (!match) return undefined;

      const day = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      const year = parseInt(match[3], 10);
      let hour = match[4] ? parseInt(match[4], 10) : 21;
      const minute = match[5] ? parseInt(match[5], 10) : 0;
      const ampm = match[6]?.toLowerCase();

      const months: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3,
        may: 4, june: 5, july: 6, august: 7,
        september: 8, october: 9, november: 10, december: 11,
      };

      const month = months[monthStr];
      if (month === undefined) return undefined;

      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;

      return new Date(year, month, day, hour, minute);
    } catch {
      return undefined;
    }
  }

  /**
   * Parse relative draw date from listing card.
   * "Draw Tomorrow", "Draw Today", "Draw Sat 14th Feb", "Draw Wed 18th Feb"
   * "Sold Out"
   */
  private parseRelativeDrawDate(text?: string): Date | undefined {
    if (!text) return undefined;
    const lower = text.toLowerCase();

    if (lower === 'sold out') return undefined;

    if (lower.includes('today')) {
      const d = new Date();
      d.setHours(21, 0, 0, 0);
      return d;
    }

    if (lower.includes('tomorrow')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(21, 0, 0, 0);
      return d;
    }

    // "Draw Sat 14th Feb" or "Draw Wed 18th Feb"
    const relMatch = text.match(
      /(?:mon|tue|wed|thu|fri|sat|sun)\w*\s+(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/i
    );
    if (relMatch) {
      const day = parseInt(relMatch[1], 10);
      const monthAbbr = relMatch[2].toLowerCase();
      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const month = monthMap[monthAbbr];
      if (month === undefined) return undefined;

      const now = new Date();
      let year = now.getFullYear();
      const candidate = new Date(year, month, day, 21, 0, 0, 0);
      // If the date is in the past, it must be next year
      if (candidate < now) {
        year++;
      }
      return new Date(year, month, day, 21, 0, 0, 0);
    }

    return undefined;
  }

  /** Scroll to load lazy images */
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
