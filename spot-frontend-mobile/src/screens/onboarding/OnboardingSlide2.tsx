import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import PaginationDots from '@/components/onboarding/PaginationDots';
import GlassCard from '@/components/onboarding/GlassCard';
import useFloatingAnimation from '@/hooks/useFloatingAnimation';

const TOTAL_SLIDES = 3;
const ACTIVE_INDEX = 1;

type Props = {
  onSkip: () => void;
  onNext: () => void;
};

/**
 * Onboarding slide 2/3 — "Connect with Teammates".
 * Ports the Figma "Onboarding 2" frame to React Native.
 *
 * `onSkip` / `onNext` are injected by the route so this component stays
 * presentation-only and reusable in tests/storybook-style previews.
 */
export default function OnboardingSlide2({ onSkip, onNext }: Props) {
  const floatStyle = useFloatingAnimation();

  // Slow spinning dashed ring behind the icon, matching the mockup's
  // `animate-[spin_20s_linear_infinite]` decoration.
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
            <Animated.View style={[styles.iconOuterWrapper, floatStyle]}>
              <Animated.View style={[styles.ringDecoration, rotateStyle]} />
              <View style={styles.iconWrapper}>
                <Image
                  source={require('../../../assets/onboarding/teammates-3d.png')}
                  style={styles.illustrationImage}
                  resizeMode="contain"
                />
                <Image
                  source={require('../../../assets/onboarding/groups-badge.png')}
                  style={styles.iconBadge}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
          </GlassCard>

          <View style={styles.textBlock}>
            <Text style={styles.heading}>Connect with Teammates</Text>
            <Text style={styles.body}>
              Find opponents and teammates that match{'\n'}your skill level.
            </Text>
          </View>
        </View>

        {/* Footer - Bottom Controls */}
        <View style={styles.footer}>
          <PaginationDots total={TOTAL_SLIDES} activeIndex={ACTIVE_INDEX} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNext}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Next slide"
          >
            <Ionicons name="arrow-forward" size={22} color={colors.white} />
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
  iconOuterWrapper: {
    width: 192,
    height: 192,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDecoration: {
    ...StyleSheet.absoluteFill,
    borderRadius: 96,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.ringBorder,
  },
  iconWrapper: {
    width: 176,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  iconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    shadowColor: colors.buttonShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
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
  actionButton: {
    // Larger than slide 1/3 to match the mockup's w-20 h-20 button here.
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.buttonShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 12.5,
    elevation: 8,
  },
});
