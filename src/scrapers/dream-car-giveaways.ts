import { BrowserContext, Page } from 'playwright';
import { BaseScraper, ScrapedRaffle, ScraperResult, QuickUpdateResult } from './base';
import { parsePriceToPence, extractSlugFromUrl } from '../lib/utils';

// ============================================
// Dream Car Giveaways Scraper
// ============================================

interface ListingCard {
  href: string;
  title: string;
  price: string | null;
  percentSold: number | null;
  imageUrl: string | null;
}

export class DreamCarGiveawaysScraper extends BaseScraper {
  name = 'Dream Car Giveaways';
  siteSlug = 'dream-car-giveaways';
  baseUrl = 'https://dreamcargiveaways.co.uk';

  /**
   * Full deep scrape — listing page + all detail pages.
   */
  async scrape(context: BrowserContext): Promise<ScraperResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const raffles: ScrapedRaffle[] = [];

    const page = await context.newPage();

    try {
      // Step 1: Get all competition links from listing page
      console.log(`[${this.name}] Fetching listing page...`);
      const cards = await this.scrapeListingPage(page);
      console.log(`[${this.name}] Found ${cards.length} competition cards`);

      // Step 2: Visit each detail page
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const detailUrl = `${this.baseUrl}${card.href}`;
        const externalId = extractSlugFromUrl(card.href);

        try {
          console.log(`[${this.name}] [${i + 1}/${cards.length}] Scraping: ${externalId}`);
          const raffle = await this.scrapeDetailPage(page, detailUrl, card);

          if (raffle) {
            raffles.push(raffle);
          }
        } catch (error) {
          const msg = `Failed to scrape ${externalId}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`[${this.name}] ${msg}`);
          errors.push(msg);
        }

        // Rate limiting between requests
        if (i < cards.length - 1) {
          await this.delay(1500);
        }
      }
    } catch (error) {
      const msg = `Listing page error: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[${this.name}] ${msg}`);
      errors.push(msg);
    } finally {
      await page.close();
    }

    return {
      siteName: this.name,
      siteSlug: this.siteSlug,
      raffles,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Quick update — listing page only, updates % sold and price.
   */
  async quickUpdate(context: BrowserContext): Promise<QuickUpdateResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const page = await context.newPage();

    try {
      const cards = await this.scrapeListingPage(page);

      const updates = cards
        .filter(card => card.price !== null || card.percentSold !== null)
        .map(card => ({
          externalId: extractSlugFromUrl(card.href),
          percentSold: card.percentSold ?? undefined,
          ticketPrice: card.price ? (parsePriceToPence(card.price) ?? undefined) : undefined,
        }));

      await page.close();

      return {
        siteName: this.name,
        siteSlug: this.siteSlug,
        updates,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const msg = `Quick update error: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(msg);
      await page.close();

      return {
        siteName: this.name,
        siteSlug: this.siteSlug,
        updates: [],
        errors,
        duration: Date.now() - startTime,
      };
    }
  }

  // ============================================
  // Private: Listing page scraping
  // ============================================

