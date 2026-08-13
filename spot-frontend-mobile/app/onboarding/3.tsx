import { useRouter } from 'expo-router';

import OnboardingSlide3 from '@/screens/onboarding/OnboardingSlide3';
import { setOnboardingCompleted } from '@/utils/onboardingStorage';

/**
 * "/onboarding/3" — third screen of onboarding (slide 3/3).
 */
export default function OnboardingScreen3() {
  const router = useRouter();

  const handleSkip = async () => {
    await setOnboardingCompleted();
    router.replace('/auth/choose-role');
  };

  const handleGetStarted = async () => {
    await setOnboardingCompleted();
    router.replace('/auth/choose-role');
  };

  return <OnboardingSlide3 onSkip={handleSkip} onGetStarted={handleGetStarted} />;
}
