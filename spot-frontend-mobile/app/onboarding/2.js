import { useRouter } from 'expo-router';

import OnboardingSlide2 from '../../src/screens/onboarding/OnboardingSlide2';
import { setOnboardingCompleted } from '../../src/utils/onboardingStorage';

/**
 * "/onboarding/2" — second screen of onboarding (slide 2/3).
 */
export default function OnboardingScreen2() {
  const router = useRouter();

  const handleSkip = async () => {
    await setOnboardingCompleted();
    router.replace('/home');
  };

  const handleNext = () => {
    router.push('/onboarding/3');
  };

  return <OnboardingSlide2 onSkip={handleSkip} onNext={handleNext} />;
}
