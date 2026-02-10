/**
 * LLF Games Scraper
 * Site: https://llfgames.com
 *
 * WordPress/WooCommerce site. Homepage shows all competitions in category tabs.
 * Cards have price, % sold, cash alt, draw date.
 * Competition URLs: /competition/{slug}/
 * Images on llfgames.com.
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
// Scraper
// ============================================

export class LlfGamesScraper extends BaseScraper {
  name = 'LLF Games';
  siteSlug = 'llf-games';
  baseUrl = 'https://llfgames.com';

  private listingUrl = 'https://llfgames.com/shop/';

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
                LlfGamesScraper.DETAIL_PAGE_TIMEOUT_MS,
              ),
            ),
          ]);
          if (raffle) raffles.push(raffle);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[${this.name}] Error on ${slug}: ${msg}`);
          errors.push(`${slug}: ${msg}`);

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

      await page.waitForSelector('a[href*="/competition/"]', { timeout: 15000 }).catch(() => {});
      await this.scrollToLoadAll(page);

      // The /shop/ page lists all competitions with titles and "BUY TICKETS" links
      const rawCards = await page.evaluate(() => {
        const results: Array<{
          url: string;
          title: string;
          imageUrl: string;
        }> = [];

        const seen = new Set<string>();

        // Find all "BUY TICKETS" links which point to /competition/ URLs
        const links = document.querySelectorAll('a[href*="/competition/"]');

        links.forEach((el) => {
          const a = el as HTMLAnchorElement;
          const href = a.href;

          if (seen.has(href)) return;
          seen.add(href);

          // Look for the competition title — usually an h2 sibling or parent
          let title = '';
          const parentLi = a.closest('li');
          if (parentLi) {
            const h2 = parentLi.querySelector('h2');
            if (h2) title = (h2.textContent || '').trim();
          }

          // If no title from li/h2, check the previous sibling h2
          if (!title) {
            let prev = a.parentElement?.previousElementSibling;
            while (prev) {
              const h2 = prev.querySelector('h2') || (prev.tagName === 'H2' ? prev : null);
              if (h2) {
                title = (h2.textContent || '').trim();
                break;
              }
              prev = prev.previousElementSibling;
            }
          }

          // Skip if no title
          if (!title || title.length < 5) return;

          // Image from the card area
          const img = parentLi?.querySelector('img') as HTMLImageElement | null;

          results.push({
            url: href,
            title,
            imageUrl: img ? img.src : '',
          });
        });

        return results;
      });

      return rawCards
        .filter(c => c.title && c.url)
        .map(c => ({
          title: c.title,
          url: c.url,
          imageUrl: c.imageUrl || undefined,
        } as ListingCard));
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

    // Price: "£0.05PER ENTRY" or "£0.05 PER ENTRY"
    // Handle sale prices: "Original price was: £0.19.£0.15Current price is: £0.15.PER ENTRY"
    let ticketPrice: number | undefined;
    const currentPriceMatch = raw.text.match(/current price is:\s*£([\d.]+)/i);
    if (currentPriceMatch) {
      ticketPrice = Math.round(parseFloat(currentPriceMatch[1]) * 100);
    } else {
      const priceLine = lines.find(l => /£[\d.]+\s*PER\s*ENTRY/i.test(l));
      if (priceLine) {
        const priceMatch = priceLine.match(/£([\d.]+)/);
        if (priceMatch) ticketPrice = Math.round(parseFloat(priceMatch[1]) * 100);
      }
    }

    // Percent sold: "81%" or "10% Sold"
    let percentSold: number | undefined;
    const percentLine = lines.find(l => /\d+%/.test(l) && !/price/i.test(l));
    if (percentLine) {
      const pMatch = percentLine.match(/(\d+)%/);
      if (pMatch) percentSold = parseInt(pMatch[1], 10);
    }

    // Cash alternative: "Cash Alternative:£36,500"
    let cashAlternative: number | undefined;
    const cashLine = lines.find(l => /cash alternative/i.test(l));
    if (cashLine) {
      const cashMatch = cashLine.match(/£([\d,]+)/);
      if (cashMatch) {
        cashAlternative = parsePriceToPence(`£${cashMatch[1]}`) ?? undefined;
      }
    }

    // Draw date: "DRAW TOMORROW", "Draw Thu 1st Jan", "DRAW TODAY"
    let drawDateText: string | undefined;
    const drawLine = lines.find(l =>
      /^draw\s/i.test(l)
    );
    if (drawLine) drawDateText = drawLine;

    // Draw type
    let drawType: string | undefined;
    if (lines.some(l => /automated draw/i.test(l))) {
      drawType = 'auto_draw';
    } else {
      drawType = 'live_draw';
    }

    // Title: find h2 text — usually the main competition name
    const skipPatterns = [
      /^£[\d.]/,
      /per entry/i,
      /^\d+%/,
      /^draw\s/i,
      /^buy tickets$/i,
      /^enter competition$/i,
      /^automated draw$/i,
      /^days$/i,
      /^hrs$/i,
      /^mins$/i,
      /^secs$/i,
      /^cash alternative/i,
      /original price/i,
      /current price/i,
      /sold$/i,
    ];

    const titleCandidates = lines.filter(l =>
      !skipPatterns.some(p => p.test(l)) && l.length > 5
    );
    const title = titleCandidates[0] || '';

    if (!title) return null;

    return {
      title,
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

        const h1 = document.querySelector('h1, .product_title');
        const title = h1 ? (h1.textContent || '').trim() : '';

        // Total tickets: "2450000 tickets available" or "total amount of tickets...is (2,450,000)"
        let totalTicketsStr: string | null = null;
        const ticketsAvailMatch = body.match(/([\d,]+)\s*tickets\s*available/i);
        if (ticketsAvailMatch) {
          totalTicketsStr = ticketsAvailMatch[1];
        } else {
          const totalMatch = body.match(/total\s*(?:amount\s*of\s*)?tickets[^(]*([\d,]+)/i);
          if (totalMatch) totalTicketsStr = totalMatch[1];
        }

        // Also try ratio format: "1726970 / 2450000"
        let ticketsSoldFromRatio: string | null = null;
        let totalFromRatio: string | null = null;
        const ratioMatch = body.match(/([\d,]+)\s*\/\s*([\d,]+)/);
        if (ratioMatch) {
          ticketsSoldFromRatio = ratioMatch[1];
          totalFromRatio = ratioMatch[2];
          if (!totalTicketsStr) totalTicketsStr = totalFromRatio;
        }

        // Draw date: "Live draw Friday 30th January @ 10:00pm"
        // or "draw will happen on January 30, 2026"
        const liveDrawMatch = body.match(/live\s*draw\s+(.+?)(?:\n|$)/i);
        const drawDateStr = liveDrawMatch ? liveDrawMatch[1].trim() : null;

        // Cash alternative: "Cash Alternative: £37,500"
        const cashMatch = body.match(/cash\s*alternative[:\s]*£([\d,]+)/i);
        const cashAltStr = cashMatch ? '£' + cashMatch[1] : null;

        // Price: "£0.04 Per Entry" or "TICKETS JUST 5P" or "Entry Just 4p"
        let priceStr: string | null = null;
        const perEntryMatch = body.match(/£([\d.]+)\s*per\s*entry/i);
        if (perEntryMatch) {
          priceStr = '£' + perEntryMatch[1];
        } else {
          const justMatch = body.match(/(?:just|only|from)\s*(\d+)p/i);
          if (justMatch) priceStr = justMatch[1] + 'p';
        }

        // Image
        const mainImg = document.querySelector('.woocommerce-product-gallery img, img.wp-post-image, .product img') as HTMLImageElement | null;
        const imageUrl = mainImg?.src || null;

        // Percent sold: "70% Sold" or "70%"
        const percentMatch = body.match(/(\d+)%\s*(?:sold|of\s*tickets\s*sold)/i);
        const percentStr = percentMatch ? percentMatch[1] : null;

        // Draw type
        const isAutomated = /automated draw/i.test(body);

        return {
          title, totalTicketsStr, drawDateStr, cashAltStr, priceStr,
          imageUrl, percentStr, isAutomated, ticketsSoldFromRatio,
        };
      });

      const externalId = extractSlugFromUrl(card.url);
      if (!externalId) return null;

      const totalTickets = pageData.totalTicketsStr
        ? parseInt(pageData.totalTicketsStr.replace(/[^0-9]/g, ''), 10)
        : undefined;

      const endDate = pageData.drawDateStr
        ? this.parseDrawDate(pageData.drawDateStr)
        : this.parseRelativeDrawDate(card.drawDateText);

      const cashAlternative = pageData.cashAltStr
        ? parsePriceToPence(pageData.cashAltStr) ?? undefined
        : card.cashAlternative;

      const percentSold = pageData.percentStr
        ? parseFloat(pageData.percentStr)
        : card.percentSold;

      // Parse ticket price from detail page
      let ticketPrice = card.ticketPrice;
      if (!ticketPrice && pageData.priceStr) {
        // Handle pence format: "5p"
        const penceMatch = pageData.priceStr.match(/^(\d+)p$/i);
        if (penceMatch) {
          ticketPrice = parseInt(penceMatch[1], 10);
        } else {
          ticketPrice = parsePriceToPence(pageData.priceStr) ?? undefined;
        }
      }

      let ticketsSold: number | undefined;
      if (totalTickets && percentSold != null) {
        ticketsSold = Math.round((percentSold / 100) * totalTickets);
      }

      const drawType = pageData.isAutomated ? 'auto_draw' : (card.drawType || 'live_draw');

      return {
        externalId,
        title: this.sanitizeTitle(pageData.title || card.title, card.url),
        sourceUrl: card.url,
        imageUrl: pageData.imageUrl || card.imageUrl,
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

  private parseDrawDate(text: string): Date | undefined {
    try {
      const cleaned = text
        .replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+/i, '')
        .replace(/(\d+)(st|nd|rd|th)/i, '$1')
        .replace(/@/g, 'at')
        .trim();

      const match = cleaned.match(
        /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i
      );
      if (!match) return undefined;

      const day = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      let year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
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

      const result = new Date(year, month, day, hour, minute);
      // If no year was specified and date is in the past, try next year
      if (!match[3] && result < new Date()) {
        year++;
        return new Date(year, month, day, hour, minute);
      }
      return result;
    } catch {
      return undefined;
    }
  }

  private parseRelativeDrawDate(text?: string): Date | undefined {
    if (!text) return undefined;
    const lower = text.toLowerCase();

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
      if (candidate < now) year++;
      return new Date(year, month, day, 21, 0, 0, 0);
    }

    return undefined;
  }

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
