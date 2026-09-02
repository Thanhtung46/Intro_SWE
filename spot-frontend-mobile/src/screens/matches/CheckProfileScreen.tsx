import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import ErrorBanner from '@/components/common/ErrorBanner';
import MatchCard from '@/components/matches/MatchCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillLabel } from '@/constants/matchSkills';
import { getErrorMessage, getHostProfile, getHostReviews, listMatches, setFavorite } from '@/services/matchService';
import { openVenueDirections } from '@/utils/directions';
import type { HostProfile, HostReview, Match, Sport } from '@/types/match';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  hostUserId: number;
  onBack: () => void;
  onOpenMatch: (matchId: number) => void;
  onJoinMatch?: (matchId: number) => void;
};

const SKILL_SPORTS: { sport: Sport; key: string }[] = [
  { sport: 'FOOTBALL', key: 'football' },
  { sport: 'BADMINTON', key: 'badminton' },
];

// Hosted Matches shows this many cards before the "View All" expand — Figma
// node 432:1211's list preview, not a paging control (no separate route).
const HOSTED_MATCHES_PREVIEW_COUNT = 1;

/**
 * Check Profile (Figma node 432:1211, SPOT-76). Presentation-only per
 * .claude/rules/code-style.md — hostUserId + navigation callbacks come from
 * app/matches/host/[id].tsx.
 *
 * Per plan mục 2.3 (committed decision, matches spot-backend/CLAUDE.md's
 * "Hide Groups / verified"): no Verified badge (no such backend concept
 * exists), no Groups section (out of scope) — those stay hidden. Rating +
 * Reviews were also hidden until the Review domain shipped; the pickup kèo
 * host-review feature (Aug 2026 P3 batch — `match_host_reviews`,
 * `GET /reviews/hosts/:userId/reviews`) is live now, so both render here.
 *
 * No phone number: `GET /users/:id` never returns it (spot-backend/CLAUDE.md
 * "Host phone" — only on match detail when caller is host/accepted
 * participant), so there's nothing to show here even though Figma mocks one.
 */
