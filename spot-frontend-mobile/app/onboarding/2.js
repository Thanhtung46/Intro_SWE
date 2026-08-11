import { useRouter } from 'expo-router';

import OnboardingSlide2 from '../../src/screens/onboarding/OnboardingSlide2';

/**
 * "/onboarding/2" — second screen of onboarding (slide 2/3).
 *
 * TODO (rest of SPOT-33):
 * - onSkip: persist `onboarding_completed=true` via AsyncStorage, then
 *   router.replace('/choose-role').
 */
export default function OnboardingScreen2() {
  const router = useRouter();

  const handleSkip = () => {
    console.log('[onboarding] Skip pressed');
  };

  const handleNext = () => {
    router.push('/onboarding/3');
  };

  return <OnboardingSlide2 onSkip={handleSkip} onNext={handleNext} />;
}
