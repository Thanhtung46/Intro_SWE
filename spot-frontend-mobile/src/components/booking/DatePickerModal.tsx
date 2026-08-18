import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type Props = {
  visible: boolean;
  /** Pre-selected date when the picker opens — defaults to today. */
  initialDate?: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type CalendarCell = { key: string; day: number; date: Date | null };

function buildCalendarGrid(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Mon

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: `lead-${i}`, day: 0, date: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ key: `day-${day}`, day, date: new Date(year, month, day) });
  }
  return cells;
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** Date picker modal for the Booking Field filters — Figma node 72:357 ("Book field - Choose date"). */
export default function DatePickerModal({ visible, initialDate, onCancel, onConfirm }: Props) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = initialDate ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selected, setSelected] = useState<Date>(initialDate ?? today);

  const calendarRows = useMemo(() => chunk(buildCalendarGrid(viewMonth), 7), [viewMonth]);

  const goToMonth = (offset: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => goToMonth(-1)}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                >
                  <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                  {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </Text>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => goToMonth(1)}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((label) => (
                  <Text key={label} style={styles.weekdayLabel}>
                    {label}
                  </Text>
                ))}
              </View>

              {calendarRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.weekRow}>
                  {row.map((cell) => {
                    if (!cell.date) return <View key={cell.key} style={styles.dayCell} />;
                    const isToday = isSameDay(cell.date, today);
                    const isSelected = isSameDay(cell.date, selected);
                    return (
                      <TouchableOpacity
                        key={cell.key}
                        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                        onPress={() => setSelected(cell.date as Date)}
                        accessibilityRole="button"
                        accessibilityLabel={`${cell.day} ${MONTH_NAMES[viewMonth.getMonth()]}`}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isToday && !isSelected && styles.dayTextToday,
                            isSelected && styles.dayTextSelected,
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel} accessibilityRole="button">
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => onConfirm(selected)}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 384,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    padding: 24,
    gap: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  monthLabel: {
    fontSize: 16,
    color: colors.headingText,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  weekdayLabel: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
    color: colors.outline,
    paddingVertical: 8,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  dayText: {
    fontSize: 16,
    color: colors.bodyText,
  },
  dayTextToday: {
    fontWeight: '700',
    color: colors.primary,
  },
  dayTextSelected: {
    fontWeight: '700',
    color: colors.white,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 16,
    color: colors.primary,
  },
  confirmButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
