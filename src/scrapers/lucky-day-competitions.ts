/**
 * Lucky Day Competitions Scraper
 * Site: https://www.luckydaycompetitions.com
 *
 * WooCommerce SSR site. Static HTML is served immediately — no Playwright needed.
 * Uses Node 18 native fetch + cheerio.
 *
 * Ticket data format on listing cards: "Tickets remaining 98% 588/597"
 *   → ticketsRemaining = 588, totalTickets = 597, percentSold = 100 - 98 = 2
 */

import * as cheerio from 'cheerio';
import { BrowserContext } from 'playwright';
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

export interface ListingCard {
  title: string;
  url: string;
  imageUrl?: string;
  ticketPrice?: number;      // pence
  totalTickets?: number;
  ticketsRemaining?: number;
  percentSold?: number;      // 0–100
  endDateText?: string;
}

// ============================================
// Skip patterns
// ============================================

const SKIP_TITLE_PATTERNS = [/gift voucher/i];

const SKIP_LINE_PATTERNS = [
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

// ============================================
// Pure parsing helpers (exported for unit tests)
// ============================================

/**
 * Parse text lines from a WooCommerce listing card into structured data.
 * Returns null if the card is unusable (no title, etc.).
 */
export function parseCardText(lines: string[], url: string): ListingCard | null {
  if (lines.length === 0) return null;

  // Price: first line matching "£N.NN"
  let ticketPrice: number | undefined;
  const priceLine = lines.find(l => /^£[\d.]+$/.test(l));
  if (priceLine) ticketPrice = parsePriceToPence(priceLine) ?? undefined;

  // Tickets: "Tickets remaining 98% 588/597" or "588/597"
  let totalTickets: number | undefined;
  let ticketsRemaining: number | undefined;
  let percentSold: number | undefined;

  const ticketLine = lines.find(l => /\d+\/\d+/.test(l));
  if (ticketLine) {
    const m = ticketLine.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) {
      ticketsRemaining = parseInt(m[1], 10);
      totalTickets = parseInt(m[2], 10);
      const sold = totalTickets - ticketsRemaining;
      percentSold = totalTickets > 0 ? Math.round((sold / totalTickets) * 100) : 0;
    }
  }

  if (percentSold === undefined) {
    const remLine = lines.find(l => /tickets remaining\s+\d+%/i.test(l));
    if (remLine) {
      const m = remLine.match(/(\d+)%/);
      if (m) percentSold = 100 - parseInt(m[1], 10);
    }
  }

  // End date: "Ends Tue 10th Feb"
  let endDateText: string | undefined;
  const endLine = lines.find(l => /^ends\s/i.test(l));
  if (endLine) endDateText = endLine;

  // Title: first non-skip line with enough substance
  const titleCandidates = lines.filter(l =>
    !SKIP_LINE_PATTERNS.some(p => p.test(l)) && l.length > 3
  );
  const title = titleCandidates[0] || '';
  if (!title) return null;

  return { title, url, ticketPrice, totalTickets, ticketsRemaining, percentSold, endDateText };
}

/**
 * Parse relative end-date text.
 * "Ends Tue 10th Feb" → Date at 21:00 that day (advances year if date is past).
 */
export function parseRelativeDate(text?: string): Date | undefined {
  if (!text) return undefined;

  const m = text.match(
    /(?:mon|tue|wed|thu|fri|sat|sun)\w*\s+(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/i
  );
  if (!m) return undefined;

  const day = parseInt(m[1], 10);
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const month = monthMap[m[2].toLowerCase()];
  if (month === undefined) return undefined;

  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month, day, 21, 0, 0, 0);
  if (candidate < now) year++;

  return new Date(year, month, day, 21, 0, 0, 0);
}

// ============================================
// HTTP helper
// ============================================

const FETCH_TIMEOUT_MS = 30_000;
const DELAY_MS = 800;
const MAX_PAGES = 10;

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CarRaffleOdds-Bot/1.0; +https://carraffleodds.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================
// Scraper
// ============================================

