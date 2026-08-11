import { useRouter } from 'expo-router';

import OnboardingSlide3 from '../../src/screens/onboarding/OnboardingSlide3';
import { setOnboardingCompleted } from '../../src/utils/onboardingStorage';

/**
 * "/onboarding/3" — third screen of onboarding (slide 3/3).
 *
 * TODO (rest of SPOT-33): route to '/choose-role' once that screen exists,
 * instead of the '/home' placeholder.
 */
export default function OnboardingScreen3() {
  const router = useRouter();

  const handleSkip = async () => {
    await setOnboardingCompleted();
    router.replace('/home');
  };

  const handleGetStarted = async () => {
    await setOnboardingCompleted();
    router.replace('/home');
  };

  return <OnboardingSlide3 onSkip={handleSkip} onGetStarted={handleGetStarted} />;
}
