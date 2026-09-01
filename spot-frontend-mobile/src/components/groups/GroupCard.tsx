import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillLabel } from '@/constants/matchSkills';
import type { Group } from '@/types/group';

type Props = {
  group: Group;
  onPress: () => void;
  onToggleFavorite: () => void;
};

/**
 * Group browse card (Pencil "Matches - Homepage 2" frame). Name + tagline
 * overlay the cover photo; the white body is a single meta row
 * (memberCount + "tagline • skill") with an avatar strip, then a full-width
 * "Join Group" button. Unlike MatchCard there is no price/spots-left pair
 * and no host row — groups only surface memberCount + joinMode.
 */
export default function GroupCard({ group, onPress, onToggleFavorite }: Props) {
  const minLabel = skillLabel(group.sport, group.skillMin);
  const maxLabel = skillLabel(group.sport, group.skillMax);
  const skillText = group.allLevels || !minLabel || !maxLabel
    ? 'All Levels'
    : minLabel === maxLabel
      ? minLabel
      : `${minLabel} – ${maxLabel}`;
  const joinLabel = group.joinMode === 'AUTO' ? 'Open to Join' : 'Approval Required';
  const metaLine = `${joinLabel} • ${skillText}`;
  const extraMembers = Math.max(0, group.memberCount - group.memberAvatars.length);

  return (
    <TouchableOpacity testID={`group-card-${group.groupId}`} style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cover}>
        {group.coverUrl ? (
          <Image source={{ uri: group.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        <View style={styles.coverScrim} />
        <TouchableOpacity
          testID={`group-favorite-${group.groupId}`}
          style={styles.favoriteButton}
          onPress={onToggleFavorite}
        >
          <Ionicons
            name={group.isFavorited ? 'heart' : 'heart-outline'}
            size={16}
            color={group.isFavorited ? colors.error : colors.white}
          />
        </TouchableOpacity>
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
              <Ionicons name="people" size={14} color={colors.headingText} />
              <Text style={styles.memberCount}>{group.memberCount} Members</Text>
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

        <TouchableOpacity testID={`group-view-${group.groupId}`} style={styles.joinButton} onPress={onPress}>
          <Text style={styles.joinButtonText}>Join Group</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  cover: { height: 190, justifyContent: 'flex-end' },
  coverScrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.heroScrim },
  favoriteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glassIconButtonBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverText: { padding: spacing.md, gap: 2 },
  coverName: { fontSize: 20, fontWeight: '800', color: colors.white },
  coverTagline: { fontSize: 13, color: colors.white, opacity: 0.9 },

  body: { padding: spacing.md, gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  metaTextWrap: { flexShrink: 1, gap: 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  memberCount: { fontSize: 14, fontWeight: '800', color: colors.headingText },
  metaLine: { fontSize: 12, color: colors.outline },

  avatars: { flexDirection: 'row' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: { marginLeft: -8 },
  avatarExtra: { backgroundColor: colors.selectedBackground },
  avatarExtraText: { fontSize: 10, fontWeight: '700', color: colors.primaryDark },

  joinButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  joinButtonText: { fontSize: 14, fontWeight: '800', color: colors.white },
});
