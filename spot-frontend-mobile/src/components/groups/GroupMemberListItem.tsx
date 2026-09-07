import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/constants/spacing';
import { groupSkillLabel, groupSkillTier } from '@/components/groups/groupPresentation';
import type { GroupMember } from '@/types/group';
import type { Sport } from '@/types/match';

type Props = {
  member: GroupMember;
  sport: Sport;
  onPress?: () => void;
};

/**
 * Group Detail Members tab row — tap opens Check Profile (same as match
 * squad). Kick/transfer stay in ManageGroupRequestsScreen only.
 */
export default function GroupMemberListItem({ member, sport, onPress }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const label = groupSkillLabel(t, member.skill ?? null);
  const tier = groupSkillTier(colors, sport, member.skill ?? null);

  return (
    <TouchableOpacity
      testID={`group-member-${member.userId}`}
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
    >
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
          <Text style={styles.adminTagText}>{t('groups.adminUpper')}</Text>
        </View>
      )}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  skillPill: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  skillPillText: { fontSize: 10, fontWeight: '700' },
  adminTag: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  adminTagText: { fontSize: 10, fontWeight: '700', color: colors.white },
});
