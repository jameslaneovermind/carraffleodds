export interface FreeEntrySite {
  siteSlug: string;
  siteName: string;
  isFreeEntryAvailable: boolean;
  postalAddress: string | null;
  entryDeadlineDays: number | null;
  skillQuestionFormat: string | null;
  lastVerified: string; // 'YYYY-MM'
  notes: string | null;
}

export const FREE_ENTRY_SITES: FreeEntrySite[] = [
  {
    siteSlug: 'elite-competitions',
    siteName: 'Elite Competitions',
    isFreeEntryAvailable: true,
    postalAddress: 'Unit 6, 7 & 8 Turing Court, Hawking Place, Bispham, Blackpool, FY2 0QW',
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: 'rev-comps',
    siteName: 'Rev Comps',
    isFreeEntryAvailable: true,
    postalAddress: 'Northfield House, Shurdington Road, Bentham, Cheltenham, GL51 4UA',
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: 'dream-car-giveaways',
    siteName: 'Dream Car Giveaways',
    isFreeEntryAvailable: true,
    postalAddress: 'DCG Ltd, PO Box 2050, Pershore, WR10 9FA',
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    lastVerified: '2026-06',
    notes: 'Allows multiple entries per stamp on a sliding scale — cheaper competitions give more entries per stamp. Check T&Cs for the current scale.',
  },
  {
    siteSlug: 'click-competitions',
    siteName: 'Click Competitions',
    isFreeEntryAvailable: true,
    postalAddress: null,
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: 'lucky-day',
    siteName: 'Lucky Day Competitions',
    isFreeEntryAvailable: true,
    postalAddress: '72 Tievecrom Road, Forkhill, Newry, Co. Down, BT35 9RX',
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: '7-days-performance',
    siteName: '7 Days Performance',
    isFreeEntryAvailable: true,
    postalAddress: null,
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: 'llf-games',
    siteName: 'LLF Games',
    isFreeEntryAvailable: true,
    postalAddress: 'LLF Games Ltd, Tayfield House, 38 Poole Road, Westbourne, Bournemouth, BH4 9DW',
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    lastVerified: '2026-06',
    notes: null,
  },
  {
    siteSlug: 'botb',
    siteName: 'BOTB',
    isFreeEntryAvailable: false,
    postalAddress: null,
    entryDeadlineDays: null,
    skillQuestionFormat: null,
    lastVerified: '2026-06',
    notes: "BOTB's Spot the Ball is a skill competition. It operates under the prize competition exemption rather than prize draw rules, so the free entry requirement doesn't apply. No postal entry is available.",
  },
];

export function getFreeEntryForSite(slug: string): FreeEntrySite | undefined {
  return FREE_ENTRY_SITES.find(s => s.siteSlug === slug);
}

export function formatVerified(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-').map(Number);
  return new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
