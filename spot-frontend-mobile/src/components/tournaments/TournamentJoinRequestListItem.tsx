import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { MyTournamentJoinRequest } from '@/types/tournament';

type Props = {
  request: MyTournamentJoinRequest;
  onPress: () => void;
  /** Omitted for REJECTED rows — no Cancel Request button renders. */
  onCancel?: () => void;
};

/**
 * Manage Tournaments "My Join Requests" row (Pencil "Tournament - Manage
 * (Joined)" frame) — mirrors GroupJoinRequestListItem: a request row wrapping a
 * small tournament summary, with the captain's own team name and a status chip.
 */
export default function TournamentJoinRequestListItem({ request, onPress, onCancel }: Props) {
  const isPending = request.status === 'PENDING';

  return (
    <TouchableOpacity
      testID={`tournament-join-request-${request.requestId}`}
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.row}>
        <View style={styles.iconTile}>
          <Ionicons
            name={request.tournament.sport === 'FOOTBALL' ? 'football' : 'tennisball'}
            size={20}
            color={colors.primaryDark}
          />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {request.tournament.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
            {request.teamName} · {request.tournament.formatBadge}
          </Text>
          <View style={[styles.statusChip, isPending ? styles.statusChipPending : styles.statusChipRejected]}>
            <Ionicons
              name={isPending ? 'time-outline' : 'close-circle-outline'}
              size={12}
              color={isPending ? colors.amber : colors.error}
            />
            <Text
              style={[
                styles.statusChipText,
                isPending ? styles.statusChipTextPending : styles.statusChipTextRejected,
              ]}
            >
              {isPending ? 'Waiting for organizer approval' : 'Rejected — you can submit again'}
            </Text>
          </View>
        </View>
      </View>

      {isPending && onCancel && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity
            testID={`tournament-cancel-request-${request.requestId}`}
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel Request</Text>
          </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flexShrink: 1, gap: spacing.xs },
  title: { fontSize: 16, fontWeight: '800', color: colors.headingText },
  subtitle: { fontSize: 12, color: colors.outline },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  statusChipPending: { backgroundColor: colors.amberSoft },
  statusChipRejected: { backgroundColor: colors.errorBackground },
  statusChipText: { fontSize: 12, fontWeight: '700' },
  statusChipTextPending: { color: colors.amber },
  statusChipTextRejected: { color: colors.error },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
});
