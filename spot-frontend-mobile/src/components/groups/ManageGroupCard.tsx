import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { Group } from '@/types/group';

type Props = {
  group: Group;
  variant: 'managed' | 'joined';
  onManage: () => void; // managed variant — opens ManageGroupRequestsScreen
  onViewDetails: () => void; // opens GroupDetailScreen (same as guest browse)
};

/**
 * Manage Groups list card — mirrors ManageMatchCard: tap card body → detail,
 * Manage / View Group buttons keep their own actions.
 */
export default function ManageGroupCard({ group, variant, onManage, onViewDetails }: Props) {
  const pendingCount = group.pendingRequestCount ?? 0;
  const logo = group.logoUrl;

  if (variant === 'joined') {
    return (
      <View style={styles.joinedCard}>
        <TouchableOpacity
          testID={`manage-group-card-${group.groupId}`}
          onPress={onViewDetails}
          activeOpacity={0.85}
        >
          <View style={styles.joinedRow}>
            <View style={styles.iconTile}>
              {logo ? (
                <Image source={{ uri: logo }} style={styles.iconTileImage} />
              ) : (
                <Ionicons name="people" size={22} color={colors.primaryDark} />
              )}
            </View>
            <View style={styles.joinedText}>
              <Text style={styles.joinedName} numberOfLines={1} ellipsizeMode="tail">
                {group.name}
              </Text>
              <View style={styles.memberRow}>
                <Ionicons name="person" size={12} color={colors.outline} />
                <Text style={styles.memberText}>{group.memberCount} members</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity testID={`view-group-${group.groupId}`} style={styles.primaryButton} onPress={onViewDetails}>
          <Text style={styles.primaryButtonText}>View Group</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.managedCard}>
      {pendingCount > 0 && (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
        </View>
      )}
      <TouchableOpacity
        testID={`manage-group-card-${group.groupId}`}
        onPress={onViewDetails}
        activeOpacity={0.85}
        style={styles.managedBody}
      >
        <View style={styles.logoLarge}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logoLargeImage} />
          ) : (
            <Ionicons name="shield" size={30} color={colors.primaryDark} />
          )}
        </View>
        <Text style={styles.managedName} numberOfLines={1} ellipsizeMode="tail">
          {group.name}
        </Text>
        <View style={styles.adminPill}>
          <Text style={styles.adminPillText}>Admin</Text>
        </View>
        <View style={styles.memberRow}>
          <Ionicons name="people" size={14} color={colors.bodyText} />
          <Text style={styles.managedMemberText}>{group.memberCount} members</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity testID={`manage-group-${group.groupId}`} style={styles.primaryButton} onPress={onManage}>
        <Ionicons name="settings-outline" size={16} color={colors.white} />
        <Text style={styles.primaryButtonText}>Manage</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  managedCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  managedBody: {
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  pendingBadge: {
    alignSelf: 'flex-end',
    backgroundColor: colors.orangeSoft,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: colors.orange },
  logoLarge: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoLargeImage: { width: '100%', height: '100%' },
  managedName: { fontSize: 20, fontWeight: '800', color: colors.headingText, textAlign: 'center' },
  adminPill: { backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.xxs },
  adminPillText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  managedMemberText: { fontSize: 14, color: colors.bodyText },

  joinedCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  joinedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconTileImage: { width: '100%', height: '100%' },
  joinedText: { flexShrink: 1, gap: 2 },
  joinedName: { fontSize: 17, fontWeight: '800', color: colors.headingText },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  memberText: { fontSize: 13, color: colors.outline },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.md,
    width: '100%',
  },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
