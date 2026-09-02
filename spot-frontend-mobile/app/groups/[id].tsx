import { useLocalSearchParams, useRouter } from 'expo-router';
import GroupDetailScreen from '@/screens/groups/GroupDetailScreen';
import { openVenueDirections } from '@/utils/directions';

// Thin route (.claude/rules/code-style.md) — parses :id, owns navigation.
// The venue mini-map / "Get Directions" open the shared VenueMapScreen
// (`/venue-map`) with the group's venue — GroupDetailScreen hands the venue
// object out through onOpenVenueMap since this route only sees the id.
export default function GroupDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Number(id);

  return (
    <GroupDetailScreen
      groupId={groupId}
      onBack={() => router.back()}
      onOpenVenueMap={(venue) => openVenueDirections(router, venue)}
      onManageRequests={() => router.push(`/groups/${groupId}/requests`)}
      onEditGroup={() => router.push(`/groups/${groupId}/edit`)}
      onOpenMemberProfile={(userId) => router.push(`/matches/host/${userId}`)}
    />
  );
}
