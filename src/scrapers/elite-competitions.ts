/**
 * Elite Competitions Scraper
 * Site: https://elitecompetitions.co.uk
 *
 * Homepage has all competitions organized by category tabs.
 * Detail pages at /competitions/{slug}-{id} contain total tickets + draw date.
 * Images hosted on images.elitecompetitions.co.uk and storage.googleapis.com.
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
  ticketPrice?: number;   // pence
  percentSold?: number;   // 0-100
  cashAlternative?: number; // pence
  endDateText?: string;
}

// ============================================
// Skip patterns — competitions we don't want
// ============================================

/** URL patterns that indicate non-standard competitions */
const SKIP_URL_PATTERNS = [
  '/coming-soon/',
  '/daily-draws/',
  '/daily-draw',
  '/bonus-draw',
];

/** Title patterns to skip */
const SKIP_TITLE_PATTERNS = [
  'elite club',
  'credit bonanza',
  'members only',
  'free to enter',
  'gift card',
];

// ============================================
// Scraper Implementation
// ============================================

export class EliteCompetitionsScraper extends BaseScraper {
  name = 'Elite Competitions';
  siteSlug = 'elite-competitions';
  baseUrl = 'https://elitecompetitions.co.uk';

  private listingUrl = 'https://elitecompetitions.co.uk';

  /** Per-detail-page timeout */
  private static readonly DETAIL_PAGE_TIMEOUT_MS = 45_000;

  // ==========================================
  // Full Scrape — listing + detail pages
  // ==========================================

  async scrape(context: BrowserContext): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const raffles: ScrapedRaffle[] = [];

