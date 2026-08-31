import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import MatchDetailScreen from '@/screens/matches/MatchDetailScreen';

// Thin route (.claude/rules/code-style.md) — parses :id, owns navigation.
// Join Match is now a self-contained sheet inside MatchDetailScreen (no
// destination to route to, like FilterSheet).
export default function MatchDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);
  const comingSoon = (feature: string) => Alert.alert('Coming soon', `${feature} is not available yet.`);

  return (
    <MatchDetailScreen
      matchId={matchId}
      onBack={() => router.back()}
      onOpenMap={() => comingSoon('Map view')}
      onOpenHostProfile={(hostUserId) => router.push(`/matches/host/${hostUserId}`)}
      onManageSquad={() => router.push(`/matches/${matchId}/squad`)}
    />
  );
}
