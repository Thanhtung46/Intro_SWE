import { useRouter } from 'expo-router';
import ManageGroupsScreen from '@/screens/groups/ManageGroupsScreen';

// Thin route (.claude/rules/code-style.md) — reached from the Groups
// sub-tab's FAB "Manage Groups" (MatchesHomepageScreen).
export default function ManageGroupsRoute() {
  const router = useRouter();

  return (
    <ManageGroupsScreen
      onBack={() => router.back()}
      onOpenGroup={(groupId) => router.push(`/groups/${groupId}`)}
      onOpenGroupRequests={(groupId) => router.push(`/groups/${groupId}/requests`)}
    />
  );
}
