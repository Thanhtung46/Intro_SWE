import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { parseIsoDate, toIsoDate } from '@/utils/dateTime';

type Props = {
  /** Selected day YYYY-MM-DD */
  selectedDate: string;
  /** ISO dayOfWeek 1(Mon)–7(Sun) that have recurring slots */
  activeDayOfWeeks: number[];
  onSelectDate: (isoDate: string) => void;
};

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Mon-first to match ISO dayOfWeek

function isoDayOfWeek(date: Date): number {
  const js = date.getDay(); // 0=Sun … 6=Sat
  return js === 0 ? 7 : js;
}

function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Month grid for Group Detail → Schedule. Green dots mark days whose
 * weekday matches the group's recurringSlots (ISO 1–7).
 */
export default function GroupScheduleCalendar({
  selectedDate,
  activeDayOfWeeks,
  onSelectDate,
}: Props) {
  const selected = parseIsoDate(selectedDate);
  const [cursor, setCursor] = useState(() => ({
    year: selected.getFullYear(),
    month: selected.getMonth(),
  }));

  const activeSet = useMemo(() => new Set(activeDayOfWeeks), [activeDayOfWeeks]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    // Monday-first offset: Mon=0 … Sun=6
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const list: ({ iso: string; day: number; hasSession: boolean } | null)[] = [];
    for (let i = 0; i < total; i += 1) {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        list.push(null);
        continue;
      }
      const date = new Date(cursor.year, cursor.month, dayNum);
      list.push({
        iso: toIsoDate(date),
        day: dayNum,
        hasSession: activeSet.has(isoDayOfWeek(date)),
      });
    }
    return list;
  }, [cursor.year, cursor.month, activeSet]);

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <View testID="group-schedule-calendar" style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="group-schedule-calendar-prev"
          style={styles.navButton}
          onPress={() => shiftMonth(-1)}
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthLabel(cursor.year, cursor.month)}</Text>
        <TouchableOpacity
          testID="group-schedule-calendar-next"
          style={styles.navButton}
          onPress={() => shiftMonth(1)}
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={18} color={colors.headingText} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }
          const isSelected = cell.iso === selectedDate;
          return (
            <TouchableOpacity
              key={cell.iso}
              testID={`group-schedule-day-${cell.iso}`}
              style={styles.cell}
              onPress={() => onSelectDate(cell.iso)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[styles.dayBubble, isSelected && styles.dayBubbleSelected]}>
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{cell.day}</Text>
              </View>
              {cell.hasSession ? <View style={styles.sessionDot} /> : <View style={styles.sessionDotSpacer} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {activeDayOfWeeks.length > 0 ? (
        <View style={styles.legend}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Group play day (recurring schedule)</Text>
        </View>
      ) : (
        <Text style={styles.legendText}>No recurring slots yet — ask the admin to add a schedule.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: { fontSize: 15, fontWeight: '800', color: colors.headingText },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 44,
  },
  dayBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubbleSelected: { backgroundColor: colors.primaryDark },
  dayText: { fontSize: 13, fontWeight: '600', color: colors.headingText },
  dayTextSelected: { color: colors.white },
  sessionDot: {
    marginTop: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  sessionDotSpacer: { marginTop: 2, width: 6, height: 6 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  legendText: { fontSize: 12, color: colors.outline, flex: 1 },
});
