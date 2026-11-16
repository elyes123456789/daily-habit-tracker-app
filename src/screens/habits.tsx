import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useFeedback } from '@/components/feedback';
import { HabitIcon } from '@/components/habit-bits';
import { Screen } from '@/components/screen';
import { Button, EmptyState, Icon, Section, Txt } from '@/components/ui';
import { useStore } from '@/data/store';
import { deleteHabit, restoreHabit } from '@/domain/habits';
import { currentWeekdays, describeWeekdays, isArchived } from '@/domain/schedule';
import { streaks } from '@/domain/stats';
import type { Habit } from '@/domain/types';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { space } from '@/theme';

/** Shared by the list and the detail screen so the wording is identical. */
export function useHabitActions() {
  const { mutate, today } = useStore();
  const { confirm, notify } = useFeedback();
  return {
    async remove(habit: Habit): Promise<boolean> {
      const ok = await confirm({
        title: `Delete “${habit.name}”?`,
        message:
          'This permanently deletes the habit and its entire check-in history from this device. It cannot be undone. To keep the history, archive the habit instead.',
        confirmLabel: 'Delete habit and history',
        destructive: true,
      });
      if (!ok) return false;
      const saved = await mutate((d) => deleteHabit(d, habit.id));
      if (saved) notify(`Deleted “${habit.name}”.`);
      return saved;
    },
    async restore(habit: Habit) {
      if (await mutate((d) => restoreHabit(d, habit.id, today))) notify(`Restored “${habit.name}”.`);
    },
  };
}

export function HabitsScreen() {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  const { data, today } = useStore();
  const actions = useHabitActions();

  const active = data.habits.filter((h) => !isArchived(h));
  const archived = data.habits.filter(isArchived);
  const open = (habit: Habit) => router.push({ pathname: '/habit', params: { id: habit.id } });

  return (
    <Screen
      tab
      title="Habits"
      actions={<Button label="New habit" variant="primary" icon="plus" onPress={() => router.push('/habit-form')} />}>
      {data.habits.length === 0 ? (
        <EmptyState
          icon="feather"
          title="No habits yet"
          body="Create your first habit and choose the days it belongs to. It will appear on Today when it is scheduled."
          action={
            <Button label="Create a habit" variant="primary" icon="plus" onPress={() => router.push('/habit-form')} />
          }
        />
      ) : (
        <>
          <Section title={`Active · ${active.length}`}>
            {active.length === 0 ? (
              <Txt color="textMuted">Every habit is archived. Restore one below or create a new one.</Txt>
            ) : (
              <View style={isWide ? styles.grid : undefined}>
                {active.map((habit) => {
                  const { current } = streaks(habit, data.checkIns[habit.id], today);
                  return (
                    <Pressable
                      key={habit.id}
                      accessibilityRole="link"
                      accessibilityLabel={`${habit.name}, ${describeWeekdays(currentWeekdays(habit), data.settings.weekStart)}, current streak ${current} days`}
                      onPress={() => open(habit)}
                      style={({ pressed }) => [
                        styles.row,
                        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
                        isWide && styles.cell,
                      ]}>
                      <HabitIcon icon={habit.icon} color={habit.color} />
                      <View style={{ flex: 1 }}>
                        <Txt variant="heading" numberOfLines={2}>
                          {habit.name}
                        </Txt>
                        <Txt variant="small" color="textMuted" numberOfLines={1}>
                          {describeWeekdays(currentWeekdays(habit), data.settings.weekStart)} · {habit.category}
                        </Txt>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Txt variant="heading">{current}</Txt>
                        <Txt variant="small" color="textMuted">
                          day streak
                        </Txt>
                      </View>
                      <Icon name="chevron-right" color={colors.textMuted} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Section>

          {archived.length > 0 ? (
            <Section title={`Archived · ${archived.length}`}>
              <Txt variant="small" color="textMuted">
                Archived habits are hidden from Today and their days are not counted. Their history is kept.
              </Txt>
              {archived.map((habit) => (
                <View key={habit.id} style={[styles.row, { borderBottomColor: colors.border, flexWrap: 'wrap' }]}>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`${habit.name}, archived, open history`}
                    onPress={() => open(habit)}
                    style={styles.archivedMain}>
                    <HabitIcon icon={habit.icon} color={colors.textMuted} />
                    <Txt variant="heading" color="textMuted" style={{ flex: 1 }} numberOfLines={2}>
                      {habit.name}
                    </Txt>
                  </Pressable>
                  <Button
                    label="Restore"
                    accessibilityLabel={`Restore ${habit.name}`}
                    icon="rotate-ccw"
                    onPress={() => actions.restore(habit)}
                  />
                  <Button
                    label="Delete"
                    accessibilityLabel={`Delete ${habit.name}`}
                    variant="danger"
                    icon="trash-2"
                    onPress={() => actions.remove(habit)}
                  />
                </View>
              ))}
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.xxxl },
  cell: { flexBasis: '40%', flexGrow: 1, maxWidth: '50%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  archivedMain: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexGrow: 1, flexBasis: 200, minHeight: 48 },
});
