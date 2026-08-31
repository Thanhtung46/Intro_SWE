import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { TranslationKey } from '@/i18n/translations';
import type { Role } from '@/types/auth';

function getCopy(
  t: (key: TranslationKey) => string
): Record<Extract<Role, 'owner' | 'referee'>, { title: string; body: string }> {
  return {
    owner: {
      title: t('pendingApproval.ownerTitle'),
      body: t('pendingApproval.ownerBody'),
    },
    referee: {
      title: t('pendingApproval.refereeTitle'),
      body: t('pendingApproval.refereeBody'),
    },
  };
}

type Props = {
  role: Extract<Role, 'owner' | 'referee'>;
  onDone: () => void;
};

/**
 * Shared "thông báo chờ admin" screen for both Owner and Referee
 * registration (AC: "form đăng ký pending + thông báo chờ admin") — static
 * content only, no network call.
 */
export default function PendingApprovalScreen({ role, onDone }: Props) {
  const { t } = useLanguage();
  const copy = getCopy(t)[role];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="time-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.heading}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={onDone}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('pendingApproval.backHome')}
        >
          <Text style={styles.buttonText}>{t('pendingApproval.backHome')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.headingText,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.bodyText,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.lg,
  },
  button: {
    width: '100%',
    maxWidth: 320,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.buttonShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 12.5,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
