import React, { useCallback, useState } from 'react';
import { Animated as RNAnimated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

import { colors } from '@/constants/colors';
import { onboardingSlides } from '@/constants/onboardingSlides';
import { useLanguage } from '@/context/LanguageContext';
import PaginationDots from '@/components/onboarding/PaginationDots';
import GlassCard from '@/components/onboarding/GlassCard';
import RingDecoration from '@/components/onboarding/RingDecoration';
import useFloatingAnimation from '@/hooks/useFloatingAnimation';

type Props = {
  onSkip: () => void;
  onGetStarted: () => void;
};

const LAST_INDEX = onboardingSlides.length - 1;

/**
 * Onboarding — single screen, 3 slides driven by internal step state
 * instead of separate routes. Only the content block (illustration +
 * heading + body) transitions on step change (Reanimated `entering`/
 * `exiting`, keyed by slide id) — the surrounding chrome (Skip,
 * pagination dots, footer button) stays mounted the whole time, so it
 * reads as one persistent surface instead of the whole screen sliding.
 */
export default function OnboardingScreen({ onSkip, onGetStarted }: Props) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slide = onboardingSlides[currentIndex];
  const isLast = currentIndex === LAST_INDEX;

  const handleNext = useCallback(() => {
    setCurrentIndex((index) => (index < LAST_INDEX ? index + 1 : index));
  }, []);

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top Navigation — persistent, does not transition between slides */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.skip')}
          >
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content — only this block animates on step change */}
        <View style={styles.mainContent}>
          <SlideContent key={slide.id} slide={slide} />
        </View>

        {/* Footer - Bottom Controls — persistent, does not transition */}
        <View style={styles.footer}>
          <PaginationDots total={onboardingSlides.length} activeIndex={currentIndex} />

          <View style={styles.actionButtonSlot}>
            {isLast ? (
              <Animated.View
                key="get-started"
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                style={styles.footerButtonWrapper}
              >
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={onGetStarted}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('onboarding.getStarted')}
                >
                  <Text style={styles.ctaText}>{t('onboarding.getStarted')}</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.white} />
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <Animated.View
                key="next"
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
                style={styles.footerButtonWrapper}
              >
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleNext}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={t('onboarding.nextSlideA11y')}
                >
                  <Ionicons name="arrow-forward" size={22} color={colors.white} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

type SlideContentProps = {
  slide: (typeof onboardingSlides)[number];
};

function SlideContent({ slide }: SlideContentProps) {
  const floatStyle = useFloatingAnimation();
  const outerSize = slide.ringOuterSize ?? slide.imageSize;

  return (
    <Animated.View
      entering={SlideInRight.duration(220)}
      exiting={SlideOutLeft.duration(220)}
      style={styles.slideContent}
    >
      <GlassCard style={styles.illustrationCard}>
        <LinearGradient
          colors={[colors.auraStart, colors.auraEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <RNAnimated.View
          style={[styles.iconOuterWrapper, { width: outerSize, height: outerSize }, floatStyle]}
        >
          {slide.ringOuterSize ? <RingDecoration size={slide.ringOuterSize} /> : null}
          <View style={[styles.iconWrapper, { width: slide.imageSize, height: slide.imageSize }]}>
            <Image source={slide.image} style={styles.illustrationImage} resizeMode="contain" />
            {slide.badges?.map((badge, index) => (
              <Image key={index} source={badge.source} style={badge.style} resizeMode="contain" />
            ))}
          </View>
        </RNAnimated.View>
      </GlassCard>

      <View style={styles.textBlock}>
        <Text style={styles.heading}>{slide.heading}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>
    </Animated.View>
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
  slideContent: {
    width: '100%',
    alignItems: 'center',
  },
  illustrationCard: {
    marginBottom: 32,
  },
  iconOuterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
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
  // Fixed height so the circular <-> full-width button swap never reflows
  // the pagination dots above it.
  actionButtonSlot: {
    width: '100%',
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Explicit width so the "100%"-width `ctaButton` inside resolves against
  // a definite parent — without this the wrapping Animated.View (needed
  // for the enter/exit crossfade) has no defined width of its own, and the
  // button's internal content ends up mis-centered.
  footerButtonWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
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
  ctaButton: {
    flexDirection: 'row',
    height: 56,
    paddingHorizontal: 32,
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
