import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { Match } from '@/types/match';
import { formatMatchWhen } from '@/utils/format';

type Props = {
  match: Match;
  /** Completed tab uses one layout regardless of myRole — pass 'completed' to force it. */
  variant?: 'completed';
  onManageSquad: () => void;
  onViewDetails: () => void;
};

/**
 * Manage Matches Active/Completed card (Figma `l3tmW`/`a6BBo`) — flatter
 * list-item layout than Homepage's MatchCard (no cover image/price/join
 * button), branching on match.myRole. See plan mục 2 "Active tab — two
 * card variants".
 */
export default function ManageMatchCard({ match, variant, onManageSquad, onViewDetails }: Props) {
  const isCompleted = variant === 'completed';
  const isHost = !isCompleted && match.myRole === 'HOST';
  const isParticipant = !isCompleted && match.myRole === 'PARTICIPANT';
  const isFull = match.status === 'FULL';
  const isHostReview = isHost && (match.pendingRequestCount ?? 0) > 0 && match.joinMode === 'APPROVAL';
  const sportLabel = match.sport === 'FOOTBALL' ? 'Football' : 'Badminton';

  const cardBody = (
    <>
      <View style={styles.topRow}>
        <View style={styles.sportChip}>
          <Text style={styles.sportChipText}>{sportLabel}</Text>
        </View>
        {isCompleted && (
          <View style={styles.completedChip}>
            <Text style={styles.completedChipText}>COMPLETED</Text>
          </View>
        )}
        {isHost && (
          <View style={[styles.roleChip, isHostReview && styles.roleChipReview]}>
            <Text style={[styles.roleChipText, isHostReview && styles.roleChipTextReview]}>
              {isHostReview ? 'HOST REVIEW' : 'HOST'}
            </Text>
          </View>
        )}
        {isFull && (
          <View style={styles.fullChip}>
            <Text style={styles.fullChipText}>Đủ người</Text>
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {match.title}
      </Text>

      {(isCompleted || isParticipant) && (
        <View style={styles.hostRow}>
          <View style={styles.hostAvatar}>
            {match.host.avatarUrl ? (
              <Image source={{ uri: match.host.avatarUrl }} style={styles.hostAvatarImage} />
            ) : (
              <Text style={styles.hostAvatarText}>{(match.hostFullName || 'H').charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.hostName} numberOfLines={1} ellipsizeMode="tail">
            {isCompleted ? 'HOST' : `Hosted by ${match.hostFullName}`}
          </Text>
          {isCompleted && (
            <Text style={styles.hostFullName} numberOfLines={1} ellipsizeMode="tail">
              {match.hostFullName}
            </Text>
          )}
        </View>
      )}

      <View style={styles.metaBlock}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.bodyText} />
          <Text style={styles.metaText}>{formatMatchWhen(match.startsAt, match.endsAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.bodyText} />
          <Text style={styles.metaText} numberOfLines={1}>
            {match.venueName}
          </Text>
        </View>
      </View>

      {isHost && (
        <View style={styles.progressRow}>
          <View style={styles.participantsRow}>
            {match.participantAvatars.slice(0, 3).map((uri, index) => (
              <Image key={index} source={{ uri }} style={[styles.participantAvatar, index > 0 && styles.participantAvatarOverlap]} />
            ))}
          </View>
          <Text style={styles.progressText}>
            {match.filledCount}/{match.maxPlayers} Joined
          </Text>
          <Text style={styles.spotsLeftText}>{match.spotsLeft} Spots Left</Text>
        </View>
      )}
    </>
  );

  return (
    <View style={styles.card}>
      <TouchableOpacity
        testID={`manage-match-card-${match.matchId}`}
        onPress={onViewDetails}
        activeOpacity={0.85}
      >
        {cardBody}
      </TouchableOpacity>

      {isHost && (
        <>
          {isHostReview ? (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingBannerText}>{match.pendingRequestCount} pending requests</Text>
              <TouchableOpacity testID={`manage-squad-${match.matchId}`} style={styles.manageSquadButton} onPress={onManageSquad}>
                <Text style={styles.manageSquadButtonText}>Manage Squad</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity testID={`manage-squad-${match.matchId}`} style={styles.outlineButton} onPress={onManageSquad}>
              <Text style={styles.outlineButtonText}>View Squad</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {isParticipant && (
        <TouchableOpacity testID={`view-details-${match.matchId}`} style={styles.outlineButton} onPress={onViewDetails}>
          <Text style={styles.outlineButtonText}>View Details</Text>
        </TouchableOpacity>
      )}

      {isCompleted && (
        <TouchableOpacity testID={`view-summary-${match.matchId}`} style={styles.filledButton} onPress={onViewDetails}>
          <Text style={styles.filledButtonText}>View Summary</Text>
        </TouchableOpacity>
      )}
    </View>
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
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sportChip: { backgroundColor: colors.iconBackground, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  sportChipText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  completedChip: { backgroundColor: colors.iconBackground, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  completedChipText: { fontSize: 11, fontWeight: '700', color: colors.outline },
  roleChip: { backgroundColor: colors.primaryDark, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  roleChipText: { fontSize: 11, fontWeight: '700', color: colors.white },
  roleChipReview: { backgroundColor: colors.orangeSoft },
  roleChipTextReview: { color: colors.orange },
  fullChip: { backgroundColor: colors.errorBackground, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  fullChipText: { fontSize: 11, fontWeight: '700', color: colors.error },

  title: { fontSize: 17, fontWeight: '800', color: colors.headingText },

  hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hostAvatarImage: { width: '100%', height: '100%' },
  hostAvatarText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  hostName: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: colors.outline },
  hostFullName: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: colors.headingText },

  metaBlock: { gap: spacing.xxs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontSize: 13, color: colors.bodyText, flexShrink: 1 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  participantsRow: { flexDirection: 'row' },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.iconBackground,
  },
  participantAvatarOverlap: { marginLeft: -8 },
  progressText: { fontSize: 12, fontWeight: '700', color: colors.headingText },
  spotsLeftText: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.error },

  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.orangeSoft,
    borderRadius: 12,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  pendingBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.orange },
  manageSquadButton: { backgroundColor: colors.primaryDark, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  manageSquadButtonText: { fontSize: 12, fontWeight: '700', color: colors.white },

  outlineButton: {
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  outlineButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  filledButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  filledButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
