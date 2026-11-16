import type { LocalDate, Weekday } from './dates';
import { addHabit, archiveHabit, restoreHabit, setCheckIn, updateHabit, type HabitDraft } from './habits';
import { describeWeekdays, isDue, weekdaysOn } from './schedule';
import {
  completion,
  dayStatus,
  dayTotals,
  habitsDueOn,
  overallCompletion,
  periodStart,
  streaks,
  weekTotals,
} from './stats';
import { type AppData, EMPTY_DATA } from './types';

const draft = (days: Weekday[], name = 'Read'): HabitDraft => ({
  name,
  description: '',
  category: 'Mind',
  icon: 'book-open',
  color: '#5B8A72',
  days,
  reminderTime: null,
});

const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const MWF: Weekday[] = [1, 3, 5];

/** A habit created on `createdOn` with the given check-ins. */
function setup(days: Weekday[], createdOn: LocalDate, done: LocalDate[] = [], skipped: LocalDate[] = []) {
  let data = addHabit(EMPTY_DATA, draft(days), createdOn, 'h1');
  for (const d of done) data = setCheckIn(data, 'h1', d, 'done');
  for (const d of skipped) data = setCheckIn(data, 'h1', d, 'skipped');
  return data;
}
const habitOf = (data: AppData) => data.habits[0];
const streaksOf = (data: AppData, today: LocalDate) => streaks(habitOf(data), data.checkIns.h1, today);

// 2026-11-16 is a Monday.
describe('schedule', () => {
  it('is due only on scheduled weekdays, from the creation date', () => {
    const habit = habitOf(setup(MWF, '2026-11-16'));
    expect(isDue(habit, '2026-11-16')).toBe(true); // Mon
    expect(isDue(habit, '2026-11-17')).toBe(false); // Tue
    expect(isDue(habit, '2026-11-18')).toBe(true); // Wed
    expect(isDue(habit, '2026-11-13')).toBe(false); // Fri before it existed
  });

  it('keeps the old schedule for days before a schedule change', () => {
    let data = setup(MWF, '2026-11-02');
    data = updateHabit(data, 'h1', draft([2, 4]), '2026-11-16');
    const habit = habitOf(data);
    expect(weekdaysOn(habit, '2026-11-13')).toEqual(MWF);
    expect(weekdaysOn(habit, '2026-11-16')).toEqual([2, 4]);
    expect(isDue(habit, '2026-11-13')).toBe(true); // Fri, old schedule
    expect(isDue(habit, '2026-11-16')).toBe(false); // Mon, new schedule
    expect(isDue(habit, '2026-11-17')).toBe(true); // Tue, new schedule
  });

  it('does not stack entries when the schedule is edited twice in one day', () => {
    let data = setup(MWF, '2026-11-02');
    data = updateHabit(data, 'h1', draft([2]), '2026-11-16');
    data = updateHabit(data, 'h1', draft([4]), '2026-11-16');
    expect(habitOf(data).schedule).toEqual([
      { from: '2026-11-02', days: MWF },
      { from: '2026-11-16', days: [4] },
    ]);
  });

  it('describes weekday sets', () => {
    expect(describeWeekdays(EVERY_DAY)).toBe('Every day');
    expect(describeWeekdays([1, 2, 3, 4, 5])).toBe('Weekdays');
    expect(describeWeekdays([0, 6])).toBe('Weekends');
    expect(describeWeekdays([0, 1, 3], 1)).toBe('Mon, Wed, Sun');
    expect(describeWeekdays([0, 1, 3], 0)).toBe('Sun, Mon, Wed');
  });
});

describe('dayStatus', () => {
  const data = setup(MWF, '2026-11-09', ['2026-11-09'], ['2026-11-11']);
  const status = (date: LocalDate, today = '2026-11-16') => dayStatus(habitOf(data), data.checkIns.h1, date, today);

  it('separates a day that has not finished from a missed day', () => {
    expect(status('2026-11-09')).toBe('done');
    expect(status('2026-11-11')).toBe('skipped');
    expect(status('2026-11-13')).toBe('missed');
    expect(status('2026-11-16')).toBe('pending'); // today, scheduled, unchecked
    expect(status('2026-11-18')).toBe('upcoming');
    expect(status('2026-11-10')).toBe('off'); // Tuesday
  });

  it('turns pending into missed only once the day is over', () => {
    expect(status('2026-11-16', '2026-11-16')).toBe('pending');
    expect(status('2026-11-16', '2026-11-17')).toBe('missed');
  });
});

