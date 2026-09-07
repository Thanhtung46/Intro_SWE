import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { type GestureResponderEvent, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MatchCoverImage, { BADMINTON_COVER_ASPECT } from '@/components/matches/MatchCoverImage';
import { groupSkillTier } from '@/components/groups/groupPresentation';
import { spacing } from '@/constants/spacing';
import { skillLabel } from '@/constants/matchSkills';
import { formatLabel } from '@/constants/matchFormats';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { Match } from '@/types/match';
import { formatMatchWhen, formatVnd } from '@/utils/format';

type Props = {
  match: Match;
  onPress: () => void;
  /** Prefer for the Join Match CTA — opens join flow (detail + sheet). Falls back to onPress. */
  onJoin?: () => void;
  onDirections: () => void;
  /** Precomputed distance from viewer GPS, e.g. "1.2 km". */
  distanceLabel?: string | null;
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
export default function MatchCard({ match, onPress, onJoin, onDirections, distanceLabel }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const isFull = match.status === 'FULL' || match.spotsLeft < 1;
  // Prefer runtime yourShare (SPLIT_EVENLY = ceil(total/maxPlayers); GENDER_RANGE by viewer gender).
  // Fall back to listed prices when yourShare is null (e.g. GENDER_RANGE + viewer gender unknown).
  const priceLabel =
    match.yourShare != null
      ? formatVnd(match.yourShare)
      : match.priceMax != null && match.priceMax !== match.priceMin
        ? `${new Intl.NumberFormat('en-US').format(match.priceMin ?? 0)} - ${formatVnd(match.priceMax)}`
        : formatVnd(match.priceMin);
  const minLabel = skillLabel(match.sport, match.skillMin);
  const maxLabel = skillLabel(match.sport, match.skillMax);
  const extraParticipants = Math.max(0, match.filledCount - 1 - match.participantAvatars.length);
  const locationLabel = [match.venueName, match.venueAddress].filter(Boolean).join(', ');
  const showSkillRange = !match.allLevels && Boolean(minLabel || maxLabel);

  return (
    <TouchableOpacity testID={`match-card-${match.matchId}`} style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardCover}>
        <MatchCoverImage sport={match.sport} coverUrl={match.coverUrl} />
        <View style={styles.cardCoverTopRow} pointerEvents="box-none">
          <TouchableOpacity
            testID={`match-directions-${match.matchId}`}
            style={styles.cardIconButton}
            onPress={(e: GestureResponderEvent) => {
              e.stopPropagation();
              onDirections();
            }}
          >
            <Ionicons name="paper-plane-outline" size={15} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardCoverBottomRow} pointerEvents="box-none">
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText} numberOfLines={1} ellipsizeMode="tail">
              {priceLabel}
            </Text>
          </View>
          <TouchableOpacity
            testID={`match-join-${match.matchId}`}
            style={[styles.joinButton, isFull && styles.joinButtonDisabled]}
            onPress={(e: GestureResponderEvent) => {
              // Nested under card onPress — stop so we don't race to detail without join=1.
              e.stopPropagation();
              (onJoin ?? onPress)();
            }}
            disabled={isFull}
          >
            <Text style={styles.joinButtonText}>{isFull ? t('matches.actions.full') : t('matches.actions.joinMatch')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={[styles.cardTitle, styles.cardTitleFlex]} numberOfLines={1} ellipsizeMode="tail">
            {match.title}
          </Text>
          <View style={styles.formatBadge}>
            <Text style={styles.formatBadgeText}>{formatLabel(match.format)}</Text>
          </View>
        </View>

        <View style={styles.cardHostRow}>
          <View style={styles.hostAvatar}>
            <Text style={styles.hostAvatarText}>{(match.hostFullName || 'H').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.hostName} numberOfLines={1} ellipsizeMode="tail">
            {match.hostFullName}
          </Text>
          <Text style={styles.hostMeta} numberOfLines={1}>
            · {match.host.matchCount} {t('matches.browse.matchesSuffix')}
          </Text>
        </View>

        <View style={styles.cardMetaBlock}>
          <View style={styles.cardMetaRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondaryAlt} />
            <Text style={[styles.cardMetaText, styles.cardMetaTextFlex]} numberOfLines={1} ellipsizeMode="tail">
              {formatMatchWhen(match.startsAt, match.endsAt)}
            </Text>
          </View>
          <View style={styles.cardMetaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondaryAlt} />
            <Text style={[styles.cardMetaText, styles.cardMetaTextFlex]} numberOfLines={1} ellipsizeMode="tail">
              {locationLabel}
            </Text>
          </View>
          <View style={styles.cardMetaRow}>
            <Ionicons name="stats-chart-outline" size={13} color={colors.textSecondaryAlt} />
            <Text style={styles.cardMetaText}>{t('matches.browse.skillPrefix')}</Text>
            <View style={styles.skillChips}>
              {showSkillRange ? (
                <>
                  {minLabel ? <SkillPill colors={colors} sport={match.sport} code={match.skillMin} label={minLabel} /> : null}
                  {minLabel && maxLabel && maxLabel !== minLabel ? (
                    <Ionicons name="arrow-forward" size={12} color={colors.outlineMuted} style={styles.skillRangeArrow} />
                  ) : null}
                  {maxLabel && maxLabel !== minLabel ? (
                    <SkillPill colors={colors} sport={match.sport} code={match.skillMax} label={maxLabel} />
                  ) : null}
                </>
              ) : (
                <View style={[styles.skillPill, styles.skillPillAllLevels]}>
                  <Text style={[styles.skillPillText, styles.skillPillAllLevelsText]}>{t('matches.browse.allLevels')}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.spotsRow}>
          <Text style={styles.spotsLeftText}>{isFull ? t('matches.actions.full') : `${match.spotsLeft} ${t('matches.browse.spotsLeft')}`}</Text>
          {distanceLabel ? (
            <Text style={styles.distanceText} numberOfLines={1}>
              {distanceLabel} {t('matches.browse.away')}
            </Text>
          ) : null}
        </View>

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

function SkillPill({ colors, sport, code, label }: { colors: ThemeColors; sport: Match['sport']; code: string | null; label: string }) {
  const styles = createStyles(colors);
  const tier = groupSkillTier(colors, sport, code);
  return (
    <View style={[styles.skillPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
      <Text style={[styles.skillPillText, { color: tier.text }]}>{label}</Text>
    </View>
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
  cardCover: {
    width: '100%',
    aspectRatio: BADMINTON_COVER_ASPECT,
    overflow: 'hidden',
    position: 'relative',
  },
  cardCoverTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    elevation: 3,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    // Dark glass so white heart / paper-plane stay visible on light covers
    // (same idea as Match Detail stickyIconButtonBackground).
    backgroundColor: colors.matchIconGlassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCoverBottomRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
  },
  pricePill: {
    flexShrink: 1,
    maxWidth: '58%',
    backgroundColor: colors.matchPriceChipBg,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pricePillText: { fontSize: 14, fontWeight: '800', color: colors.matchPriceChipText },
  joinButton: {
    flexShrink: 0,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  joinButtonDisabled: { backgroundColor: colors.outlineMuted },
  joinButtonText: { color: colors.white, fontWeight: '700', fontSize: 12 },

  cardBody: { padding: spacing.md, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  cardTitleFlex: { flex: 1, flexShrink: 1 },
  formatBadge: {
    flexShrink: 0,
    backgroundColor: colors.roleCardSelectedBg,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  formatBadgeText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  cardHostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  hostName: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  hostMeta: { flexShrink: 0, fontSize: 11, color: colors.outlineMuted },

  cardMetaBlock: { gap: spacing.xxs, marginTop: spacing.xs },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardMetaText: { fontSize: 13, color: colors.textSecondaryAlt },
  cardMetaTextFlex: { flex: 1, flexShrink: 1 },
  distanceText: { fontSize: 12, fontWeight: '700', color: colors.primary, flexShrink: 0 },
  skillChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xxs },
  skillRangeArrow: { marginHorizontal: 2 },
  skillPill: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  skillPillText: { fontSize: 11, fontWeight: '700' },
  skillPillAllLevels: {
    backgroundColor: colors.roleCardSelectedBg,
    borderColor: colors.chromeBorder,
  },
  skillPillAllLevelsText: { color: colors.primary },

  spotsRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  spotsLeftText: { fontSize: 12, fontWeight: '700', color: colors.roleErrorText, flexShrink: 1 },

  participantsRow: { flexDirection: 'row', marginTop: spacing.xs },
  participantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarOverlap: { marginLeft: -8 },
  participantExtra: { backgroundColor: colors.roleCardSelectedBg },
  participantExtraText: { fontSize: 10, fontWeight: '700', color: colors.primary },
});
