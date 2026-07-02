import type { Raffle } from '@/lib/types';

export interface DrawGroup {
  label: string;
  isoDate: string; // YYYY-MM-DD in Europe/London
  draws: Raffle[];
}

function toUKDateKey(date: Date): string {
  // en-CA locale formats as YYYY-MM-DD — reliable cross-platform
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function groupDrawsByDate(
  draws: Raffle[],
  now: Date = new Date()
): DrawGroup[] {
  const todayKey = toUKDateKey(now);
  // +24h to get the next calendar day in London time
  const tomorrowKey = toUKDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const grouped = new Map<string, Raffle[]>();
  for (const draw of draws) {
    if (!draw.end_date) continue;
    const key = toUKDateKey(new Date(draw.end_date));
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(draw);
  }

  const dayFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, groupDraws]) => {
      let label: string;
      if (key === todayKey) {
        label = 'Today';
      } else if (key === tomorrowKey) {
        label = 'Tomorrow';
      } else {
        label = dayFormatter.format(new Date(groupDraws[0].end_date!));
      }
      return { label, isoDate: key, draws: groupDraws };
    });
}
