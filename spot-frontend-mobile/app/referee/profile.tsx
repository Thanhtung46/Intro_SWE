import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import RefereeProfileScreen from '@/screens/referee/RefereeProfileScreen';

export default function RefereeProfileRoute() {
  const router = useRouter();
  return (
    <RefereeProfileScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace(ROUTES.REFEREE_SETTINGS))}
      onEdit={() => router.push(ROUTES.PROFILE_EDIT)}
    />
  );
}
