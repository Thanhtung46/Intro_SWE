import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import TournamentStatusPill from '@/components/tournaments/TournamentStatusPill';
import type { Tournament } from '@/types/tournament';

type Props = {
  tournament: Tournament;
  variant: 'hosted' | 'joined';
  onManage: () => void; // hosted — opens the organizer view / requests
  onViewDetails: () => void; // joined — opens TournamentDetailScreen
};

/**
 * Manage Tournaments list card (Pencil "Tournament - Manage (Hosted/Joined)"
 * frames). Mirrors ManageGroupCard: `hosted` gets a "Manage" button + a
 * "N pending" badge; `joined` gets "View". Both show the status pill + format
 * badge + team count so a mixed list of tournaments across every status stays
 * legible.
 */
export default function ManageTournamentCard({ tournament, variant, onManage, onViewDetails }: Props) {
  const pendingCount = tournament.pendingRequestCount ?? 0;
  const isHosted = variant === 'hosted';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.thumb}>
          {tournament.coverUrl ? (
            <Image source={{ uri: tournament.coverUrl }} style={styles.thumbImage} />
          ) : (
            <Ionicons name="trophy" size={22} color={colors.primaryDark} />
          )}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {tournament.title}
          </Text>
          <View style={styles.metaRow}>
            <TournamentStatusPill status={tournament.status} />
            {isHosted && pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.factRow}>
        <Fact icon="trophy-outline" text={tournament.formatBadge} />
        <Fact icon="people-outline" text={`${tournament.acceptedTeamCount} / ${tournament.maxTeams} teams`} />
      </View>

      <TouchableOpacity
        testID={`${variant}-tournament-${tournament.tournamentId}`}
        style={styles.primaryButton}
        onPress={isHosted ? onManage : onViewDetails}
      >
        {isHosted && <Ionicons name="settings-outline" size={16} color={colors.white} />}
        <Text style={styles.primaryButtonText}>{isHosted ? 'Manage' : 'View'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={13} color={colors.outline} />
      <Text style={styles.factText} numberOfLines={1}>
        {text}
      </Text>
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
    gap: spacing.sm,
  },
  topRow: { flexDirection: 'row', gap: spacing.sm },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  textCol: { flex: 1, gap: spacing.xs },
  name: { fontSize: 16, fontWeight: '800', color: colors.headingText },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  pendingBadge: {
    backgroundColor: colors.orangeSoft,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: colors.orange },

  factRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  factText: { fontSize: 12, color: colors.bodyText },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.md,
    width: '100%',
  },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
