import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Heatmap } from '@/components/charts';
import { useFeedback } from '@/components/feedback';
import { HabitIcon, STATUS_TEXT } from '@/components/habit-bits';
import { Screen } from '@/components/screen';
import { Button, EmptyState, Panel, Section, Segmented, Stat, Txt } from '@/components/ui';
import { useStore } from '@/data/store';
import { formatShort } from '@/domain/dates';
import { archiveHabit } from '@/domain/habits';
import { currentWeekdays, describeWeekdays, isArchived } from '@/domain/schedule';
import { STREAK_RULES, completion, dayStatus, formatRate, periodStart, streaks } from '@/domain/stats';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { space } from '@/theme';

import { useHabitActions } from './habits';

export const PERIODS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 0, label: 'All time' },
] as const;

export function StreakRules() {
  return (
    <Section title="How streaks and rates work">
      {STREAK_RULES.map((rule) => (
        <View key={rule} style={styles.rule}>
          <Txt color="textMuted">•</Txt>
          <Txt variant="small" color="textMuted" style={{ flex: 1 }}>
            {rule}
          </Txt>
        </View>
      ))}
    </Section>
  );
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

export function HabitDetailScreen() {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, today, mutate } = useStore();
  const { confirm, notify } = useFeedback();
  const actions = useHabitActions();
  const [period, setPeriod] = useState<number>(30);

  const habit = data.habits.find((h) => h.id === id);
  if (!habit) {
    return (
      <Screen title="Habit" back="/habits">
        <EmptyState
          icon="help-circle"
          title="Habit not found"
          body="It may have been deleted, or this link belongs to another device."
          action={<Button label="See all habits" variant="primary" onPress={() => router.replace('/habits')} />}
        />
      </Screen>
    );
  }

  const checkIns = data.checkIns[habit.id];
  const archived = isArchived(habit);
  const streak = streaks(habit, checkIns, today);
  const rate = completion(habit, checkIns, periodStart(period || null, today), today);

  const archive = async () => {
    const ok = await confirm({
      title: `Archive “${habit.name}”?`,
      message:
        'It will leave the Today screen and stop counting days. All of its history is kept, and you can restore it at any time.',
      confirmLabel: 'Archive',
    });
    if (ok && (await mutate((d) => archiveHabit(d, habit.id, today)))) notify(`Archived “${habit.name}”.`);
  };

  return (
    <Screen
      back="/habits"
      eyebrow={archived ? 'Archived habit' : habit.category}
      title={habit.name}
      actions={
        <>
          <Button
            label="Edit"
            icon="edit-2"
            onPress={() => router.push({ pathname: '/habit-form', params: { id: habit.id } })}
          />
          {archived ? (
            <Button label="Restore" icon="rotate-ccw" onPress={() => actions.restore(habit)} />
          ) : (
            <Button label="Archive" icon="archive" onPress={archive} />
          )}
          <Button
            label="Delete"
            variant="danger"
            icon="trash-2"
            onPress={async () => {
              if (await actions.remove(habit)) router.replace('/habits');
            }}
          />
        </>
      }>
      <View style={styles.meta}>
        <HabitIcon icon={habit.icon} color={habit.color} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          {habit.description ? <Txt>{habit.description}</Txt> : null}
          <Txt variant="small" color="textMuted">
            {describeWeekdays(currentWeekdays(habit), data.settings.weekStart)} · since {formatShort(habit.createdOn)}
            {habit.reminderTime ? ` · reminder at ${habit.reminderTime}` : ''}
          </Txt>
        </View>
      </View>

      <View style={isWide ? styles.columns : { gap: space.xl }}>
        <Panel style={isWide ? { width: 360 } : undefined}>
          <View style={styles.stats}>
            <Stat label="Current streak" value={days(streak.current)} />
            <Stat label="Best streak" value={days(streak.best)} />
          </View>
          <Segmented label="Completion period" options={PERIODS} value={period} onChange={setPeriod} />
          <Stat
            label="Completion rate"
            value={formatRate(rate.rate)}
            note={
              rate.rate === null
                ? 'No finished scheduled days in this period yet.'
                : `${rate.done} done · ${rate.skipped} skipped · ${rate.missed} without a check-in`
            }
          />
        </Panel>

        <View style={{ flex: 1, gap: space.xl }}>
          <Section title="History">
            <Heatmap
              today={today}
              weekStart={data.settings.weekStart}
              onSelect={(date) => router.push({ pathname: '/', params: { date } })}
              cell={(date) => {
                const status = dayStatus(habit, checkIns, date, today);
                return {
                  label: STATUS_TEXT[status],
                  outlined: status === 'pending',
                  color:
                    status === 'done'
                      ? habit.color
                      : status === 'skipped'
                        ? colors.skipSoft
                        : status === 'missed'
                          ? colors.missed
                          : null,
                };
              }}
              legend={[
                { color: habit.color, label: 'Done' },
                { color: colors.skipSoft, label: 'Skipped' },
                { color: colors.missed, label: 'No check-in' },
                { color: null, label: 'Today, open', outlined: true },
                { color: null, label: 'Not scheduled' },
              ]}
            />
            <Txt variant="small" color="textMuted">
              Select a day to open it on the Today screen and correct its check-in.
            </Txt>
          </Section>
          <StreakRules />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  columns: { flexDirection: 'row', gap: space.xxxl, alignItems: 'flex-start' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  rule: { flexDirection: 'row', gap: space.sm },
});
