import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import SplashScreen, { SplashStatus } from '@/screens/splash/SplashScreen';
import { getOnboardingCompleted } from '@/utils/onboardingStorage';
import { getToken } from '@/utils/authStorage';

type Destination = '/onboarding' | '/auth/choose-role' | '/home';

const AUTO_NAVIGATE_ENABLED = true;

/**
 * "/" — app entry point: brand Splash screen.
 *
 * Bootstraps the session (onboarding flag + secure token) while the Splash
 * screen plays its progress animation, then navigates once both are done:
 *  - no token, onboarding not done -> /onboarding
 *  - no token, onboarding done     -> /auth/choose-role
 *  - token present                 -> /home (Dashboard placeholder — no
 *    real dashboard/tabs entry exists yet)
 *
 * On bootstrap failure (e.g. expo-secure-store unavailable on `npm run web`)
 * shows the retry state instead of navigating.
 */
export default function Splash() {
  const router = useRouter();
  const [status, setStatus] = useState<SplashStatus>('loading');
  const [destination, setDestination] = useState<Destination | null>(null);
  const [animationDone, setAnimationDone] = useState(false);

  const bootstrap = useCallback(() => {
    setStatus('loading');
    setDestination(null);
    setAnimationDone(false);

    let cancelled = false;
    (async () => {
      try {
        const [onboardingCompleted, token] = await Promise.all([
          getOnboardingCompleted(),
          getToken(),
        ]);
        if (cancelled) return;

        if (token) {
          setDestination('/home');
        } else if (!onboardingCompleted) {
          setDestination('/onboarding');
        } else {
          setDestination('/auth/choose-role');
        }
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => bootstrap(), [bootstrap]);

  useEffect(() => {
    if (AUTO_NAVIGATE_ENABLED && status === 'loading' && destination && animationDone) {
      router.replace(destination);
    }
  }, [status, destination, animationDone, router]);

  const handleAnimationComplete = useCallback(() => setAnimationDone(true), []);

  return (
    <SplashScreen status={status} onAnimationComplete={handleAnimationComplete} onRetry={bootstrap} />
  );
}
