import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

type TeamSlot = { teamId: number; teamName: string; teamLogoUrl: string | null };

type Props = {
  teams: TeamSlot[];
  maxTeams: number;
};

/**
 * Registered-teams strip on the Overview tab (Pencil "Tournament Detail" —
 * Registered Teams). Renders every accepted team as a filled tile followed by
 * `maxTeams - accepted` dashed "OPEN" placeholder tiles.
 */
export default function TeamSlotStrip({ teams, maxTeams }: Props) {
  const openCount = Math.max(0, maxTeams - teams.length);

  return (
    <View style={styles.row}>
      {teams.map((team) => (
        <View key={team.teamId} style={styles.tile}>
          {team.teamLogoUrl ? (
            <Image source={{ uri: team.teamLogoUrl }} style={styles.logo} />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoInitials}>{initials(team.teamName)}</Text>
            </View>
          )}
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {team.teamName}
          </Text>
        </View>
      ))}
      {Array.from({ length: openCount }).map((_, index) => (
        <View key={`open-${index}`} style={styles.tile}>
          <View style={styles.openLogo}>
            <Ionicons name="add" size={18} color={colors.outline} />
          </View>
          <Text style={styles.openName}>OPEN</Text>
        </View>
      ))}
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { width: 64, alignItems: 'center', gap: spacing.xs },
  logo: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.iconBackground },
  logoFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitials: { fontSize: 11, fontWeight: '800', color: colors.outline },
  name: { fontSize: 11, fontWeight: '600', color: colors.bodyText },
  openLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openName: { fontSize: 11, fontWeight: '600', color: colors.outline },
});
