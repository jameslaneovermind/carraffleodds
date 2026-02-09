import { BrowserContext, Page } from 'playwright';
import {
  BaseScraper,
  ScrapedRaffle,
  ScraperResult,
  QuickUpdateResult,
} from './base';
import { parsePriceToPence, extractSlugFromUrl } from '../lib/utils';

// ============================================
// Rev Comps Scraper
// https://www.revcomps.com
//
// WooCommerce-based site. Homepage lists all active
// competitions with total tickets, price, % sold,
// draw type and end date visible per card.
// Detail pages at /product/{slug}/ have an
// "Additional Information" table with exact end date,
// total tickets, and description text with cash
// alternative values.
// ============================================

interface ListingCard {
  title: string;
  url: string;
  imageUrl?: string;
  ticketPrice?: number; // pence
  totalTickets?: number;
  percentSold?: number; // 0-100
  drawType?: string;
  endDateText?: string;
}

export class RevCompsScraper extends BaseScraper {
  name = 'Rev Comps';
  siteSlug = 'rev-comps';
  baseUrl = 'https://www.revcomps.com';

  // ==========================================
  // Full Scrape — listing + detail pages (vehicles only)
  // ==========================================

  /** Keywords that indicate a vehicle prize worth visiting the detail page for */
  private static readonly VEHICLE_KEYWORDS = [
    'bmw', 'audi', 'mercedes', 'ferrari', 'lamborghini', 'porsche', 'mclaren',
    'volkswagen', 'ford focus', 'ford fiesta', 'ford mustang', 'ford escort',
    'ford transit', 'ford ranger',
    'honda civic', 'honda type', 'honda cb', 'toyota supra', 'toyota gr',
    'nissan gtr', 'nissan gt-r', 'nissan skyline',
    'range rover', 'land rover', 'bentley', 'rolls royce', 'tesla',
    'volvo xc', 'volvo v', 'volvo s', 'vauxhall', 'mini cooper',
    'jaguar', 'aston martin', 'defender', 'motorhome', 'campervan',
    'peugeot', 'seat ', 'skoda', 'fiat ', 'alfa romeo', 'maserati',
    'suzuki jimny', 'suzuki swift', 'transit connect', 'transporter', 'camper',
    'ducati', 'kawasaki', 'yamaha', 'motorcycle', 'motorbike', 'panigale',
    'triumph', 'fireblade', 'hayabusa', 'sur ron', 'surron',
    // Generic vehicle hints
    'car', 'van', 'bike', 'quad',
  ];

  /** Per-detail-page timeout to prevent a single hung page from stalling everything */
  private static readonly DETAIL_PAGE_TIMEOUT_MS = 45_000; // 45 seconds

  private looksLikeVehicle(title: string): boolean {
    const lower = title.toLowerCase();
    return RevCompsScraper.VEHICLE_KEYWORDS.some((kw) => lower.includes(kw));
  }

  async scrape(context: BrowserContext): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const raffles: ScrapedRaffle[] = [];

