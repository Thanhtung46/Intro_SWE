import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { GestureResponderEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MatchCoverImage from '@/components/matches/MatchCoverImage';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { Tournament } from '@/types/tournament';

type Props = {
  tournament: Tournament;
  onPress: () => void;
  /** Card "Join Tournament" CTA — opens join form without requiring detail first. */
  onJoin: () => void;
  /** Precomputed distance from viewer GPS, e.g. "1.2 km". */
  distanceLabel?: string | null;
};

function dateRange(startsAt: string, endsAt: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startText = start.toLocaleDateString('en-US', opts);
  const endText = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return startText === endText.replace(/,.*/, '') ? endText : `${startText} – ${endText}`;
}

function vnd(amount: number): string {
  return `${amount.toLocaleString('en-US')} ₫`;
}

/**
 * Tournament browse card (Pencil "Matches - Homepage 3" frame). Mirrors
 * GroupCard: tap body → detail; full-width button → Join flow.
 */
export default function TournamentCard({
  tournament,
  onPress,
  onJoin,
  distanceLabel,
}: Props) {
  const cityText = tournament.cityName ?? tournament.venueName;
  const feeText =
    tournament.registrationFeeVnd > 0 ? `${vnd(tournament.registrationFeeVnd)} / team` : 'Free entry';
  const locationText = `${tournament.venueName}, ${cityText}`;

  return (
    <TouchableOpacity
      testID={`tournament-card-${tournament.tournamentId}`}
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cover}>
        {/* Same clipped remote+default layering as GroupCard / MatchCard — prevents Unsplash overflow on web. */}
        <MatchCoverImage sport={tournament.sport} coverUrl={tournament.coverUrl} />
        <View style={styles.coverScrim} />
        <View style={styles.coverText}>
          <View style={styles.badge}>
            <Ionicons name="trophy" size={11} color={colors.white} />
            <Text style={styles.badgeText}>{tournament.formatBadge}</Text>
          </View>
          <Text style={styles.coverName} numberOfLines={2} ellipsizeMode="tail">
            {tournament.title}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <MetaRow icon="calendar-outline" text={dateRange(tournament.startsAt, tournament.endsAt)} />
        <View style={styles.locationRow}>
          <MetaRow icon="location-outline" text={locationText} />
          {distanceLabel ? <Text style={styles.distanceText}>{distanceLabel} away</Text> : null}
        </View>
        <View style={styles.statsRow}>
          <MetaRow
            icon="people-outline"
            text={`${tournament.acceptedTeamCount} / ${tournament.maxTeams} teams`}
          />
          <Text style={styles.fee}>{feeText}</Text>
        </View>

        <TouchableOpacity
          testID={`tournament-join-${tournament.tournamentId}`}
          style={styles.joinButton}
          onPress={(e: GestureResponderEvent) => {
            e.stopPropagation();
            onJoin();
          }}
        >
          <Text style={styles.joinButtonText}>Join Tournament</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color={colors.outline} />
      <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
        {text}
      </Text>
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
  cover: { height: 170, justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' },
  coverScrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.heroScrim, zIndex: 1 },
  coverText: { zIndex: 1, padding: spacing.md, gap: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.glassIconButtonBackground,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  coverName: { fontSize: 20, fontWeight: '800', color: colors.white },

  body: { padding: spacing.md, gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  metaText: { fontSize: 12, color: colors.bodyText, flexShrink: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  distanceText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark, flexShrink: 0 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  fee: { fontSize: 12, fontWeight: '700', color: colors.priceText },

  joinButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  joinButtonText: { fontSize: 14, fontWeight: '800', color: colors.white },
});
