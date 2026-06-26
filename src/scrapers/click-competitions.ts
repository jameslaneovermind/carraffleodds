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

// ============================================
// Exported parsing utilities
// ============================================

/**
 * Derives the full competition page URL from the API's slugPrefix.
 * ".prizes.CupraLeon010726"  → "https://…/prizes/CupraLeon010726"
 * ".instawins.CarIW280626"   → "https://…/instawins/CarIW280626"
 */
export function deriveCompetitionUrl(slugPrefix: string, baseUrl: string): string {
  const withoutLeadingDot = slugPrefix.replace(/^\./, '');
  const path = withoutLeadingDot.replace('.', '/');
  return `${baseUrl}/${path}`;
}

/**
 * Parses "28/6/2026 - 2:00PM" → Date.
 * Returns undefined for any format it doesn't recognise.
 */
export function parseAutoDrawDate(text: string): Date | undefined {
  const m = text.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i
  );
  if (!m) return undefined;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1; // 0-indexed
  const year = parseInt(m[3], 10);
  let hour = parseInt(m[4], 10);
  const minute = parseInt(m[5], 10);
  const ampm = m[6].toUpperCase();
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return new Date(year, month, day, hour, minute, 0, 0);
}

// ============================================
// Skip patterns
// ============================================

const SKIP_TITLE_PATTERNS = [
  /click credit/i,
  /site credit/i,
];

// ============================================
// API response types
// ============================================

interface ApiCompetition {
  id: string;
  slugPrefix: string;
  unified_status: string;
  ticketAmount: number;
  visability: {
    percentage?: number;
  };
  global_maximum_tickets_quantity: number;
}

interface ApiCompetitionDetail {
  visability: {
    soldTickets: number;
    totalTickets: number;
  };
}

// ============================================
// Scraper
// ============================================

export class ClickCompetitionsScraper extends BaseScraper {
  name = 'Click Competitions';
  siteSlug = 'click-competitions';
  baseUrl = 'https://www.clickcompetitions.co.uk';

  private readonly listingApiUrl = 'https://www.clickcompetitions.co.uk/be/content/api/competitions/active';
  private cookiesDismissed = false;

  // ==========================================
  // Full Scrape
  // ==========================================

  async scrape(context: BrowserContext): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const raffles: ScrapedRaffle[] = [];

    try {
      const competitions = await this.fetchActiveCompetitions();
      console.log(`[${this.name}] API returned ${competitions.length} active competitions`);

      for (let i = 0; i < competitions.length; i++) {
        const comp = competitions[i];
        const sourceUrl = deriveCompetitionUrl(comp.slugPrefix, this.baseUrl);
        console.log(`[${this.name}] [${i + 1}/${competitions.length}] ${comp.id}`);

        try {
          const raffle = await this.buildRaffle(context, comp, sourceUrl);
          if (raffle) raffles.push(raffle);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[${this.name}] Error on ${comp.id}: ${msg}`);
          errors.push(`${comp.id}: ${msg}`);
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
  // Quick Update
  // ==========================================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async quickUpdate(_context: BrowserContext): Promise<QuickUpdateResult> {
    const start = Date.now();
    const errors: string[] = [];
    const updates: QuickUpdateResult['updates'] = [];

    try {
      const competitions = await this.fetchActiveCompetitions();

      for (const comp of competitions) {
        updates.push({
          externalId: comp.id,
          percentSold: comp.visability.percentage ?? undefined,
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
  // API helpers
  // ==========================================

  private async fetchActiveCompetitions(): Promise<ApiCompetition[]> {
    const response = await fetch(this.listingApiUrl, {
      headers: {
        'Accept': 'application/json',
        'Referer': this.baseUrl + '/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Listing API returned ${response.status}`);
    }

    const all = await response.json() as ApiCompetition[];
    return all.filter((c) => c.unified_status === 'liveOpen');
  }

