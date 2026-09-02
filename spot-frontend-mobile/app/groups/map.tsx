import { useRouter } from 'expo-router';
import JoinMatchMapScreen from '@/screens/matches/JoinMatchMapScreen';

export default function GroupsMapRoute() {
  const router = useRouter();

  return (
    <JoinMatchMapScreen
      mode="groups"
      onBack={() => router.back()}
      onOpenItem={(groupId) => router.push(`/groups/${groupId}`)}
    />
  );
}
