import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { TournamentStatus } from '@/types/tournament';

type Props = { status: TournamentStatus };

export default function TournamentStatusPill({ status }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const label: Record<TournamentStatus, string> = {
    OPEN_REGISTRATION: t('tournaments.status.registrationOpen'), FULL: t('matches.status.full'),
    ACTIVE: t('tournaments.status.ongoing'), COMPLETED: t('tournaments.status.completed'),
    CANCELLED: t('tournaments.status.cancelled'),
  };
  const tint: Record<TournamentStatus, { bg: string; fg: string }> = {
    OPEN_REGISTRATION: { bg: colors.tintedSurface, fg: colors.primary },
    FULL: { bg: colors.warningSurface, fg: colors.warningText },
    ACTIVE: { bg: colors.successSurface, fg: colors.successText },
    COMPLETED: { bg: colors.glassButtonBg, fg: colors.textMuted },
    CANCELLED: { bg: colors.dangerSurface, fg: colors.error },
  };
  const currentTint = tint[status];
  return (
    <View style={[styles.pill, { backgroundColor: currentTint.bg }]}>
      <Text style={[styles.text, { color: currentTint.fg }]}>{label[status].toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  text: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
});
