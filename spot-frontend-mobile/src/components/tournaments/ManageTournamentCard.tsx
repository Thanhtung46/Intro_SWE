import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
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
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const pendingCount = tournament.pendingRequestCount ?? 0;
  const isHosted = variant === 'hosted';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.thumb}>
          {tournament.coverUrl ? (
            <Image source={{ uri: tournament.coverUrl }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <Ionicons name="trophy" size={22} color={colors.primary} />
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
                <Text style={styles.pendingBadgeText}>{pendingCount} {t('tournaments.manage.pending')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.factRow}>
        <Fact colors={colors} styles={styles} icon="trophy-outline" text={tournament.formatBadge} />
        <Fact colors={colors} styles={styles} icon="people-outline" text={t('tournaments.browse.teamsCount').replace('{accepted}', String(tournament.acceptedTeamCount)).replace('{max}', String(tournament.maxTeams))} />
      </View>

      <TouchableOpacity
        testID={`${variant}-tournament-${tournament.tournamentId}`}
        style={styles.primaryButton}
        onPress={isHosted ? onManage : onViewDetails}
      >
        {isHosted && <Ionicons name="settings-outline" size={16} color={colors.white} />}
        <Text style={styles.primaryButtonText}>{isHosted ? t('groups.actions.manageShort') : t('groups.actions.view')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Fact({ icon, text, colors, styles }: { icon: keyof typeof Ionicons.glyphMap; text: string; colors: ThemeColors; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={styles.factText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: { flexDirection: 'row', gap: spacing.sm },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  textCol: { flex: 1, gap: spacing.xs },
  name: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  pendingBadge: {
    backgroundColor: colors.warningSurface,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: colors.warningText },

  factRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  factText: { fontSize: 12, color: colors.textSecondary },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    width: '100%',
  },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