export class LuckyDayCompetitionsScraper extends BaseScraper {
  name = 'Lucky Day Competitions';
  siteSlug = 'lucky-day-competitions';
  baseUrl = 'https://www.luckydaycompetitions.com';

  private listingUrl = 'https://www.luckydaycompetitions.com/all-competitions/';

  private static readonly HIGH_VALUE_KEYWORDS = [
    'bmw', 'audi', 'mercedes', 'ferrari', 'lamborghini', 'porsche', 'mclaren',
    'volkswagen', 'vw ', 'ford', 'honda', 'toyota', 'nissan',
    'range rover', 'land rover', 'bentley', 'rolls royce', 'tesla',
    'volvo', 'vauxhall', 'mini cooper', 'jaguar', 'aston martin',
    'defender', 'motorhome', 'campervan', 'camper',
    'peugeot', 'seat ', 'skoda', 'fiat ', 'alfa romeo', 'maserati',
    'suzuki', 'transit', 'transporter',
    'ducati', 'kawasaki', 'yamaha', 'motorcycle', 'motorbike',
    'triumph', 'fireblade', 'hayabusa', 'sur ron', 'surron',
    'rolex', 'tag heuer', 'omega', 'breitling', 'watch',
    'house', 'home', 'property',
    'car', 'van', 'bike',
  ];

  private needsDetailPage(title: string): boolean {
    const lower = title.toLowerCase();
    return LuckyDayCompetitionsScraper.HIGH_VALUE_KEYWORDS.some(kw => lower.includes(kw));
  }

  // ==========================================
  // Public interface (context param kept for BaseScraper compatibility)
  // ==========================================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async scrape(_context: BrowserContext): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const raffles: ScrapedRaffle[] = [];

