import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillLabel, skillTierColor } from '@/constants/matchSkills';
import type { GroupMember } from '@/types/group';
import type { Sport } from '@/types/match';

type Props = {
  member: GroupMember;
  sport: Sport;
};

/**
 * Group Detail Members tab row — read-only for everyone, including the
 * admin (Groups implementation plan resolved decision #1: kick/transfer
 * live only in ManageGroupRequestsScreen, never inline here). No Matches
 * equivalent — ManageSquadScreen's squad row is inline, not extracted, and
 * Matches has no standalone "browse all participants" list at all.
 */
export default function GroupMemberListItem({ member, sport }: Props) {
  const label = skillLabel(sport, member.skill ?? null);
  const tier = skillTierColor(sport, member.skill ?? null);

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {member.avatarUrl ? (
          <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{(member.fullName || 'P').charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {member.fullName}
      </Text>
      {label && (
        <View style={[styles.skillPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
          <Text style={[styles.skillPillText, { color: tier.text }]}>{label}</Text>
        </View>
      )}
      {member.isAdmin && (
        <View style={styles.adminTag}>
          <Text style={styles.adminTagText}>ADMIN</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.headingText },
  skillPill: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  skillPillText: { fontSize: 10, fontWeight: '700' },
  adminTag: { backgroundColor: colors.primaryDark, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  adminTagText: { fontSize: 10, fontWeight: '700', color: colors.white },
});
