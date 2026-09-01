import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import SubmitButton from '@/components/common/SubmitButton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage } from '@/services/apiErrors';
import { updateTournament } from '@/services/tournamentService';
import type { TournamentDetail, TournamentTeam } from '@/types/tournament';

type Props = {
  tournament: TournamentDetail;
  teams: TournamentTeam[];
  onBack: () => void;
  onSaved: () => void;
};

export default function SetPlayerRanksScreen({ tournament, teams, onBack, onSaved }: Props) {
  const [ranks, setRanks] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    teams.forEach((team) => {
      team.roster.forEach((p) => {
        initial[p.rosterPlayerId] = p.rank != null ? String(p.rank) : '';
      });
    });
    return initial;
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setError('');
    const playerRanks = Object.entries(ranks).map(([id, value]) => ({
      rosterPlayerId: Number(id),
      rank: value === '' ? null : Number(value),
    }));

    setIsSaving(true);
    try {
      await updateTournament(tournament.tournamentId, { playerRanks });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="set-ranks-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Player Rankings</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {tournament.title}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <ErrorBanner message={error} onRetry={handleSave} /> : null}
        <Text style={styles.info}>Set each player's in-team rank. Leave blank to keep them unranked.</Text>

        {teams.map((team) => (
          <View key={team.teamId} style={styles.teamBlock}>
            <Text style={styles.teamName}>{team.teamName}</Text>
            {team.roster.map((player) => (
              <View key={player.rosterPlayerId} style={styles.playerRow}>
                <Ionicons name="reorder-three-outline" size={18} color={colors.outline} />
                <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                  {player.name}
                  {player.jerseyNumber != null ? `  #${player.jerseyNumber}` : ''}
                </Text>
                <TextInput
                  testID={`rank-${player.rosterPlayerId}`}
                  style={styles.rankInput}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="—"
                  placeholderTextColor={colors.outline}
                  value={ranks[player.rosterPlayerId] ?? ''}
                  onChangeText={(t) =>
                    setRanks((prev) => ({ ...prev, [player.rosterPlayerId]: t.replace(/[^0-9]/g, '') }))
                  }
                />
              </View>
            ))}
          </View>
        ))}

        <SubmitButton label="Save Rankings" loading={isSaving} onPress={handleSave} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.headingText },
  subtitle: { fontSize: 12, color: colors.outline },

  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  info: { fontSize: 12, color: colors.outline },

  teamBlock: { gap: spacing.xs },
  teamName: { fontSize: 15, fontWeight: '700', color: colors.headingText },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.sm,
  },
  playerName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.headingText },
  rankInput: {
    width: 52,
    borderWidth: 1,
    borderColor: colors.dotInactive,
    borderRadius: 9,
    paddingVertical: spacing.xs,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: colors.headingText,
    backgroundColor: colors.white,
  },
});
