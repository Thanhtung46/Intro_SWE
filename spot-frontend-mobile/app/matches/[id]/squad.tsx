import { useLocalSearchParams, useRouter } from 'expo-router';
import ManageSquadScreen from '@/screens/matches/ManageSquadScreen';

// Thin route (.claude/rules/code-style.md) — "/matches/:id/squad", opened
// from a host's Active card "Manage Squad" button (SPOT-76 Manage Matches
// redesign). Coexists with app/matches/[id].tsx (Match Detail) — different
// path, expo-router resolves them independently.
export default function ManageSquadRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);

  return <ManageSquadScreen matchId={matchId} onBack={() => router.back()} />;
}
