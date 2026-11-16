import { createMemoryStore, createRepository, STORAGE_KEY } from '@/data/repository';

import { addHabit, deleteHabit, setCheckIn, validateDraft } from './habits';
import { exportCsv, exportJson, parseBackup, validateData } from './transfer';
import { type AppData, EMPTY_DATA } from './types';

const draft = {
  name: 'Read, "slowly"',
  description: '10 pages',
  category: 'Mind',
  icon: 'book-open',
  color: '#5B8A72',
  days: [1, 3, 5] as (1 | 3 | 5)[],
  reminderTime: '07:30',
};

function sample(): AppData {
  let data = addHabit(EMPTY_DATA, draft, '2026-11-02', 'h1');
  data = addHabit(data, { ...draft, name: '=SUM(A1)' }, '2026-11-02', 'h2');
  data = setCheckIn(data, 'h1', '2026-11-04', 'done');
  data = setCheckIn(data, 'h1', '2026-11-02', 'skipped');
  return setCheckIn(data, 'h2', '2026-11-02', 'done');
}

describe('check-in uniqueness', () => {
  it('keeps one record per habit and local date, replacing on correction', () => {
    let data = sample();
    data = setCheckIn(data, 'h1', '2026-11-04', 'done');
    data = setCheckIn(data, 'h1', '2026-11-04', 'skipped');
    expect(Object.keys(data.checkIns.h1)).toHaveLength(2);
    expect(data.checkIns.h1['2026-11-04']).toBe('skipped');
  });

  it('clears a check-in back to unchecked', () => {
    const data = setCheckIn(sample(), 'h1', '2026-11-04', null);
    expect(data.checkIns.h1).toEqual({ '2026-11-02': 'skipped' });
  });

  it('ignores check-ins for unknown habits and does not mutate its input', () => {
    const before = sample();
    const snapshot = JSON.stringify(before);
    expect(setCheckIn(before, 'nope', '2026-11-04', 'done')).toBe(before);
    setCheckIn(before, 'h1', '2026-11-06', 'done');
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('removes check-ins when a habit is deleted', () => {
    const data = deleteHabit(sample(), 'h1');
    expect(data.habits.map((h) => h.id)).toEqual(['h2']);
    expect(data.checkIns.h1).toBeUndefined();
  });
});

describe('draft validation', () => {
  it('requires a name and at least one weekday', () => {
    expect(validateDraft({ ...draft, name: '   ' })).toMatch(/name/);
    expect(validateDraft({ ...draft, days: [] })).toMatch(/at least one day/);
    expect(validateDraft(draft)).toBeNull();
  });
});

describe('JSON backup', () => {
  it('round-trips exactly', () => {
    const data = sample();
    const result = parseBackup(exportJson(data, new Date('2026-11-16T10:00:00Z')));
    expect(result).toEqual({ ok: true, data });
  });

  it('includes the app id, format version and export time', () => {
    const parsed = JSON.parse(exportJson(sample(), new Date('2026-11-16T10:00:00Z')));
    expect(parsed).toMatchObject({
      app: 'daily-habit-tracker-app',
      formatVersion: 1,
      exportedAt: '2026-11-16T10:00:00.000Z',
    });
  });

  const errorOf = (text: string) => {
    const result = parseBackup(text);
    return result.ok ? null : result.error;
  };
  const withData = (patch: (d: any) => void) => {
    const backup = JSON.parse(exportJson(sample()));
    patch(backup.data);
    return JSON.stringify(backup);
  };

  it('rejects files that are not JSON or not from this app', () => {
    expect(errorOf('not json')).toMatch(/not valid JSON/);
    expect(errorOf('{"hello":1}')).toMatch(/not a Daily Habit Tracker backup/);
    expect(errorOf('[]')).toMatch(/not a Daily Habit Tracker backup/);
  });

  it('rejects newer format versions with a clear message', () => {
    const backup = { ...JSON.parse(exportJson(sample())), formatVersion: 2 };
    expect(errorOf(JSON.stringify(backup))).toMatch(/format version 2.*reads version 1/);
  });

  it('explains what is wrong inside the data', () => {
    expect(errorOf(withData((d) => (d.habits[0].name = '')))).toMatch(/Habit 1 has no name/);
    expect(errorOf(withData((d) => (d.habits[0].schedule[0].days = [7])))).toMatch(/weekday outside 0–6/);
    expect(errorOf(withData((d) => (d.habits[0].createdOn = '2026-02-30')))).toMatch(/created date must be a date/);
    expect(errorOf(withData((d) => (d.checkIns.h1['2026-11-04'] = 'maybe')))).toMatch(/unknown status “maybe”/);
    expect(errorOf(withData((d) => (d.checkIns.h1['04/11/2026'] = 'done')))).toMatch(/not a valid check-in date/);
    expect(errorOf(withData((d) => (d.habits[1].id = 'h1')))).toMatch(/share the same id/);
    expect(errorOf(withData((d) => delete d.habits))).toMatch(/habit list is missing/);
  });

  it('drops orphaned check-ins and repairs soft fields instead of failing', () => {
    const result = parseBackup(
      withData((d) => {
        d.checkIns.ghost = { '2026-11-04': 'done' };
        d.habits[0].color = 'red';
        d.habits[0].reminderTime = '25:99';
        d.settings.theme = 'neon';
        d.settings.timeZone = 'Mars/Olympus';
      }),
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.data.checkIns.ghost).toBeUndefined();
    expect(result.data.habits[0]).toMatchObject({ color: '#5B8A72', reminderTime: null });
    expect(result.data.settings).toMatchObject({ theme: 'system', timeZone: 'device' });
  });
});

describe('CSV export', () => {
  it('writes one sorted row per check-in, quoting and neutralising risky cells', () => {
    expect(exportCsv(sample())).toBe(
      [
        'date,habit,category,status',
        "2026-11-02,'=SUM(A1),Mind,done",
        '2026-11-02,"Read, ""slowly""",Mind,skipped',
        '2026-11-04,"Read, ""slowly""",Mind,done',
        '',
      ].join('\r\n'),
    );
  });
});

describe('repository', () => {
  it('returns empty data on first run', async () => {
    expect(await createRepository(createMemoryStore()).load()).toEqual(EMPTY_DATA);
  });

  it('persists across repository instances (an app restart)', async () => {
    const store = createMemoryStore();
    await createRepository(store).save(sample());
    expect(await createRepository(store).load()).toEqual(sample());
  });

  it('refuses to load corrupted data rather than replacing it with nothing', async () => {
    const store = createMemoryStore({ [STORAGE_KEY]: '{"version":1,"habits":"oops"}' });
    await expect(createRepository(store).load()).rejects.toThrow(/habit list is missing/);
    expect(await store.getItem(STORAGE_KEY)).toBe('{"version":1,"habits":"oops"}');
    expect(() => validateData(null)).toThrow();
  });

  it('clears stored data', async () => {
    const store = createMemoryStore();
    const repo = createRepository(store);
    await repo.save(sample());
    await repo.clear();
    expect(await repo.load()).toEqual(EMPTY_DATA);
  });
});
