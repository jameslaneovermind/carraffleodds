import { describe, it, expect } from 'vitest';
import { parseCardText, parseRelativeDate } from '../lucky-day-competitions';

describe('parseCardText', () => {
  it('parses a fully-populated card', () => {
    // "Tickets remaining 98% 588/597": remaining=588, total=597, sold=9, percentSold=round(9/597*100)=2
    const lines = [
      'Win a BMW M3 Competition',
      '£2.97',
      'Tickets remaining 98% 588/597',
      'Ends Sun 15th Jun',
    ];
    const card = parseCardText(lines, 'https://www.luckydaycompetitions.com/product/win-bmw-m3/');
    expect(card).not.toBeNull();
    expect(card!.title).toBe('Win a BMW M3 Competition');
    expect(card!.ticketPrice).toBe(297);    // £2.97 → 297 pence
    expect(card!.totalTickets).toBe(597);
    expect(card!.ticketsRemaining).toBe(588);
    expect(card!.percentSold).toBe(2);      // sold=9, round(9/597*100)=2
    expect(card!.endDateText).toBe('Ends Sun 15th Jun');
  });

  it('skips lines that are Enter Now / Quick Buy / Read More', () => {
    const lines = ['Enter Now', '£1.97', '50/100', 'Ends Mon 2nd Feb'];
    const card = parseCardText(lines, 'https://www.luckydaycompetitions.com/product/test/');
    // No non-skip title line → null
    expect(card).toBeNull();
  });

  it('returns null when lines are empty', () => {
    expect(parseCardText([], 'https://www.luckydaycompetitions.com/product/test/')).toBeNull();
  });

  it('handles a card with just price and title (no tickets or end date)', () => {
    const lines = ['Win a Tesla Model 3', '£0.99'];
    const card = parseCardText(lines, 'https://www.luckydaycompetitions.com/product/win-tesla-model-3/');
    expect(card).not.toBeNull();
    expect(card!.title).toBe('Win a Tesla Model 3');
    expect(card!.ticketPrice).toBe(99);
    expect(card!.totalTickets).toBeUndefined();
    expect(card!.endDateText).toBeUndefined();
  });
});

describe('parseRelativeDate', () => {
  it('returns undefined for undefined input', () => {
    expect(parseRelativeDate(undefined)).toBeUndefined();
  });

  it('returns undefined for unrecognised format', () => {
    expect(parseRelativeDate('TBD')).toBeUndefined();
  });

  it('parses a future date correctly', () => {
    const d = parseRelativeDate('Ends Wed 31st Dec');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getDate()).toBe(31);
    expect(d!.getMonth()).toBe(11); // December = 11 (0-indexed)
    expect(d!.getHours()).toBe(21); // always set to 21:00
  });

  it('parses ordinal "15th" correctly', () => {
    const d = parseRelativeDate('Ends Sat 15th Nov');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getDate()).toBe(15);
    expect(d!.getMonth()).toBe(10); // November = 10
  });

  it('returns undefined when the date has already passed this year', () => {
    // Jan 1st is always in the past by the time any CI runs.
    const d = parseRelativeDate('Ends Wed 1st Jan');
    expect(d).toBeUndefined();
  });
});
