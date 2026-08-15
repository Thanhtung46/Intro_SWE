import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

type Props = {
  message: string;
  onRetry: () => void;
};

/**
 * Inline error banner + retry action — same shape as SplashScreen's
 * bootstrap-error state, reused here so the register forms don't invent a
 * second error UI pattern.
 */
export default function ErrorBanner({ message, onRetry }: Props) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry">
        <Text style={styles.retry}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorBackground,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.error,
  },
  retry: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
});
