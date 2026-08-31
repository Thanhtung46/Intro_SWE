import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { toHm, toIsoDate } from '@/utils/dateTime';

type Props = {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  error?: string;
  disabled?: boolean;
};

// <input type="datetime-local"> value is `YYYY-MM-DDTHH:mm` in the browser's
// local time — the same wall-clock a Date holds before CreateTournamentScreen
// serialises it with .toISOString(). `new Date(str)` parses it back as local.
function toLocalDatetime(d: Date): string {
  return `${toIsoDate(d)}T${toHm(d)}`;
}

// react-native-web renders unrecognised lowercase JSX tags as raw DOM nodes.
// Same shape as HostMatchScreen's WebDateTimeInput (fix `175f2e5`).
function WebDateTimeInput(props: { value: string; disabled?: boolean; onChange: (v: string) => void }) {
  return (
    <input
      type="datetime-local"
      value={props.value}
      disabled={props.disabled}
      onChange={(e: { target: { value: string } }) => props.onChange(e.target.value)}
      style={{
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: colors.dotInactive,
        borderRadius: 10,
        padding: spacing.sm,
        fontSize: 14,
        color: colors.headingText,
        backgroundColor: props.disabled ? colors.formScreenBackground : colors.white,
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  );
}

/**
 * A single "date + time" field. Native (iOS/Android): tapping it opens a date
 * picker, then chains to a time picker (the RN community picker has no
 * cross-platform `datetime` mode). Web: `@react-native-community/datetimepicker`
 * has no web build, so fall back to the browser's own
 * `<input type="datetime-local">` — same pattern as HostMatchScreen's
 * WebDateTimeInput (fix `175f2e5`).
 */
export default function DateTimeField({ label, value, onChange, error, disabled }: Props) {
  const [stage, setStage] = useState<'none' | 'date' | 'time'>('none');
  const [temp, setTemp] = useState<Date>(value ?? new Date());

  if (Platform.OS === 'web') {
    return (
      <View style={styles.field} testID={`datetime-field-web-${label}`}>
        <Text style={styles.label}>{label}</Text>
        <WebDateTimeInput
          value={value ? toLocalDatetime(value) : ''}
          disabled={disabled}
          onChange={(v) => {
            const next = v ? new Date(v) : null;
            if (next && !Number.isNaN(next.getTime())) onChange(next);
          }}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  const open = () => {
    if (disabled) return;
    setTemp(value ?? new Date());
    setStage('date');
  };

  const onDate = (event: DateTimePickerEvent, picked?: Date) => {
    if (event.type === 'dismissed' || !picked) {
      setStage('none');
      return;
    }
    const merged = new Date(temp);
    merged.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    setTemp(merged);
    setStage('time');
  };

  const onTime = (event: DateTimePickerEvent, picked?: Date) => {
    setStage('none');
    if (event.type === 'dismissed' || !picked) return;
    const merged = new Date(temp);
    merged.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    onChange(merged);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        testID={`datetime-field-${label}`}
        style={[styles.picker, disabled && styles.pickerDisabled]}
        onPress={open}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value
            ? value.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Pick date & time'}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {stage === 'date' && (
        <DateTimePicker value={temp} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDate} />
      )}
      {stage === 'time' && (
        <DateTimePicker value={temp} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTime} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.bodyText },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.dotInactive,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  pickerDisabled: { backgroundColor: colors.formScreenBackground },
  value: { fontSize: 14, color: colors.headingText },
  placeholder: { fontSize: 14, color: colors.outline },
  error: { fontSize: 12, color: colors.error },
});
