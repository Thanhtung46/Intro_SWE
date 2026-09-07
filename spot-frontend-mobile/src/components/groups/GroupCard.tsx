import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  GestureResponderEvent,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import MatchCoverImage from '@/components/matches/MatchCoverImage';
import { spacing } from '@/constants/spacing';
import { groupSkillLabel } from '@/components/groups/groupPresentation';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { Group } from '@/types/group';

type Props = {
  group: Group;
  onPress: () => void;
  /** Card "Join Group" CTA — joins immediately without opening detail. */
  onJoin: () => void;
  joining?: boolean;
  /** Precomputed distance from viewer GPS, e.g. "1.2 km". */
  distanceLabel?: string | null;
};

/**
 * Group browse card (Pencil "Matches - Homepage 2" frame). Name + tagline
 * overlay the cover photo; the white body is a single meta row
 * (memberCount + "tagline • skill") with an avatar strip, then a full-width
 * "Join Group" button. Unlike MatchCard there is no price/spots-left pair
 * and no host row — groups only surface memberCount + joinMode.
 */
export default function GroupCard({
  group,
  onPress,
  onJoin,
  joining = false,
  distanceLabel,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const minLabel = groupSkillLabel(t, group.skillMin);
  const maxLabel = groupSkillLabel(t, group.skillMax);
  const skillText = group.allLevels || !minLabel || !maxLabel
    ? t('groups.skill.allLevels')
    : minLabel === maxLabel
      ? minLabel
      : `${minLabel} – ${maxLabel}`;
  const joinLabel = group.joinMode === 'AUTO' ? t('groups.join.open') : t('groups.join.approvalRequired');
  const metaLine = `${joinLabel} • ${skillText}`;
  const extraMembers = Math.max(0, group.memberCount - group.memberAvatars.length);

  return (
    <TouchableOpacity testID={`group-card-${group.groupId}`} style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cover}>
        {/* Same remote+default layering as MatchCard — Unsplash fail no longer leaves a blank hero. */}
        <MatchCoverImage sport={group.sport} coverUrl={group.coverUrl} />
        <View style={styles.coverScrim} />
        <View style={styles.coverText}>
          <Text style={styles.coverName} numberOfLines={1} ellipsizeMode="tail">
            {group.name}
          </Text>
          {group.title ? (
            <Text style={styles.coverTagline} numberOfLines={1} ellipsizeMode="tail">
              {group.title}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={styles.metaTextWrap}>
            <View style={styles.memberRow}>
              <Ionicons name="people" size={14} color={colors.textPrimary} />
              <Text style={styles.memberCount}>{group.memberCount} {t('groups.members')}</Text>
              {distanceLabel ? <Text style={styles.distanceText}>· {distanceLabel} {t('groups.away')}</Text> : null}
            </View>
            <Text style={styles.metaLine} numberOfLines={1} ellipsizeMode="tail">
              {metaLine}
            </Text>
          </View>
          <View style={styles.avatars}>
            {group.memberAvatars.slice(0, 3).map((uri, index) => (
              <Image key={index} source={{ uri }} style={[styles.avatar, index > 0 && styles.avatarOverlap]} />
            ))}
            {extraMembers > 0 && (
              <View style={[styles.avatar, styles.avatarExtra, group.memberAvatars.length > 0 && styles.avatarOverlap]}>
                <Text style={styles.avatarExtraText}>+{extraMembers}</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          testID={`group-join-${group.groupId}`}
          style={[styles.joinButton, joining && styles.joinButtonDisabled]}
          disabled={joining}
          onPress={(e: GestureResponderEvent) => {
            e.stopPropagation();
            onJoin();
          }}
        >
          <Text style={styles.joinButtonText}>{joining ? t('groups.join.joining') : t('groups.join.action')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  cover: { height: 190, justifyContent: 'flex-end' },
  coverScrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.groupImageScrim },
  coverText: { padding: spacing.md, gap: 2 },
  coverName: { fontSize: 20, fontWeight: '800', color: colors.white },
  coverTagline: { fontSize: 13, color: colors.white, opacity: 0.9 },

  body: { padding: spacing.md, gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  metaTextWrap: { flexShrink: 1, gap: 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  memberCount: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  distanceText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  metaLine: { fontSize: 12, color: colors.textMuted },

  avatars: { flexDirection: 'row' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: { marginLeft: -8 },
  avatarExtra: { backgroundColor: colors.roleCardSelectedBg },
  avatarExtraText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  joinButtonDisabled: { opacity: 0.6 },
  joinButtonText: { fontSize: 14, fontWeight: '800', color: colors.white },
});
