import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PrizeType, CarCategory } from './types';

// ============================================
// shadcn/ui Utility
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// Odds & Value Calculations
// ============================================

/**
 * Calculate odds ratio — "1 in X" per single ticket. Lower is better.
 */
export function calculateOddsRatio(totalTickets: number | null): number | null {
  if (!totalTickets || totalTickets <= 0) return null;
  return totalTickets;
}

/**
 * Value per pound — how much prize value per £1 spent.
 * Uses cashAlternative as fallback when prizeValue isn't available.
 */
export function calculateValuePerPound(
  prizeValue: number | null,
  cashAlternative: number | null,
  ticketPrice: number | null
): number | null {
  const value = prizeValue || cashAlternative;
  if (!value || !ticketPrice || ticketPrice <= 0) return null;
  return value / ticketPrice;
}

/**
 * Expected value (Value Score) — return per £1 spent.
 *
 *   Value Score = Prize Value / (Ticket Price × Total Tickets)
 *
 * A score of 0.75 means for every £1 you spend, you're "buying"
 * 75p of prize value on average. Higher is better.
 *
 * Uses cashAlternative as fallback when prizeValue isn't available.
 */
export function calculateExpectedValue(
  prizeValue: number | null,
  cashAlternative: number | null,
  totalTickets: number | null,
  ticketPrice: number | null
): number | null {
  const value = prizeValue || cashAlternative;
  if (!value || !totalTickets || !ticketPrice || totalTickets <= 0 || ticketPrice <= 0) {
    return null;
  }
  return (value / totalTickets) / ticketPrice;
}

/**
 * Compute value score from a Raffle object (client-side).
 * Returns the expected return per £1 spent, or null.
 */
export function getValueScore(raffle: {
  prize_value: number | null;
  cash_alternative: number | null;
  total_tickets: number | null;
  ticket_price: number | null;
}): number | null {
  // Prefer DB-computed value if available
  const value = raffle.prize_value || raffle.cash_alternative;
  if (!value || !raffle.total_tickets || !raffle.ticket_price) return null;
  if (raffle.total_tickets <= 0 || raffle.ticket_price <= 0) return null;
  return value / (raffle.total_tickets * raffle.ticket_price);
}

/**
 * Format value score for display.
 * 0.75 → "75p", 1.2 → "£1.20", 0.04 → "4p"
 */
export function formatValueScore(score: number | null): string {
  if (score == null) return 'N/A';
  const pence = Math.round(score * 100);
  if (pence >= 100) {
    const pounds = (pence / 100).toFixed(2);
    return `£${pounds}`;
  }
  return `${pence}p`;
}

/**
 * Get a qualitative label for a value score.
 */
export function getValueScoreLabel(score: number | null): { label: string; color: string } {
  if (score == null) return { label: '', color: 'text-slate-400' };
  if (score >= 0.70) return { label: 'Excellent', color: 'text-emerald-600' };
  if (score >= 0.45) return { label: 'Great', color: 'text-green-600' };
  if (score >= 0.25) return { label: 'Good', color: 'text-blue-600' };
  if (score >= 0.10) return { label: 'Fair', color: 'text-amber-600' };
  return { label: 'Low', color: 'text-slate-400' };
}

/**
 * Calculate all derived fields for a raffle.
 */
export function calculateRaffleMetrics(data: {
  prizeValue: number | null;
  cashAlternative: number | null;
  totalTickets: number | null;
  ticketPrice: number | null;
  ticketsSold: number | null;
  endDate: Date | null;
}) {
  const { prizeValue, cashAlternative, totalTickets, ticketPrice, ticketsSold, endDate } = data;

  const ticketsRemaining =
    totalTickets != null && ticketsSold != null
      ? totalTickets - ticketsSold
      : null;

  const percentSold =
    totalTickets != null && ticketsSold != null && totalTickets > 0
      ? Number(((ticketsSold / totalTickets) * 100).toFixed(2))
      : null;

  const oddsRatio = calculateOddsRatio(totalTickets);
  const valuePerPound = calculateValuePerPound(prizeValue, cashAlternative, ticketPrice);
  const expectedValue = calculateExpectedValue(prizeValue, cashAlternative, totalTickets, ticketPrice);

  // Determine status
  let status: 'active' | 'ending_soon' | 'sold_out' = 'active';
  if (percentSold != null && percentSold >= 100) {
    status = 'sold_out';
  } else if (endDate) {
    const hoursUntilEnd = (endDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilEnd <= 48 && hoursUntilEnd > 0) {
      status = 'ending_soon';
    }
  }

  return {
    tickets_remaining: ticketsRemaining,
    percent_sold: percentSold,
    odds_ratio: oddsRatio,
    value_per_pound: valuePerPound,
    expected_value: expectedValue,
    status,
  };
}

// ============================================
// Car Classification
// ============================================

