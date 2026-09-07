import { useRouter } from 'expo-router';
import JoinMatchMapScreen from '@/screens/matches/JoinMatchMapScreen';

// Thin route (.claude/rules/code-style.md).
export default function JoinMatchMapRoute() {
  const router = useRouter();

  return (
    <JoinMatchMapScreen
      mode="matches"
      onBack={() => router.back()}
      onOpenItem={(matchId) => router.push(`/matches/${matchId}`)}
    />
  );
}
