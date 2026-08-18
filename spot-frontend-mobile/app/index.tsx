import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import SplashScreen, { SplashStatus } from '@/screens/splash/SplashScreen';
import { getProfile } from '@/services/profileService';
import { getOnboardingCompleted } from '@/utils/onboardingStorage';
import { clearAllTokens, getToken } from '@/utils/authStorage';
import { ROUTES } from '@/constants/routes';

type Destination = typeof ROUTES.ONBOARDING | typeof ROUTES.AUTH_LOGIN | typeof ROUTES.HOME;

const AUTO_NAVIGATE_ENABLED = true;

/**
 * "/" — app entry point: brand Splash screen.
 *
 * Bootstraps the session (onboarding flag + secure token) while the Splash
 * screen plays its progress animation, then navigates once both are done:
 *  - no token, onboarding not done -> /onboarding
 *  - no token, onboarding done     -> /auth/login
 *  - token present                 -> /home (Dashboard)
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
          const check = await getProfile();
          if (cancelled) return;

          if (check.success) {
            setDestination(ROUTES.HOME);
          } else if (check.statusCode === 401) {
            await clearAllTokens();
            if (cancelled) return;
            setDestination(ROUTES.AUTH_LOGIN);
          } else {
            setStatus('error');
          }
        } else if (!onboardingCompleted) {
          setDestination(ROUTES.ONBOARDING);
        } else {
          setDestination(ROUTES.AUTH_LOGIN);
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
