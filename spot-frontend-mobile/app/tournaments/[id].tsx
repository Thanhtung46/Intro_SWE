import { useLocalSearchParams, useRouter } from 'expo-router';
import TournamentDetailScreen from '@/screens/tournaments/TournamentDetailScreen';

// Thin route (.claude/rules/code-style.md) — parses :id, owns navigation.
// Organizer-only callbacks (requests / add match / edit match) are passed
// unconditionally; TournamentDetailScreen only surfaces them when
// `tournament.isOrganizer`.
export default function TournamentDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Number(id);

  return (
    <TournamentDetailScreen
      tournamentId={tournamentId}
      onBack={() => router.back()}
      onJoin={(joinId) => router.push(`/tournaments/${joinId}/join`)}
      onManage={() => router.push('/tournaments/mine')}
      onManageRequests={() => router.push(`/tournaments/${tournamentId}/requests`)}
      onAddMatch={() => router.push(`/tournaments/${tournamentId}/match-form`)}
      onEditMatch={(matchId) =>
        router.push({ pathname: `/tournaments/${tournamentId}/match-form`, params: { matchId: String(matchId) } })
      }
      onEditTournament={() => router.push(`/tournaments/${tournamentId}/edit`)}
      onSetWinners={() => router.push(`/tournaments/${tournamentId}/winners`)}
      onSetPlayerRanks={() => router.push(`/tournaments/${tournamentId}/rankings`)}
    />
  );
}
