import { useLocalSearchParams, useRouter } from 'expo-router';
import CreateTournamentScreen from '@/screens/tournaments/CreateTournamentScreen';
import type { Sport } from '@/types/match';
import { safeBack } from '@/utils/safeBack';

// Thin route (.claude/rules/code-style.md) — sport comes from the Homepage tab
// (MatchesHomepageScreen's FAB "Create a Tournament"), same as
// app/groups/create.tsx.
export default function CreateTournamentRoute() {
  const router = useRouter();
  const { sport } = useLocalSearchParams<{ sport: Sport }>();

  return (
    <CreateTournamentScreen
      sport={sport ?? 'FOOTBALL'}
      mode="create"
      onBack={() => safeBack(router, '/matches')}
      onSaved={(tournamentId) => router.replace(`/tournaments/${tournamentId}`)}
      onHostMatch={() => router.replace({ pathname: '/matches/host-form', params: { sport: sport ?? 'FOOTBALL' } })}
    />
  );
}
