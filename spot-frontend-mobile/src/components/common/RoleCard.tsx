import React, { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

type Props = {
  title: string;
  description: string;
  icon: (color: string) => ReactNode;
  selected: boolean;
  onPress: () => void;
};

/**
 * Selectable role card used by Choose Role (Figma node 1:565). A short
 * Reanimated scale pulse on press gives immediate feedback before
 * navigation happens (runs on the UI thread, unlike the JS-thread
 * `Animated` API used for onboarding's float animation).
 */
export default function RoleCard({ title, description, icon, selected, onPress }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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
          {icon(selected ? colors.white : colors.primaryDark)}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {selected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={14} color={colors.white} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.selectedBackground,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconCircleSelected: {
    backgroundColor: colors.primaryDark,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.headingText,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.bodyText,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
