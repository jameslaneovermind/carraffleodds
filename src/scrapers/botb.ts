/**
 * BOTB (Best of the Best) Scraper
 * Site: https://www.botb.com
 *
 * BOTB runs skill-based "Spot the Ball" competitions with unlimited entries.
 * This is fundamentally different from fixed-odds raffles — there are no
 * total tickets, no calculable odds, and no value score.
 *
 * The homepage (botb.com) is an SPA that organizes competitions by sections:
 *   - Featured Competitions
 *   - Ends Today / Ends Tomorrow / Ends Soon
 *   - Instant Wins
 *   - Free Comps
 *
 * Each competition card shows:
 *   - Title, description, image
 *   - Entry price (e.g. "STARTING FROM £0.90" or "TICKET PRICE £0.07")
 *   - End date badge (e.g. "ENDS SUNDAY", "ENDS TONIGHT")
 *   - Optional sold percentage
 *   - Link to detail/play page
 *
 * We skip: free competitions, subscriber-only comps, and promotional banners.
 */

import { BrowserContext } from 'playwright';
import {
  BaseScraper,
  ScrapedRaffle,
  ScraperResult,
  QuickUpdateResult,
} from './base';

// ============================================
// Types
// ============================================

interface BotbCard {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  priceText: string;
  endDateText: string;
  percentSold: number | null;
}

// ============================================
// Skip patterns
// ============================================

const SKIP_TITLE_PATTERNS = [
  'free comp',
  'free entry',
  'free ticket',
  'free to enter',
  'free tech in app',
  'subscriber comp',
  'subscriber only',
  'botb pass',
  'love at first subscribe',
  'new subscribers get',
  'sign up and get',
  'refer a friend',
];

// ============================================
// Helpers
// ============================================

/**
 * Parse price text like "£0.90", "£0.07", "£1.00" to pence.
 */
function parsePriceToPence(priceText: string): number | undefined {
  const match = priceText.match(/£([\d,.]+)/);
  if (!match) return undefined;
  const pounds = parseFloat(match[1].replace(',', ''));
  if (isNaN(pounds)) return undefined;
  return Math.round(pounds * 100);
}

/**
 * Parse cash alternative from description text.
 * e.g. "Win up to £500,000 tax-free cash" → 50000000 pence
 * e.g. "£144,000 cash alternative" → 14400000 pence
 */
function parseCashAlternative(text: string): number | undefined {
  // Look for "£X cash alternative" or "£X tax-free cash" or "£X cash"
  const match = text.match(/£([\d,]+)(?:\s*(?:cash\s*alternative|tax[- ]free\s*cash|cash))/i);
  if (!match) return undefined;
  const pounds = parseInt(match[1].replace(/,/g, ''), 10);
  if (isNaN(pounds)) return undefined;
  return pounds * 100;
}

/**
 * Parse end date text like "ENDS SUNDAY", "ENDS TONIGHT", "ENDS TOMORROW"
 * into an approximate Date.
 */
function parseEndDate(text: string): Date | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase().trim();

  const now = new Date();
  const today = now.getDay(); // 0=Sun, 1=Mon...

  if (lower.includes('tonight') || lower.includes('today')) {
    // Ends today at ~11:59 PM
    const d = new Date(now);
    d.setHours(23, 59, 0, 0);
    return d;
  }

  if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    return d;
  }

  // Day name: "ENDS SUNDAY", "ENDS FRIDAY", etc.
  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  for (const [dayName, dayNum] of Object.entries(dayMap)) {
    if (lower.includes(dayName)) {
      let daysUntil = dayNum - today;
      if (daysUntil <= 0) daysUntil += 7;
      const d = new Date(now);
      d.setDate(d.getDate() + daysUntil);
      d.setHours(23, 59, 0, 0);
      return d;
    }
  }

  // Try to match a date format like "FEB 14", "14 FEB"
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const dateMatch = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)
    || text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i);
  if (dateMatch) {
    const isMonthFirst = isNaN(parseInt(dateMatch[1]));
    const month = isMonthFirst ? monthMap[dateMatch[1].toLowerCase().substring(0, 3)] : monthMap[dateMatch[2].toLowerCase().substring(0, 3)];
    const day = isMonthFirst ? parseInt(dateMatch[2]) : parseInt(dateMatch[1]);
    if (month !== undefined && day) {
      const d = new Date(now.getFullYear(), month, day, 23, 59, 0);
      if (d < now) d.setFullYear(d.getFullYear() + 1);
      return d;
    }
  }

  return undefined;
}

