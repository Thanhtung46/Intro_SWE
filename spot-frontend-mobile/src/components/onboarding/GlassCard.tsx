import React, { PropsWithChildren } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

import { colors } from '@/constants/colors';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

/**
 * The frosted "glass" illustration card shared by all onboarding slides.
 * Ports the mockups' `.glass-card` (backdrop-blur + translucent white +
 * soft blue shadow) via expo-blur, since RN has no CSS backdrop-filter.
 */
export default function GlassCard({ children, style }: Props) {
  return (
    <View style={[styles.shadowWrapper, style]}>
      <BlurView intensity={40} tint="light" style={styles.blur}>
        <View style={styles.overlay} />
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 40,
    // Blue "floating card" shadow from the design. Kept on the outer,
    // non-clipped wrapper since the BlurView below clips its own shadow.
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 10,
  },
  blur: {
    flex: 1,
    borderRadius: 40,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.cardOverlay,
  },
});
