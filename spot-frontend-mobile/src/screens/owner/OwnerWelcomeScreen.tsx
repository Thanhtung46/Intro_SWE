import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import useFloatingAnimation from '@/hooks/useFloatingAnimation';
import { useLanguage } from '@/context/LanguageContext';

const OWNER_WEB_URL = 'owner.spot.com';

type Props = {
  onContinue: () => void;
};

/**
 * Owner Welcome screen (Figma node 1:634) — shown right after a new user
 * picks the Venue Owner role, explaining that revenue/licensing management
 * happens on the Web Portal, then continuing into the venue registration
 * form (`onContinue` -> /owner/register).
 *
 * `onContinue` is injected by the route so this component stays
 * presentation-only, matching the onboarding/choose-role screens' pattern.
 */
export default function OwnerWelcomeScreen({ onContinue }: Props) {
  const { t } = useLanguage();
  const floatStyle = useFloatingAnimation({ distance: 10, duration: 2000 });
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    await Clipboard.setStringAsync(OWNER_WEB_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.logo}>SPOT</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BlurView intensity={40} tint="light" style={styles.card}>
            <View style={styles.cardOverlay} />

            <Animated.View style={[styles.illustrationWrapper, floatStyle]}>
              <Image
                source={require('../../../assets/Owner Welcome.png')}
                style={styles.illustrationImage}
                resizeMode="cover"
              />
            </Animated.View>

            <Text style={styles.heading}>{t('ownerWelcome.heading')}</Text>
            <Text style={styles.body}>
              {t('ownerWelcome.bodyPart1')}
              <Text style={styles.bodyStrong}>{t('ownerWelcome.bodyRevenueAdmin')}</Text>
              {t('ownerWelcome.bodyAnd')}
              <Text style={styles.bodyStrong}>{t('ownerWelcome.bodyLicensingFeatures')}</Text>
              {t('ownerWelcome.bodyPart2')}
              {' '}
              {t('ownerWelcome.bodyPart3')}
            </Text>

            <View style={styles.urlSection}>
              <Text style={styles.urlLabel}>{t('ownerWelcome.urlLabel')}</Text>
              <View style={styles.urlBox}>
                <View style={styles.urlBoxLeft}>
                  <MaterialIcons name="language" size={22} color={colors.primary} />
                  <Text style={styles.urlText}>{OWNER_WEB_URL}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleCopyUrl}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Copy web portal URL"
                >
                  <MaterialIcons
                    name={copied ? 'check' : 'content-copy'}
                    size={20}
                    color={copied ? colors.primary : colors.outline}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onContinue}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Continue to venue registration"
            >
              <Text style={styles.primaryButtonText}>{t('ownerWelcome.continueButton')}</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>
          </BlurView>

          <View style={styles.footnote}>
            <View style={styles.footnoteItem}>
              <MaterialIcons name="verified-user" size={16} color={colors.outline} />
              <Text style={styles.footnoteText}>{t('ownerWelcome.footnoteSecurity')}</Text>
            </View>
            <View style={styles.footnoteDot} />
            <View style={styles.footnoteItem}>
              <MaterialIcons name="support-agent" size={16} color={colors.outline} />
              <Text style={styles.footnoteText}>{t('ownerWelcome.footnoteSupport')}</Text>
            </View>
          </View>
        </ScrollView>
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
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  logo: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },

  card: {
    width: '100%',
    maxWidth: 448,
    borderRadius: 32,
    padding: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.cardOverlay,
  },

  illustrationWrapper: {
    width: 180,
    height: 180,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },

  heading: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.28,
    color: colors.headingText,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: colors.bodyText,
    textAlign: 'center',
    maxWidth: 360,
    marginBottom: spacing.xl,
  },
  bodyStrong: {
    fontWeight: '700',
  },

  urlSection: {
    width: '100%',
    maxWidth: 360,
    marginBottom: spacing.xl + spacing.sm,
  },
  urlLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.outline,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  urlBoxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  urlText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headingText,
  },

  primaryButton: {
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    shadowColor: colors.buttonShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },

  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  footnoteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footnoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.outline,
  },
  footnoteDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dotInactive,
  },
});
