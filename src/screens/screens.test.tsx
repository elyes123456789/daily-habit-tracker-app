import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { FeedbackProvider } from '@/components/feedback';
import { type Repository, createMemoryStore, createRepository } from '@/data/repository';
import { StoreProvider } from '@/data/store';
import { addHabit, updateSettings } from '@/domain/habits';
import { type AppData, EMPTY_DATA } from '@/domain/types';
import { ensurePermission } from '@/services/reminders';

import { HabitFormScreen } from './habit-form';
import { TodayScreen } from './today';

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
  canGoBack: () => true,
};
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  // A getter, because jest.mock is hoisted above the declaration of mockRouter.
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
  Redirect: () => null,
}));
jest.mock('@/services/reminders', () => ({
  getReminderSupport: () => ({ available: true, note: 'Reminder note.' }),
  ensurePermission: jest.fn(async () => true),
  syncReminders: jest.fn(async () => {}),
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

// Monday 16 November 2026, midday.
const NOW = () => new Date(2026, 10, 16, 12, 0);
const TODAY = '2026-11-16';

const onboarded = updateSettings(EMPTY_DATA, { onboarded: true });
const draft = {
  name: 'Read',
  description: '',
  category: 'Mind',
  icon: 'book-open',
  color: '#5B8A72',
  days: [0, 1, 2, 3, 4, 5, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[],
  reminderTime: null,
};

async function setup(ui: ReactElement, initial: AppData = onboarded, repository?: Repository) {
  const repo = repository ?? createRepository(createMemoryStore());
  await repo.save(initial);
  await render(
    <StoreProvider repository={repo} now={NOW}>
      <FeedbackProvider>{ui}</FeedbackProvider>
    </StoreProvider>,
  );
  return repo;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

describe('habit form', () => {
  it('validates, then creates a habit and returns', async () => {
    const repo = await setup(<HabitFormScreen />);
    await screen.findByLabelText('Create habit');

    await fireEvent.press(screen.getByLabelText('Create habit'));
    expect(await screen.findByText('Give the habit a name.')).toBeOnTheScreen();
    expect((await repo.load()).habits).toHaveLength(0);

    await fireEvent.changeText(screen.getByLabelText('Name'), '  Stretch  ');
    await fireEvent.press(screen.getByLabelText('Weekdays'));
    await fireEvent.press(screen.getByLabelText('Mind'));
    await fireEvent.press(screen.getByLabelText('Create habit'));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    const [habit] = (await repo.load()).habits;
    expect(habit).toMatchObject({
      name: 'Stretch',
      category: 'Mind',
      createdOn: TODAY,
      schedule: [{ from: TODAY, days: [1, 2, 3, 4, 5] }],
    });
  });

  it('refuses a habit with no scheduled days', async () => {
    const repo = await setup(<HabitFormScreen />);
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Stretch');
    await fireEvent.press(screen.getByLabelText('Weekends'));
    await fireEvent.press(screen.getByLabelText('Saturday'));
    await fireEvent.press(screen.getByLabelText('Sunday'));
    await fireEvent.press(screen.getByLabelText('Create habit'));

    expect(await screen.findByText('Choose at least one day of the week.')).toBeOnTheScreen();
    expect((await repo.load()).habits).toHaveLength(0);
  });

  it('edits a habit and starts the new schedule today without touching history', async () => {
    mockParams = { id: 'h1' };
    const repo = await setup(<HabitFormScreen />, addHabit(onboarded, draft, '2026-11-02', 'h1'));

    const name = await screen.findByLabelText('Name');
    expect(name.props.value).toBe('Read');
    await fireEvent.changeText(name, 'Read more');
    await fireEvent.press(screen.getByLabelText('Sunday'));
    expect(await screen.findByText(/The new days apply from today/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Save changes'));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    const [habit] = (await repo.load()).habits;
    expect(habit.name).toBe('Read more');
    expect(habit.createdOn).toBe('2026-11-02');
    expect(habit.schedule).toEqual([
      { from: '2026-11-02', days: [0, 1, 2, 3, 4, 5, 6] },
      { from: TODAY, days: [1, 2, 3, 4, 5, 6] },
    ]);
  });

  it('asks for notification permission only when a reminder is switched on, and stays off if refused', async () => {
    jest.mocked(ensurePermission).mockResolvedValueOnce(false);
    await setup(<HabitFormScreen />);
    const toggle = await screen.findByLabelText('Remind me on scheduled days');
    expect(ensurePermission).not.toHaveBeenCalled();

    await fireEvent(toggle, 'valueChange', true);
    expect(await screen.findByText(/Notifications are not allowed/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Time (24-hour, HH:MM)')).toBeNull();

    await fireEvent(toggle, 'valueChange', true);
    expect(await screen.findByLabelText('Time (24-hour, HH:MM)')).toBeOnTheScreen();
    expect(ensurePermission).toHaveBeenCalledTimes(2);
  });
});

describe('today', () => {
  const withHabit = addHabit(onboarded, draft, '2026-11-10', 'h1');

  it('checks in, corrects, and clears, storing one record for the day', async () => {
    const repo = await setup(<TodayScreen />, withHabit);
    expect(await screen.findByText('0 of 1 done')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Done: Read'));
    expect(await screen.findByText('1 of 1 done')).toBeOnTheScreen();
    await waitFor(async () => expect((await repo.load()).checkIns).toEqual({ h1: { [TODAY]: 'done' } }));

    await fireEvent.press(screen.getByLabelText('Skip: Read'));
    expect(await screen.findByText('0 of 1 done')).toBeOnTheScreen();
    await waitFor(async () => expect((await repo.load()).checkIns).toEqual({ h1: { [TODAY]: 'skipped' } }));

    await fireEvent.press(screen.getByLabelText('Skip: Read'));
    await waitFor(async () => expect((await repo.load()).checkIns).toEqual({ h1: {} }));
  });

  it('shows only habits scheduled for the day', async () => {
    // 16 November 2026 is a Monday; this habit is weekends only.
    const data = addHabit(withHabit, { ...draft, name: 'Tidy', days: [0, 6] }, '2026-11-10', 'h2');
    await setup(<TodayScreen />, data);
    expect(await screen.findByText('0 of 1 done')).toBeOnTheScreen();
    expect(screen.queryByText('Tidy')).toBeNull();
  });

  it('undoes the check-in and says so when storage fails', async () => {
    const repo = createRepository(createMemoryStore());
    await setup(<TodayScreen />, withHabit, repo);
    await screen.findByText('0 of 1 done');

    repo.save = jest.fn().mockRejectedValue(new Error('disk full'));
    await fireEvent.press(screen.getByLabelText('Done: Read'));

    expect(await screen.findByText(/could not be saved, so it was undone/)).toBeOnTheScreen();
    expect(screen.getByText('0 of 1 done')).toBeOnTheScreen();
  });

  it('greets a first-time user with an empty state instead of sample data', async () => {
    await setup(<TodayScreen />);

    expect(await screen.findByText('Start with one small habit')).toBeOnTheScreen();
  });
});
