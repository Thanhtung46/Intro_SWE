import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SelectField } from '@/components/SelectField';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/constants/spacing';
import { toHm, parseHm } from '@/utils/dateTime';

export type RecurringSlotField = {
  dayOfWeek: number; // ISO 1(Mon)-7(Sun) — see src/types/group.ts's RecurringSlot comment
  startsAt: string; // 'HH:mm'
  durationMinutes: number;
  courtName: string;
};

type Props = {
  courtNames: string[];
  slots: RecurringSlotField[];
  onAddSlot: (slot: RecurringSlotField) => void;
  onRemoveSlot: (index: number) => void;
  error?: string;
};

// Labelled Mon-Sun but stored as ISO 1-7 — matches spot-backend's
// dayOfWeek convention for group recurring slots (opposite of
// HostMatchScreen's JS Date.getDay() weekday chips, which are 0=Sun).
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

const IS_WEB = Platform.OS === 'web';

const DURATION_STEP = 30;
const DURATION_MIN = 30;
const DURATION_MAX = 240;

function weekdayLabel(isoDay: number, language: 'en' | 'vi'): string {
  const labels = language === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels[isoDay - 1] ?? '?';
}

/**
 * Recurring-slot builder for CreateGroupScreen's "Recurring Schedule"
 * section (Groups implementation plan) — day-of-week × court × time ×
 * duration rows, used by both Create and Edit. No Matches equivalent
 * (matches don't have a recurring-slot concept at create time, only a
 * "clone by weekday" bulk-publish — see HostMatchScreen's Recurring Match
 * section for that different feature).
 */
export default function CreateGroupSchedulePicker({ courtNames, slots, onAddSlot, onRemoveSlot, error }: Props) {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const styles = createStyles(colors);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [courtName, setCourtName] = useState('');
  const [startsAt, setStartsAt] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    // Snap to the nearest 30-minute boundary — backend requires it.
    const minutes = selected.getMinutes() < 30 ? 0 : 30;
    selected.setMinutes(minutes, 0, 0);
    setStartsAt(toHm(selected));
  };

  const handleAdd = () => {
    if (!courtName) return;
    onAddSlot({ dayOfWeek, startsAt, durationMinutes, courtName });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <SelectField
                    themeColors={colors}
            label={t('groups.schedule.court')}
            placeholder={courtNames.length ? t('groups.schedule.selectCourt') : t('groups.schedule.addCourtFirst')}
            value={courtName}
            onChange={setCourtName}
            options={courtNames.map((name) => ({ label: name, value: name }))}
          />
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.fieldLabel}>{t('groups.schedule.startTime')}</Text>
          {IS_WEB ? (
            // @react-native-community/datetimepicker has no web build — fall back
            // to the browser's native time input. `startsAt` holds 'HH:mm', which
            // is exactly the value format of <input type="time">.
            <View testID="group-schedule-start-time-web">
              <input
                type="time"
                value={startsAt}
                step={1800}
                onChange={(e: { target: { value: string } }) => {
                  const parts = e.target.value.split(':');
                  if (parts.length < 2) return;
                  const h = Number(parts[0]);
                  const m = Number(parts[1]);
                  if (!Number.isInteger(h) || !Number.isInteger(m)) return;
                  setStartsAt(`${String(h).padStart(2, '0')}:${m < 30 ? '00' : '30'}`);
                }}
                style={{
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: colors.surfaceBorder,
                  borderRadius: 10,
                  padding: spacing.sm,
                  fontSize: 14,
                  color: colors.textPrimary,
                  backgroundColor: colors.surface,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </View>
          ) : (
            <TouchableOpacity testID="group-schedule-start-time" style={styles.pickerField} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.pickerValue}>{startsAt}</Text>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {showTimePicker && !IS_WEB && (
        <DateTimePicker
          value={parseHm(startsAt)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      <Text style={styles.fieldLabel}>{t('groups.schedule.weekday')}</Text>
      <View style={styles.weekdayGrid}>
        {WEEKDAYS.map((isoDay) => {
          const selected = dayOfWeek === isoDay;
          return (
            <TouchableOpacity
              key={isoDay}
              testID={`group-schedule-weekday-${isoDay}`}
              style={[styles.weekdayChip, selected && styles.weekdayChipSelected]}
              onPress={() => setDayOfWeek(isoDay)}
            >
              <Text style={[styles.weekdayChipText, selected && styles.weekdayChipTextSelected]}>{weekdayLabel(isoDay, language)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>{t('groups.schedule.duration')}</Text>
      <View style={styles.durationRow}>
        <TouchableOpacity
          testID="group-schedule-duration-minus"
          style={styles.stepperButton}
          onPress={() => setDurationMinutes((d) => Math.max(DURATION_MIN, d - DURATION_STEP))}
        >
          <Ionicons name="remove" size={16} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.durationText}>{durationMinutes} {t('groups.schedule.minutes')}</Text>
        <TouchableOpacity
          testID="group-schedule-duration-plus"
          style={styles.stepperButton}
          onPress={() => setDurationMinutes((d) => Math.min(DURATION_MAX, d + DURATION_STEP))}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity testID="group-schedule-add-slot" style={styles.addButton} onPress={handleAdd} disabled={!courtName}>
        <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.addButtonText}>{t('groups.actions.addSlot')}</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      {slots.map((slot, index) => (
        <View key={index} style={styles.slotRow}>
          <Text style={styles.slotText}>
            {weekdayLabel(slot.dayOfWeek, language)} · {slot.startsAt} · {slot.durationMinutes} {t('groups.schedule.minutes')} · {slot.courtName}
          </Text>
          <TouchableOpacity testID={`group-schedule-remove-${index}`} onPress={() => onRemoveSlot(index)}>
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1, gap: spacing.xxs },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  fieldError: { fontSize: 12, color: colors.error },

  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  pickerValue: { fontSize: 14, color: colors.textPrimary },

  weekdayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  weekdayChip: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  weekdayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekdayChipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  weekdayChipTextSelected: { color: colors.white },

  durationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  durationText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  addButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.tintedSurface,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  slotText: { flex: 1, fontSize: 12, color: colors.textPrimary },
});
