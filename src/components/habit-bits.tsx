/** Habit-specific building blocks: icon chip, check-in control, weekday picker, reminder field. */
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { type Weekday, WEEKDAY_LONG, WEEKDAY_SHORT, isValidTime, orderedWeekdays } from '@/domain/dates';
import type { DayStatus } from '@/domain/stats';
import type { CheckInStatus, Habit } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { ensurePermission, getReminderSupport } from '@/services/reminders';
import { TOUCH, radius, space, type } from '@/theme';

import { Field, Icon, type IconName, Txt, iconName } from './ui';

export function HabitIcon({ icon, color, size = 44 }: { icon: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: color + '26', // 15% tint of the habit colour
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={iconName(icon)} size={size * 0.48} color={color} />
    </View>
  );
}

export const STATUS_TEXT: Record<DayStatus, string> = {
  done: 'Done',
  skipped: 'Skipped',
  missed: 'No check-in',
  pending: 'To do',
  upcoming: 'Upcoming',
  off: 'Not scheduled',
};

/**
 * Two toggles: Done and Skip. Pressing the active one clears it, so every state
 * (done, skipped, unchecked) is one tap away and can always be corrected.
 */
export function CheckInControl({
  habit,
  status,
  onChange,
}: {
  habit: Habit;
  status: CheckInStatus | undefined;
  onChange: (status: CheckInStatus | null) => void;
}) {
  const { colors } = useTheme();
  const toggle = (
    value: CheckInStatus,
    icon: IconName,
    label: string,
    on: { bg: string; fg: string },
  ) => {
    const selected = status === value;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${habit.name}`}
        accessibilityHint={selected ? 'Clears this check-in' : undefined}
        aria-selected={selected}
        onPress={() => onChange(selected ? null : value)}
        style={({ pressed }) => [
          styles.toggle,
          {
            backgroundColor: selected ? on.bg : 'transparent',
            borderColor: selected ? on.bg : colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <Icon name={icon} size={18} color={selected ? on.fg : colors.textMuted} />
        <Text style={[type.small, { fontWeight: '600', color: selected ? on.fg : colors.textMuted }]}>
          {label}
        </Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.toggles}>
      {toggle('done', 'check', 'Done', { bg: colors.primary, fg: colors.onPrimary })}
      {toggle('skipped', 'skip-forward', 'Skip', { bg: colors.skipSoft, fg: colors.skip })}
    </View>
  );
}

export function WeekdayPicker({
  value,
  onChange,
  weekStart,
}: {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
  weekStart: Weekday;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.days} accessibilityLabel="Scheduled days">
      {orderedWeekdays(weekStart).map((day) => {
        const selected = value.includes(day);
        return (
          <Pressable
            key={day}
            accessibilityRole="checkbox"
            accessibilityLabel={WEEKDAY_LONG[day]}
            aria-checked={selected}
            onPress={() => onChange(selected ? value.filter((d) => d !== day) : [...value, day])}
            style={[
              styles.day,
              {
                backgroundColor: selected ? colors.primary : 'transparent',
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}>
            <Text
              style={[
                type.small,
                { fontWeight: '600', color: selected ? colors.onPrimary : colors.textMuted },
              ]}>
              {WEEKDAY_SHORT[day]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A reminder switch with a time. Permission is requested only at the moment the
 * user switches it on; if it is refused the switch stays off and says why.
 */
export function ReminderField({
  label,
  value,
  onChange,
  defaultTime = '08:00',
}: {
  label: string;
  value: string | null;
  onChange: (time: string | null) => void;
  defaultTime?: string;
}) {
  const { colors } = useTheme();
  const support = getReminderSupport();
  const [text, setText] = useState(value ?? defaultTime);
  const [problem, setProblem] = useState<string | null>(null);
  const enabled = value !== null;

  const setEnabled = async (on: boolean) => {
    setProblem(null);
    if (!on) return onChange(null);
    if (!(await ensurePermission())) {
      setProblem(
        'Notifications are not allowed for this app, so the reminder was left off. You can allow them in your device or browser settings.',
      );
      return;
    }
    onChange(isValidTime(text) ? text : defaultTime);
    if (!isValidTime(text)) setText(defaultTime);
  };

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.switchRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="heading">{label}</Txt>
          <Txt variant="small" color="textMuted">
            {enabled
              ? 'We ask for notification permission only so this reminder can be shown.'
              : 'Off. Turning it on asks for notification permission, used only for reminders.'}
          </Txt>
        </View>
        <Switch
          accessibilityLabel={label}
          value={enabled}
          disabled={!support.available && !enabled}
          onValueChange={setEnabled}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>
      {enabled ? (
        <Field
          label="Time (24-hour, HH:MM)"
          value={text}
          placeholder="08:00"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          autoCorrect={false}
          onChangeText={(next) => {
            setText(next);
            if (isValidTime(next)) onChange(next);
          }}
          error={isValidTime(text) ? null : 'Enter a time like 07:30 or 21:00.'}
        />
      ) : null}
      {problem ? (
        <Txt variant="small" color="danger" accessibilityLiveRegion="polite">
          {problem}
        </Txt>
      ) : null}
      <Txt variant="small" color="textMuted">
        {support.note}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  toggles: { flexDirection: 'row', gap: space.sm },
  toggle: {
    minHeight: TOUCH,
    minWidth: 84,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  day: {
    minWidth: 52,
    minHeight: TOUCH,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
});
