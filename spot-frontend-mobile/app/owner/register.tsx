import { useRouter } from 'expo-router';

import OwnerRegisterScreen from '@/screens/owner/OwnerRegisterScreen';

/**
 * "/owner/register" — venue registration form, submitted via the mock
 * `registerOwner` service. On success, routes to the shared pending screen.
 */
export default function OwnerRegisterRoute() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) router.back();
  };

  const handleRegistered = () => {
    router.replace({ pathname: '/pending', params: { role: 'owner' } });
  };

  return <OwnerRegisterScreen onBack={handleBack} onRegistered={handleRegistered} />;
}
