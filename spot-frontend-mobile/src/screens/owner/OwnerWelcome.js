import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { colors } from '../../constants/colors';
import useFloatingAnimation from '../../hooks/useFloatingAnimation';

const OWNER_WEB_URL = 'owner.spot.com';

/**
 * Owner Welcome screen (Figma node 1:634) — shown right after a new user
 * picks the Venue Owner role, explaining that revenue/licensing management
 * happens on the Web Portal and letting them continue into the mobile
 * check-in app (or defer profile setup).
 *
 * `onEnterApp` / `onLater` are injected by the route so this component
 * stays presentation-only, matching the onboarding screens' pattern.
 */
export default function OwnerWelcome({ onEnterApp, onLater }) {
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <BlurView intensity={40} tint="light" style={styles.card}>
            <View style={styles.cardOverlay} />

            <Animated.View style={[styles.illustrationWrapper, floatStyle]}>
              <Image
                source={require('../../../assets/Owner Welcome.png')}
                style={styles.illustrationImage}
                resizeMode="cover"
              />
            </Animated.View>

            <Text style={styles.heading}>Welcome Venue Owner!</Text>
            <Text style={styles.body}>
              To ensure the best management experience,{' '}
              <Text style={styles.bodyStrong}>revenue administration</Text> and{' '}
              <Text style={styles.bodyStrong}>licensing features</Text> will be performed on the
              Web Portal for computers.
            </Text>

            <View style={styles.urlSection}>
              <Text style={styles.urlLabel}>Access on Browser</Text>
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
                    color={copied ? colors.success : colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onEnterApp}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Enter app, check-in version"
              >
                <Text style={styles.primaryButtonText}>Enter App (Check-in Version)</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onLater}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="I will update my profile later"
              >
                <Text style={styles.secondaryButtonText}>I will update my profile later</Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          <View style={styles.footnote}>
            <View style={styles.footnoteItem}>
              <MaterialIcons name="verified-user" size={16} color={colors.labelMuted} />
              <Text style={styles.footnoteText}>256-bit Security</Text>
            </View>
            <View style={styles.footnoteDot} />
            <View style={styles.footnoteItem}>
              <MaterialIcons name="support-agent" size={16} color={colors.labelMuted} />
              <Text style={styles.footnoteText}>24/7 Support</Text>
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
    paddingVertical: 16,
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  card: {
    width: '100%',
    maxWidth: 448,
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardOverlay,
  },

  illustrationWrapper: {
    width: 180,
    height: 180,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 24,
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
    color: colors.ownerHeading,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    color: colors.bodyText,
    textAlign: 'center',
    maxWidth: 360,
    marginBottom: 32,
  },
  bodyStrong: {
    fontWeight: '700',
  },

  urlSection: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 40,
  },
  urlLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.labelMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  urlBoxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  urlText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headingText,
  },

  actions: {
    width: '100%',
    maxWidth: 360,
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.bodyText,
  },

  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 32,
  },
  footnoteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footnoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.labelMuted,
  },
  footnoteDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dotInactive,
  },
});