const CATEGORY_RULES: Record<CarCategory, string[]> = {
  supercar: ['lamborghini', 'ferrari', 'mclaren', 'bugatti', 'pagani', 'koenigsegg', 'aston martin'],
  performance: [
    ' m2 ', ' m3 ', ' m4 ', ' m5 ', ' m8 ', 'm135', 'm140i', 'm240i', 'm340',
    'rs3', 'rs4', 'rs5', 'rs6', 'rs7', 'amg', 'type r', 'st-line',
    'vxr', 'gti', 'golf r', 'focus rs', 'civic type',
    'sti', 'wrx', 'gt4rs', 'gt3 rs', 'cayman', ' 911 ', 'supra', ' gtr',
    'gt-r', 'nismo', 'gr yaris', 'a45', 'c63', 'e63', 's63',
    'jimny',
  ],
  luxury: [
    'rolls royce', 'bentley', 'maybach', 'range rover',
    'g wagon', 'g63', 'g-class', 'defender',
  ],
  electric: [
    'tesla', 'model 3', 'model y', 'model s', 'model x',
    'taycan', 'e-tron', 'id.', 'ioniq', 'ev6', 'enyaq',
    'polestar',
  ],
  suv: [
    'urus', 'cayenne', 'macan', 'x3', 'x5', 'x7',
    'q5', 'q7', 'q8', 'glc', 'gle', 'gls',
    'tiguan', 'tucson', 'sportage', 'xc60', 'xc90',
  ],
  classic: [
    'escort rs', 'cosworth', 'mk1', 'mk2', 'e30', 'e36',
    'mini cooper classic', 'nova gsi', 'ek9', 'skyline r32',
    'skyline r33', 'restored', '106 rallye',
  ],
  sedan: [
    '3 series', '5 series', 'a4 ', 'a6 ', 'c-class', 'e-class',
    's-class',
  ],
  van: ['transit', 'sprinter', 'vivaro', 'transporter', 'crafter', 'camper', 'ranger'],
  other: [],
};

/**
 * Classify a car into a category based on title and make/model.
 * Pads the search text with spaces so word-boundary keywords like ' m3 ' work.
 */
export function classifyCarCategory(title: string, make?: string, model?: string): CarCategory {
  const searchText = ' ' + [title, make, model].filter(Boolean).join(' ').toLowerCase() + ' ';

  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (category === 'other') continue;
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category as CarCategory;
      }
    }
  }

  return 'other';
}

// ============================================
// Prize Type Classification
// ============================================

const PRIZE_TYPE_RULES: Record<Exclude<PrizeType, 'other'>, string[]> = {
  car: [
    'bmw', 'audi', 'mercedes', 'ferrari', 'lamborghini', 'porsche', 'mclaren',
    'volkswagen', 'ford focus', 'ford fiesta', 'ford mustang', 'ford escort',
    'ford transit', 'ford ranger',
    'honda civic', 'honda type', 'toyota supra', 'toyota gr', 'nissan gtr', 'nissan gt-r', 'nissan skyline',
    'range rover', 'land rover', 'bentley', 'rolls royce', 'tesla',
    'volvo xc', 'volvo v', 'volvo s', 'vauxhall', 'mini cooper',
    'jaguar', 'aston martin', 'defender', 'motorhome', 'campervan',
    'peugeot', 'seat ', 'skoda', 'fiat ', 'alfa romeo', 'maserati',
    'suzuki jimny', 'suzuki swift',
    'transit connect', 'transporter', 'camper',
    'car giveaway', 'free car',
  ],
  motorcycle: [
    'ducati', 'kawasaki ninja', 'yamaha r1', 'yamaha mt',
    'motorcycle', 'motorbike', 'panigale',
    'honda cb', 'triumph street', 'triumph speed',
    'fireblade', 'hayabusa',
    'sur ron', 'surron',
  ],
  cash: [
    'tax free cash', 'win £',
  ],
  watch: [
    'rolex', 'tag heuer', 'omega', 'breitling', 'cartier',
    'watch', 'patek', 'audemars', 'tissot', 'swatch',
  ],
  tech: [
    'iphone', 'macbook', 'ipad', 'samsung', 'playstation', 'ps5',
    'xbox', 'nintendo', 'switch', 'gaming', 'apple', 'pixel',
    'laptop', 'tv ', 'smart tv', 'steam deck', 'alienware',
    'dyson', 'imac',
  ],
  holiday: [
    'holiday', 'tui voucher', 'travel', 'getaway', 'spa break',
    'tickets to',
  ],
  house: [
    'house', 'home package', 'property', 'apartment', 'flat',
    'herefordshire', 'worcestershire', 'cottage',
  ],
};

/**
 * Titles that should NOT be classified as car/motorcycle even if they match keywords.
 */
