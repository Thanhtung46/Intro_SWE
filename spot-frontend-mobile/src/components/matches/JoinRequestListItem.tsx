import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { MyJoinRequest } from '@/types/match';
import { formatMatchWhen } from '@/utils/format';

type Props = {
  request: MyJoinRequest;
  onPress: () => void;
  /** Omitted for REJECTED rows — no Cancel Request button renders. */
  onCancel?: () => void;
};

/**
 * Manage Matches "Requests" tab row (Figma `N2FQP`, participant only) —
 * a join-request row wrapping a small match summary, not a full Match card.
 */
export default function JoinRequestListItem({ request, onPress, onCancel }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const isPending = request.status === 'PENDING';

  return (
    <TouchableOpacity testID={`join-request-${request.requestId}`} style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.statusChip, isPending ? styles.statusChipPending : styles.statusChipRejected]}>
        <Text style={[styles.statusChipText, isPending ? styles.statusChipTextPending : styles.statusChipTextRejected]}>
          {isPending ? t('matches.join.pendingHostApproval') : t('matches.join.rejected')}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {request.match.title}
      </Text>

      <View style={styles.metaBlock}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondaryAlt} />
          <Text style={styles.metaText}>{formatMatchWhen(request.match.startsAt, request.match.endsAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondaryAlt} />
          <Text style={styles.metaText} numberOfLines={1}>
            {request.match.venueName}
          </Text>
        </View>
      </View>

      <Text style={styles.hostedBy} numberOfLines={1} ellipsizeMode="tail">
        {t('matches.browse.hostedByPrefix')} {request.match.hostFullName}
      </Text>

      {isPending && onCancel && (
        <TouchableOpacity testID={`cancel-request-${request.requestId}`} style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>{t('matches.actions.cancelRequest')}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statusChip: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  statusChipPending: { backgroundColor: colors.warningSurface },
  statusChipRejected: { backgroundColor: colors.dangerSurface },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  statusChipTextPending: { color: colors.warningText },
  statusChipTextRejected: { color: colors.roleErrorText },

  title: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },

  metaBlock: { gap: spacing.xxs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontSize: 13, color: colors.textSecondaryAlt, flexShrink: 1 },

  hostedBy: { fontSize: 12, fontWeight: '700', color: colors.outlineMuted },

  cancelButton: {
    borderWidth: 1,
    borderColor: colors.roleErrorText,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cancelButtonText: { fontSize: 13, fontWeight: '700', color: colors.roleErrorText },
});