    try {
      const cards = await this.scrapeListingPages(errors);
      console.log(`[${this.name}] Found ${cards.length} cards`);

      const detailCards = cards.filter(c => this.needsDetailPage(c.title));
      const listingOnlyCards = cards.filter(c => !this.needsDetailPage(c.title));

      console.log(`[${this.name}] ${detailCards.length} high-value (detail), ${listingOnlyCards.length} listing-only`);

      for (const card of listingOnlyCards) {
        const r = this.buildRaffleFromCard(card);
        if (r) raffles.push(r);
      }

      for (let i = 0; i < detailCards.length; i++) {
        const card = detailCards[i];
        const slug = extractSlugFromUrl(card.url);
        console.log(`[${this.name}] [${i + 1}/${detailCards.length}] Detail: ${slug}`);

        const r = await this.scrapeDetailPage(card).catch(err => {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${slug}: ${msg}`);
          return this.buildRaffleFromCard(card);
        });
        if (r) raffles.push(r);

        await sleep(DELAY_MS);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Fatal: ${msg}`);
      console.error(`[${this.name}] Fatal: ${msg}`);
    }

    return { siteName: this.name, siteSlug: this.siteSlug, raffles, errors, duration: Date.now() - start };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async quickUpdate(_context: BrowserContext): Promise<QuickUpdateResult> {
    const start = Date.now();
    const errors: string[] = [];
    const updates: QuickUpdateResult['updates'] = [];

    try {
      const cards = await this.scrapeListingPages(errors);
      for (const card of cards) {
        const externalId = extractSlugFromUrl(card.url);
        if (!externalId) continue;
        updates.push({ externalId, percentSold: card.percentSold, ticketPrice: card.ticketPrice });
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }

    return { siteName: this.name, siteSlug: this.siteSlug, updates, errors, duration: Date.now() - start };
  }

  // ==========================================
  // Listing pages (paginated)
  // ==========================================

  private async scrapeListingPages(errors: string[]): Promise<ListingCard[]> {
    const all: ListingCard[] = [];
    let url: string | null = this.listingUrl;
    let pageNum = 0;

    while (url && pageNum < MAX_PAGES) {
      pageNum++;
      let html: string;
      try {
        html = await fetchHtml(url);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Listing page ${pageNum} fetch failed: ${msg}`);
        break;
      }

      const $ = cheerio.load(html);
      const seen = new Set<string>();

      $('li a[href*="/product/"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr('href');
        if (!href || seen.has(href)) return;
        seen.add(href);

        const rawText = $a.text().trim();
        if (!rawText) return;

        // Reject stand-alone button links
        if (['Enter Now', 'Quick Buy', 'Read More'].includes(rawText)) return;

        const imageUrl =
          $a.find('img').first().attr('src') ||
          $a.find('img').first().attr('data-src') ||
          '';

        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        const card = parseCardText(lines, href);
        if (!card) return;
        if (SKIP_TITLE_PATTERNS.some(p => p.test(card.title))) return;
        if (card.ticketPrice === undefined || card.ticketPrice <= 0) return;

        all.push({ ...card, imageUrl: imageUrl || undefined });
      });

      // Follow WooCommerce pagination
      const nextHref = $('a.next.page-numbers').attr('href') || null;
      url = nextHref;
      if (url) await sleep(DELAY_MS);
    }

    return all;
  }

  // ==========================================
  // Detail page (high-value raffles only)
  // ==========================================

  private async scrapeDetailPage(card: ListingCard): Promise<ScrapedRaffle | null> {
    const html = await fetchHtml(card.url);
    const $ = cheerio.load(html);
    const body = $.text();

    const cashMatch = body.match(/cash\s*alternative[:\s]*£([\d,]+)/i);
    const cashAlternative = cashMatch
      ? (parsePriceToPence('£' + cashMatch[1]) ?? undefined)
      : undefined;

    const prizeMatch = body.match(/(?:prize|rrp|value)[:\s]*£([\d,]+)/i);
    const prizeValue = prizeMatch
      ? (parsePriceToPence('£' + prizeMatch[1]) ?? undefined)
      : undefined;

    const galleryImg = $('.woocommerce-product-gallery img, .product-image img, img.wp-post-image').first();
    const imageUrl = galleryImg.attr('src') || galleryImg.attr('data-src') || card.imageUrl;

    const ticketMatch = body.match(/(?:max|total)\s*(?:entries|tickets)[:\s]*([\d,]+)/i);
    const totalTickets = card.totalTickets
      || (ticketMatch ? parseInt(ticketMatch[1].replace(/,/g, ''), 10) : undefined);

    const externalId = extractSlugFromUrl(card.url);
    if (!externalId) return null;

    const ticketsSold = totalTickets !== undefined && card.ticketsRemaining !== undefined
      ? totalTickets - card.ticketsRemaining
      : undefined;

    return {
      externalId,
      title: this.sanitizeTitle(card.title, card.url),
      sourceUrl: card.url,
      imageUrl,
      ticketPrice: card.ticketPrice,
      totalTickets,
      ticketsSold,
      percentSold: card.percentSold,
      cashAlternative,
      prizeValue,
      endDate: parseRelativeDate(card.endDateText),
      drawType: 'live_draw',
    };
  }

  // ==========================================
  // Fallback builder (listing data only)
  // ==========================================

  private buildRaffleFromCard(card: ListingCard): ScrapedRaffle | null {
    const externalId = extractSlugFromUrl(card.url);
    if (!externalId) return null;

    const ticketsSold = card.totalTickets !== undefined && card.ticketsRemaining !== undefined
      ? card.totalTickets - card.ticketsRemaining
      : undefined;

    return {
      externalId,
      title: this.sanitizeTitle(card.title, card.url),
      sourceUrl: card.url,
      imageUrl: card.imageUrl,
      ticketPrice: card.ticketPrice,
      totalTickets: card.totalTickets,
      ticketsSold,
      percentSold: card.percentSold,
      endDate: parseRelativeDate(card.endDateText),
      drawType: 'live_draw',
    };
  }
}
