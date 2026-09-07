import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { ThemeColors } from '@/constants/theme';
import { MONTH_ABBR_EN, MONTH_ABBR_VI } from '@/i18n/translations';
import { formatVnd } from '@/utils/format';

type Props = {
  bookingId: number;
  venueName: string;
  fieldName: string;
  startTime: string;
  endTime: string;
  /** YYYY-MM-DD */
  bookingDate: string;
  totalAmountVnd: number | null;
  onViewDetails: () => void;
  onReturnHome: () => void;
};

/** Payment Successful — full-screen confirmation shown right after Checkout's
 * "Confirm Payment" completes (Figma "Payment Successful"). The QR square is
 * a static empty placeholder (Figma itself has no real QR pattern) — no QR
 * library is wired up, this is intentional. */
export default function PaymentSuccessScreen({
  bookingId,
  venueName,
  fieldName,
  startTime,
  endTime,
  bookingDate,
  totalAmountVnd,
  onViewDetails,
  onReturnHome,
}: Props) {
  const { t, language } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  const monthAbbr = language === 'vi' ? MONTH_ABBR_VI : MONTH_ABBR_EN;
  const dateLabel = useMemo(() => {
    const [year, month, day] = bookingDate.split('-').map(Number);
    if (!year || !month || !day) return bookingDate;
    return `${monthAbbr[month - 1]} ${day}, ${year}`;
  }, [bookingDate, monthAbbr]);

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={44} color={c.primary} />
          </View>
          <Text style={styles.title}>{t('paymentSuccess.title')}</Text>
          <Text style={styles.subtitle}>{t('paymentSuccess.subtitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Card stays fixed white (like a physical receipt) regardless of
              theme — its text below uses static colors, not theme tokens,
              so contrast holds in dark mode too. */}
          <View style={styles.card}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('paymentSuccess.badge')}</Text>
            </View>

            <Text style={styles.pitchName}>{fieldName}</Text>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={15} color={colors.bodyText} />
              <Text style={styles.venueText}>{venueName}</Text>
            </View>

            <View style={styles.twoColRow}>
              <View style={styles.col}>
                <Text style={styles.colLabel}>{t('paymentSuccess.dateLabel')}</Text>
                <Text style={styles.colValue}>{dateLabel}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.colLabel}>{t('paymentSuccess.timeLabel')}</Text>
                <Text style={styles.colValue}>
                  {startTime} - {endTime}
                </Text>
              </View>
            </View>

            <Text style={styles.bookingIdText}>
              {t('paymentSuccess.bookingIdPrefix')}: #SPOT-{bookingId}
            </Text>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('paymentSuccess.totalPaidLabel')}</Text>
              <Text style={styles.totalValue}>{formatVnd(totalAmountVnd)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.viewDetailsButton} onPress={onViewDetails} accessibilityRole="button">
            <Text style={styles.viewDetailsText}>{t('paymentSuccess.viewDetailsButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.returnHomeButton} onPress={onReturnHome} accessibilityRole="button">
            <Text style={styles.returnHomeText}>{t('paymentSuccess.returnHomeButton')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.primary,
    },
    safeArea: {
      flex: 1,
    },
    hero: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
      gap: 8,
    },
    checkCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.white,
      marginBottom: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.white,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.85)',
      textAlign: 'center',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: 24,
      padding: 20,
      gap: 12,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.skillTierGreenBg,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
      color: colors.skillTierGreenText,
      textTransform: 'uppercase',
    },
    pitchName: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.headingText,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    venueText: {
      fontSize: 14,
      color: colors.bodyText,
    },
    twoColRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 4,
    },
    col: {
      flex: 1,
      gap: 2,
    },
    colLabel: {
      fontSize: 12,
      color: colors.bodyText,
    },
    colValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.headingText,
    },
    bookingIdText: {
      alignSelf: 'center',
      fontSize: 14,
      fontWeight: '700',
      color: colors.headingText,
      marginTop: 4,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.headingText,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.primaryDark,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 12,
    },
    viewDetailsButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: colors.white,
    },
    viewDetailsText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.primary,
    },
    returnHomeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.white,
      backgroundColor: 'transparent',
    },
    returnHomeText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.white,
    },
  });
}
