import { useLocalSearchParams, useRouter } from 'expo-router';

import PendingApprovalScreen from '@/screens/common/PendingApprovalScreen';

/**
 * "/pending?role=owner|referee" — shared "thông báo chờ admin" screen,
 * reached after either registration form submits successfully.
 */
export default function PendingRoute() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const resolvedRole = role === 'referee' ? 'referee' : 'owner';

  const handleDone = () => {
    router.replace('/home');
  };

  return <PendingApprovalScreen role={resolvedRole} onDone={handleDone} />;
}
