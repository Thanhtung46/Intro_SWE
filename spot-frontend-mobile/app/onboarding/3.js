import { useRouter } from 'expo-router';

import OnboardingSlide3 from '../../src/screens/onboarding/OnboardingSlide3';

/**
 * "/onboarding/3" — third screen of onboarding (slide 3/3).
 *
 * TODO (rest of SPOT-33):
 * - onSkip / onGetStarted: persist `onboarding_completed=true` via
 *   AsyncStorage before navigating, then route to '/choose-role' once that
 *   screen exists (currently routes to the '/home' placeholder).
 */
export default function OnboardingScreen3() {
  const router = useRouter();

  const handleSkip = () => {
    router.replace('/home');
  };

  const handleGetStarted = () => {
    router.replace('/home');
  };

  return <OnboardingSlide3 onSkip={handleSkip} onGetStarted={handleGetStarted} />;
}
