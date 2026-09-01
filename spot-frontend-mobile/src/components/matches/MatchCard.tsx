import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillLabel, skillTierColor } from '@/constants/matchSkills';
import type { Match } from '@/types/match';
import { formatMatchWhen, formatVnd } from '@/utils/format';

type Props = {
  match: Match;
  onPress: () => void;
  onToggleFavorite: () => void;
  onDirections: () => void;
};

/**
 * Match card (Figma node 95:2417's list item). Extracted out of
 * MatchesHomepageScreen.tsx once a second real consumer showed up
 * (Manage/My Matches + Join Match - Map's list fallback, SPOT-76 tasks
 * #6/#7) — same bar used for extracting BottomNavBar/FilterSheet.
 *
 * The paper-plane icon is GPS directions to the venue, not sharing — see
 * spot-backend/CLAUDE.md ("Paper-plane = directions, not share") and
 * src/utils/directions.ts. `onDirections` is a callback prop (not owned
 * here) so every screen can wire the same `openDirections(match)` helper.
 */
export default function MatchCard({ match, onPress, onToggleFavorite, onDirections }: Props) {
  const isFull = match.status === 'FULL' || match.spotsLeft < 1;
  const priceLabel =
    match.priceMax != null && match.priceMax !== match.priceMin
      ? `${new Intl.NumberFormat('en-US').format(match.priceMin ?? 0)} - ${formatVnd(match.priceMax)}`
      : formatVnd(match.priceMin);
  const minLabel = skillLabel(match.sport, match.skillMin);
  const maxLabel = skillLabel(match.sport, match.skillMax);
  const extraParticipants = Math.max(0, match.filledCount - 1 - match.participantAvatars.length);

  return (
    <TouchableOpacity testID={`match-card-${match.matchId}`} style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardCover}>
        {match.coverUrl ? (
          <Image source={{ uri: match.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        <View style={styles.cardCoverTopRow}>
          <TouchableOpacity testID={`match-favorite-${match.matchId}`} style={styles.cardIconButton} onPress={onToggleFavorite}>
            <Ionicons name={match.isFavorited ? 'heart' : 'heart-outline'} size={16} color={match.isFavorited ? colors.error : colors.white} />
          </TouchableOpacity>
          <TouchableOpacity testID={`match-directions-${match.matchId}`} style={styles.cardIconButton} onPress={onDirections}>
            <Ionicons name="paper-plane-outline" size={15} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardCoverBottomRow}>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{priceLabel}</Text>
          </View>
          <TouchableOpacity
            testID={`match-join-${match.matchId}`}
            style={[styles.joinButton, isFull && styles.joinButtonDisabled]}
            onPress={onPress}
            disabled={isFull}
          >
            <Text style={styles.joinButtonText}>{isFull ? 'Full' : 'Join Match'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
          {match.title}
        </Text>

        <View style={styles.cardHostRow}>
          <View style={styles.hostAvatar}>
            <Text style={styles.hostAvatarText}>{(match.hostFullName || 'H').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.hostName} numberOfLines={1} ellipsizeMode="tail">
            {match.hostFullName}
          </Text>
          <Text style={styles.hostMeta}>· {match.host.matchCount} matches</Text>
        </View>

        <View style={styles.cardMetaBlock}>
          <View style={styles.cardMetaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.bodyText} />
            <Text style={styles.cardMetaText}>{formatMatchWhen(match.startsAt, match.endsAt)}</Text>
          </View>
          <View style={styles.cardMetaRow}>
            <Ionicons name="location-outline" size={14} color={colors.bodyText} />
            <Text style={[styles.cardMetaText, styles.cardMetaTextTruncate]} numberOfLines={1} ellipsizeMode="tail">
              {match.venueName}, {match.venueAddress}
            </Text>
          </View>
          {!match.allLevels && (minLabel || maxLabel) && (
            <View style={styles.cardMetaRow}>
              <Ionicons name="stats-chart-outline" size={13} color={colors.bodyText} />
              <Text style={styles.cardMetaText}>Skill:</Text>
              <View style={styles.skillChips}>
                {minLabel && <SkillPill sport={match.sport} code={match.skillMin} label={minLabel} />}
                {maxLabel && maxLabel !== minLabel && <SkillPill sport={match.sport} code={match.skillMax} label={maxLabel} />}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.spotsLeftText}>{isFull ? 'Full' : `${match.spotsLeft} spots left`}</Text>

        <View style={styles.participantsRow}>
          {match.participantAvatars.slice(0, 3).map((uri, index) => (
            <Image key={index} source={{ uri }} style={[styles.participantAvatar, index > 0 && styles.participantAvatarOverlap]} />
          ))}
          {extraParticipants > 0 && (
            <View style={[styles.participantAvatar, styles.participantExtra, match.participantAvatars.length > 0 && styles.participantAvatarOverlap]}>
              <Text style={styles.participantExtraText}>+{extraParticipants}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SkillPill({ sport, code, label }: { sport: Match['sport']; code: string | null; label: string }) {
  const tier = skillTierColor(sport, code);
  return (
    <View style={[styles.skillPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
      <Text style={[styles.skillPillText, { color: tier.text }]}>{label}</Text>
    </View>
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
  cardCover: { height: 200, justifyContent: 'space-between' },
  cardCoverTopRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  cardIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.glassChipBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCoverBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  pricePill: { backgroundColor: colors.white, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  pricePillText: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  joinButton: { backgroundColor: colors.primaryDark, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  joinButtonDisabled: { backgroundColor: colors.outline },
  joinButtonText: { color: colors.white, fontWeight: '700', fontSize: 12 },

  cardBody: { padding: spacing.md, gap: spacing.xs },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.headingText },
  cardHostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  hostName: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: colors.headingText },
  hostMeta: { flexShrink: 0, fontSize: 11, color: colors.outline },

  cardMetaBlock: { gap: spacing.xxs, marginTop: spacing.xs },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  cardMetaText: { fontSize: 13, color: colors.bodyText },
  cardMetaTextTruncate: { flexShrink: 1 },
  skillChips: { flexDirection: 'row', gap: spacing.xxs },
  skillPill: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  skillPillText: { fontSize: 11, fontWeight: '700' },

  spotsLeftText: { fontSize: 12, fontWeight: '700', color: colors.error, marginTop: spacing.xs },

  participantsRow: { flexDirection: 'row', marginTop: spacing.xs },
  participantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarOverlap: { marginLeft: -8 },
  participantExtra: { backgroundColor: colors.iconBackground },
  participantExtraText: { fontSize: 10, fontWeight: '700', color: colors.primaryDark },
});
