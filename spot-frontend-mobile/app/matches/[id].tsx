import { useLocalSearchParams, useRouter } from 'expo-router';
import MatchDetailScreen from '@/screens/matches/MatchDetailScreen';
import { openVenueDirections } from '@/utils/directions';

// Thin route (.claude/rules/code-style.md) — parses :id, owns navigation.
// Join Match is a sheet inside MatchDetailScreen. `?join=1` opens it right
// away (Homepage card "Join Match" CTA).
export default function MatchDetailRoute() {
  const router = useRouter();
  const { id, join } = useLocalSearchParams<{ id: string; join?: string | string[] }>();
  const matchId = Number(id);
  const joinFlag = Array.isArray(join) ? join[0] : join;
  const autoOpenJoin = joinFlag === '1' || joinFlag === 'true';

  return (
    <MatchDetailScreen
      matchId={matchId}
      autoOpenJoin={autoOpenJoin}
      onBack={() => router.back()}
      onOpenVenueMap={(venue) => openVenueDirections(router, venue)}
      onOpenHostProfile={(hostUserId) => router.push(`/matches/host/${hostUserId}`)}
      onManageSquad={() => router.push(`/matches/${matchId}/squad`)}
      onEditMatch={() => router.push(`/matches/${matchId}/edit`)}
    />
  );
}
