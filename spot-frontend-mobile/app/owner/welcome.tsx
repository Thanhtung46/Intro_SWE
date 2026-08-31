import { useRouter } from 'expo-router';

import OwnerWelcomeScreen from '@/screens/owner/OwnerWelcomeScreen';
import { ROUTES } from '@/constants/routes';

/**
 * "/owner/welcome" — shown right after choosing the Venue Owner role.
 */
export default function OwnerWelcomeRoute() {
  const router = useRouter();

  const handleContinue = () => {
    router.push(ROUTES.OWNER_REGISTER);
  };

  return <OwnerWelcomeScreen onContinue={handleContinue} />;
}
