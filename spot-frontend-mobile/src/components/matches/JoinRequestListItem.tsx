import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
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
  const isPending = request.status === 'PENDING';

  return (
    <TouchableOpacity testID={`join-request-${request.requestId}`} style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.statusChip, isPending ? styles.statusChipPending : styles.statusChipRejected]}>
        <Text style={[styles.statusChipText, isPending ? styles.statusChipTextPending : styles.statusChipTextRejected]}>
          {isPending ? 'Pending Host Approval' : 'Rejected'}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {request.match.title}
      </Text>

      <View style={styles.metaBlock}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.bodyText} />
          <Text style={styles.metaText}>{formatMatchWhen(request.match.startsAt, request.match.endsAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.bodyText} />
          <Text style={styles.metaText} numberOfLines={1}>
            {request.match.venueName}
          </Text>
        </View>
      </View>

      <Text style={styles.hostedBy} numberOfLines={1} ellipsizeMode="tail">
        Hosted by {request.match.hostFullName}
      </Text>

      {isPending && onCancel && (
        <TouchableOpacity testID={`cancel-request-${request.requestId}`} style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel Request</Text>
        </TouchableOpacity>
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
  statusChip: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  statusChipPending: { backgroundColor: colors.amberSoft },
  statusChipRejected: { backgroundColor: colors.errorBackground },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  statusChipTextPending: { color: colors.amber },
  statusChipTextRejected: { color: colors.error },

  title: { fontSize: 17, fontWeight: '800', color: colors.headingText },

  metaBlock: { gap: spacing.xxs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontSize: 13, color: colors.bodyText, flexShrink: 1 },

  hostedBy: { fontSize: 12, fontWeight: '700', color: colors.outline },

  cancelButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  cancelButtonText: { fontSize: 13, fontWeight: '700', color: colors.error },
});