    try {
      const cards = await this.scrapeListingPage(context);
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
                EliteCompetitionsScraper.DETAIL_PAGE_TIMEOUT_MS
              )
            ),
          ]);
          if (raffle) raffles.push(raffle);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[${this.name}] Error on ${slug}: ${msg}`);
          errors.push(`${slug}: ${msg}`);

          // Fallback: build from listing card data
          const fallback = this.buildRaffleFromCard(card);
          if (fallback) raffles.push(fallback);
        }

        await this.delay(1000);
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
  // Listing Page
  // ==========================================

  private async scrapeListingPage(context: BrowserContext): Promise<ListingCard[]> {
    const page = await context.newPage();

    try {
      const ok = await this.navigateWithRetry(page, this.listingUrl);
      if (!ok) throw new Error(`Failed to load listing page: ${this.listingUrl}`);

      // Dismiss cookie banner if present
      await this.dismissCookies(page);

      // Wait for competition cards to load
      await page.waitForSelector('a[href*="/competitions/"]', { timeout: 15000 }).catch(() => {});

      // Scroll to load lazy content
      await this.scrollToLoadAll(page);

      // Extract raw card data — keep evaluate simple, no TS types inside
      const rawLinks = await page.evaluate(() => {
        const results: Array<{ url: string; text: string; imageUrl: string }> = [];
        const els = document.querySelectorAll('a[href*="/competitions/"]');
        els.forEach((el) => {
          const a = el as HTMLAnchorElement;
          const img = a.querySelector('img') as HTMLImageElement | null;
          results.push({
            url: a.href,
            text: (a.innerText || '').trim(),
            imageUrl: img ? img.src : '',
          });
        });
        return results;
      });

      // Process raw links outside of evaluate (full TypeScript available here)
      const rawCards = this.processRawCards(rawLinks);

      // Parse and filter
      return rawCards
        .filter((c) => c.title && c.url)
        .filter((c) => !this.shouldSkip(c.title, c.url))
        .map((c) => ({
          title: c.title,
          url: c.url,
          imageUrl: c.imageUrl,
          ticketPrice: c.priceText ? parsePriceToPence(c.priceText) ?? undefined : undefined,
          percentSold: c.percentText
            ? parseFloat(c.percentText.replace(/[^0-9.]/g, ''))
            : undefined,
          cashAlternative: c.cashText ? this.parseCashFromCard(c.cashText) : undefined,
          endDateText: c.endDateText,
        }));
    } finally {
      await page.close();
    }
  }

  // ==========================================
  // Detail Page
  // ==========================================

  private async scrapeDetailPage(
    context: BrowserContext,
    card: ListingCard
  ): Promise<ScrapedRaffle | null> {
    const page = await context.newPage();

    try {
      const ok = await this.navigateWithRetry(page, card.url);
      if (!ok) return this.buildRaffleFromCard(card);

      // Wait for content
      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

      // Extract data from page body text
      const pageData = await page.evaluate(() => {
        const body = document.body.innerText;

        const ticketsMatch = body.match(/total amount of entries:\s*([\d,]+)/i);
        const drawDateMatch = body.match(/draw date and time:\s*(.+?)(?:\n|$)/i);
        const priceMatch = body.match(/entry price:\s*([\d.p£]+)/i);
        const cashAltMatch = body.match(/£([\d,]+)\s*cash alternative/i);
        const percentMatch = body.match(/(\d+)%\s*SOLD/i);

        const h1 = document.querySelector('h1');
        const heroImg = document.querySelector('img[src*="competitions/"]');

        return {
          title: h1 ? (h1.textContent || '').trim() : '',
          totalTicketsStr: ticketsMatch ? ticketsMatch[1] : null,
          drawDateStr: drawDateMatch ? drawDateMatch[1].trim() : null,
          priceStr: priceMatch ? priceMatch[1] : null,
          cashAltStr: cashAltMatch ? '£' + cashAltMatch[1] : null,
          percentStr: percentMatch ? percentMatch[1] : null,
          imageUrl: heroImg ? heroImg.getAttribute('src') : null,
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
        : this.parseRelativeDate(card.endDateText);

      // Parse price from detail page, fallback to card
      let ticketPrice = card.ticketPrice;
      if (pageData.priceStr) {
        const detailPrice = this.parseEntryPrice(pageData.priceStr);
        if (detailPrice) ticketPrice = detailPrice;
      }

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

      // Title — prefer h1, fallback to card, then URL slug
      const title = this.sanitizeTitle(pageData.title || card.title, card.url);

      // Image — prefer detail page, fallback to card
      const imageUrl = pageData.imageUrl || card.imageUrl;

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

    return {
      externalId,
      title: this.sanitizeTitle(card.title, card.url),
      sourceUrl: card.url,
      imageUrl: card.imageUrl,
      ticketPrice: card.ticketPrice,
      percentSold: card.percentSold,
      cashAlternative: card.cashAlternative,
      endDate: this.parseRelativeDate(card.endDateText),
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  /** Process raw link data into structured cards with deduplication */
  private processRawCards(
    rawLinks: Array<{ url: string; text: string; imageUrl: string }>
  ): Array<{
    title: string;
    url: string;
    imageUrl?: string;
    priceText?: string;
    percentText?: string;
    cashText?: string;
    endDateText?: string;
  }> {
    const skipLinePatterns = [
      /^£\d/,
      /^\d+%\s*SOLD/i,
      /cash alternative/i,
      /prize pot/i,
      /^enter now$/i,
      /^ends?\s/i,
      /^just launched/i,
      /^members only$/i,
      /^free to enter$/i,
      /^app exclusive$/i,
      /^\d+$/,
      /^[HMS]$/,
      /^details$/i,
      /^launching/i,
      /^join the club$/i,
      /^grab a free/i,
      /^how would you/i,
      /^win big/i,
      /^every day/i,
    ];

    type CardData = {
      title: string;
      url: string;
      imageUrl?: string;
      priceText?: string;
      percentText?: string;
      cashText?: string;
      endDateText?: string;
    };

    const allCards: CardData[] = [];

    for (const link of rawLinks) {
      if (!link.text) continue;

      const lines = link.text.split('\n').map(l => l.trim()).filter(Boolean);

      const priceLine = lines.find(l => /^£\d/.test(l) && l.length < 15);
      const percentLine = lines.find(l => /\d+%\s*SOLD/i.test(l));
      const cashLine = lines.find(l =>
        /cash alternative/i.test(l) || /prize pot/i.test(l)
      );
      const endDateLine = lines.find(l =>
        /ends?\s+(in\s+\d|tomorrow)/i.test(l) || /just launched/i.test(l)
      );

      const titleCandidates = lines.filter(l =>
        !skipLinePatterns.some(p => p.test(l))
      );
      const title = titleCandidates[0] || '';

      allCards.push({
        title,
        url: link.url,
        imageUrl: link.imageUrl || undefined,
        priceText: priceLine,
        percentText: percentLine,
        cashText: cashLine,
        endDateText: endDateLine,
      });
    }

    // Deduplicate by URL — merge data from multiple occurrences
    const byUrl = new Map<string, CardData>();
    for (const card of allCards) {
      const existing = byUrl.get(card.url);
      if (!existing) {
        byUrl.set(card.url, card);
        continue;
      }
      // Merge: fill gaps from whichever card has the data
      byUrl.set(card.url, {
        title: existing.title || card.title,
        url: card.url,
        imageUrl: existing.imageUrl || card.imageUrl,
        priceText: existing.priceText || card.priceText,
        percentText: existing.percentText || card.percentText,
        cashText: existing.cashText || card.cashText,
        endDateText: existing.endDateText || card.endDateText,
      });
    }

    return Array.from(byUrl.values());
  }

  /** Dismiss cookie consent banner */
  private async dismissCookies(page: Page): Promise<void> {
    try {
      const acceptBtn = await page.$('button:has-text("Accept"), [class*="cookie"] button, #cookie-accept');
      if (acceptBtn) {
        await acceptBtn.click();
        await this.delay(500);
      }
    } catch {
      // Cookie banner not found or not clickable — that's fine
    }
  }

  /** Check if a competition should be skipped */
  private shouldSkip(title: string, url: string): boolean {
    const lowerUrl = url.toLowerCase();
    const lowerTitle = title.toLowerCase();

    // Skip by URL pattern
    for (const pattern of SKIP_URL_PATTERNS) {
      if (lowerUrl.includes(pattern)) return true;
    }

    // Skip by title pattern
    for (const pattern of SKIP_TITLE_PATTERNS) {
      if (lowerTitle.includes(pattern)) return true;
    }

    return false;
  }

  /** Parse cash value from card text like "£85,000 Cash Alternative" or "£3 Million Prize Pot" */
  private parseCashFromCard(text: string): number | undefined {
    // Try "£X Cash Alternative" pattern
    const cashAltMatch = text.match(/£([\d,]+)\s*cash alternative/i);
    if (cashAltMatch) {
      return parsePriceToPence(`£${cashAltMatch[1]}`) ?? undefined;
    }

    // Try "£X Prize Pot" or "£X Million Prize Pot"
    const prizePotMatch = text.match(/£([\d,.]+)\s*(million\s+)?prize pot/i);
    if (prizePotMatch) {
      let value = parseFloat(prizePotMatch[1].replace(/,/g, ''));
      if (prizePotMatch[2]) value *= 1_000_000; // "Million"
      return Math.round(value * 100); // Convert to pence
    }

    return undefined;
  }

  /**
   * Parse "Entry price: 7p" or "Entry price: £0.07"
   */
  private parseEntryPrice(priceStr: string): number | undefined {
    // Handle pence format: "7p", "50p"
    const penceMatch = priceStr.match(/(\d+)p/i);
    if (penceMatch) {
      return parseInt(penceMatch[1], 10);
    }

    // Handle pounds format: "£0.07", "£1.00"
    return parsePriceToPence(priceStr) ?? undefined;
  }

  /**
   * Parse exact draw date from detail page.
   * "Wednesday 11th February 2026 at 9pm" → Date
   * "Tuesday 10th February 2026 at 9pm" → Date
   */
  private parseDrawDate(text: string): Date | undefined {
    try {
      // Remove day name and ordinal suffixes
      const cleaned = text
        .replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+/i, '')
        .replace(/(\d+)(st|nd|rd|th)/i, '$1')
        .trim();

      // Match: "11 February 2026 at 9pm" or "11 February 2026 at 9:30pm"
      const match = cleaned.match(
        /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
      );

      if (!match) return undefined;

      const day = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      const year = parseInt(match[3], 10);
      let hour = parseInt(match[4], 10);
      const minute = match[5] ? parseInt(match[5], 10) : 0;
      const ampm = match[6].toLowerCase();

      const months: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3,
        may: 4, june: 5, july: 6, august: 7,
        september: 8, october: 9, november: 10, december: 11,
      };

      const month = months[monthStr];
      if (month === undefined) return undefined;

      // Convert to 24h
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;

      return new Date(year, month, day, hour, minute);
    } catch {
      return undefined;
    }
  }

  /**
   * Parse relative end date from listing card.
   * "Ends in 2 days" → Date (now + 2 days)
   * "Ends Tomorrow" → Date (now + 1 day)
   */
  private parseRelativeDate(text?: string): Date | undefined {
    if (!text) return undefined;

    const lower = text.toLowerCase();

    if (lower.includes('tomorrow')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(21, 0, 0, 0); // Default to 9pm
      return d;
    }

    const daysMatch = lower.match(/ends?\s+in\s+(\d+)\s*day/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(21, 0, 0, 0); // Default to 9pm
      return d;
    }

    return undefined;
  }

  /** Scroll to load lazy content */
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
}
