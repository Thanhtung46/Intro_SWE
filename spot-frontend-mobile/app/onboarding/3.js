import OnboardingSlide3 from '../../src/screens/onboarding/OnboardingSlide3';

/**
 * "/onboarding/3" — third screen of onboarding (slide 3/3).
 *
 * TODO (rest of SPOT-33):
 * - onSkip / onGetStarted: persist `onboarding_completed=true` via
 *   AsyncStorage, then router.replace('/choose-role') once that screen
 *   exists.
 */
export default function OnboardingScreen3() {
  const handleSkip = () => {
    console.log('[onboarding] Skip pressed');
  };

  const handleGetStarted = () => {
    console.log('[onboarding] Get started pressed');
  };

  return <OnboardingSlide3 onSkip={handleSkip} onGetStarted={handleGetStarted} />;
}
