import { useRouter } from 'expo-router';

import { RefereeShell } from '@/components/referee/RefereeShell';
import { refereeAssignmentRoute } from '@/constants/routes';
import RefereeScheduleScreen from '@/screens/referee/RefereeScheduleScreen';

export default function RefereeScheduleRoute() {
  const router = useRouter();
  return (
    <RefereeShell activeTab="schedule">
      <RefereeScheduleScreen onOpenAssignment={(id) => router.push(refereeAssignmentRoute(id))} />
    </RefereeShell>
  );
}
