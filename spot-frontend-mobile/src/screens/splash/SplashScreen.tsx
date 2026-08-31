import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

const PROGRESS_DURATION_MS = 900;

export type SplashStatus = 'loading' | 'error';

type Props = {
  status: SplashStatus;
  onAnimationComplete: () => void;
  onRetry: () => void;
};

/**
 * Brand Splash screen. Ports the Figma "Splash Screen" frame (node 1:771).
 *
 * Presentation-only: `status` and `onRetry` are driven by the route
 * (app/index.tsx), which owns the actual bootstrap (onboarding flag +
 * secure token read). `onAnimationComplete` fires once the progress bar
 * finishes filling, so the route knows when it's safe to navigate away.
 */
export default function SplashScreen({ status, onAnimationComplete, onRetry }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status !== 'loading') return undefined;

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: PROGRESS_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) onAnimationComplete();
    });

    return () => animation.stop();
  }, [status, progress, onAnimationComplete]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          {/* Logo card */}
          <View style={styles.logoShadowWrapper}>
            <BlurView intensity={40} tint="light" style={styles.logoBlur}>
              <View style={styles.logoOverlay} />
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </BlurView>
          </View>

          {/* Brand identity */}
          <View style={styles.brandBlock}>
            <Text style={styles.brandTitle}>SPOT</Text>
            <Text style={styles.brandTagline}>Premium Arena Access</Text>
          </View>

          {/* Loading indicator / error + retry */}
          {status === 'error' ? (
            <View style={styles.errorBlock}>
              <Text style={styles.errorText}>Couldn't connect. Check your network.</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Retry"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <Text style={styles.progressLabel}>Starting...</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={styles.footerText}>Powered by AI &amp; Matchmaking</Text>
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
    paddingTop: 24,
    paddingBottom: 32,
  },
  // Fills all space above the footer and centers itself within just that
  // region — so the logo/brand/progress group reads as "centered", while
  // the footer text still sits at the true bottom of the screen below it.
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },

  // Logo card — sized to match the Figma content group (256x438 total,
  // measured directly off the "Splash Screen" frame).
  logoShadowWrapper: {
    width: 240,
    height: 240,
    borderRadius: 32,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
  logoBlur: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  logoOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.cardOverlay,
  },
  logoImage: {
    width: 170,
    height: 170,
  },

  // Brand identity
  brandBlock: {
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 8,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.outline,
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.7,
  },

  // Progress
  progressBlock: {
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    width: 220,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    opacity: 0.6,
  },

  // Error + retry
  errorBlock: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 260,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: colors.primary,
    shadowColor: colors.buttonShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bodyText,
    opacity: 0.8,
  },
});
