import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import OnboardingSlide1 from '../src/screens/onboarding/OnboardingSlide1';
import { getOnboardingCompleted, setOnboardingCompleted } from '../src/utils/onboardingStorage';
import { colors } from '../src/constants/colors';

/**
 * "/" — first screen the app shows (Onboarding slide 1/3).
 *
 * On mount, checks AsyncStorage for `onboarding_completed` and redirects
 * straight to '/home' if onboarding was already seen, so it isn't shown
 * again on relaunch.
 *
 * TODO (rest of SPOT-33): once '/choose-role' or a real auth/dashboard
 * entry point exists, redirect there instead of the '/home' placeholder.
 */
export default function OnboardingScreen1() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getOnboardingCompleted().then((completed) => {
      if (!isMounted) return;
      if (completed) {
        router.replace('/home');
      } else {
        setChecking(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSkip = async () => {
    await setOnboardingCompleted();
    router.replace('/home');
  };

  const handleNext = () => {
    router.push('/onboarding/2');
  };

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <OnboardingSlide1 onSkip={handleSkip} onNext={handleNext} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gradientStart,
  },
});
