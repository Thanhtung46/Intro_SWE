import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import GroupDetailScreen from '@/screens/groups/GroupDetailScreen';

// Thin route (.claude/rules/code-style.md) — parses :id, owns navigation.
// onOpenMap mirrors app/matches/[id].tsx's own placeholder (real venue map
// needs the group object GroupDetailScreen itself fetches — this route file
// only ever sees the id).
export default function GroupDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);
  const comingSoon = (feature: string) => Alert.alert('Coming soon', `${feature} is not available yet.`);

  return (
    <GroupDetailScreen
      groupId={groupId}
      onBack={() => router.back()}
      onOpenMap={() => comingSoon('Map view')}
      onManageRequests={() => router.push(`/groups/${groupId}/requests`)}
      onEditGroup={() => router.push(`/groups/${groupId}/edit`)}
    />
  );
}
