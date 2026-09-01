import { useRouter } from 'expo-router';

import { RefereeShell } from '@/components/referee/RefereeShell';
import { venueDetailRoute } from '@/constants/routes';
import RefereeBoardScreen from '@/screens/referee/RefereeBoardScreen';

export default function RefereeBoardRoute() {
  const router = useRouter();
  return (
    <RefereeShell activeTab="board">
      <RefereeBoardScreen onOpenVenue={(id) => router.push(venueDetailRoute(String(id)))} />
    </RefereeShell>
  );
}
