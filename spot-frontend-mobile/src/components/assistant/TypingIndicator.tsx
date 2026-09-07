import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

const DOT_COUNT = 3;
const BOUNCE_HEIGHT = 4;
const CYCLE_MS = 900;

/**
 * Three-dot "assistant is typing" bubble shown while waiting for a reply
 * (matches ChatMessageBubble's assistant bubble styling so it reads as
 * part of the conversation, not a separate status row).
 */
export default function TypingIndicator() {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);
  const dotAnims = useRef([...Array(DOT_COUNT)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = dotAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((CYCLE_MS / DOT_COUNT) * index),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(CYCLE_MS - (CYCLE_MS / DOT_COUNT) * index - 600),
        ]),
      ),
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dotAnims]);

  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        {dotAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -BOUNCE_HEIGHT],
                    }),
                  },
                ],
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingHorizontal: 16,
      marginVertical: 4,
    },
    bubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 16,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      backgroundColor: c.glassCardBg,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.textSecondary,
    },
  });
}
