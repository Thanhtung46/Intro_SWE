import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { Match } from '@/types/match';
import { formatMatchWhen } from '@/utils/format';

type Props = {
  match: Match;
  /** Completed tab uses one layout regardless of myRole — pass 'completed' to force it. */
  variant?: 'completed';
  onManageSquad: () => void;
  onViewDetails: () => void;
  onEditMatch?: () => void;
  onCancelMatch?: () => void;
};

/**
 * Manage Matches Active/Completed card (Figma `l3tmW`/`a6BBo`) — flatter
 * list-item layout than Homepage's MatchCard (no cover image/price/join
 * button), branching on match.myRole. See plan mục 2 "Active tab — two
 * card variants".
 */
export default function ManageMatchCard({
  match,
  variant,
  onManageSquad,
  onViewDetails,
  onEditMatch,
  onCancelMatch,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const isCompleted = variant === 'completed';
  const isHost = !isCompleted && match.myRole === 'HOST';
  const isParticipant = !isCompleted && match.myRole === 'PARTICIPANT';
  const isFull = match.status === 'FULL';
  const isHostReview = isHost && (match.pendingRequestCount ?? 0) > 0 && match.joinMode === 'APPROVAL';
  const sportLabel = match.sport === 'FOOTBALL' ? t('common.sportFootball') : t('common.sportBadminton');

  const cardBody = (
    <>
      <View style={styles.topRow}>
        <View style={styles.sportChip}>
          <Text style={styles.sportChipText}>{sportLabel}</Text>
        </View>
        {isCompleted && (
          <View style={styles.completedChip}>
            <Text style={styles.completedChipText}>{t('matches.status.completed')}</Text>
          </View>
        )}
        {isHost && (
          <View style={[styles.roleChip, isHostReview && styles.roleChipReview]}>
            <Text style={[styles.roleChipText, isHostReview && styles.roleChipTextReview]}>
              {isHostReview ? t('matches.status.hostReview') : t('matches.status.host')}
            </Text>
          </View>
        )}
        {isFull && (
          <View style={styles.fullChip}>
            <Text style={styles.fullChipText}>{t('matches.status.full')}</Text>
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
            {isCompleted ? t('matches.status.host') : `${t('matches.browse.hostedByPrefix')} ${match.hostFullName}`}
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
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondaryAlt} />
          <Text style={styles.metaText}>{formatMatchWhen(match.startsAt, match.endsAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondaryAlt} />
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
            {match.filledCount}/{match.maxPlayers} {t('matches.status.joinedSuffix')}
          </Text>
          <Text style={styles.spotsLeftText}>{match.spotsLeft} {t('matches.status.spotsLeftSuffix')}</Text>
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
              <Text style={styles.pendingBannerText}>{match.pendingRequestCount} {t('matches.status.pendingRequestsSuffix')}</Text>
              <TouchableOpacity testID={`manage-squad-${match.matchId}`} style={styles.manageSquadButton} onPress={onManageSquad}>
                <Text style={styles.manageSquadButtonText}>{t('matches.actions.manageSquad')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity testID={`manage-squad-${match.matchId}`} style={styles.outlineButton} onPress={onManageSquad}>
              <Text style={styles.outlineButtonText}>{t('matches.actions.viewSquad')}</Text>
            </TouchableOpacity>
          )}
          {(onEditMatch || onCancelMatch) && (
            <View style={styles.hostActionsRow}>
              {onEditMatch ? (
                <TouchableOpacity testID={`manage-edit-${match.matchId}`} style={styles.outlineButtonFlex} onPress={onEditMatch}>
                  <Text style={styles.outlineButtonText}>{t('matches.actions.edit')}</Text>
                </TouchableOpacity>
              ) : null}
              {onCancelMatch ? (
                <TouchableOpacity testID={`manage-cancel-${match.matchId}`} style={styles.dangerButtonFlex} onPress={onCancelMatch}>
                  <Text style={styles.dangerButtonText}>{t('matches.actions.cancelMatch')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </>
      )}

      {isParticipant && (
        <TouchableOpacity testID={`view-details-${match.matchId}`} style={styles.outlineButton} onPress={onViewDetails}>
          <Text style={styles.outlineButtonText}>{t('matches.actions.viewDetails')}</Text>
        </TouchableOpacity>
      )}

      {isCompleted && (
        <TouchableOpacity testID={`view-summary-${match.matchId}`} style={styles.filledButton} onPress={onViewDetails}>
          <Text style={styles.filledButtonText}>{t('matches.actions.viewSummary')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sportChip: { backgroundColor: colors.roleCardSelectedBg, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  sportChipText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  completedChip: { backgroundColor: colors.roleCardSelectedBg, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  completedChipText: { fontSize: 11, fontWeight: '700', color: colors.outlineMuted },
  roleChip: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  roleChipText: { fontSize: 11, fontWeight: '700', color: colors.white },
  roleChipReview: { backgroundColor: colors.warningSurface },
  roleChipTextReview: { color: colors.warningText },
  fullChip: { backgroundColor: colors.dangerSurface, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  fullChipText: { fontSize: 11, fontWeight: '700', color: colors.roleErrorText },

  title: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },

  hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hostAvatarImage: { width: '100%', height: '100%' },
  hostAvatarText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  hostName: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: colors.outlineMuted },
  hostFullName: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: colors.textPrimary },

  metaBlock: { gap: spacing.xxs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontSize: 13, color: colors.textSecondaryAlt, flexShrink: 1 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  participantsRow: { flexDirection: 'row' },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.roleCardSelectedBg,
  },
  participantAvatarOverlap: { marginLeft: -8 },
  progressText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  spotsLeftText: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.roleErrorText },

  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningSurface,
    borderRadius: 12,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  pendingBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.warningText },
  manageSquadButton: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  manageSquadButtonText: { fontSize: 12, fontWeight: '700', color: colors.white },

  outlineButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  outlineButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  hostActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  outlineButtonFlex: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dangerButtonFlex: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.roleErrorText,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dangerButtonText: { fontSize: 13, fontWeight: '700', color: colors.roleErrorText },
  filledButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  filledButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
