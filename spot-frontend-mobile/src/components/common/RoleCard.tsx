import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { spacing } from '@/constants/spacing';
import { ThemeColors } from '@/constants/theme';

type Props = {
  title: string;
  description: string;
  icon: (color: string) => ReactNode;
  selected: boolean;
  onPress: () => void;
  themeColors: ThemeColors;
};

/**
 * Selectable role card used by Choose Role (Figma node 1:565). A short
 * Reanimated scale pulse on press gives immediate feedback before
 * navigation happens (runs on the UI thread, unlike the JS-thread
 * `Animated` API used for onboarding's float animation).
 */
export default function RoleCard({ title, description, icon, selected, onPress, themeColors }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
        activeOpacity={0.9}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={title}
        style={[styles.card, selected && styles.cardSelected]}
      >
        <View style={[styles.iconCircle, selected && styles.iconCircleSelected]}>
          {icon(selected ? themeColors.white : themeColors.primary)}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {selected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={14} color={themeColors.white} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: '100%',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.roleCardBorder,
      backgroundColor: c.roleCardBg,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
    },
    cardSelected: {
      borderColor: c.primary,
      backgroundColor: c.roleCardSelectedBg,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 16,
      backgroundColor: c.roleIconBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    iconCircleSelected: {
      backgroundColor: c.primary,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: spacing.sm,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      color: c.textSecondary,
      textAlign: 'center',
    },
    checkBadge: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
