import { useLocalSearchParams, useRouter } from 'expo-router';
import CheckProfileScreen from '@/screens/matches/CheckProfileScreen';

// Thin route (.claude/rules/code-style.md) — parses :id (host userId), owns
// navigation.
export default function CheckProfileRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hostUserId = Number(id);

  return (
    <CheckProfileScreen
      hostUserId={hostUserId}
      onBack={() => router.back()}
      onOpenMatch={(matchId) => router.push(`/matches/${matchId}`)}
    />
  );
}
