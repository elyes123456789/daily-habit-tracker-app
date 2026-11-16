import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useFeedback } from '@/components/feedback';
import { HabitIcon, ReminderField, WeekdayPicker } from '@/components/habit-bits';
import { Screen } from '@/components/screen';
import { Button, EmptyState, Field, Icon, Section, Txt, iconName } from '@/components/ui';
import { useStore } from '@/data/store';
import type { Weekday } from '@/domain/dates';
import { type HabitDraft, addHabit, draftFromHabit, updateHabit, validateDraft } from '@/domain/habits';
import { currentWeekdays } from '@/domain/schedule';
import { CATEGORIES, HABIT_COLORS, HABIT_ICONS } from '@/domain/types';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { TOUCH, radius, space } from '@/theme';

const EMPTY_DRAFT: HabitDraft = {
  name: '',
  description: '',
  category: 'Health',
  icon: HABIT_ICONS[0],
  color: HABIT_COLORS[0],
  days: [0, 1, 2, 3, 4, 5, 6],
  reminderTime: null,
};

const PRESETS: { label: string; days: Weekday[] }[] = [
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
];

export function HabitFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  // The form copies the habit into local state once, so it must not mount before data has loaded.
  if (useStore().status !== 'ready') {
    return (
      <Screen back="/habits" title={id ? 'Edit habit' : 'New habit'}>
        {null}
      </Screen>
    );
  }
  return <HabitForm />;
}

function HabitForm() {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, today, mutate } = useStore();
  const { notify } = useFeedback();
  const existing = id ? data.habits.find((h) => h.id === id) : undefined;

  const [draft, setDraft] = useState<HabitDraft>(() => (existing ? draftFromHabit(existing) : EMPTY_DRAFT));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof HabitDraft>(key: K, value: HabitDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  if (id && !existing) {
    return (
      <Screen title="Edit habit" back="/habits">
        <EmptyState icon="help-circle" title="Habit not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const error = validateDraft(draft);
  const nameError = submitted && !draft.name.trim() ? 'Give the habit a name.' : null;
  const scheduleChanged = existing && [...draft.days].sort().join() !== currentWeekdays(existing).join();
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/habits'));

  const save = async () => {
    setSubmitted(true);
    if (error || saving) return;
    setSaving(true);
    const saved = await mutate((d) => (existing ? updateHabit(d, existing.id, draft, today) : addHabit(d, draft, today)));
    setSaving(false);
    if (!saved) return; // the screen shows the storage error; keep the form so nothing typed is lost
    notify(existing ? 'Habit updated.' : `Added “${draft.name.trim()}”.`);
    leave();
  };

  const chip = (label: string, selected: boolean, onPress: () => void, role: 'radio' | 'button' = 'radio') => (
    <Pressable
      key={label}
      accessibilityRole={role}
      accessibilityLabel={label}
      aria-checked={role === 'radio' ? selected : undefined}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : 'transparent' },
      ]}>
      <Txt variant="small" style={{ fontWeight: '600' }} color={selected ? 'primary' : 'textMuted'}>
        {label}
      </Txt>
    </Pressable>
  );

  return (
    <Screen back="/habits" title={existing ? 'Edit habit' : 'New habit'} maxWidth={920}>
      <View style={isWide ? styles.columns : { gap: space.xl }}>
        <View style={{ flex: 1, gap: space.xl }}>
          <Field
            label="Name"
            value={draft.name}
            onChangeText={(v) => set('name', v)}
            placeholder="e.g. Read 10 pages"
            maxLength={60}
            autoFocus={!existing}
            error={nameError}
            returnKeyType="done"
          />
          <Field
            label="Description (optional)"
            value={draft.description}
            onChangeText={(v) => set('description', v)}
            placeholder="Why it matters, or how you will do it"
            maxLength={500}
            multiline
          />
          <Section title="Category">
            <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Category">
              {CATEGORIES.map((c) => chip(c, draft.category === c, () => set('category', c)))}
            </View>
          </Section>
          <Section title="Scheduled days">
            <View style={styles.wrap}>
              {PRESETS.map((p) =>
                chip(p.label, [...draft.days].sort().join() === p.days.join(), () => set('days', p.days), 'button'),
              )}
            </View>
            <WeekdayPicker value={draft.days} onChange={(d) => set('days', d)} weekStart={data.settings.weekStart} />
            {submitted && draft.days.length === 0 ? (
              <Txt variant="small" color="danger" accessibilityLiveRegion="polite">
                Choose at least one day of the week.
              </Txt>
            ) : null}
            {scheduleChanged ? (
              <Txt variant="small" color="textMuted">
                The new days apply from today. Earlier days keep their old schedule, so your history and streak are not rewritten.
              </Txt>
            ) : null}
          </Section>
        </View>

        <View style={{ flex: 1, gap: space.xl }}>
          <Section title="Icon and colour (optional)">
            <View style={styles.preview}>
              <HabitIcon icon={draft.icon} color={draft.color} size={56} />
              <Txt variant="heading" style={{ flex: 1 }} numberOfLines={2}>
                {draft.name.trim() || 'Your habit'}
              </Txt>
            </View>
            <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Icon">
              {HABIT_ICONS.map((icon) => {
                const selected = draft.icon === icon;
                return (
                  <Pressable
                    key={icon}
                    accessibilityRole="radio"
                    accessibilityLabel={`Icon: ${icon.replace(/-\d+$/, '').replace('-', ' ')}`}
                    aria-checked={selected}
                    onPress={() => set('icon', icon)}
                    style={[
                      styles.swatch,
                      { borderColor: selected ? colors.text : colors.border, borderWidth: selected ? 2 : 1 },
                    ]}>
                    <Icon name={iconName(icon)} color={selected ? colors.text : colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Colour">
              {HABIT_COLORS.map((color, i) => {
                const selected = draft.color === color;
                return (
                  <Pressable
                    key={color}
                    accessibilityRole="radio"
                    accessibilityLabel={`Colour ${i + 1} of ${HABIT_COLORS.length}`}
                    aria-checked={selected}
                    onPress={() => set('color', color)}
                    style={[styles.swatch, { borderColor: selected ? colors.text : 'transparent', borderWidth: 2 }]}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: color }} />
                  </Pressable>
                );
              })}
            </View>
          </Section>
          <Section title="Reminder (optional)">
            <ReminderField
              label="Remind me on scheduled days"
              value={draft.reminderTime}
              onChange={(t) => set('reminderTime', t)}
            />
          </Section>
        </View>
      </View>

      {submitted && error && !nameError && draft.days.length > 0 ? (
        <Txt color="danger" accessibilityLiveRegion="polite">
          {error}
        </Txt>
      ) : null}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Button label="Cancel" onPress={leave} />
        <Button
          label={existing ? 'Save changes' : 'Create habit'}
          variant="primary"
          icon="check"
          disabled={saving}
          onPress={save}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: space.xxxl, alignItems: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: TOUCH - 4,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
