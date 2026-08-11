import { useRouter } from 'expo-router';

import OnboardingSlide1 from '../src/screens/onboarding/OnboardingSlide1';

/**
 * "/" — first screen the app shows (Onboarding slide 1/3).
 *
 * TODO (rest of SPOT-33):
 * - onSkip: persist `onboarding_completed=true` via AsyncStorage before
 *   navigating, so onboarding isn't shown again on relaunch.
 * - On mount, redirect straight to '/home' (or '/choose-role'/'/dashboard'
 *   once they exist) if `onboarding_completed` is already true in storage.
 */
export default function OnboardingScreen1() {
  const router = useRouter();

  const handleSkip = () => {
    router.replace('/home');
  };

  const handleNext = () => {
    router.push('/onboarding/2');
  };

  return <OnboardingSlide1 onSkip={handleSkip} onNext={handleNext} />;
}
