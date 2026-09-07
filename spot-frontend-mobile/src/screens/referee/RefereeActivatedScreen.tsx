import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  onContinue: () => void;
};

/** "Account Activated!" (Pencil "Account Activated" frame) — celebratory
 *  interstitial shown right after a referee's first successful login. */
export default function RefereeActivatedScreen({ onContinue }: Props) {
  const { t } = useLanguage();
  const steps = [
    t('referee.activated.stepSignup'),
    t('referee.activated.stepVerify'),
    t('referee.activated.stepApproved'),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.card}>
        <View style={styles.stepRow}>
          {steps.map((label, i) => (
            <View key={label} style={styles.step}>
              <View style={styles.stepDot}>
                <Ionicons name="checkmark" size={14} color={colors.white} />
              </View>
              <Text style={[styles.stepLabel, i === steps.length - 1 && styles.stepLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.trophyWrap}>
          <View style={styles.trophyCircle}>
            <Ionicons name="trophy" size={40} color={colors.white} />
          </View>
        </View>

        <Text style={styles.title}>{t('referee.activated.title')}</Text>
        <Text style={styles.body}>{t('referee.activated.body')}</Text>

        <TouchableOpacity style={styles.cta} onPress={onContinue}>
          <Text style={styles.ctaText}>{t('referee.activated.cta')}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  step: { alignItems: 'center', gap: 6 },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { fontSize: 12, fontWeight: '600', color: colors.bodyText },
  stepLabelActive: { color: colors.primary, fontWeight: '800' },
  trophyWrap: { padding: spacing.sm },
  trophyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.selectedBackground,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.headingText, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, color: colors.bodyText, textAlign: 'center' },
  cta: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
