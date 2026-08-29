import { useLocalSearchParams, useRouter } from 'expo-router';
import ManageGroupRequestsScreen from '@/screens/groups/ManageGroupRequestsScreen';

// Thin route (.claude/rules/code-style.md) — parses :id, owns navigation.
// Reached only from ManageGroupsScreen's "Manage" button (Groups
// implementation plan resolved decision #5) — never from GroupDetailScreen
// as the *only* path, though GroupDetailScreen's admin "Manage Requests"
// entry point routes here too.
export default function ManageGroupRequestsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  return (
    <ManageGroupRequestsScreen
      groupId={groupId}
      onBack={() => router.back()}
      onEditGroup={() => router.push(`/groups/${groupId}/edit`)}
    />
  );
}
