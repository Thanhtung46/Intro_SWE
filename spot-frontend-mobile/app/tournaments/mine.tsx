import { useRouter } from 'expo-router';
import ManageTournamentsScreen from '@/screens/tournaments/ManageTournamentsScreen';
import { safeBack } from '@/utils/safeBack';

// Thin route (.claude/rules/code-style.md) — reached from the Tournaments
// sub-tab's FAB "Manage Tournaments" (MatchesHomepageScreen). Both the card's
// Manage and View Details actions open the tournament detail, whose action bar
// routes on into the organizer toolset.
export default function ManageTournamentsRoute() {
  const router = useRouter();

  return (
    <ManageTournamentsScreen
      onBack={() => safeBack(router, '/matches')}
      onOpenTournament={(tournamentId) => router.push(`/tournaments/${tournamentId}`)}
    />
  );
}
