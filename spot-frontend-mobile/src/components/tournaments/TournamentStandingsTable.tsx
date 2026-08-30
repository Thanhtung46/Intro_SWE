import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { Sport } from '@/types/match';
import type { StandingRow } from '@/types/tournament';

type Props = {
  sport: Sport;
  standings: StandingRow[];
};

/**
 * Standings table (Pencil "Tournament Standings" frame). Football shows
 * P/W/D/L/GD/PTS; badminton shows P/W/L/SD/PTS. Rows arrive pre-sorted +
 * pre-ranked from the API.
 */
export default function TournamentStandingsTable({ sport, standings }: Props) {
  const isFootball = sport === 'FOOTBALL';

  if (standings.length === 0) {
    return <Text style={styles.empty}>No results recorded yet.</Text>;
  }

  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headRow]}>
        <Text style={[styles.cellRank, styles.headText]}>#</Text>
        <Text style={[styles.cellTeam, styles.headText]}>Team</Text>
        <Text style={[styles.cellNum, styles.headText]}>P</Text>
        <Text style={[styles.cellNum, styles.headText]}>W</Text>
        {isFootball && <Text style={[styles.cellNum, styles.headText]}>D</Text>}
        <Text style={[styles.cellNum, styles.headText]}>L</Text>
        <Text style={[styles.cellNum, styles.headText]}>{isFootball ? 'GD' : 'SD'}</Text>
        <Text style={[styles.cellNum, styles.headText, styles.ptsHead]}>PTS</Text>
      </View>

      {standings.map((r) => (
        <View key={r.teamId} style={styles.row}>
          <Text style={styles.cellRank}>{r.rank}</Text>
          <View style={styles.cellTeam}>
            {r.teamLogoUrl ? <Image source={{ uri: r.teamLogoUrl }} style={styles.logo} /> : <View style={styles.logo} />}
            <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
              {r.teamName}
            </Text>
          </View>
          <Text style={styles.cellNum}>{r.played}</Text>
          <Text style={styles.cellNum}>{r.won}</Text>
          {isFootball && <Text style={styles.cellNum}>{r.drawn}</Text>}
          <Text style={styles.cellNum}>{r.lost}</Text>
          <Text style={styles.cellNum}>{isFootball ? r.goalDifference : r.setDifference}</Text>
          <Text style={[styles.cellNum, styles.pts]}>{r.pts}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { backgroundColor: colors.cardBackground, borderRadius: 14, paddingVertical: spacing.xs },
  empty: { fontSize: 13, color: colors.outline, textAlign: 'center', paddingVertical: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headRow: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  headText: { fontSize: 11, fontWeight: '800', color: colors.outline },
  ptsHead: { color: colors.primaryDark },
  cellRank: { width: 22, fontSize: 12, fontWeight: '700', color: colors.bodyText },
  cellTeam: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cellNum: { width: 26, textAlign: 'center', fontSize: 12, color: colors.bodyText },
  pts: { fontWeight: '800', color: colors.headingText },
  logo: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.iconBackground },
  teamName: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: colors.headingText },
});