  private async scrapeListingPage(page: Page): Promise<ListingCard[]> {
    const success = await this.navigateWithRetry(page, `${this.baseUrl}/competitions`, {
      waitUntil: 'domcontentloaded',
    });

    if (!success) {
      throw new Error('Failed to load listing page after retries');
    }

    // Wait for content to render
    await page.waitForTimeout(5000);

    // Scroll down to load all competition cards (they may lazy-load)
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(800);
    }

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));

    // Extract competition cards
    const cards = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href^="/competitions/"]'));

      // Filter to actual competition cards (must have image and either price or % sold)
      const competitionCards = allLinks.filter(a => {
        const href = a.getAttribute('href') || '';
        const text = (a as HTMLElement).innerText || '';
        const hasImage = a.querySelector('img') !== null;
        const hasPrice = /£\d/.test(text);
        const hasSold = /\d+%\s*sold/i.test(text);

        // Exclude category pages and navigation links
        const categoryPaths = [
          '/competitions',
          '/competitions/',
          '/competitions/cars',
          '/competitions/cash',
          '/competitions/tech',
          '/competitions/watches',
          '/competitions/instant-wins',
        ];
        const isCategory = categoryPaths.includes(href) || /^\/competitions\/cars\//.test(href);

        return !isCategory && hasImage && (hasPrice || hasSold);
      });

      // Deduplicate by href
      const seen = new Set<string>();
      const unique = competitionCards.filter(a => {
        const href = a.getAttribute('href')!;
        if (seen.has(href)) return false;
        seen.add(href);
        return true;
      });

      return unique.map(a => {
        const href = a.getAttribute('href') || '';
        const text = (a as HTMLElement).innerText.trim();
        const img = a.querySelector('img');
        const imgSrc = img?.getAttribute('src') || null;

        // Extract title — get the longest meaningful line from card text
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const titleLine = lines
          .filter(l =>
            l.length > 15 &&
            !l.startsWith('£') &&
            !/^\d+%/.test(l) &&
            !/^\d+\s*days?$/i.test(l) &&
            !/^Closes/i.test(l) &&
            !/^App Exclusive/i.test(l)
          )
          .sort((a, b) => b.length - a.length)[0] || lines[0] || '';

        // Extract price (£X.XX format)
        const priceMatch = text.match(/£(\d+\.?\d*)/);

        // Extract percent sold
        const soldMatch = text.match(/(\d+)%\s*sold/i);

        return {
          href,
          title: titleLine,
          price: priceMatch ? `£${priceMatch[1]}` : null,
          percentSold: soldMatch ? parseInt(soldMatch[1]) : null,
          imageUrl: imgSrc,
        };
      });
    });

    // Filter out free entries (£0.00)
    return cards.filter(card => {
      if (!card.price) return true;
      const pence = parsePriceToPence(card.price);
      return pence !== null && pence > 0;
    });
  }

  // ============================================
  // Private: Detail page scraping
  // ============================================

  private async scrapeDetailPage(
    page: Page,
    url: string,
    card: ListingCard
  ): Promise<ScrapedRaffle | null> {
    const success = await this.navigateWithRetry(page, url, {
      waitUntil: 'domcontentloaded',
    });

    if (!success) {
      console.warn(`[${this.name}] Could not load detail page: ${url}`);
      // Fall back to listing card data only
      return this.buildRaffleFromCard(card);
    }

    // Wait for content to render
    await page.waitForTimeout(4000);

    const data = await page.evaluate(() => {
      const body = document.body.innerText;

      // === Clean title from document.title ===
      const pageTitle = (document.title || '')
        .replace(/\s*\|\s*Dream Car Giveaways$/i, '')
        .trim();

      // === Cash alternative & additional cash from the CLEAN title ===
      // This avoids the announcement banner contamination.
      // Pattern: "or £XX,XXX Tax Free" at the end of title
      const cashAltFromTitle = pageTitle.match(/or\s+£([\d,]+)\s*(?:tax free|cash)?/i);
      const cashAlternative = cashAltFromTitle
        ? parseInt(cashAltFromTitle[1].replace(/,/g, ''))
        : null;

      // Pattern: "& £X,XXX" or "+ £X,XXX" in title
      const additionalMatch = pageTitle.match(/[&+]\s*£([\d,]+)/i);
      const additionalCash = additionalMatch
        ? parseInt(additionalMatch[1].replace(/,/g, ''))
        : null;

      // === Total entries / tickets ===
      const entriesMatch = body.match(/([\d,]+)\s*entries/i);
      const totalEntries = entriesMatch
        ? parseInt(entriesMatch[1].replace(/,/g, ''))
        : null;

      // === Percent sold ===
      // Look for "XX% SOLD" or "XX%\nSOLD" pattern
      const soldMatch = body.match(/(\d+)%\s*(?:\n\s*)?(?:sold|SOLD)/i);
      const percentSold = soldMatch ? parseInt(soldMatch[1]) : null;

      // === Ticket price ===
      // Look for price near "Enter Now" button
      const priceMatch = body.match(/£(\d+\.?\d*)\s*\n?\s*Enter Now/i);
      const price = priceMatch ? `£${priceMatch[1]}` : null;

      // === Cash alternative from body (fallback) ===
      // Only use the explicit "cash alternative" wording (not "tax free")
      // to avoid catching the announcement banner. Scoped to after "entries".
      let cashAltFromBody: number | null = null;
      if (!cashAlternative) {
        const entriesIdx = body.indexOf('entries');
        if (entriesIdx > -1) {
          const section = body.substring(Math.max(0, entriesIdx - 300), entriesIdx);
          // Only match "cash alternative" — not "tax free" (banner says "tax free")
          const altMatch = section.match(/or\s+£([\d,]+)\s*cash alternative/i);
          cashAltFromBody = altMatch
            ? parseInt(altMatch[1].replace(/,/g, ''))
            : null;
        }
      }

      // === Draw type ===
      const drawTypeMatch = body.match(/(Live Draw|Automated Draw)/i);
      const drawType = drawTypeMatch ? drawTypeMatch[1].toLowerCase().replace(' draw', '') : null;

      // === Draw date / countdown ===
      const closesMatch = body.match(/Competition closes in\s*\n(\d+)\nDays?\n(\d+)\nHours?/i);
      const days = closesMatch ? parseInt(closesMatch[1]) : null;
      const hours = closesMatch ? parseInt(closesMatch[2]) : null;

      // === Main image ===
      const mainImg = document.querySelector('img[src*="media.dreamcargiveaways"]');
      const mainImgSrc = mainImg?.getAttribute('src') || null;

      return {
        pageTitle,
        totalEntries,
        percentSold,
        price,
        cashAlternative: cashAlternative || cashAltFromBody,
        additionalCash,
        drawType,
        daysRemaining: days,
        hoursRemaining: hours,
        mainImage: mainImgSrc,
      };
    });

    // Calculate end date from countdown
    let endDate: Date | null = null;
    if (data.daysRemaining != null && data.hoursRemaining != null) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + data.daysRemaining);
      endDate.setHours(endDate.getHours() + data.hoursRemaining);
    }

    // Use detail page title, fall back to card title
    const title = data.pageTitle || card.title;
    const externalId = extractSlugFromUrl(url);

    // Calculate tickets sold from percent and total
    let ticketsSold: number | undefined;
    const percentSold = data.percentSold ?? card.percentSold ?? undefined;
    if (data.totalEntries && percentSold) {
      ticketsSold = Math.round((percentSold / 100) * data.totalEntries);
    }

    // Parse price
    const priceStr = data.price ?? card.price;
    const ticketPrice = priceStr ? (parsePriceToPence(priceStr) ?? undefined) : undefined;

    // Skip free entries
    if (ticketPrice != null && ticketPrice <= 0) {
      return null;
    }

    return {
      externalId,
      title,
      sourceUrl: url,
      imageUrl: data.mainImage ?? card.imageUrl ?? undefined,
      ticketPrice,
      totalTickets: data.totalEntries ?? undefined,
      ticketsSold,
      percentSold,
      cashAlternative: data.cashAlternative ? data.cashAlternative * 100 : undefined, // convert pounds to pence
      additionalCash: data.additionalCash ? data.additionalCash * 100 : undefined,   // convert pounds to pence
      endDate: endDate ?? undefined,
      drawType: data.drawType ?? undefined,
    };
  }

  /**
   * Build a minimal raffle from listing card data (fallback when detail page fails).
   */
  private buildRaffleFromCard(card: ListingCard): ScrapedRaffle | null {
    const ticketPrice = card.price ? (parsePriceToPence(card.price) ?? undefined) : undefined;

    // Skip free entries
    if (ticketPrice != null && ticketPrice <= 0) {
      return null;
    }

    return {
      externalId: extractSlugFromUrl(card.href),
      title: card.title,
      sourceUrl: `${this.baseUrl}${card.href}`,
      imageUrl: card.imageUrl ?? undefined,
      ticketPrice,
      percentSold: card.percentSold ?? undefined,
    };
  }
}