const NOT_REAL_VEHICLE_PATTERNS = [
  'ride on', 'kids', 'toy', 'rc ', 'r/c', '1:8', '1:10', '1:16', '1:18',
  'scale', 'remote control', 'rtr', 'hpi ', 'licensed ride',
  'mini bag', 'mini bundle', 'mini pack',
  'gucci', 'dior', 'louis vuitton', 'prada',
];

/**
 * Titles that indicate instant-win / game-style competitions (not pure cash).
 */
const INSTANT_WIN_PATTERNS = [
  'instant win', 'guaranteed wins', 'prize pot', 'prize every time',
  'click & win', 'click and win', 'wheel of fortune', 'wheel of wealth',
  'arcade', 'vault',
  'cash spin', 'cash scratch', 'fortune builder',
  'fishing finds', 'coin drop', 'drop zone',
  'temple of prosperity', 'pirate quest',
];

/**
 * Determine the prize type from the competition title.
 */
export function classifyPrizeType(title: string): PrizeType {
  const lowerTitle = title.toLowerCase();

  // Check if it's an instant-win game (classify as 'other', not cash)
  for (const pattern of INSTANT_WIN_PATTERNS) {
    if (lowerTitle.includes(pattern)) return 'other';
  }

  // Check if title contains NOT-a-real-vehicle patterns
  const isNotRealVehicle = NOT_REAL_VEHICLE_PATTERNS.some(p => lowerTitle.includes(p));

  // Check car first — many car prizes also mention cash alternatives
  if (!isNotRealVehicle) {
    for (const keyword of PRIZE_TYPE_RULES.car) {
      if (lowerTitle.includes(keyword)) return 'car';
    }
  }

  // Check motorcycle before others
  if (!isNotRealVehicle) {
    for (const keyword of PRIZE_TYPE_RULES.motorcycle) {
      if (lowerTitle.includes(keyword)) return 'motorcycle';
    }
  }

  // Check house before cash (houses mention "tax free" too)
  for (const keyword of PRIZE_TYPE_RULES.house) {
    if (lowerTitle.includes(keyword)) return 'house';
  }

  // Check watch before tech
  for (const keyword of PRIZE_TYPE_RULES.watch) {
    if (lowerTitle.includes(keyword)) return 'watch';
  }

  // Check tech
  for (const keyword of PRIZE_TYPE_RULES.tech) {
    if (lowerTitle.includes(keyword)) return 'tech';
  }

  // Check holiday
  for (const keyword of PRIZE_TYPE_RULES.holiday) {
    if (lowerTitle.includes(keyword)) return 'holiday';
  }

  // Check cash last (most generic)
  for (const keyword of PRIZE_TYPE_RULES.cash) {
    if (lowerTitle.includes(keyword)) return 'cash';
  }

  return 'other';
}

// ============================================
// Formatting Helpers
// ============================================

/**
 * Format pence as pounds string. 4999 → "£49.99", 4300000 → "£43,000"
 */
export function formatPence(pence: number | null): string {
  if (pence == null) return 'N/A';
  const pounds = pence / 100;
  // If it's a whole number, omit the decimals and use commas
  if (pounds % 1 === 0) {
    return `£${pounds.toLocaleString('en-GB')}`;
  }
  return `£${pounds.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format odds ratio. 5000 → "1 in 5,000"
 */
export function formatOdds(oddsRatio: number | null): string {
  if (oddsRatio == null) return 'N/A';
  return `1 in ${oddsRatio.toLocaleString()}`;
}

/**
 * Parse a price string to pence. "£0.79" → 79, "£2.99" → 299
 */
export function parsePriceToPence(priceStr: string): number | null {
  const match = priceStr.match(/£?([\d,]+\.?\d*)/);
  if (!match) return null;
  const pounds = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(pounds)) return null;
  return Math.round(pounds * 100);
}

/**
 * Parse a cash value from a title string.
 */
export function parseCashFromTitle(title: string): {
  additionalCash: number | null;
  cashAlternative: number | null;
} {
  const cashAltMatch = title.match(/or\s+£([\d,]+)/i);
  const cashAlternative = cashAltMatch
    ? Math.round(parseFloat(cashAltMatch[1].replace(/,/g, '')) * 100)
    : null;

  const additionalMatch = title.match(/[&+]\s*£([\d,]+)/i);
  const additionalCash = additionalMatch
    ? Math.round(parseFloat(additionalMatch[1].replace(/,/g, '')) * 100)
    : null;

  return { additionalCash, cashAlternative };
}

/**
 * Extract the URL slug to use as an external ID.
 */
export function extractSlugFromUrl(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1] || parts[parts.length - 2] || url;
}

/**
 * Build the outbound link — affiliate URL if available, otherwise direct source.
 */
export function getOutboundUrl(sourceUrl: string, affiliateUrl?: string | null): string {
  return affiliateUrl || sourceUrl;
}
