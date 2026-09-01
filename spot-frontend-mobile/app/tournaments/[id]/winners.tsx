import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import SetTournamentWinnersScreen from '@/screens/tournaments/SetTournamentWinnersScreen';
import { getErrorMessage } from '@/services/apiErrors';
import { getTournamentDetail, getTournamentPlayers } from '@/services/tournamentService';
import type { TournamentDetail, TournamentTeam } from '@/types/tournament';

// Thin route (.claude/rules/code-style.md) — pre-fetches tournament + accepted
// teams for the winners picker.
export default function SetWinnersRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(id);

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setStatus('loading');
    try {
      const [detail, players] = await Promise.all([
        getTournamentDetail(tournamentId),
        getTournamentPlayers(tournamentId),
      ]);
      setTournament(detail);
      setTeams(players.teams);
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('error');
    }
  }, [tournamentId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (status === 'ready' && tournament) {
    return (
      <SetTournamentWinnersScreen
        tournament={tournament}
        teams={teams}
        onBack={() => router.back()}
        onSaved={() => router.replace(`/tournaments/${tournamentId}`)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {status === 'error' ? (
        <ErrorBanner message={error} onRetry={fetch} />
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screenBackground },
});
