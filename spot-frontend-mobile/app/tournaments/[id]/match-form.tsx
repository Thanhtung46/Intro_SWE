import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import EditTournamentMatchScreen from '@/screens/tournaments/EditTournamentMatchScreen';
import { getErrorMessage } from '@/services/apiErrors';
import { getTournamentDetail, getTournamentPlayers, listTournamentMatches } from '@/services/tournamentService';
import type { TournamentDetail, TournamentMatch, TournamentTeam } from '@/types/tournament';
import { safeBack } from '@/utils/safeBack';

// Thin route (.claude/rules/code-style.md) — pre-fetches the tournament + its
// accepted teams (and, when ?matchId is present, the match being edited) so
// EditTournamentMatchScreen has everything it needs up front.
export default function TournamentMatchFormRoute() {
  const router = useRouter();
  const { id, matchId } = useLocalSearchParams<{ id: string; matchId?: string }>();
  const tournamentId = Number(id);
  const detailHref = `/tournaments/${tournamentId}`;

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [match, setMatch] = useState<TournamentMatch | undefined>(undefined);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setStatus('loading');
    try {
      const [detail, players, matches] = await Promise.all([
        getTournamentDetail(tournamentId),
        getTournamentPlayers(tournamentId),
        matchId ? listTournamentMatches(tournamentId) : Promise.resolve<TournamentMatch[]>([]),
      ]);
      setTournament(detail);
      setTeams(players.teams);
      if (matchId) setMatch(matches.find((m) => m.matchId === Number(matchId)));
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('error');
    }
  }, [tournamentId, matchId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (status === 'ready' && tournament) {
    return (
      <EditTournamentMatchScreen
        tournament={tournament}
        teams={teams}
        initialMatch={match}
        onBack={() => safeBack(router, detailHref)}
        onSaved={() => router.replace(detailHref)}
        onDeleted={() => router.replace(detailHref)}
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
