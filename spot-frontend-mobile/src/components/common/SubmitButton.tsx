import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  label: string;
  loading: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/**
 * Submit button with a built-in loading spinner — the same
 * loading/disabled contract used by every async action in this flow
 * (see .claude/rules/api-conventions.md).
 */
export default function SubmitButton({ label, loading, disabled, onPress }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isDisabled = loading || disabled;
  return (
    <TouchableOpacity
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.text}>{label}</Text>}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 12.5,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: colors.primaryDisabledBg,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
