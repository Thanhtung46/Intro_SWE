import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

type Props = {
  total: number;
  activeIndex: number;
};

/**
 * Pagination dots for the onboarding pager.
 * The dot at `activeIndex` renders as a wide pill; the rest are small circles.
 */
export default function PaginationDots({ total, activeIndex }: Props) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          accessibilityRole="tab"
          accessibilityState={{ selected: index === activeIndex }}
          style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.dotInactive,
  },
});
