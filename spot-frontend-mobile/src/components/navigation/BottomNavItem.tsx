import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors } from '@/constants/colors';

const ACTIVE_BG = '#2170E4';
const INACTIVE_TEXT = '#334155';
const SPRING = { damping: 20, stiffness: 320, mass: 0.6 };

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** One tab of the bottom navigation shell — Figma node 8:139. */
export default function BottomNavItem({ icon, label, active = false, onPress }: Props) {
  const pressScale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.item, pressStyle]}
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = withSpring(0.94, SPRING);
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, SPRING);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {/* Pill hugs icon+label; outer item stays flex:1 for a decent tap target. */}
      <View style={[styles.pill, active && styles.pillActive]}>
        <Ionicons name={icon} size={18} color={active ? colors.white : INACTIVE_TEXT} />
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 56,
  },
  pillActive: {
    backgroundColor: ACTIVE_BG,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: INACTIVE_TEXT,
  },
  labelActive: {
    color: colors.white,
  },
});
