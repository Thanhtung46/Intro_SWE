import { useRouter } from 'expo-router';

import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
import { setOnboardingCompleted } from '@/utils/onboardingStorage';
import { ROUTES } from '@/constants/routes';

/**
 * "/onboarding" — single-screen onboarding (3 internal steps, see
 * OnboardingScreen). Replaces the old app/onboarding/{1,2,3}.tsx routes.
 */
export default function OnboardingRoute() {
  const router = useRouter();

  const handleSkip = async () => {
    await setOnboardingCompleted();
    router.replace(ROUTES.AUTH_LOGIN);
  };

  const handleGetStarted = async () => {
    await setOnboardingCompleted();
    router.replace(ROUTES.AUTH_LOGIN);
  };

  return <OnboardingScreen onSkip={handleSkip} onGetStarted={handleGetStarted} />;
}