// ============================================
// Scraper Implementation
// ============================================

export class BotbScraper extends BaseScraper {
  name = 'BOTB';
  siteSlug = 'botb';
  baseUrl = 'https://www.botb.com';

  // ==========================================
  // Full Scrape
  // ==========================================

  async scrape(context: BrowserContext): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const raffles: ScrapedRaffle[] = [];

    try {
      const cards = await this.scrapeHomepage(context);
      console.log(`[${this.name}] Found ${cards.length} competition cards`);

      // Deduplicate by URL
      const seen = new Set<string>();
      for (const card of cards) {
        if (seen.has(card.url)) continue;
        seen.add(card.url);

        // Skip free / subscriber comps
        const titleLower = (card.title + ' ' + card.description).toLowerCase();
        if (SKIP_TITLE_PATTERNS.some(p => titleLower.includes(p))) {
          console.log(`[${this.name}] Skipping: ${card.title}`);
          continue;
        }

        const ticketPrice = parsePriceToPence(card.priceText);
        // Skip if no price or price is 0 (free entries)
        if (!ticketPrice || ticketPrice === 0) {
          console.log(`[${this.name}] Skipping (no price): ${card.title}`);
          continue;
        }

        const cashAlt = parseCashAlternative(card.description) || parseCashAlternative(card.title);
        const endDate = parseEndDate(card.endDateText);

        // Generate a stable external ID from the URL path
        const urlPath = new URL(card.url).pathname.replace(/^\//, '').replace(/\/$/, '');
        const externalId = urlPath.replace(/\//g, '-') || card.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 60);

        raffles.push({
          externalId,
          title: card.title,
          sourceUrl: card.url,
          imageUrl: card.imageUrl || undefined,
          ticketPrice,
          cashAlternative: cashAlt,
          endDate,
          percentSold: card.percentSold ?? undefined,
          // BOTB has unlimited entries — no total_tickets, no odds
          totalTickets: undefined,
          ticketsSold: undefined,
        });
      }

      console.log(`[${this.name}] Processed ${raffles.length} valid competitions`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      console.error(`[${this.name}] Scrape error: ${msg}`);
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
  // Quick Update — just refresh from homepage
  // ==========================================

  async quickUpdate(context: BrowserContext): Promise<QuickUpdateResult> {
    const start = Date.now();
    const errors: string[] = [];
    const updates: QuickUpdateResult['updates'] = [];

    try {
      const cards = await this.scrapeHomepage(context);

      const seen = new Set<string>();
      for (const card of cards) {
        if (seen.has(card.url)) continue;
        seen.add(card.url);

        const urlPath = new URL(card.url).pathname.replace(/^\//, '').replace(/\/$/, '');
        const externalId = urlPath.replace(/\//g, '-') || card.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 60);

        updates.push({
          externalId,
          percentSold: card.percentSold ?? undefined,
          ticketPrice: parsePriceToPence(card.priceText),
        });
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
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
  // Homepage scraping
  // ==========================================

  private async scrapeHomepage(context: BrowserContext): Promise<BotbCard[]> {
    const page = await context.newPage();

    try {
      // Navigate
      const ok = await this.navigateWithRetry(page, this.baseUrl, {
        waitUntil: 'domcontentloaded',
      });
      if (!ok) throw new Error('Failed to load BOTB homepage');

      // Wait for content to render (SPA)
      await page.waitForTimeout(3000);

      // Dismiss cookie banner if present
      try {
        const acceptBtn = page.locator('button:has-text("Accept All")');
        if (await acceptBtn.isVisible({ timeout: 2000 })) {
          await acceptBtn.click();
          await page.waitForTimeout(500);
        }
      } catch {
        // Cookie banner may not appear
      }

      // Scroll down to trigger lazy loading of all sections
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await page.waitForTimeout(800);
      }

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      // Extract competition cards from the DOM
      const cards = await page.evaluate(() => {
        const results: Array<{
          title: string;
          description: string;
          url: string;
          imageUrl: string;
          priceText: string;
          endDateText: string;
          percentSold: number | null;
        }> = [];

        // BOTB uses competition cards with various structures.
        // Look for all links that lead to competition/play pages.
        const allLinks = document.querySelectorAll('a[href]');

        for (let i = 0; i < allLinks.length; i++) {
          const link = allLinks[i] as HTMLElement;
          const href = link.getAttribute('href') || '';

          // Only process links that lead to competition/play pages
          if (!href.match(/\/(competitions|play|prizes|dream-car|lifestyle|instant-win)/i)) continue;
          // Skip if it's a tiny inline link
          if (link.clientHeight < 50) continue;

          // Get the card container — walk up to find a reasonable parent
          let card: HTMLElement = link;
          for (let j = 0; j < 5; j++) {
            if (card.parentElement && card.parentElement.clientHeight < 600) {
              card = card.parentElement;
            } else {
              break;
            }
          }

          const cardText = (card as HTMLElement).innerText || '';
          const lines = cardText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

          // Extract image
          const img = card.querySelector('img[src*="cdn.botb.com"], img[src*="botb"], img[src*="media"]');
          const imageUrl = img ? (img.getAttribute('src') || '') : '';

          // Extract price
          const priceMatch = cardText.match(/(?:starting\s+from|ticket\s+price)\s*£([\d,.]+)/i);
          const priceText = priceMatch ? '£' + priceMatch[1] : '';

          // Extract end date text
          const endDateMatch = cardText.match(/ends?\s+(today|tonight|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday|[\d]+\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i);
          let endDateText = endDateMatch ? 'ENDS ' + endDateMatch[1] : '';

          // Also check for badge-style end dates in the card
          const badges = card.querySelectorAll('[class*="badge"], [class*="label"], [class*="ends"], [class*="timer"], span, div');
          for (let k = 0; k < badges.length; k++) {
            const badgeText = (badges[k].textContent || '').trim();
            if (badgeText.match(/^ends?\s+(today|tonight|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i)) {
              endDateText = badgeText;
              break;
            }
          }

          // Extract sold percentage
          const soldMatch = cardText.match(/sold\s*(\d+)%|(\d+)%\s*sold/i);
          const percentSold = soldMatch ? parseInt(soldMatch[1] || soldMatch[2]) : null;

          // Extract title — usually the bold/heading text on the card
          // Try headings first, then class-based selectors
          let title = '';
          const headings = card.querySelectorAll('h1, h2, h3, h4, [class*="title"], [class*="name"]');
          for (let h = 0; h < headings.length; h++) {
            const hText = (headings[h].textContent || '').trim();
            // Skip badge-like text (e.g. "ENDS SUNDAY", "ENDS TONIGHT")
            if (hText.match(/^ends?\s/i)) continue;
            // Skip very short text
            if (hText.length < 3) continue;
            // Skip price-like text
            if (hText.match(/^£/)) continue;
            // Skip action buttons and UI labels
            if (hText.match(/^(play|enter|sign up|get|select)/i)) continue;
            title = hText;
            break;
          }

          // If no title found from headings, try the first meaningful line
          if (!title) {
            for (let n = 0; n < lines.length; n++) {
              const line = lines[n];
              if (line.match(/^ends?\s/i)) continue;
              if (line.match(/^(starting|ticket|sold|play|enter|sign|get|select|£)/i)) continue;
              if (line.length < 4) continue;
              title = line;
              break;
            }
          }

          // Skip generic UI text that isn't a real title
          if (title === 'Select' || title === 'select') title = '';

          // Extract description — any subtitle or descriptive text
          let description = '';
          for (let m = 0; m < lines.length; m++) {
            if (lines[m] !== title && lines[m].length > 20 && !lines[m].match(/^(starting|ticket|sold|ends|play|enter)/i)) {
              description = lines[m];
              break;
            }
          }

          if (title && priceText) {
            // Make URL absolute
            const fullUrl = href.startsWith('http') ? href : 'https://www.botb.com' + (href.startsWith('/') ? '' : '/') + href;
            results.push({
              title,
              description,
              url: fullUrl,
              imageUrl,
              priceText,
              endDateText,
              percentSold,
            });
          }
        }

        return results;
      });

      console.log(`[${this.name}] Extracted ${cards.length} raw cards from homepage`);

      // Deduplicate by URL
      const uniqueCards: BotbCard[] = [];
      const seenUrls = new Set<string>();
      for (const card of cards) {
        if (seenUrls.has(card.url)) continue;
        seenUrls.add(card.url);
        uniqueCards.push(card);
      }

      return uniqueCards;
    } finally {
      await page.close();
    }
  }
}
