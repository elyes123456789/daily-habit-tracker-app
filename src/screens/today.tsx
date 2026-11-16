import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { WeekSummary } from '@/components/charts';
import { CheckInControl, HabitIcon, STATUS_TEXT } from '@/components/habit-bits';
import { Screen } from '@/components/screen';
import { Button, EmptyState, IconButton, Panel, Section, Txt } from '@/components/ui';
import { useStore } from '@/data/store';
import { type LocalDate, addDays, formatLong, isValidLocalDate } from '@/domain/dates';
import { setCheckIn } from '@/domain/habits';
import { activeHabits, dayStatus, dayTotals, habitsDueOn, streaks, weekTotals } from '@/domain/stats';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/theme';

function encouragement(done: number, total: number, isToday: boolean): string {
  if (!isToday) return done === total ? 'Everything scheduled was completed.' : 'You can still correct this day.';
  if (done === total) return 'All done for today. Nicely kept.';
  if (done === 0) return 'A fresh page. Start wherever you like.';
  return `${total - done} to go, whenever you are ready.`;
}

export function TodayScreen() {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  const { data, today, mutate, status } = useStore();
  const params = useLocalSearchParams<{ date?: string }>();

  // The selected day lives in the URL, so it survives a refresh and can be linked to.
  const date: LocalDate = isValidLocalDate(params.date) && params.date < today ? params.date : today;
  const isToday = date === today;
  const goTo = (next: LocalDate) => router.setParams({ date: next >= today ? undefined : next });

  if (status === 'ready' && !data.settings.onboarded) return <Redirect href="/onboarding" />;

  const habits = habitsDueOn(data, date);
  const totals = dayTotals(data, date, today);
  const hasHabits = activeHabits(data).length > 0;

  const topStreaks = activeHabits(data)
    .map((habit) => ({ habit, current: streaks(habit, data.checkIns[habit.id], today).current }))
    .filter((s) => s.current > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, 4);

  const list =
    habits.length === 0 ? (
      hasHabits ? (
        <EmptyState
          icon="coffee"
          title="Nothing scheduled"
          body={isToday ? 'No habits are planned for today. Enjoy the rest.' : 'No habits were scheduled on this day.'}
        />
      ) : (
        <EmptyState
          icon="feather"
          title="Start with one small habit"
          body="Add something you would like to do regularly. You choose the days, and checking in takes a second."
          action={
            <Button label="Create a habit" variant="primary" icon="plus" onPress={() => router.push('/habit-form')} />
          }
        />
      )
    ) : (
      <View>
        <View style={{ gap: space.sm, marginBottom: space.lg }}>
          <View style={styles.progressHead}>
            <Txt variant="title" accessibilityLiveRegion="polite">
              {totals.done} of {totals.due} done
            </Txt>
            <Txt variant="small" color="textMuted" style={{ flexShrink: 1 }}>
              {encouragement(totals.done, totals.due, isToday)}
            </Txt>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: totals.due, now: totals.done }}
            style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={{
                width: `${(totals.done / totals.due) * 100}%`,
                backgroundColor: colors.primary,
                borderRadius: radius.pill,
              }}
            />
          </View>
        </View>
        {habits.map((habit) => {
          const recorded = data.checkIns[habit.id]?.[date];
          return (
            <View key={habit.id} style={[styles.row, { borderTopColor: colors.border }]}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${habit.name}, open details`}
                onPress={() => router.push({ pathname: '/habit', params: { id: habit.id } })}
                style={styles.rowMain}>
                <HabitIcon icon={habit.icon} color={habit.color} />
                <View style={{ flex: 1 }}>
                  <Txt variant="heading" numberOfLines={2}>
                    {habit.name}
                  </Txt>
                  <Txt variant="small" color="textMuted" numberOfLines={1}>
                    {STATUS_TEXT[dayStatus(habit, data.checkIns[habit.id], date, today)]} · {habit.category}
                  </Txt>
                </View>
              </Pressable>
              <CheckInControl
                habit={habit}
                status={recorded}
                onChange={(next) => mutate((d) => setCheckIn(d, habit.id, date, next))}
              />
            </View>
          );
        })}
      </View>
    );

  const aside = hasHabits ? (
    <View style={{ gap: space.xl, width: isWide ? 360 : undefined }}>
      <Panel>
        <Section title="This week">
          <WeekSummary
            days={weekTotals(data, date, data.settings.weekStart, today)}
            today={today}
            selected={date}
            onSelect={goTo}
          />
        </Section>
      </Panel>
      {topStreaks.length > 0 ? (
        <Panel>
          <Section title="Current streaks">
            {topStreaks.map(({ habit, current }) => (
              <View key={habit.id} style={styles.streakRow}>
                <HabitIcon icon={habit.icon} color={habit.color} size={32} />
                <Txt style={{ flex: 1 }} numberOfLines={1}>
                  {habit.name}
                </Txt>
                <Txt variant="heading">
                  {current} {current === 1 ? 'day' : 'days'}
                </Txt>
              </View>
            ))}
          </Section>
        </Panel>
      ) : null}
    </View>
  ) : null;

  return (
    <Screen
      tab
      eyebrow={isToday ? 'Today' : 'Earlier day'}
      title={formatLong(date, !isToday)}
      actions={
        <>
          <IconButton icon="chevron-left" label="Previous day" onPress={() => goTo(addDays(date, -1))} />
          <IconButton icon="chevron-right" label="Next day" disabled={isToday} onPress={() => goTo(addDays(date, 1))} />
          {!isToday ? <Button label="Back to today" onPress={() => goTo(today)} /> : null}
        </>
      }>
      <View style={isWide ? styles.columns : { gap: space.xxl }}>
        <View style={{ flex: 1 }}>{list}</View>
        {aside}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: space.xxxl, alignItems: 'flex-start' },
  progressHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.md, flexWrap: 'wrap' },
  track: { height: 8, borderRadius: radius.pill, flexDirection: 'row', overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexGrow: 1, flexBasis: 140, minHeight: 48 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
