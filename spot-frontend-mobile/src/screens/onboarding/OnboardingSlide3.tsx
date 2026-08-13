import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import PaginationDots from '@/components/onboarding/PaginationDots';
import GlassCard from '@/components/onboarding/GlassCard';
import useFloatingAnimation from '@/hooks/useFloatingAnimation';

const TOTAL_SLIDES = 3;
const ACTIVE_INDEX = 2;

type Props = {
  onSkip: () => void;
  onGetStarted: () => void;
};

/**
 * Onboarding slide 3/3 — "Smart Schedule".
 * Ports the Figma "Onboarding 3" frame to React Native.
 *
 * `onSkip` / `onGetStarted` are injected by the route so this component
 * stays presentation-only and reusable in tests/storybook-style previews.
 */
export default function OnboardingSlide3({ onSkip, onGetStarted }: Props) {
  const floatStyle = useFloatingAnimation();

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top Navigation */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <GlassCard style={styles.illustrationCard}>
            <LinearGradient
              colors={[colors.auraStart, colors.auraEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[styles.iconWrapper, floatStyle]}>
              <Image
                source={require('../../../assets/onboarding/ai-schedule-3d.png')}
                style={styles.illustrationImage}
                resizeMode="contain"
              />
              {/* "monitoring" badge — top-right, matches the mockup's position */}
              <Image
                source={require('../../../assets/onboarding/trending-badge.png')}
                style={[styles.cornerBadge, styles.badgeTopRight]}
                resizeMode="contain"
              />
              {/* "bolt" badge — bottom-left, matches the mockup's position */}
              <Image
                source={require('../../../assets/onboarding/flash-badge.png')}
                style={[styles.cornerBadge, styles.badgeBottomLeft]}
                resizeMode="contain"
              />
            </Animated.View>
          </GlassCard>

          <View style={styles.textBlock}>
            <Text style={styles.heading}>Smart Schedule</Text>
            <Text style={styles.body}>
              Manage your sports life and schedule{'\n'}with AI.
            </Text>
          </View>
        </View>

        {/* Footer - Bottom Controls */}
        <View style={styles.footer}>
          <PaginationDots total={TOTAL_SLIDES} activeIndex={ACTIVE_INDEX} />

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onGetStarted}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Get started"
          >
            <Text style={styles.ctaText}>Get started</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // Top Navigation
  topNav: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
    letterSpacing: 0.14,
  },

  // Main Content Canvas
  mainContent: {
    flex: 1,
    width: '100%',
    maxWidth: 448,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationCard: {
    marginBottom: 32,
  },
  iconWrapper: {
    width: 208,
    height: 208,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  cornerBadge: {
    position: 'absolute',
    width: 44,
    height: 44,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeTopRight: {
    top: 4,
    right: -8,
  },
  badgeBottomLeft: {
    bottom: 16,
    left: -16,
  },

  textBlock: {
    gap: 16,
    width: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  heading: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.headingText,
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '400',
    color: colors.bodyText,
    textAlign: 'center',
  },

  // Footer
  footer: {
    width: '100%',
    maxWidth: 448,
    alignItems: 'center',
    gap: 32,
  },
  ctaButton: {
    flexDirection: 'row',
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryDark,
    shadowColor: colors.buttonShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 12.5,
    elevation: 8,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
