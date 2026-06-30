import { describe, it, expect } from 'vitest';
import { getFreeEntryForSite, FREE_ENTRY_SITES, formatVerified } from '../free-entry';

describe('getFreeEntryForSite', () => {
  it('returns the correct site for a known slug', () => {
    const site = getFreeEntryForSite('rev-comps');
    expect(site).toBeDefined();
    expect(site?.siteName).toBe('Rev Comps');
  });

  it('returns undefined for an unknown slug', () => {
    expect(getFreeEntryForSite('unknown-site')).toBeUndefined();
  });

  it('returns BOTB with isFreeEntryAvailable false', () => {
    const botb = getFreeEntryForSite('botb');
    expect(botb?.isFreeEntryAvailable).toBe(false);
  });
});

describe('FREE_ENTRY_SITES', () => {
  it('has an entry for all 8 tracked sites', () => {
    const slugs = FREE_ENTRY_SITES.map(s => s.siteSlug);
    expect(slugs).toContain('elite-competitions');
    expect(slugs).toContain('rev-comps');
    expect(slugs).toContain('dream-car-giveaways');
    expect(slugs).toContain('click-competitions');
    expect(slugs).toContain('lucky-day');
    expect(slugs).toContain('7-days-performance');
    expect(slugs).toContain('llf-games');
    expect(slugs).toContain('botb');
  });

  it('all entries have a lastVerified date in YYYY-MM format', () => {
    for (const site of FREE_ENTRY_SITES) {
      expect(site.lastVerified).toMatch(/^\d{4}-\d{2}$/);
    }
  });
});

describe('formatVerified', () => {
  it('formats YYYY-MM as "Month YYYY" in en-GB locale', () => {
    expect(formatVerified('2026-06')).toBe('June 2026');
  });
});
