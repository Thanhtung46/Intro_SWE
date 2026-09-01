import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import type { MatchInvitation } from '@/types/referee';
import { formatVnd } from '@/utils/format';
import { formatDayLabel, formatTimeRange, formatWhen } from '@/utils/refereeFormat';

type Props = {
  invitation: MatchInvitation;
  onPress?: () => void;
  onApprove?: () => void;
  onDecline?: () => void;
  actionLoading?: boolean;
};

const STATUS_TINT: Record<string, { bg: string; fg: string }> = {
  ACCEPTED: { bg: '#e7f6ec', fg: '#1a7f37' },
  CONFIRMED: { bg: '#e7f6ec', fg: '#1a7f37' },
  COMPLETED: { bg: '#eef2f7', fg: '#5b6b7c' },
  DECLINED: { bg: '#fdecec', fg: '#d92d20' },
  CANCELLED: { bg: '#fdecec', fg: '#d92d20' },
};

/** Referee invitation / assignment card — reused across the Pending Queue,
 *  Confirmed and Completed tabs. Approve/Decline actions render only when
 *  the matching callbacks are passed (Pending only). */
export default function InvitationCard({ invitation, onPress, onApprove, onDecline, actionLoading }: Props) {
  const { t } = useLanguage();
  const showActions = Boolean(onApprove || onDecline);
  const tint = STATUS_TINT[invitation.status];

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.85 : 1} onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.player}>{invitation.playerName ?? 'Player'}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={colors.subtitle} />
            <Text style={styles.meta}>
              {invitation.sportType} · {invitation.venueName}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.fee}>{formatVnd(invitation.feeVnd)}</Text>
          {tint ? (
            <View style={[styles.pill, { backgroundColor: tint.bg }]}>
              <Text style={[styles.pillText, { color: tint.fg }]}>{invitation.status}</Text>
            </View>
          ) : (
            <Text style={styles.rate}>{t('referee.invitations.standardRate')}</Text>
          )}
        </View>
      </View>

      {showActions ? (
        <View style={styles.detailGrid}>
          <View style={styles.detailCell}>
            <Text style={styles.detailLabel}>DATE</Text>
            <Text style={styles.detailValue}>{formatDayLabel(invitation.startsAt)}</Text>
          </View>
          <View style={styles.detailCell}>
            <Text style={styles.detailLabel}>TIME</Text>
            <Text style={styles.detailValue}>{formatTimeRange(invitation.startsAt, invitation.endsAt)}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.whenLine}>{formatWhen(invitation.startsAt, invitation.endsAt)}</Text>
      )}

      {showActions ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.declineBtn} onPress={onDecline} disabled={actionLoading}>
            <Text style={styles.declineText}>{t('referee.invitations.decline')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveBtn} onPress={onApprove} disabled={actionLoading}>
            {actionLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.approveText}>{t('referee.invitations.approve')}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  headerLeft: { flex: 1, gap: 4 },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  player: { fontSize: 18, fontWeight: '800', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 13, color: colors.subtitle, flexShrink: 1 },
  fee: { fontSize: 18, fontWeight: '800', color: colors.primaryDark },
  rate: { fontSize: 11, color: colors.subtitle },
  pill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '800' },
  whenLine: { fontSize: 13, color: colors.subtitle },
  detailGrid: { flexDirection: 'row', gap: spacing.sm },
  detailCell: {
    flex: 1,
    backgroundColor: colors.selectedBackground,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 2,
  },
  detailLabel: { fontSize: 10, fontWeight: '700', color: colors.subtitle, letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  declineBtn: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d92d20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { color: '#d92d20', fontWeight: '800', fontSize: 14 },
  approveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveText: { color: colors.white, fontWeight: '800', fontSize: 14 },
});