describe('streaks', () => {
  it('is zero for a new habit', () => {
    expect(streaksOf(setup(EVERY_DAY, '2026-11-16'), '2026-11-16')).toEqual({ current: 0, best: 0 });
  });

  it('counts consecutive completed days and includes today once done', () => {
    const data = setup(EVERY_DAY, '2026-11-10', ['2026-11-13', '2026-11-14', '2026-11-15']);
    expect(streaksOf(data, '2026-11-16')).toEqual({ current: 3, best: 3 });
    expect(streaksOf(setCheckIn(data, 'h1', '2026-11-16', 'done'), '2026-11-16')).toEqual({ current: 4, best: 4 });
  });

  it('does not break the streak for today while today is unfinished', () => {
    const data = setup(EVERY_DAY, '2026-11-14', ['2026-11-14', '2026-11-15']);
    expect(streaksOf(data, '2026-11-16').current).toBe(2);
    // The next day, the unchecked 16th has become a miss.
    expect(streaksOf(data, '2026-11-17')).toEqual({ current: 0, best: 2 });
  });

  it('ignores unscheduled weekdays', () => {
    // Mon/Wed/Fri habit, done on five scheduled days in a row over two weeks.
    const data = setup(MWF, '2026-11-02', ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09', '2026-11-11']);
    expect(streaksOf(data, '2026-11-12')).toEqual({ current: 5, best: 5 }); // Thursday: nothing due
  });

  it('resets on a missed scheduled day and remembers the best run', () => {
    const data = setup(MWF, '2026-11-02', ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-11', '2026-11-13']);
    // Monday the 9th was missed.
    expect(streaksOf(data, '2026-11-15')).toEqual({ current: 2, best: 3 });
  });

  it('treats a skip as a pause: no increment, no reset', () => {
    const data = setup(EVERY_DAY, '2026-11-10', ['2026-11-10', '2026-11-11', '2026-11-13'], ['2026-11-12']);
    expect(streaksOf(data, '2026-11-13')).toEqual({ current: 3, best: 3 });
  });

  it('runs across month and year boundaries and a leap day', () => {
    const newYear = setup(EVERY_DAY, '2026-12-30', ['2026-12-30', '2026-12-31', '2027-01-01']);
    expect(streaksOf(newYear, '2027-01-01').current).toBe(3);
    const leap = setup(EVERY_DAY, '2028-02-27', ['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01']);
    expect(streaksOf(leap, '2028-03-01').current).toBe(4);
  });

  it('survives a schedule change without rewriting earlier days', () => {
    // Every day until the 16th, then Mondays only. The unscheduled Tue–Sun must not count as misses.
    let data = setup(EVERY_DAY, '2026-11-13', ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']);
    data = updateHabit(data, 'h1', draft([1]), '2026-11-16');
    expect(streaksOf(data, '2026-11-22')).toEqual({ current: 4, best: 4 });
    expect(data.checkIns.h1).toEqual({
      '2026-11-13': 'done',
      '2026-11-14': 'done',
      '2026-11-15': 'done',
      '2026-11-16': 'done',
    });
    // Missing the next Monday does break it.
    expect(streaksOf(data, '2026-11-24')).toEqual({ current: 0, best: 4 });
  });

  it('does not count archived days as missed and keeps history', () => {
    let data = setup(EVERY_DAY, '2026-11-10', ['2026-11-10', '2026-11-11']);
    data = archiveHabit(data, 'h1', '2026-11-12');
    expect(streaksOf(data, '2026-11-20')).toEqual({ current: 2, best: 2 });
    data = restoreHabit(data, 'h1', '2026-11-20');
    expect(data.checkIns.h1).toEqual({ '2026-11-10': 'done', '2026-11-11': 'done' });
    expect(streaksOf(data, '2026-11-20').current).toBe(2); // the 20th is pending
    expect(streaksOf(data, '2026-11-21').current).toBe(0); // the 20th was then missed
  });

  it('archiving and restoring on the same day changes nothing', () => {
    const before = setup(EVERY_DAY, '2026-11-10');
    const after = restoreHabit(archiveHabit(before, 'h1', '2026-11-12'), 'h1', '2026-11-12');
    expect(habitOf(after).pauses).toEqual([]);
  });
});

describe('completion rate', () => {
  // Every day from the 10th: done 10, 11, 13; skipped 12; missed 14, 15; today is the 16th.
  const data = setup(EVERY_DAY, '2026-11-10', ['2026-11-10', '2026-11-11', '2026-11-13'], ['2026-11-12']);
  const habit = habitOf(data);

  it('counts done over done + skipped + missed and leaves out unfinished today', () => {
    expect(completion(habit, data.checkIns.h1, null, '2026-11-16')).toEqual({
      done: 3,
      skipped: 1,
      missed: 2,
      rate: 0.5,
    });
  });

  it('includes today as soon as it is checked in', () => {
    const checked = setCheckIn(data, 'h1', '2026-11-16', 'done');
    expect(completion(habit, checked.checkIns.h1, null, '2026-11-16').rate).toBeCloseTo(4 / 7);
  });

  it('limits the window to the selected period', () => {
    expect(periodStart(7, '2026-11-16')).toBe('2026-11-10');
    expect(periodStart(null, '2026-11-16')).toBeNull();
    const last3 = completion(habit, data.checkIns.h1, periodStart(3, '2026-11-16'), '2026-11-16');
    expect(last3).toEqual({ done: 0, skipped: 0, missed: 2, rate: 0 });
  });

  it('has no rate when nothing was due', () => {
    const fresh = setup(EVERY_DAY, '2026-11-16');
    expect(completion(habitOf(fresh), undefined, null, '2026-11-16').rate).toBeNull();
  });

  it('does not count unscheduled days in the denominator', () => {
    const mwf = setup(MWF, '2026-11-02', ['2026-11-02', '2026-11-04', '2026-11-06']);
    expect(completion(habitOf(mwf), mwf.checkIns.h1, null, '2026-11-08')).toEqual({
      done: 3,
      skipped: 0,
      missed: 0,
      rate: 1,
    });
  });
});

describe('totals across habits', () => {
  let data = addHabit(EMPTY_DATA, draft(EVERY_DAY, 'Water'), '2026-11-09', 'a');
  data = addHabit(data, draft(MWF, 'Run'), '2026-11-09', 'b');
  data = setCheckIn(data, 'a', '2026-11-16', 'done');
  data = setCheckIn(data, 'a', '2026-11-15', 'done');

  it('shows only habits scheduled for the selected date', () => {
    expect(habitsDueOn(data, '2026-11-16').map((h) => h.name)).toEqual(['Water', 'Run']);
    expect(habitsDueOn(data, '2026-11-17').map((h) => h.name)).toEqual(['Water']);
    expect(habitsDueOn(data, '2026-11-08')).toEqual([]);
  });

  it('summarises a day and a week', () => {
    expect(dayTotals(data, '2026-11-16', '2026-11-16')).toMatchObject({ done: 1, pending: 1, missed: 0, due: 2 });
    const week = weekTotals(data, '2026-11-18', 1, '2026-11-16');
    expect(week.map((d) => d.date)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ]);
    expect(week[1]).toMatchObject({ due: 1, done: 0, missed: 0 }); // tomorrow: upcoming, not missed
    expect(weekTotals(data, '2026-11-18', 0, '2026-11-16')[0].date).toBe('2026-11-15');
  });

  it('aggregates completion over all habits', () => {
    // Water: 2 done, 6 missed (the 9th to the 14th). Run: missed 9, 11, 13; pending today.
    expect(overallCompletion(data, null, '2026-11-16')).toMatchObject({ done: 2, missed: 9 });
  });
});
