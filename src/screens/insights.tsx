import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Heatmap, WeekSummary } from '@/components/charts';
import { HabitIcon } from '@/components/habit-bits';
import { Screen } from '@/components/screen';
import { Button, EmptyState, IconButton, Panel, Section, Segmented, Stat, Txt } from '@/components/ui';
import { useStore } from '@/data/store';
import { addDays, formatShort, startOfWeek } from '@/domain/dates';
import { isArchived } from '@/domain/schedule';
import {
  activeHabits,
  completion,
  dayTotals,
  formatRate,
  overallCompletion,
  periodStart,
  streaks,
  weekTotals,
} from '@/domain/stats';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { heatScale, space } from '@/theme';

import { PERIODS, StreakRules } from './habit-detail';

export function InsightsScreen() {
  const { colors, scheme } = useTheme();
  const { isWide } = useLayout();
  const { data, today } = useStore();
  const [period, setPeriod] = useState<number>(30);
  const [weekOffset, setWeekOffset] = useState(0);

  if (data.habits.length === 0) {
    return (
      <Screen tab title="Insights">
        <EmptyState
          icon="bar-chart-2"
          title="Nothing to chart yet"
          body="Once you have habits and a few check-ins, your consistency, streaks and history appear here."
          action={
            <Button label="Create a habit" variant="primary" icon="plus" onPress={() => router.push('/habit-form')} />
          }
        />
      </Screen>
    );
  }

  const from = periodStart(period || null, today);
  const overall = overallCompletion(data, from, today);
  const todayTotals = dayTotals(data, today, today);
  const perHabit = data.habits.map((habit) => ({
    habit,
    streak: streaks(habit, data.checkIns[habit.id], today),
    rate: completion(habit, data.checkIns[habit.id], from, today),
  }));
  const longest = Math.max(0, ...perHabit.filter((p) => !isArchived(p.habit)).map((p) => p.streak.current));

  const weekStart = addDays(startOfWeek(today, data.settings.weekStart), weekOffset * 7);
  const week = weekTotals(data, weekStart, data.settings.weekStart, today);
  const weekDone = week.reduce((n, d) => n + d.done, 0);
  const weekDue = week.filter((d) => d.date <= today).reduce((n, d) => n + d.done + d.skipped + d.missed, 0);

  const shades = heatScale[scheme];

  const weekly = (
    <Panel style={isWide ? { width: 400 } : undefined}>
      <Section
        title={weekOffset === 0 ? 'This week' : `Week of ${formatShort(weekStart)}`}
        action={
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="chevron-left" label="Previous week" onPress={() => setWeekOffset((w) => w - 1)} />
            <IconButton
              icon="chevron-right"
              label="Next week"
              disabled={weekOffset === 0}
              onPress={() => setWeekOffset((w) => w + 1)}
            />
          </View>
        }>
        <WeekSummary
          days={week}
          today={today}
          onSelect={(date) => router.push({ pathname: '/', params: { date } })}
        />
        <Txt variant="small" color="textMuted">
          {weekDue === 0
            ? 'No finished scheduled days in this week.'
            : `${weekDone} of ${weekDue} scheduled check-ins completed${weekOffset === 0 ? ' so far' : ''}.`}
        </Txt>
      </Section>
    </Panel>
  );

  return (
    <Screen
      tab
      title="Insights"
      actions={<Segmented label="Period" options={PERIODS} value={period} onChange={setPeriod} />}>
      <View style={isWide ? styles.columns : { gap: space.xl }}>
        <View style={{ flex: 1, gap: space.xl }}>
          <View style={styles.stats}>
            <Stat
              label="Completion rate"
              value={formatRate(overall.rate)}
              note={`${overall.done} done · ${overall.skipped} skipped · ${overall.missed} open`}
            />
            <Stat label="Today" value={`${todayTotals.done}/${todayTotals.due}`} note="habits done" />
            <Stat label="Longest current streak" value={String(longest)} note={longest === 1 ? 'day' : 'days'} />
            <Stat label="Active habits" value={String(activeHabits(data).length)} />
          </View>

          <Section title="History · all habits">
            <Heatmap
              today={today}
              weekStart={data.settings.weekStart}
              onSelect={(date) => router.push({ pathname: '/', params: { date } })}
              cell={(date) => {
                const t = dayTotals(data, date, today);
                if (t.due === 0) return { color: null, label: 'nothing scheduled' };
                const label = `${t.done} of ${t.due} done`;
                if (t.done === 0) return { color: date === today ? null : colors.missed, outlined: date === today, label };
                return { color: shades[Math.min(3, Math.ceil((t.done / t.due) * 4) - 1)], label };
              }}
              legend={[
                { color: colors.missed, label: 'None done' },
                { color: shades[0], label: 'Some' },
                { color: shades[3], label: 'All done' },
                { color: null, label: 'Nothing scheduled' },
              ]}
            />
          </Section>
        </View>
        {weekly}
      </View>

      <Section title="By habit">
        <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
          <Txt variant="label" color="textMuted" style={{ flex: 1 }}>
            Habit
          </Txt>
          <Txt variant="label" color="textMuted" style={styles.num}>
            Rate
          </Txt>
          <Txt variant="label" color="textMuted" style={styles.num}>
            Streak
          </Txt>
          <Txt variant="label" color="textMuted" style={styles.num}>
            Best
          </Txt>
        </View>
        {perHabit.map(({ habit, streak, rate }) => (
          <Pressable
            key={habit.id}
            accessibilityRole="link"
            accessibilityLabel={`${habit.name}: completion ${formatRate(rate.rate)}, current streak ${streak.current}, best ${streak.best}`}
            onPress={() => router.push({ pathname: '/habit', params: { id: habit.id } })}
            style={({ pressed }) => [styles.tableRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
            <View style={styles.habitCell}>
              <HabitIcon icon={habit.icon} color={isArchived(habit) ? colors.textMuted : habit.color} size={32} />
              <Txt numberOfLines={1} style={{ flex: 1 }} color={isArchived(habit) ? 'textMuted' : 'text'}>
                {habit.name}
                {isArchived(habit) ? ' (archived)' : ''}
              </Txt>
            </View>
            <Txt variant="heading" style={styles.num}>
              {formatRate(rate.rate)}
            </Txt>
            <Txt style={styles.num}>{streak.current}</Txt>
            <Txt style={styles.num} color="textMuted">
              {streak.best}
            </Txt>
          </Pressable>
        ))}
      </Section>

      <StreakRules />
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: space.xxxl, alignItems: 'flex-start' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xl },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  habitCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  num: { width: 60, textAlign: 'right' },
});
