import { useRouter } from 'expo-router';

import OnboardingSlide2 from '../../src/screens/onboarding/OnboardingSlide2';

/**
 * "/onboarding/2" — second screen of onboarding (slide 2/3).
 *
 * TODO (rest of SPOT-33):
 * - onSkip: persist `onboarding_completed=true` via AsyncStorage before
 *   navigating, so onboarding isn't shown again on relaunch.
 */
export default function OnboardingScreen2() {
  const router = useRouter();

  const handleSkip = () => {
    router.replace('/home');
  };

  const handleNext = () => {
    router.push('/onboarding/3');
  };

  return <OnboardingSlide2 onSkip={handleSkip} onNext={handleNext} />;
}
