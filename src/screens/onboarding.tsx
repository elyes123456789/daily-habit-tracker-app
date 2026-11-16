import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HabitIcon } from '@/components/habit-bits';
import { Screen } from '@/components/screen';
import { Button, Icon, type IconName, Section, Txt } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Weekday } from '@/domain/dates';
import { addHabit, updateSettings } from '@/domain/habits';
import { describeWeekdays } from '@/domain/schedule';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/theme';

const POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'check',
    title: 'Check in within seconds',
    body: 'Today shows only what is scheduled. Mark each habit done or skipped, and change it whenever you like.',
  },
  {
    icon: 'trending-up',
    title: 'Streaks that are fair',
    body: 'Days a habit is not scheduled never break a streak, and today is never counted as missed.',
  },
  {
    icon: 'lock',
    title: 'Private by default',
    body: 'No account. Your data stays on this device, and you can export a backup at any time.',
  },
];

const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const STARTERS: { name: string; category: string; icon: string; color: string; days: Weekday[] }[] = [
  { name: 'Drink water', category: 'Health', icon: 'droplet', color: '#4F7CAC', days: EVERY_DAY },
  { name: 'Read 10 pages', category: 'Mind', icon: 'book-open', color: '#8E6BA8', days: EVERY_DAY },
  { name: 'Move for 20 minutes', category: 'Health', icon: 'activity', color: '#C2714F', days: [1, 3, 5] },
  { name: 'Tidy for 10 minutes', category: 'Home', icon: 'home', color: '#7A7F52', days: [0, 6] },
];

export function OnboardingScreen() {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  const { today, mutate } = useStore();
  const [picked, setPicked] = useState<string[]>([]);

  const finish = async (thenCreate: boolean) => {
    const saved = await mutate((data) => {
      let next = updateSettings(data, { onboarded: true });
      for (const s of STARTERS.filter((s) => picked.includes(s.name))) {
        next = addHabit(next, { ...s, description: '', reminderTime: null }, today);
      }
      return next;
    });
    if (!saved) return;
    router.replace('/');
    if (thenCreate) router.push('/habit-form');
  };

  return (
    <Screen eyebrow="Welcome" title="A calm place for your daily habits" maxWidth={920}>
      <View style={isWide ? styles.columns : { gap: space.xl }}>
        <View style={{ flex: 1, gap: space.xl }}>
          {POINTS.map((p) => (
            <View key={p.title} style={styles.point}>
              <View style={[styles.pointIcon, { backgroundColor: colors.primarySoft }]}>
                <Icon name={p.icon} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="heading">{p.title}</Txt>
                <Txt color="textMuted">{p.body}</Txt>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flex: 1, gap: space.xl }}>
          <Section title="Optional: start with a few">
            <Txt variant="small" color="textMuted">
              Pick any that fit. You can edit or remove them later.
            </Txt>
            {STARTERS.map((s) => {
              const selected = picked.includes(s.name);
              return (
                <Pressable
                  key={s.name}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${s.name}, ${describeWeekdays(s.days)}`}
                  aria-checked={selected}
                  onPress={() => setPicked((p) => (selected ? p.filter((n) => n !== s.name) : [...p, s.name]))}
                  style={[
                    styles.starter,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primarySoft : colors.surface,
                    },
                  ]}>
                  <HabitIcon icon={s.icon} color={s.color} size={40} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="heading">{s.name}</Txt>
                    <Txt variant="small" color="textMuted">
                      {describeWeekdays(s.days)}
                    </Txt>
                  </View>
                  <Icon name={selected ? 'check-circle' : 'circle'} color={selected ? colors.primary : colors.textMuted} />
                </Pressable>
              );
            })}
          </Section>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label={picked.length > 0 ? `Start with ${picked.length} ${picked.length === 1 ? 'habit' : 'habits'}` : 'Start with an empty list'}
          onPress={() => finish(false)}
        />
        <Button label="Create my own habit" variant="primary" icon="plus" onPress={() => finish(true)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: space.xxxl, alignItems: 'flex-start' },
  point: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  pointIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  starter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 64,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: space.sm },
});
