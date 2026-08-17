import { useRouter } from 'expo-router';
import ManageMatchesScreen from '@/screens/matches/ManageMatchesScreen';

// Thin route (.claude/rules/code-style.md).
export default function ManageMatchesRoute() {
  const router = useRouter();

  return (
    <ManageMatchesScreen onBack={() => router.back()} onOpenMatch={(matchId) => router.push(`/matches/${matchId}`)} />
  );
}
