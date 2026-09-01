import { useLocalSearchParams, useRouter } from 'expo-router';
import MatchDetailScreen from '@/screens/matches/MatchDetailScreen';
import { openVenueDirections } from '@/utils/directions';

// Thin route (.claude/rules/code-style.md) — parses :id, owns navigation.
// Join Match is now a self-contained sheet inside MatchDetailScreen (no
// destination to route to, like FilterSheet).
export default function MatchDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);

  return (
    <MatchDetailScreen
      matchId={matchId}
      onBack={() => router.back()}
      onOpenVenueMap={(venue) => openVenueDirections(router, venue)}
      onOpenHostProfile={(hostUserId) => router.push(`/matches/host/${hostUserId}`)}
      onManageSquad={() => router.push(`/matches/${matchId}/squad`)}
    />
  );
}
