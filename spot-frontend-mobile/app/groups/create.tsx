import { useLocalSearchParams, useRouter } from 'expo-router';
import CreateGroupScreen from '@/screens/groups/CreateGroupScreen';
import type { Sport } from '@/types/match';

// Thin route (.claude/rules/code-style.md) — sport comes from the Homepage
// tab (MatchesHomepageScreen's FAB "Create a Group"), same as
// app/matches/host-form.tsx's pattern for Matches.
export default function CreateGroupRoute() {
  const router = useRouter();
  const { sport } = useLocalSearchParams<{ sport: Sport }>();

  return (
    <CreateGroupScreen
      sport={sport ?? 'FOOTBALL'}
      mode="create"
      onBack={() => router.back()}
      onSaved={(groupId) => router.replace(`/groups/${groupId}`)}
    />
  );
}
