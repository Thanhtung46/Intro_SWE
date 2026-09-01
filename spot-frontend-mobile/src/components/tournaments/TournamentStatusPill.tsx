import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { TournamentStatus } from '@/types/tournament';

type Props = { status: TournamentStatus };

const LABEL: Record<TournamentStatus, string> = {
  OPEN_REGISTRATION: 'Open for registration',
  FULL: 'Full',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const TINT: Record<TournamentStatus, { bg: string; fg: string }> = {
  OPEN_REGISTRATION: { bg: colors.selectedBackground, fg: colors.primary },
  FULL: { bg: colors.orangeSoft, fg: colors.orange },
  ACTIVE: { bg: colors.skillTierGreenBg, fg: colors.skillTierGreenText },
  COMPLETED: { bg: colors.iconBackground, fg: colors.outline },
  CANCELLED: { bg: colors.errorBackground, fg: colors.error },
};

export default function TournamentStatusPill({ status }: Props) {
  const tint = TINT[status];
  return (
    <View style={[styles.pill, { backgroundColor: tint.bg }]}>
      <Text style={[styles.text, { color: tint.fg }]}>{LABEL[status].toUpperCase()}</Text>
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
