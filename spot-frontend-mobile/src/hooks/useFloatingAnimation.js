import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Loops a subtle up/down float, matching the onboarding mockups' CSS
 * `floating` keyframes (0 -> -distance -> 0, ease-in-out, infinite).
 * Shared by all three onboarding slides' center illustration.
 */
export default function useFloatingAnimation({ distance = 15, duration = 1500 } = {}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -distance,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [translateY, distance, duration]);

  return { transform: [{ translateY }] };
}