export default function CheckProfileScreen({ hostUserId, onBack, onOpenMatch, onJoinMatch }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [hostedMatches, setHostedMatches] = useState<Match[]>([]);
  const [reviews, setReviews] = useState<HostReview[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAllHostedMatches, setShowAllHostedMatches] = useState(false);

  const fetchProfile = useCallback(async () => {
    setStatus('loading');
    try {
      const [profileResult, matchesResult, reviewsResult] = await Promise.all([
        getHostProfile(hostUserId),
        listMatches({ hostUserId }),
        getHostReviews(hostUserId),
      ]);
      setProfile(profileResult);
      setHostedMatches(matchesResult.matches);
      setReviews(reviewsResult.reviews);
      setShowAllHostedMatches(false);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setStatus('error');
    }
  }, [hostUserId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleToggleFavorite = async (match: Match) => {
    const nextFavorited = !match.isFavorited;
    setHostedMatches((prev) => prev.map((m) => (m.matchId === match.matchId ? { ...m, isFavorited: nextFavorited } : m)));
    try {
      await setFavorite(match.matchId, nextFavorited);
    } catch {
      setHostedMatches((prev) => prev.map((m) => (m.matchId === match.matchId ? { ...m, isFavorited: match.isFavorited } : m)));
    }
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (status === 'error' || !profile) {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ErrorBanner message={errorMessage || 'Profile not found.'} onRetry={fetchProfile} />
      </SafeAreaView>
    );
  }

  const joinedLabel = new Date(profile.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const skillEntries = SKILL_SPORTS.map(({ sport, key }) => ({ sport, label: skillLabel(sport, profile.skills[key]) })).filter(
    (entry): entry is { sport: Sport; label: string } => Boolean(entry.label)
  );

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.heroOverlay} />
        </View>

        <View style={styles.identitySection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile.fullName}</Text>
          {profile.rating != null && (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={13} color={colors.amber} />
              <Text style={styles.ratingPillText}>{profile.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.matchCount}</Text>
            <Text style={styles.statLabel}>Hosted Matches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.reviewCount}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{joinedLabel}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
        </View>

        <View style={styles.body}>
          {skillEntries.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="football-outline" size={20} color={colors.headingText} />
                <Text style={styles.sectionTitle}>Sports & Skill Level</Text>
              </View>
              <View style={styles.skillRow}>
                {skillEntries.map((entry) => (
                  <View key={entry.sport} style={styles.skillPill}>
                    <Text style={styles.skillPillSport}>{entry.sport === 'FOOTBALL' ? 'Football' : 'Badminton'}</Text>
                    <View style={styles.skillPillDivider} />
                    <Text style={styles.skillPillLevel}>{entry.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.headingText} />
              <Text style={styles.sectionTitle}>Hosted Matches</Text>
              {hostedMatches.length > HOSTED_MATCHES_PREVIEW_COUNT && (
                <TouchableOpacity
                  testID="hosted-matches-view-all"
                  style={styles.viewAllButton}
                  onPress={() => setShowAllHostedMatches((prev) => !prev)}
                >
                  <Text style={styles.viewAllText}>{showAllHostedMatches ? 'Show Less' : 'View All'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {hostedMatches.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={24} color={colors.outline} />
                <Text style={styles.emptyCardText}>No active hosted matches.</Text>
              </View>
            ) : (
              <View style={styles.matchList}>
                {(showAllHostedMatches ? hostedMatches : hostedMatches.slice(0, HOSTED_MATCHES_PREVIEW_COUNT)).map((match) => (
                  <MatchCard
                    key={match.matchId}
                    match={match}
                    onPress={() => onOpenMatch(match.matchId)}
                    onJoin={() => (onJoinMatch ?? onOpenMatch)(match.matchId)}
                    onToggleFavorite={() => handleToggleFavorite(match)}
                    onDirections={() => openVenueDirections(router, match)}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.headingText} />
              <Text style={styles.sectionTitle}>Reviews</Text>
            </View>
            {reviews.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.outline} />
                <Text style={styles.emptyCardText}>No reviews yet.</Text>
              </View>
            ) : (
              <View style={styles.reviewList}>
                {reviews.map((review) => (
                  <View key={review.reviewId} style={styles.reviewCard}>
                    <View style={styles.reviewHeaderRow}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{(review.reviewer.fullName || 'P').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.reviewHeaderText}>
                        <Text style={styles.reviewerName} numberOfLines={1} ellipsizeMode="tail">
                          {review.reviewer.fullName || 'Player'}
                        </Text>
                        <Text style={styles.reviewMatchTitle} numberOfLines={1} ellipsizeMode="tail">
                          {review.match.title}
                        </Text>
                      </View>
                      <View style={styles.reviewRatingPill}>
                        <Ionicons name="star" size={12} color={colors.amber} />
                        <Text style={styles.reviewRatingText}>{review.rating.toFixed(1)}</Text>
                      </View>
                    </View>
                    {review.reviewText ? <Text style={styles.reviewText}>{review.reviewText}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} style={styles.topBarWrap}>
        <TouchableOpacity testID="check-profile-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.white} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.screenBackground },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.screenBackground },
  scrollContent: { paddingBottom: spacing.xl },

  hero: { height: 192, overflow: 'hidden' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.heroScrim },
  topBarWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  backButton: {
    marginLeft: spacing.md,
    marginTop: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.stickyIconButtonBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },

  identitySection: { alignItems: 'center', marginTop: -64, gap: spacing.sm },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.iconBackground,
    borderWidth: 6,
    borderColor: colors.screenBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 40, fontWeight: '700', color: colors.primaryDark },
  name: { fontSize: 20, fontWeight: '700', color: colors.headingText },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.amberSoft,
    borderRadius: 9999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  ratingPillText: { fontSize: 13, fontWeight: '700', color: colors.amber },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, gap: spacing.lg },
  statItem: { alignItems: 'center', gap: spacing.xxs },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 13, color: colors.bodyText },
  statDivider: { width: 1, height: 32, backgroundColor: colors.cardBorder },

  body: { padding: spacing.md, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.headingText },
  viewAllButton: { paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs },
  viewAllText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.iconBackground,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skillPillSport: { fontSize: 14, fontWeight: '600', color: colors.headingText },
  skillPillDivider: { width: 1, height: 16, backgroundColor: colors.cardBorder },
  skillPillLevel: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },

  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingVertical: spacing.xl,
  },
  emptyCardText: { fontSize: 13, color: colors.bodyText },

  matchList: { gap: spacing.lg },

  reviewList: { gap: spacing.sm },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  reviewHeaderText: { flex: 1, gap: spacing.xxs },
  reviewerName: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  reviewMatchTitle: { fontSize: 12, color: colors.outline },
  reviewRatingPill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.amberSoft,
    borderRadius: 9999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  reviewRatingText: { fontSize: 12, fontWeight: '700', color: colors.amber },
  reviewText: { fontSize: 13, color: colors.bodyText },
});
