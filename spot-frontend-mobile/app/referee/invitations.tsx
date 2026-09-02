import { useRouter } from 'expo-router';

import { RefereeShell } from '@/components/referee/RefereeShell';
import { refereeAssignmentRoute, ROUTES } from '@/constants/routes';
import RefereeInvitationsScreen from '@/screens/referee/RefereeInvitationsScreen';

export default function RefereeInvitationsRoute() {
  const router = useRouter();
  return (
    <RefereeShell activeTab="invitations">
      <RefereeInvitationsScreen
        onOpenAssignment={(id) => router.push(refereeAssignmentRoute(id))}
        onGoToBoard={() => router.push(ROUTES.REFEREE_BOARD)}
      />
    </RefereeShell>
  );
}
