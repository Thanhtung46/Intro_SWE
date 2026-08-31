import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  size: number;
};

/**
 * Slow-spinning dashed ring decoration (slide 2's "Connect with Teammates"
 * illustration). Kept as its own component with its own animation loop so
 * remounting the parent onboarding content block (keyed by slide index,
 * see OnboardingScreen) doesn't jerk this loop — it starts fresh cleanly
 * on its own mount/unmount instead of fighting a shared lifecycle.
 */
export default function RingDecoration({ size }: Props) {
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotateValue]);

  const rotateStyle = {
    transform: [
      { rotate: rotateValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
    ],
  };

  return (
    <Animated.View
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, rotateStyle]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.ringBorder,
  },
});
