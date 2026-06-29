import { describe, it, expect } from 'vitest';
import {
  groupSiteComparisonRows,
  groupReleasePatternRows,
  groupMarketBreakdownRows,
} from '../insights';

describe('groupSiteComparisonRows', () => {
  it('aggregates draws by site and computes avg/min/max', () => {
    const rows = [
      { name: 'Rev Comps', slug: 'rev-comps', percent_sold: 80 },
      { name: 'Rev Comps', slug: 'rev-comps', percent_sold: 60 },
      { name: 'Lucky Day', slug: 'lucky-day', percent_sold: 50 },
    ];
    const result = groupSiteComparisonRows(rows);
    const rc = result.find(r => r.slug === 'rev-comps')!;
    expect(rc.total_draws).toBe(2);
    expect(rc.avg_percent_sold).toBe(70);
    expect(rc.min_percent_sold).toBe(60);
    expect(rc.max_percent_sold).toBe(80);
    expect(result.length).toBe(2);
  });

  it('sorts by avg_percent_sold ascending (best odds first)', () => {
    const rows = [
      { name: 'Rev Comps', slug: 'rev-comps', percent_sold: 80 },
      { name: 'Lucky Day', slug: 'lucky-day', percent_sold: 50 },
    ];
    const result = groupSiteComparisonRows(rows);
    expect(result[0].slug).toBe('lucky-day');
    expect(result[1].slug).toBe('rev-comps');
  });

  it('returns empty array for empty input', () => {
    expect(groupSiteComparisonRows([])).toEqual([]);
  });
});

describe('groupReleasePatternRows', () => {
  it('groups by site and fills all 7 days', () => {
    const rows = [
      { name: 'Rev Comps', slug: 'rev-comps', day_of_week: 1, competition_count: 10 },
      { name: 'Rev Comps', slug: 'rev-comps', day_of_week: 3, competition_count: 5 },
    ];
    const result = groupReleasePatternRows(rows);
    expect(result.length).toBe(1);
    expect(result[0].slug).toBe('rev-comps');
    expect(result[0].days.length).toBe(7);
    expect(result[0].days.find(d => d.day_of_week === 1)!.count).toBe(10);
    expect(result[0].days.find(d => d.day_of_week === 0)!.count).toBe(0);
  });
});

describe('groupMarketBreakdownRows', () => {
  it('groups by site with all prize types as columns', () => {
    const rows = [
      { name: 'Rev Comps', slug: 'rev-comps', prize_type: 'car', active_count: 3 },
      { name: 'Rev Comps', slug: 'rev-comps', prize_type: 'watch', active_count: 10 },
    ];
    const result = groupMarketBreakdownRows(rows);
    expect(result.length).toBe(1);
    expect(result[0].counts['car']).toBe(3);
    expect(result[0].counts['watch']).toBe(10);
    expect(result[0].total).toBe(13);
  });
});
