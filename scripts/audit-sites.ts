import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import Anthropic from '@anthropic-ai/sdk';
import { chromium } from 'playwright';
import { createServiceClient } from '../src/lib/supabase';
import { extractSlugFromUrl } from '../src/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface LiveRaffle {
  title: string;
  sourceUrl: string | null;
  ticketPricePence: number | null;
  endDate: string | null;
  imageUrl: string | null;
  totalTickets: number | null;
}

interface DbRaffle {
  id: string;
  external_id: string;
  title: string;
  source_url: string;
  ticket_price: number | null;
  end_date: string | null;
  image_url: string | null;
  total_tickets: number | null;
  status: string;
}

interface SiteAuditResult {
  slug: string;
  name: string;
  listingUrl: string;
  liveCount: number;
  dbCount: number;
  matchedCount: number;
  staleInDb: { title: string; externalId: string }[];
  missingFromDb: { title: string; sourceUrl: string }[];
  missingImages: { title: string; externalId: string }[];
  priceMismatches: { title: string; livePrice: number; dbPrice: number }[];
  endDateMismatches: { title: string; liveDate: string; dbDate: string }[];
  error: string | null;
}

interface AuditOutput {
  auditedAt: string;
  sites: SiteAuditResult[];
  summary: {
    sitesAudited: number;
    totalLive: number;
    totalDb: number;
    staleInDb: number;
    missingFromDb: number;
    missingImages: number;
    priceMismatches: number;
    endDateMismatches: number;
  };
}

// ── Site registry ─────────────────────────────────────────────────────────────
// Listing URLs verified against each scraper's baseUrl/listingUrl fields.

const SITES: { slug: string; name: string; listingUrl: string }[] = [
  { slug: 'dream-car-giveaways',     name: 'Dream Car Giveaways',     listingUrl: 'https://dreamcargiveaways.co.uk/competitions' },
  { slug: '7-days-performance',      name: '7 Days Performance',      listingUrl: 'https://7daysperformance.co.uk' },
  { slug: 'rev-comps',               name: 'Rev Comps',               listingUrl: 'https://www.revcomps.com' },
  { slug: 'elite-competitions',      name: 'Elite Competitions',      listingUrl: 'https://elitecompetitions.co.uk' },
  { slug: 'click-competitions',      name: 'Click Competitions',      listingUrl: 'https://www.clickcompetitions.co.uk/competitions/' },
  { slug: 'lucky-day-competitions',  name: 'Lucky Day Competitions',  listingUrl: 'https://www.luckydaycompetitions.com/all-competitions/' },
  { slug: 'llf-games',               name: 'LLF Games',               listingUrl: 'https://llfgames.com/shop/' },
  { slug: 'botb',                    name: 'BOTB',                    listingUrl: 'https://www.botb.com' },
];