  private async fetchCompetitionDetail(id: string): Promise<ApiCompetitionDetail | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/be/content/api/competitions/${id}`,
        {
          headers: {
            'Accept': 'application/json',
            'Referer': this.baseUrl + '/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }
      );
      if (!response.ok) return null;
      return await response.json() as ApiCompetitionDetail;
    } catch {
      return null;
    }
  }

  // ==========================================
  // Build a single raffle (API + Playwright)
  // ==========================================

  private async buildRaffle(
    context: BrowserContext,
    comp: ApiCompetition,
    sourceUrl: string,
  ): Promise<ScrapedRaffle | null> {
    // 1. Fetch ticket counts from the detail API (no Playwright needed)
    const detail = await this.fetchCompetitionDetail(comp.id);
    const totalTickets = detail?.visability.totalTickets;
    const ticketsSold = detail?.visability.soldTickets;

    // 2. Load the competition page in Playwright to get title, image, dates
    const page = await context.newPage();
    try {
      const ok = await this.navigateWithRetry(page, sourceUrl);
      if (!ok) return null;

      // Wait for the main content to render (it's a Next.js SPA)
      await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});

      // Dismiss cookie banner on first page in this context
      if (!this.cookiesDismissed) {
        await this.dismissCookies(page);
        this.cookiesDismissed = true;
      }

      const pageData = await page.evaluate(() => {
        // Title
        const h1 = document.querySelector('h1');
        const title = h1 ? (h1.textContent || '').trim() : '';

        // Image — og:image is most reliable; fall back to first skywind/prismic img
        const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
        let imageUrl: string | null = ogImage?.content || null;
        if (!imageUrl) {
          const imgs = Array.from(document.querySelectorAll('img'));
          const match = imgs.find(
            (img) => img.src.includes('skywind360') || img.src.includes('prismic.skywind360')
          );
          imageUrl = match?.src || null;
        }

        // End date — "Auto Draw:\n28/6/2026 - 2:00PM"
        const bodyText = document.body.innerText;
        const drawMatch = bodyText.match(
          /Auto Draw:\s*(\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM))/i
        );
        const drawDateStr = drawMatch ? drawMatch[1].trim() : null;

        // Cash alternative — "Cash alternative:\n£20,000"
        const cashMatch = bodyText.match(/cash\s*alternative[:\s]*£([\d,]+)/i);
        const cashAltStr = cashMatch ? cashMatch[1] : null;

        // Draw type — page text reveals "Auto Draw" vs "Live Draw"
        const isLive = /live\s*draw/i.test(bodyText);
        const drawType = isLive ? 'live_draw' : 'auto_draw';

        return { title, imageUrl, drawDateStr, cashAltStr, drawType };
      });

      if (!pageData.title) return null;

      // Filter out credit/non-car competitions
      if (SKIP_TITLE_PATTERNS.some(p => p.test(pageData.title))) return null;

      const cashAlternative = pageData.cashAltStr
        ? parseInt(pageData.cashAltStr.replace(/,/g, ''), 10) * 100
        : undefined;

      const endDate = pageData.drawDateStr
        ? parseAutoDrawDate(pageData.drawDateStr)
        : undefined;

      return {
        externalId: comp.id,
        title: this.sanitizeTitle(pageData.title, sourceUrl),
        sourceUrl,
        imageUrl: pageData.imageUrl ?? undefined,
        ticketPrice: Math.round(comp.ticketAmount * 100),
        totalTickets,
        ticketsSold,
        percentSold: comp.visability.percentage ?? undefined,
        cashAlternative,
        endDate,
        drawType: pageData.drawType,
      };
    } finally {
      await page.close();
    }
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async dismissCookies(page: Page): Promise<void> {
    try {
      const btn = await page.$('button.osano-cm-accept');
      if (btn) {
        await btn.click();
        await this.delay(500);
      }
    } catch {
      // Cookie banner not present
    }
  }
}
