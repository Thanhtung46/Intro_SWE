import { useRouter } from 'expo-router';
import JoinMatchMapScreen from '@/screens/matches/JoinMatchMapScreen';
import { safeBack } from '@/utils/safeBack';

export default function TournamentsMapRoute() {
  const router = useRouter();

  return (
    <JoinMatchMapScreen
      mode="tournaments"
      onBack={() => safeBack(router, '/matches')}
      onOpenItem={(tournamentId) => router.push(`/tournaments/${tournamentId}`)}
    />
  );
}
