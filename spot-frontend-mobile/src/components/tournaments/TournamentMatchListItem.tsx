import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { TournamentMatch } from '@/types/tournament';

type Props = {
  match: TournamentMatch;
  // Organizer affordances — omitted for the read-only player view (Step 3).
  onEdit?: () => void;
  onEnterResult?: () => void;
};

function scoreText(match: TournamentMatch): string {
  const { result } = match;
  if (!result) return '—';
  if (result.type === 'FOOTBALL') return `${result.teamAGoals} – ${result.teamBGoals}`;
  const teamASets = result.sets.filter((s) => s.teamAPoints > s.teamBPoints).length;
  const teamBSets = result.sets.length - teamASets;
  return `${teamASets} – ${teamBSets}`;
}

function whenText(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TournamentMatchListItem({ match, onEdit, onEnterResult }: Props) {
  const done = match.resultStatus === 'COMPLETED';

  return (
    <View style={styles.card}>
      <Text style={[styles.when, done && styles.whenDone]}>
        {whenText(match.scheduledAt)}
        {done ? ' · Full time' : ' · Scheduled'}
      </Text>
      <View style={styles.teams}>
        <Text style={styles.team} numberOfLines={1} ellipsizeMode="tail">
          {match.teamA.teamName}
        </Text>
        <Text style={[styles.score, !done && styles.scorePending]}>{scoreText(match)}</Text>
        <Text style={[styles.team, styles.teamRight]} numberOfLines={1} ellipsizeMode="tail">
          {match.teamB.teamName}
        </Text>
      </View>

      {(onEdit || onEnterResult) && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity style={styles.actionOutline} onPress={onEdit}>
              <Ionicons name="pencil" size={13} color={colors.bodyText} />
              <Text style={styles.actionOutlineText}>Edit</Text>
            </TouchableOpacity>
          )}
          {onEnterResult && (
            <TouchableOpacity style={styles.actionFilled} onPress={onEnterResult}>
              <Ionicons name="clipboard-outline" size={13} color={colors.white} />
              <Text style={styles.actionFilledText}>{done ? 'Edit Result' : 'Enter Result'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
  },
  when: { fontSize: 11, fontWeight: '700', color: colors.outline },
  whenDone: { color: colors.skillTierGreenText },
  teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  team: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.headingText },
  teamRight: { textAlign: 'right' },
  score: { fontSize: 16, fontWeight: '800', color: colors.headingText },
  scorePending: { color: colors.outline },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 9,
    paddingVertical: spacing.xs,
  },
  actionOutlineText: { fontSize: 12, fontWeight: '600', color: colors.bodyText },
  actionFilled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 9,
    paddingVertical: spacing.xs,
  },
  actionFilledText: { fontSize: 12, fontWeight: '700', color: colors.white },
});
