import { useLocalSearchParams, useRouter } from 'expo-router';
import ManageTournamentRequestsScreen from '@/screens/tournaments/ManageTournamentRequestsScreen';

// Thin route (.claude/rules/code-style.md) — reached from the organizer's
// "Manage Requests" action on TournamentDetailScreen.
export default function ManageTournamentRequestsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Accepting/rejecting here changes the tournament's team count + roster, so
  // return via `replace` to force TournamentDetailScreen to re-mount fresh
  // rather than land back on a cached copy.
  return (
    <ManageTournamentRequestsScreen
      tournamentId={Number(id)}
      onBack={() => router.replace(`/tournaments/${id}`)}
    />
  );
}
