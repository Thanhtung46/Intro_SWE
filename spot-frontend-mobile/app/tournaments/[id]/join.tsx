import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import JoinTournamentScreen from '@/screens/tournaments/JoinTournamentScreen';
import { getErrorMessage } from '@/services/apiErrors';
import { getTournamentDetail } from '@/services/tournamentService';
import type { TournamentDetail } from '@/types/tournament';
import { safeBack } from '@/utils/safeBack';

// Thin route (.claude/rules/code-style.md) — pre-fetches the tournament so
// JoinTournamentScreen knows the sport + format that drive the roster rules
// (same prefetch pattern as app/groups/[id]/edit.tsx).
export default function JoinTournamentRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(id);

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setStatus('loading');
    try {
      setTournament(await getTournamentDetail(tournamentId));
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
      <JoinTournamentScreen
        tournament={tournament}
        onBack={() => safeBack(router, '/matches')}
        onJoined={() => router.replace(`/tournaments/${tournamentId}`)}
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
