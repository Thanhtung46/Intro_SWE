import { useRouter } from 'expo-router';

import OnboardingSlide1 from '@/screens/onboarding/OnboardingSlide1';
import { setOnboardingCompleted } from '@/utils/onboardingStorage';

/**
 * "/onboarding/1" — first screen of onboarding (slide 1/3).
 */
export default function OnboardingScreen1() {
  const router = useRouter();

  const handleSkip = async () => {
    await setOnboardingCompleted();
    router.replace('/auth/choose-role');
  };

  const handleNext = () => {
    router.push('/onboarding/2');
  };

  return <OnboardingSlide1 onSkip={handleSkip} onNext={handleNext} />;
}
