import { useLocalSearchParams, useRouter } from 'expo-router';

import PendingApprovalScreen from '@/screens/common/PendingApprovalScreen';
import { ROUTES } from '@/constants/routes';

/**
 * "/pending?role=owner|referee" — shared "thông báo chờ admin" screen,
 * reached after either registration form submits successfully.
 */
export default function PendingRoute() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const resolvedRole = role === 'referee' ? 'referee' : 'owner';

  const handleDone = () => {
    // Owner/Referee are PENDING here — no player session to land on Home,
    // so send them back to the login screen.
    router.replace(ROUTES.AUTH_LOGIN);
  };

  return <PendingApprovalScreen role={resolvedRole} onDone={handleDone} />;
}