    try {
      const cards = await this.scrapeListingPage(context);
      console.log(`[${this.name}] Found ${cards.length} competition cards`);

      // Split into vehicles (need detail page) and non-vehicles (listing data only)
      const vehicleCards = cards.filter((c) => this.looksLikeVehicle(c.title));
      const otherCards = cards.filter((c) => !this.looksLikeVehicle(c.title));

      console.log(
        `[${this.name}] ${vehicleCards.length} vehicles (detail page), ${otherCards.length} others (listing only)`
      );

      // Non-vehicle competitions: use listing data directly (fast)
      for (const card of otherCards) {
        const fallback = this.buildRaffleFromCard(card);
        if (fallback) raffles.push(fallback);
      }

      // Vehicle competitions: visit detail pages for cash alt, precise end date
      for (let i = 0; i < vehicleCards.length; i++) {
        const card = vehicleCards[i];
        const slug = extractSlugFromUrl(card.url);
        console.log(
          `[${this.name}] [${i + 1}/${vehicleCards.length}] Detail: ${slug}`
        );

        try {
          // Wrap detail page in a timeout so one hung page can't block everything
          const raffle = await Promise.race([
            this.scrapeDetailPage(context, card),
            new Promise<null>((_, reject) =>
              setTimeout(
                () => reject(new Error('Detail page timed out')),
                RevCompsScraper.DETAIL_PAGE_TIMEOUT_MS
              )
            ),
          ]);
          if (raffle) raffles.push(raffle);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[${this.name}] Error on ${slug}: ${msg}`);
          errors.push(`${slug}: ${msg}`);

          // Fallback: build raffle from listing card data
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
  // Listing Page — extract competition cards
  // ==========================================

  private async scrapeListingPage(
    context: BrowserContext
  ): Promise<ListingCard[]> {
    const page = await context.newPage();

    try {
      const ok = await this.navigateWithRetry(page, this.baseUrl);
      if (!ok) throw new Error('Failed to load homepage');

      // Wait for initial page render
      await page.waitForTimeout(3000);

      // Dismiss cookie consent banner (required to see competition cards)
      await this.dismissCookieBanner(page);

      // Wait for product cards to render after cookie acceptance
      await page.waitForTimeout(5000);

      // Scroll to trigger lazy-loaded competitions
      await this.scrollToLoadAll(page);

      // Click "ALL PRIZES" tab to show all competitions (not just featured)
      try {
        const allPrizesBtn = await page.$('button:has-text("ALL PRIZES")');
        if (allPrizesBtn) {
          await allPrizesBtn.click();
          console.log(`[${this.name}] Clicked "ALL PRIZES" tab`);
          await page.waitForTimeout(3000);
        }
      } catch {
        console.log(`[${this.name}] No "ALL PRIZES" button found`);
      }

      // Scroll again after tab switch to load all
      await this.scrollToLoadAll(page);

      // Extract card data from the DOM
      // Rev Comps uses <a href="/product/..."> with all card data
      // in the link's innerText and image inside div.rcfs-media
      const rawCards = await page.evaluate(() => {
        const results: Array<{
          title: string;
          url: string;
          imageUrl?: string;
          cardText: string;
        }> = [];
        const seen = new Set<string>();

        document.querySelectorAll('a[href*="/product/"]').forEach((a) => {
          const href = (a as HTMLAnchorElement).href;
          if (!href || seen.has(href)) return;
          if (href.includes('/product-category/')) return;

          const cardText = (a as HTMLElement).innerText?.trim() || '';
          // Must have ticket count to be a competition card
          if (!cardText.includes('TKTS')) return;

          seen.add(href);

          // Parse title from card text lines
          // Card format:
          //   "24999 TKTS"
          //   "£4.97" or "FREE"
          //   "WIN TODAY 11PM"
          //   "87% SOLD"
          //   ""
          //   "ACTUAL TITLE HERE"
          //   ""
          //   "−" / "+" / "ADD"
          const lines = cardText
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

          // Title: skip pattern lines, find the meaningful title line
          const title = lines.find(
            (l) =>
              l.length > 3 &&
              !/^\d[\d,]*\s*TKTS$/i.test(l) &&
              !/^£[\d,.]+$/i.test(l) &&
              !/^\d+[pP]$/i.test(l) &&
              !/^FREE$/i.test(l) &&
              !/^EARLY BIRD/i.test(l) &&
              !/^WIN\s/i.test(l) &&
              !/^\d+%\s*SOLD$/i.test(l) &&
              !/^LAST CHANCE$/i.test(l) &&
              !/^£[\d]+K?\s*CASH/i.test(l) &&
              !/^ENDS\s/i.test(l) &&
              !/^AUTO DRAW$/i.test(l) &&
              !/^LIVE DRAW$/i.test(l) &&
              !/^[−+]$/i.test(l) &&
              !/^ADD$/i.test(l)
          );

          if (!title) return;

          // Get image from within the link
          const img = a.querySelector('img');
          let imageUrl = img?.getAttribute('src') || undefined;
          // Try to get a larger image (replace -300x300 with -500x500 or full)
          if (imageUrl) {
            imageUrl = imageUrl.replace(/-\d+x\d+\./, '.');
          }

          results.push({ title, url: href, imageUrl, cardText });
        });

        return results;
      });

      // Parse structured data from card text
      const cards: ListingCard[] = rawCards
        .map((raw) => {
          const text = raw.cardText;

          // --- Total tickets: "39999 TKTS" ---
          const ticketsMatch = text.match(/([\d,]+)\s*TKTS/i);
          const totalTickets = ticketsMatch
            ? parseInt(ticketsMatch[1].replace(/,/g, ''), 10)
            : undefined;

          // --- Percent sold: "38% SOLD" ---
          const soldMatch = text.match(/(\d+)%\s*SOLD/i);
          const percentSold = soldMatch
            ? parseFloat(soldMatch[1])
            : undefined;

          // --- Price: "£2.50", "25P", "6p", "FREE" ---
          let ticketPrice: number | undefined;
          const penceMatch = text.match(/\b(\d+)\s*[pP]\b/);
          if (penceMatch) {
            ticketPrice = parseInt(penceMatch[1], 10);
          } else {
            // Find price — skip cash alt values (£50K, £130,000 etc)
            // Look for small price values near "SOLD" or "TKTS"
            const priceMatches = text.match(/£([\d,.]+)/g);
            if (priceMatches) {
              for (const pm of priceMatches) {
                const val = parsePriceToPence(pm);
                // Ticket prices are typically under £100 (10000 pence)
                if (val != null && val > 0 && val <= 10000) {
                  ticketPrice = val;
                  break;
                }
              }
            }
          }
          if (
            text.includes('FREE') &&
            ticketPrice === undefined
          ) {
            ticketPrice = 0;
          }

          // --- Draw type: "AUTO DRAW" or "LIVE DRAW" ---
          const drawTypeMatch = text.match(
            /\b(AUTO DRAW|LIVE DRAW|AUTO|LIVE)\b/i
          );
          const drawType = drawTypeMatch
            ? drawTypeMatch[1].toLowerCase().replace(' draw', '')
            : undefined;

          // --- End date text ---
          const endMatch =
            text.match(
              /ENDS\s+(TODAY\s+\d{1,2}:\d{2})/i
            ) ||
            text.match(
              /ENDS\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)\s+[A-Za-z]+)/i
            ) ||
            text.match(
              /WIN\s+(?:LIVE\s+)?([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)\s+[A-Za-z]+)/i
            );
          const endDateText = endMatch ? endMatch[0] : undefined;

          return {
            title: raw.title,
            url: raw.url,
            imageUrl: raw.imageUrl,
            ticketPrice,
            totalTickets,
            percentSold,
            drawType,
            endDateText,
          };
        })
        // Filter out free entries
        .filter((c) => c.ticketPrice == null || c.ticketPrice > 0);

      console.log(
        `[${this.name}] Parsed ${cards.length} paid competitions from listing`
      );
      return cards;
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

      await page.waitForTimeout(3000);

      const data: {
        pageTitle: string;
        endDateStr: string | null;
        totalTicketsStr: string | null;
        cashAlternative: number | null;
        additionalCash: number | null;
        price: string | null;
        mainImage: string | null;
        drawType: string | null;
      } = await page.evaluate(() => {
        const body = document.body.innerText;

        // --- Title from page ---
        const pageTitle = (document.title || '')
          .replace(/\s*[-–|]\s*Rev Comps.*$/i, '')
          .trim();

        // --- Additional Information table ---
        let endDateStr: string | null = null;
        let totalTicketsStr: string | null = null;

        document.querySelectorAll('table tr').forEach((row) => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length < 2) return;
          const label = (cells[0].textContent || '').trim().toLowerCase();
          const value = (cells[1].textContent || '').trim();

          if (
            label.includes('competition end date') ||
            label.includes('end date')
          ) {
            endDateStr = value;
          }
          if (
            label.includes('number of tickets') ||
            (label.includes('tickets') && !label.includes('max'))
          ) {
            totalTicketsStr = value;
          }
        });

        // Fallback date: look for "DD Month YYYY" in body
        if (!endDateStr) {
          const dateMatch = body.match(
            /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
          );
          endDateStr = dateMatch ? dateMatch[0] : null;
        }

        // --- Cash alternative from description ---
        // Match "£50,000 CASH ALTERNATIVE" or "£50,000 TAX FREE CASH"
        const cashAltMatch =
          body.match(
            /£([\d,]+)\s*(?:TAX\s+FREE\s+)?CASH\s*ALTERNATIVE/i
          ) ||
          body.match(/£([\d,]+)\s*TAX\s+FREE\s+CASH/i) ||
          body.match(/or\s+£([\d,]+)\s*(?:tax free|cash)/i);
        const cashAlternative = cashAltMatch
          ? parseInt(cashAltMatch[1].replace(/,/g, ''), 10)
          : null;

        // --- Additional cash included ---
        const additionalMatch = body.match(
          /£([\d,]+)\s*CASH\s*INCLUDED/i
        );
        const additionalCash = additionalMatch
          ? parseInt(additionalMatch[1].replace(/,/g, ''), 10)
          : null;

        // --- Price per ticket ---
        const priceMatch = body.match(/£([\d,.]+)\s*per ticket/i);
        const price = priceMatch ? `£${priceMatch[1]}` : null;

        // --- Main image ---
        const mainImg =
          document.querySelector(
            '.woocommerce-product-gallery__image img'
          ) ||
          document.querySelector(
            'img[src*="wp-content/uploads"]'
          );
        // Prefer data-src (full-size) over src (thumbnail)
        const mainImgSrc =
          mainImg?.getAttribute('data-large_image') ||
          mainImg?.getAttribute('data-src') ||
          mainImg?.getAttribute('src') ||
          null;

        // --- Draw type ---
        const isLive = /LIVE DRAW/i.test(body);
        const isAuto =
          /AUTO DRAW/i.test(body) ||
          /AUTOMATICALLY/i.test(body);

        return {
          pageTitle,
          endDateStr,
          totalTicketsStr,
          cashAlternative,
          additionalCash,
          price,
          mainImage: mainImgSrc,
          drawType: isLive ? 'live' : isAuto ? 'auto' : null,
        };
      });

      // Parse end date
      let endDate: Date | undefined;
      if (data.endDateStr) {
        endDate = this.parseDateStr(data.endDateStr) ?? undefined;
      }
      // Fallback: parse from card end date text
      if (!endDate && card.endDateText) {
        endDate = this.parseEndDateFromCard(card.endDateText) ?? undefined;
      }

      // Total tickets (prefer detail page, fall back to card)
      const totalTickets = data.totalTicketsStr
        ? parseInt(data.totalTicketsStr.replace(/[^0-9]/g, ''), 10)
        : card.totalTickets;

      // Calculate tickets sold from % and total
      let ticketsSold: number | undefined;
      if (totalTickets && card.percentSold != null) {
        ticketsSold = Math.round((card.percentSold / 100) * totalTickets);
      }

      // Price (prefer detail page, fall back to card)
      const ticketPrice = data.price
        ? parsePriceToPence(data.price) ?? card.ticketPrice
        : card.ticketPrice;

      // Skip free entries
      if (ticketPrice != null && ticketPrice <= 0) return null;

      const title = data.pageTitle || card.title;
      const externalId = extractSlugFromUrl(card.url);
      if (!externalId) return null;

      return {
        externalId,
        title,
        sourceUrl: card.url,
        imageUrl: data.mainImage || card.imageUrl,
        ticketPrice,
        totalTickets,
        ticketsSold,
        percentSold: card.percentSold,
        cashAlternative: data.cashAlternative
          ? data.cashAlternative * 100
          : undefined, // pounds → pence
        additionalCash: data.additionalCash
          ? data.additionalCash * 100
          : undefined, // pounds → pence
        endDate,
        drawType: data.drawType || card.drawType,
      };
    } finally {
      await page.close();
    }
  }

  // ==========================================
  // Fallback — build raffle from card data
  // ==========================================

  private buildRaffleFromCard(card: ListingCard): ScrapedRaffle | null {
    const externalId = extractSlugFromUrl(card.url);
    if (!externalId) return null;
    if (card.ticketPrice != null && card.ticketPrice <= 0) return null;

    let endDate: Date | undefined;
    if (card.endDateText) {
      endDate = this.parseEndDateFromCard(card.endDateText) ?? undefined;
    }

    return {
      externalId,
      title: card.title,
      sourceUrl: card.url,
      imageUrl: card.imageUrl,
      ticketPrice: card.ticketPrice,
      totalTickets: card.totalTickets,
      percentSold: card.percentSold,
      drawType: card.drawType,
      endDate,
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  /**
   * Dismiss cookie consent banner if present.
   * Rev Comps blocks product content until cookies are accepted.
   */
  private async dismissCookieBanner(page: Page): Promise<void> {
    try {
      // Try common cookie consent button selectors
      const selectors = [
        'button:has-text("Accept All")',
        'button:has-text("Accept")',
        'a:has-text("Accept All")',
        '.cookie-accept',
        '#cookie-accept',
        '[data-action="accept"]',
        '.cmplz-accept',
        '.cky-btn-accept',
      ];

      for (const selector of selectors) {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          console.log(`[${this.name}] Dismissed cookie banner via: ${selector}`);
          await page.waitForTimeout(1500);
          return;
        }
      }

      // Fallback: try to find any button with "accept" text
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text && /accept/i.test(text)) {
          await btn.click();
          console.log(`[${this.name}] Dismissed cookie banner via button text match`);
          await page.waitForTimeout(1500);
          return;
        }
      }

      console.log(`[${this.name}] No cookie banner found (may already be dismissed)`);
    } catch (err) {
      console.warn(`[${this.name}] Cookie banner dismissal failed: ${err}`);
    }
  }

  /**
   * Scroll to load lazy-loaded competition sections.
   */
  private async scrollToLoadAll(page: Page): Promise<void> {
    let previousHeight = 0;
    for (let i = 0; i < 25; i++) {
      const currentHeight = await page.evaluate(
        () => document.body.scrollHeight
      );
      if (currentHeight === previousHeight) break;
      previousHeight = currentHeight;
      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight)
      );
      await this.delay(800);
    }
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * Parse a full date string like "27 December 2025".
   */
  private parseDateStr(text: string): Date | null {
    const match = text.match(
      /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
    );
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];
    const month = monthNames.indexOf(match[2].toLowerCase());
    const year = parseInt(match[3], 10);

    if (month === -1 || isNaN(day) || isNaN(year)) return null;
    return new Date(year, month, day, 23, 0, 0); // Default to 11pm (common draw time)
  }

  /**
   * Parse end date from card text like:
   * - "ENDS TODAY 23:00"
   * - "ENDS Mon 29th Dec"
   * - "WIN LIVE MON 9TH FEB"
   */
  private parseEndDateFromCard(text: string): Date | null {
    // "ENDS TODAY 23:00"
    const todayMatch = text.match(/TODAY\s+(\d{1,2}):(\d{2})/i);
    if (todayMatch) {
      const now = new Date();
      now.setHours(
        parseInt(todayMatch[1], 10),
        parseInt(todayMatch[2], 10),
        0,
        0
      );
      return now;
    }

    // "Mon 29th Dec" or "FRI 13TH FEB" (with or without "ENDS" / "WIN LIVE")
    const dateMatch = text.match(
      /(\d{1,2})(?:st|nd|rd|th)\s+([A-Za-z]+)/i
    );
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const monthMap: Record<string, number> = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };
      const monthStr = dateMatch[2].toLowerCase().substring(0, 3);
      const month = monthMap[monthStr];
      if (month == null) return null;

      const now = new Date();
      const year = now.getFullYear();
      const target = new Date(year, month, day, 23, 0, 0);

      // If the date has passed, assume next year
      if (target < now) {
        target.setFullYear(year + 1);
      }

      return target;
    }

    return null;
  }
}
