import { BrowserContext, Page } from 'playwright';
import { BaseScraper, ScrapedRaffle, ScraperResult, QuickUpdateResult } from './base';
import { parsePriceToPence, extractSlugFromUrl } from '../lib/utils';

// ============================================
// 7 Days Performance Scraper
// ============================================

interface ListingCard {
  href: string;
  title: string;
  price: string | null;
  percentSold: number | null;
  cashAlternative: number | null;  // in pounds (not pence)
  imageUrl: string | null;
}

export class SevenDaysPerformanceScraper extends BaseScraper {
  name = '7 Days Performance';
  siteSlug = '7-days-performance';
  baseUrl = 'https://7daysperformance.co.uk';

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
    // 7 Days uses the homepage as the main listing
    const success = await this.navigateWithRetry(page, this.baseUrl, {
      waitUntil: 'domcontentloaded',
    });

    if (!success) {
      throw new Error('Failed to load listing page after retries');
    }

    // Wait for content to render
    await page.waitForTimeout(5000);

    // Scroll down to load all competition cards (they may lazy-load)
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(600);
    }

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));

    // Extract competition cards
    const cards = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href^="/product/"]'));

      // Deduplicate by href
      const seen = new Set<string>();
      const unique = allLinks.filter(a => {
        const href = a.getAttribute('href')!;
        if (seen.has(href)) return false;
        seen.add(href);
        return true;
      });

      return unique.map(a => {
        const href = a.getAttribute('href') || '';
        // Normalize newlines to spaces — 7DP card text uses block elements
        // which produce \n in innerText, breaking regex patterns
        const text = (a as HTMLElement).innerText.trim().replace(/\n+/g, ' ');
        const img = a.querySelector('img');
        const imgSrc = img?.getAttribute('src') || null;

        // === Parse structured data from link text ===
        //
        // Typical formats:
        //   "Draw on Monday 10pm Win This VW Golf GTI + £2,000 Cash! Cash Alternative: £22,500 £19.99 sold: 21 % Enter now"
        //   "Closing Today 10pm THE CHEAPEST YET ⚡️ 1 in 7.8 Chance of Winning ⚡️ £0.10"
        //   "Just launched Win this £550k Home! Cash Alternative: £450,000 £1.99 sold: 28 % Enter now"

        // Extract cash alternative
        const cashAltMatch = text.match(/Cash Alternative:\s*£([\d,]+)/i);
        const cashAlternative = cashAltMatch
          ? parseInt(cashAltMatch[1].replace(/,/g, ''))
          : null;

        // Extract percent sold
        const soldMatch = text.match(/sold:\s*(\d+)\s*%/i);
        const percentSold = soldMatch ? parseInt(soldMatch[1]) : null;

        // Extract ticket price — the £X.XX value right before "sold:" or "Enter now" or end
        // Must have a decimal to distinguish from prize values like £2,000
        let price: string | null = null;
        const priceRegex = /£(\d+\.\d+)\s*(?:sold|Enter|$)/i;
        const priceMatch = text.match(priceRegex);
        if (priceMatch) {
          price = `£${priceMatch[1]}`;
        }

        // Extract title — remove the draw timing prefix and trailing data
        let title = text;

        // Remove draw timing prefix:
        // "Draw Today 10pm ", "Closing Tomorrow 9pm ", "Draw on Monday 10pm ",
        // "Just launched ", "Closing on Wednesday 10pm "
        title = title.replace(
          /^(?:Draw\s+(?:Today|Tomorrow|on\s+\w+)\s+\d+(?::\d+)?pm\s*|Closing\s+(?:Today|Tomorrow|on\s+\w+)\s+\d+(?::\d+)?pm\s*|Just\s+launched\s*)/i,
          ''
        );

        // Remove trailing data: "Cash Alternative: £X £X.XX sold: XX % Enter now"
        title = title.replace(/\s*Cash Alternative:.*$/i, '');
        title = title.replace(/\s*£\d+\.\d+\s*(?:sold:.*)?(?:Enter now)?$/i, '');
        title = title.replace(/\s*sold:\s*\d+\s*%.*$/i, '');
        title = title.replace(/\s*Enter now\s*$/i, '');
        title = title.trim();

        return {
          href,
          title,
          price,
          percentSold,
          cashAlternative,
          imageUrl: imgSrc,
        };
      });
    });

    // Filter out free entries (£0.00) and cards with empty titles
    return cards.filter(card => {
      if (!card.title || card.title.length < 5) return false;
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
        .replace(/\s*-\s*7days Performance$/i, '')
        .trim();

      // === Total entries ===
      // Pattern: "total amount of entries for this competition is (X,XXX)" or "(XXXX)"
      const entriesMatch = body.match(
        /total (?:amount|number) of entries for this competition is\s*\(?([\d,]+)\)?/i
      );
      const totalEntries = entriesMatch
        ? parseInt(entriesMatch[1].replace(/,/g, ''))
        : null;

      // === Draw date ===
      // Pattern: "draw for this competition will take place on DD/MM/YYYY"
      const dateMatch = body.match(
        /draw for this competition will take place on\s*(\d{2}\/\d{2}\/\d{4})/i
      );
      const drawDateStr = dateMatch ? dateMatch[1] : null;

      // === Percent sold ===
      // Match "SOLD: 26%" or "SOLD: 26 %" (the actual format on the page).
      // Previous regex /(\d+)%?\s*sold/i was buggy — it matched the last
      // digits of ticket prices like "£19.99" followed by "\nSOLD:".
      const soldMatch = body.match(/SOLD:\s*(\d+)\s*%/i);
      const percentSold = soldMatch ? parseInt(soldMatch[1]) : null;

      // === Tickets sold / total from "658 / 2,499" pattern ===
      const ratioMatch = body.match(/SOLD:\s*\d+\s*%\s*([\d,]+)\s*\/\s*([\d,]+)/i);
      const ticketsSoldDirect = ratioMatch
        ? parseInt(ratioMatch[1].replace(/,/g, ''))
        : null;
      const totalEntriesDirect = ratioMatch
        ? parseInt(ratioMatch[2].replace(/,/g, ''))
        : null;

      // === Ticket price ===
      // Look for "for £X.XX!" pattern in descriptions
      const priceFromDesc = body.match(/for\s+£(\d+\.?\d*)\s*!/i);
      const price = priceFromDesc ? `£${priceFromDesc[1]}` : null;

      // === Cash alternative from page ===
      const cashAltMatch = body.match(/Cash Alternative:\s*£([\d,]+)/i);
      const cashAlternative = cashAltMatch
        ? parseInt(cashAltMatch[1].replace(/,/g, ''))
        : null;

      // === Additional cash ===
      // Pattern: "+ £X,XXX Cash!" or "& £X,XXX Cash!"
      const additionalMatch = pageTitle.match(/[+&]\s*£([\d,]+)\s*Cash/i);
      const additionalCash = additionalMatch
        ? parseInt(additionalMatch[1].replace(/,/g, ''))
        : null;

      // === Draw type ===
      const isAutomated = body.includes('Automated Draw System');
      const isLive = body.match(/live draw/i) !== null && !isAutomated;
      const drawType = isAutomated ? 'automated' : isLive ? 'live' : null;

      // === Main image ===
      // 7 Days uses a Swiper carousel for product galleries.
      // The carousel has duplicate slides for infinite scrolling, so we must
      // target the ACTIVE slide specifically to get the hero/exterior image.
      // Fallback: first non-duplicate gallery image, then any S3/CDN image.
      const activeSlideImg = document.querySelector('.swiper-slide-active .product-gallery__img') as HTMLImageElement | null;
      const firstGalleryImg = document.querySelector('.swiper-slide:not(.swiper-slide-duplicate) .product-gallery__img') as HTMLImageElement | null;
      const fallbackImg =
        document.querySelector('img[src*="7days-production"]') as HTMLImageElement | null ||
        document.querySelector('img[src*="7daysperformance"]') as HTMLImageElement | null;
      const mainImgSrc = activeSlideImg?.getAttribute('src') || firstGalleryImg?.getAttribute('src') || fallbackImg?.getAttribute('src') || null;

      return {
        pageTitle,
        totalEntries: totalEntriesDirect ?? totalEntries,
        ticketsSoldDirect,
        drawDateStr,
        percentSold,
        price,
        cashAlternative,
        additionalCash,
        drawType,
        mainImage: mainImgSrc,
      };
    });

    // Parse draw date (DD/MM/YYYY → Date object)
    let endDate: Date | null = null;
    if (data.drawDateStr) {
      const [day, month, year] = data.drawDateStr.split('/').map(Number);
      if (day && month && year) {
        // Set to 22:00 (10pm) as most draws happen at that time
        endDate = new Date(year, month - 1, day, 22, 0, 0);
      }
    }

    // Use detail page title, fall back to card title
    const title = data.pageTitle || card.title;
    const externalId = extractSlugFromUrl(url);

    // Determine % sold — prefer detail page, fall back to listing
    const percentSold = data.percentSold ?? card.percentSold ?? undefined;

    // Prefer the directly extracted tickets sold count (e.g. "658 / 2,499"),
    // fall back to calculating from percent and total
    let ticketsSold: number | undefined;
    if (data.ticketsSoldDirect) {
      ticketsSold = data.ticketsSoldDirect;
    } else if (data.totalEntries && percentSold) {
      ticketsSold = Math.round((percentSold / 100) * data.totalEntries);
    }

    // Parse price — prefer detail page, fall back to listing card
    const priceStr = data.price ?? card.price;
    const ticketPrice = priceStr ? (parsePriceToPence(priceStr) ?? undefined) : undefined;

    // Skip free entries
    if (ticketPrice != null && ticketPrice <= 0) {
      return null;
    }

    // Cash alternative — prefer detail page, fall back to listing card
    const cashAltPounds = data.cashAlternative ?? card.cashAlternative;
    const cashAlternative = cashAltPounds ? cashAltPounds * 100 : undefined;  // pounds to pence

    // Additional cash
    const additionalCash = data.additionalCash ? data.additionalCash * 100 : undefined;  // pounds to pence

    return {
      externalId,
      title,
      sourceUrl: url,
      // Prefer the listing card image (consistent hero/exterior shot),
      // fall back to the detail page active slide image
      imageUrl: card.imageUrl ?? data.mainImage ?? undefined,
      ticketPrice,
      totalTickets: data.totalEntries ?? undefined,
      ticketsSold,
      percentSold,
      cashAlternative,
      additionalCash,
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
      cashAlternative: card.cashAlternative ? card.cashAlternative * 100 : undefined,
    };
  }
}
