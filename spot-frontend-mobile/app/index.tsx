import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { getOnboardingCompleted } from '@/utils/onboardingStorage';
import { colors } from '@/constants/colors';

/**
 * "/" — temporary redirect-only entry point for this ticket (SPOT-33).
 *
 * The real brand Splash screen is a separate ticket (SPOT-28) that owns
 * "/" — this just unblocks testing onboarding on its own branch. Once
 * SPOT-28 merges, this file goes away and Splash takes over "/",
 * redirecting into `/onboarding` the same way.
 */
export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const check = useCallback(() => {
    setChecking(true);
    let cancelled = false;
    getOnboardingCompleted().then((completed) => {
      if (cancelled) return;
      if (completed) {
        router.replace('/home');
      } else {
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => check(), [check]);

  useEffect(() => {
    if (!checking) {
      router.replace('/onboarding');
    }
  }, [checking, router]);

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gradientStart,
  },
});
