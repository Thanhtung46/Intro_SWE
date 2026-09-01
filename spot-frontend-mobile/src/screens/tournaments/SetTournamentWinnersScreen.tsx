import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import SubmitButton from '@/components/common/SubmitButton';
import { SelectField } from '@/components/SelectField';
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

const PLACES = [
  { place: 1, label: '1st place', color: colors.amber },
  { place: 2, label: '2nd place', color: colors.outline },
  { place: 3, label: '3rd place', color: colors.orange },
];

export default function SetTournamentWinnersScreen({ tournament, teams, onBack, onSaved }: Props) {
  const [selection, setSelection] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    (tournament.winners ?? []).forEach((w) => {
      initial[w.place] = String(w.teamId);
    });
    return initial;
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const teamOptions = teams.map((t) => ({ label: t.teamName, value: String(t.teamId) }));

  const handleSave = async () => {
    setError('');
    const winners = PLACES.filter((p) => selection[p.place]).map((p) => ({
      place: p.place,
      teamId: Number(selection[p.place]),
    }));
    const teamIds = winners.map((w) => w.teamId);
    if (new Set(teamIds).size !== teamIds.length) {
      setError('Each place must be a different team.');
      return;
    }

    setIsSaving(true);
    try {
      await updateTournament(tournament.tournamentId, { winners });
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
        <TouchableOpacity testID="set-winners-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Set Winners</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {tournament.title}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? <ErrorBanner message={error} onRetry={handleSave} /> : null}
        <Text style={styles.info}>Shown on the Overview tab once saved. Places are optional.</Text>

        {PLACES.map((p) => (
          <View key={p.place} style={styles.row}>
            <View style={[styles.medal, { backgroundColor: p.color }]}>
              <Text style={styles.medalText}>{p.place}</Text>
            </View>
            <View style={styles.selectWrap}>
              <SelectField
                label={p.label}
                placeholder="Select team"
                value={selection[p.place] ?? ''}
                onChange={(v) => setSelection((prev) => ({ ...prev, [p.place]: v }))}
                options={teamOptions}
              />
            </View>
          </View>
        ))}

        <SubmitButton label="Save Winners" loading={isSaving} onPress={handleSave} />
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

  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  medal: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  medalText: { fontSize: 13, fontWeight: '800', color: colors.white },
  selectWrap: { flex: 1, gap: spacing.xxs },
});
