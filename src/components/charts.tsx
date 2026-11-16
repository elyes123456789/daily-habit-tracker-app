/** History heatmap and weekly summary. */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  type LocalDate,
  MONTH_LONG,
  type Weekday,
  WEEKDAY_SHORT,
  addDays,
  formatShort,
  orderedWeekdays,
  startOfWeek,
  weekdayOf,
} from '@/domain/dates';
import type { DayTotals } from '@/domain/stats';
import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/theme';

import { Txt } from './ui';

export interface HeatCell {
  /** Fill colour, or `null` for an empty (not scheduled / future) day. */
  color: string | null;
  /** Draws an outline, used for "today, not checked in yet". */
  outlined?: boolean;
  /** Spoken and shown on hover, e.g. "2 of 3 done". */
  label: string;
}

const LABEL_WIDTH = 34;
const MAX_WEEKS = 53;

/**
 * A week-per-column grid ending at the current week. It shows as many weeks as
 * fit the available width: about four months on a phone, a full year on desktop.
 */
export function Heatmap({
  today,
  weekStart,
  cell,
  onSelect,
  legend,
}: {
  today: LocalDate;
  weekStart: Weekday;
  cell: (date: LocalDate) => HeatCell;
  /** Called with a past or current date when a day is pressed. */
  onSelect?: (date: LocalDate) => void;
  legend: { color: string | null; label: string; outlined?: boolean }[];
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const size = width >= 700 ? 15 : 14;
  const gap = 3;
  const weeks = Math.max(4, Math.min(MAX_WEEKS, Math.floor((width - LABEL_WIDTH) / (size + gap))));
  const firstWeek = addDays(startOfWeek(today, weekStart), -7 * (weeks - 1));
  const rows = orderedWeekdays(weekStart);

  const box = (c: Pick<HeatCell, 'color' | 'outlined'>) => ({
    width: size,
    height: size,
    borderRadius: 4,
    backgroundColor: c.color ?? colors.surfaceAlt,
    opacity: c.color ? 1 : 0.55,
    borderWidth: c.outlined ? 1.5 : 0,
    borderColor: colors.text,
  });

  return (
    <View style={{ gap: space.md }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <View style={{ flexDirection: 'row', gap }}>
          <View style={{ width: LABEL_WIDTH - gap, marginTop: 18, gap }}>
            {rows.map((day, i) => (
              <View key={day} style={{ height: size, justifyContent: 'center' }}>
                {i % 2 === 0 ? (
                  <Txt variant="small" color="textMuted" style={{ fontSize: 10, lineHeight: 12 }}>
                    {WEEKDAY_SHORT[day]}
                  </Txt>
                ) : null}
              </View>
            ))}
          </View>
          {Array.from({ length: weeks }, (_, w) => {
            const weekStartDate = addDays(firstWeek, w * 7);
            // Label the column holding the first week of a month.
            const month = Number(weekStartDate.slice(5, 7));
            const showMonth = Number(weekStartDate.slice(8, 10)) <= 7;
            return (
              <View key={weekStartDate} style={{ gap }}>
                <View style={{ height: 18 - gap, width: size, overflow: 'visible' }}>
                  {showMonth ? (
                    <Txt
                      variant="small"
                      color="textMuted"
                      // Wider than its one-cell column, so it is taken out of the layout.
                      style={{ fontSize: 10, lineHeight: 12, width: 40, position: 'absolute' }}>
                      {MONTH_LONG[month - 1].slice(0, 3)}
                    </Txt>
                  ) : null}
                </View>
                {rows.map((_, d) => {
                  const date = addDays(weekStartDate, d);
                  if (date > today) return <View key={date} style={{ width: size, height: size }} />;
                  const c = cell(date);
                  const label = `${formatShort(date)}: ${c.label}`;
                  return (
                    <Pressable
                      key={date}
                      // 300+ tab stops would make keyboard navigation unusable; dates stay
                      // reachable with the day arrows on the Today screen.
                      focusable={false}
                      accessibilityLabel={label}
                      accessibilityRole={onSelect ? 'button' : 'image'}
                      disabled={!onSelect}
                      onPress={() => onSelect?.(date)}
                      {...{ title: label }}
                      style={box(c)}
                    />
                  );
                })}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ height: 7 * (size + gap) + 18 }} />
      )}
      <View style={styles.legend}>
        {legend.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={box(item)} />
            <Txt variant="small" color="textMuted">
              {item.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Seven columns, one per day: a bar filled by the share of due habits completed. */
export function WeekSummary({
  days,
  today,
  selected,
  onSelect,
}: {
  days: DayTotals[];
  today: LocalDate;
  selected?: LocalDate;
  onSelect?: (date: LocalDate) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.week}>
      {days.map((day) => {
        const future = day.date > today;
        const ratio = day.due === 0 ? 0 : day.done / day.due;
        const weekday = WEEKDAY_SHORT[weekdayOf(day.date)];
        const summary =
          day.due === 0
            ? 'nothing scheduled'
            : future
              ? `${day.due} scheduled`
              : `${day.done} of ${day.due} done`;
        const isSelected = selected === day.date;
        return (
          <Pressable
            key={day.date}
            accessibilityRole={onSelect && !future ? 'button' : 'text'}
            accessibilityLabel={`${weekday} ${formatShort(day.date)}: ${summary}`}
            aria-selected={isSelected}
            disabled={!onSelect || future}
            onPress={() => onSelect?.(day.date)}
            style={[
              styles.weekDay,
              isSelected && { backgroundColor: colors.surfaceAlt },
            ]}>
            <Txt
              variant="label"
              color={day.date === today ? 'primary' : 'textMuted'}
              style={{ letterSpacing: 0.4 }}>
              {weekday}
            </Txt>
            <View style={[styles.bar, { backgroundColor: colors.surfaceAlt }]}>
              <View
                style={{
                  height: `${Math.round(ratio * 100)}%`,
                  backgroundColor: colors.primary,
                  borderRadius: radius.sm,
                }}
              />
            </View>
            <Txt variant="small" color="textMuted">
              {day.due === 0 ? '–' : future ? `·${day.due}` : `${day.done}/${day.due}`}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  week: { flexDirection: 'row', gap: space.xs },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  bar: { width: 14, height: 64, borderRadius: radius.sm, justifyContent: 'flex-end', overflow: 'hidden' },
});
