import {
  addDays,
  diffDays,
  eachDay,
  formatLong,
  isValidLocalDate,
  isValidTime,
  isValidTimeZone,
  orderedWeekdays,
  startOfWeek,
  toLocalDate,
  weekdayOf,
} from './dates';

describe('toLocalDate', () => {
  // 23:30 UTC on 15 Nov is already the 16th in Tokyo and still the 15th in Los Angeles.
  const instant = new Date('2026-11-15T23:30:00Z');

  it('uses the calendar of the given time zone, not UTC', () => {
    expect(toLocalDate(instant, 'Asia/Tokyo')).toBe('2026-11-16');
    expect(toLocalDate(instant, 'America/Los_Angeles')).toBe('2026-11-15');
    expect(toLocalDate(instant, 'UTC')).toBe('2026-11-15');
  });

  it('rolls over exactly at local midnight', () => {
    expect(toLocalDate(new Date('2026-06-30T21:59:59Z'), 'Europe/Paris')).toBe('2026-06-30');
    expect(toLocalDate(new Date('2026-06-30T22:00:00Z'), 'Europe/Paris')).toBe('2026-07-01');
  });

  it('is right on both sides of daylight-saving changes', () => {
    // US spring forward: 8 Mar 2026, 02:00 -> 03:00 local.
    expect(toLocalDate(new Date('2026-03-08T07:30:00Z'), 'America/New_York')).toBe('2026-03-08');
    expect(toLocalDate(new Date('2026-03-09T03:59:00Z'), 'America/New_York')).toBe('2026-03-08');
    expect(toLocalDate(new Date('2026-03-09T04:00:00Z'), 'America/New_York')).toBe('2026-03-09');
    // US fall back: 1 Nov 2026, a 25-hour local day.
    expect(toLocalDate(new Date('2026-11-01T04:00:00Z'), 'America/New_York')).toBe('2026-11-01');
    expect(toLocalDate(new Date('2026-11-02T04:59:00Z'), 'America/New_York')).toBe('2026-11-01');
    expect(toLocalDate(new Date('2026-11-02T05:00:00Z'), 'America/New_York')).toBe('2026-11-02');
  });

  it('follows the device calendar for "device" and for unknown zones', () => {
    const local = new Date(2026, 0, 5, 23, 59);
    expect(toLocalDate(local)).toBe('2026-01-05');
    expect(toLocalDate(local, 'Not/AZone')).toBe('2026-01-05');
  });
});

describe('calendar arithmetic', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2100-02-28', 1)).toBe('2100-03-01'); // 2100 is not a leap year
  });

  it('counts every day across a DST change exactly once', () => {
    expect(eachDay('2026-03-07', '2026-03-09')).toEqual(['2026-03-07', '2026-03-08', '2026-03-09']);
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2);
    expect(diffDays('2026-01-01', '2027-01-01')).toBe(365);
    expect(diffDays('2028-01-01', '2029-01-01')).toBe(366);
  });

  it('returns an empty range when the start is after the end', () => {
    expect(eachDay('2026-01-02', '2026-01-01')).toEqual([]);
  });

  it('knows weekdays and week starts', () => {
    expect(weekdayOf('2026-11-16')).toBe(1); // Monday
    expect(weekdayOf('2028-02-29')).toBe(2); // Tuesday
    expect(startOfWeek('2026-11-18', 1)).toBe('2026-11-16');
    expect(startOfWeek('2026-11-18', 0)).toBe('2026-11-15');
    expect(startOfWeek('2026-11-15', 1)).toBe('2026-11-09'); // Sunday belongs to the Monday week before
    expect(startOfWeek('2027-01-01', 1)).toBe('2026-12-28');
    expect(orderedWeekdays(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it('formats dates without depending on the engine locale data', () => {
    expect(formatLong('2026-11-16')).toBe('Monday, 16 November');
    expect(formatLong('2028-02-29', true)).toBe('Tuesday, 29 February 2028');
  });
});

describe('validation', () => {
  it('accepts only real calendar dates', () => {
    expect(isValidLocalDate('2028-02-29')).toBe(true);
    expect(isValidLocalDate('2027-02-29')).toBe(false);
    expect(isValidLocalDate('2026-13-01')).toBe(false);
    expect(isValidLocalDate('2026-1-1')).toBe(false);
    expect(isValidLocalDate(20260101)).toBe(false);
  });

  it('accepts 24-hour times and IANA zones', () => {
    expect(isValidTime('07:05')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('7:5')).toBe(false);
    expect(isValidTimeZone('Europe/Paris')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
