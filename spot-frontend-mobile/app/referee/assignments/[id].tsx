import { useLocalSearchParams, useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import AssignmentDetailScreen from '@/screens/referee/AssignmentDetailScreen';

export default function AssignmentDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const assignmentId = Number(id);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(ROUTES.REFEREE_INVITATIONS);
  };

  return (
    <AssignmentDetailScreen
      assignmentId={assignmentId}
      onBack={goBack}
      onDone={() => router.replace(ROUTES.REFEREE_INVITATIONS)}
    />
  );
}
