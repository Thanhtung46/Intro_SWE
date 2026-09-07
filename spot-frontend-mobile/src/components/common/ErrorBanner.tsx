import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

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
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel={t('common.retry')}>
        <Text style={styles.retry}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  banner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.dangerSurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.error,
    lineHeight: 18,
  },
  retry: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
    marginTop: 1,
  },
});
