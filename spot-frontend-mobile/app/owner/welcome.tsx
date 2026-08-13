import { useRouter } from 'expo-router';

import OwnerWelcomeScreen from '@/screens/owner/OwnerWelcomeScreen';

/**
 * "/owner/welcome" — shown right after choosing the Venue Owner role.
 */
export default function OwnerWelcomeRoute() {
  const router = useRouter();

  const handleContinue = () => {
    router.push('/owner/register');
  };

  return <OwnerWelcomeScreen onContinue={handleContinue} />;
}
