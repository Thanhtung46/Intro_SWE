import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { GestureResponderEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MatchCoverImage from '@/components/matches/MatchCoverImage';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { Tournament } from '@/types/tournament';

type Props = {
  tournament: Tournament;
  onPress: () => void;
  /** Card "Join Tournament" CTA — opens join form without requiring detail first. */
  onJoin: () => void;
  /** Precomputed distance from viewer GPS, e.g. "1.2 km". */
  distanceLabel?: string | null;
};

function dateRange(startsAt: string, endsAt: string, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const startText = start.toLocaleDateString(locale, opts);
  const endText = end.toLocaleDateString(locale, { ...opts, year: 'numeric' });
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
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const styles = createStyles(colors);
  const cityText = tournament.cityName ?? tournament.venueName;
  const feeText =
    tournament.registrationFeeVnd > 0
      ? t('tournaments.browse.feePerTeam').replace('{fee}', vnd(tournament.registrationFeeVnd))
      : t('tournaments.common.freeEntry');
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
        <MetaRow colors={colors} styles={styles} icon="calendar-outline" text={dateRange(tournament.startsAt, tournament.endsAt, language === 'vi' ? 'vi-VN' : 'en-US')} />
        <View style={styles.locationRow}>
          <MetaRow colors={colors} styles={styles} icon="location-outline" text={locationText} />
          {distanceLabel ? <Text style={styles.distanceText}>{distanceLabel} {t('tournaments.common.away')}</Text> : null}
        </View>
        <View style={styles.statsRow}>
          <MetaRow colors={colors} styles={styles}
            icon="people-outline"
            text={t('tournaments.browse.teamsCount').replace('{accepted}', String(tournament.acceptedTeamCount)).replace('{max}', String(tournament.maxTeams))}
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
          <Text style={styles.joinButtonText}>{t('tournaments.browse.join')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function MetaRow({ icon, text, colors, styles }: { icon: keyof typeof Ionicons.glyphMap; text: string; colors: ThemeColors; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
        {text}
      </Text>
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
  cover: { height: 170, justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' },
  coverScrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.groupImageScrim, zIndex: 1 },
  coverText: { zIndex: 1, padding: spacing.md, gap: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.matchIconGlassBg,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  coverName: { fontSize: 20, fontWeight: '800', color: colors.white },

  body: { padding: spacing.md, gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  metaText: { fontSize: 12, color: colors.textSecondary, flexShrink: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  distanceText: { fontSize: 12, fontWeight: '700', color: colors.primary, flexShrink: 0 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  fee: { fontSize: 12, fontWeight: '700', color: colors.accentText },

  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  joinButtonText: { fontSize: 14, fontWeight: '800', color: colors.white },
});
