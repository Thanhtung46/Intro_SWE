import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { Tournament } from '@/types/tournament';

type Props = {
  tournament: Tournament;
  onPress: () => void;
  onToggleFavorite: () => void;
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
 * GroupCard's cover-overlay + white-body-meta + full-width-button layout.
 * Browse only ever surfaces OPEN_REGISTRATION tournaments so there's no status
 * pill here (the Manage screens carry that instead). `formatBadge` is the
 * server-computed string — render verbatim.
 */
export default function TournamentCard({ tournament, onPress, onToggleFavorite }: Props) {
  const cityText = tournament.cityName ?? tournament.venueName;
  const feeText =
    tournament.registrationFeeVnd > 0 ? `${vnd(tournament.registrationFeeVnd)} / team` : 'Free entry';

  return (
    <TouchableOpacity
      testID={`tournament-card-${tournament.tournamentId}`}
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cover}>
        {tournament.coverUrl ? (
          <Image
            source={{ uri: tournament.coverUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
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
          testID={`tournament-favorite-${tournament.tournamentId}`}
          style={styles.favoriteButton}
          onPress={onToggleFavorite}
        >
          <Ionicons
            name={tournament.isFavorited ? 'heart' : 'heart-outline'}
            size={16}
            color={tournament.isFavorited ? colors.error : colors.white}
          />
        </TouchableOpacity>
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
        <MetaRow icon="location-outline" text={`${tournament.venueName}, ${cityText}`} />
        <View style={styles.statsRow}>
          <MetaRow
            icon="people-outline"
            text={`${tournament.acceptedTeamCount} / ${tournament.maxTeams} teams`}
          />
          <Text style={styles.fee}>{feeText}</Text>
        </View>

        <TouchableOpacity
          testID={`tournament-view-${tournament.tournamentId}`}
          style={styles.viewButton}
          onPress={onPress}
        >
          <Text style={styles.viewButtonText}>View Tournament</Text>
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
  cover: { height: 170, justifyContent: 'flex-end' },
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
  coverText: { padding: spacing.md, gap: spacing.sm },
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
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  fee: { fontSize: 12, fontWeight: '700', color: colors.priceText },

  viewButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  viewButtonText: { fontSize: 14, fontWeight: '800', color: colors.white },
});
