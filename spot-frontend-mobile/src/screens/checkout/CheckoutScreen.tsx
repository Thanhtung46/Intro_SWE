import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { ThemeColors } from '@/constants/theme';
import { TranslationKey } from '@/i18n/translations';
import { formatVnd } from '@/utils/format';
import { showAlert } from '@/utils/showAlert';
import { openVenueDirections } from '@/utils/directions';
import { createBookingsBulk, markBookingPaidDev, CreateBookingPayload } from '@/services/bookingService';
import { clearCheckoutDraft } from '@/services/checkoutDraft';

export type PaymentLineItem = CreateBookingPayload & {
  pitchName: string;
  pitchFormat: string;
  pricePerHour: number;
  venueName: string;
  venueAddress: string;
  venueLatitude?: number | null;
  venueLongitude?: number | null;
};

type Props = {
  items: PaymentLineItem[];
  dateLabel: string;
  onBack: () => void;
};

/** Line items can span multiple merged 30-min slots (SelectPitchTimeModal
 * merges contiguous picks into one booking) — derive duration from the
 * actual time range instead of assuming a fixed 30 minutes. Copied verbatim
 * from the old PaymentConfirmModal.tsx (this screen replaces it as the
 * full-screen "Checkout" step) — do not change the formula. */
function durationHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH * 60 + endM - (startH * 60 + startM)) / 60;
}

function formatDuration(hours: number, t: (key: TranslationKey) => string): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  const parts: string[] = [];
  if (wholeHours > 0) parts.push(`${wholeHours}${t('payment.hourUnit')}`);
  if (minutes > 0) parts.push(`${minutes}${t('payment.minuteUnit')}`);
  return parts.join(' ') || `0${t('payment.minuteUnit')}`;
}

function lineItemTotal(item: PaymentLineItem): number {
  const courtTotal = item.pricePerHour * durationHours(item.startTime, item.endTime);
  const refereeFee = item.hireReferee ? item.refereeFeeVnd ?? 0 : 0;
  return courtTotal + refereeFee;
}

/**
 * Checkout — full-screen replacement for the old PaymentConfirmModal bottom
 * sheet (Figma "Checkout"). spot-backend has no live payment gateway yet
 * (spot-backend/CLAUDE.md: domain `payment/` is an empty scaffold) — the
 * MoMo vs Visa/Mastercard choice below is cosmetic only, no real payment
 * gateway; Confirm Payment always creates the bookings then completes each
 * one via the non-prod `POST /bookings/:id/dev/mark-paid` stub.
 */
export default function CheckoutScreen({ items, dateLabel, onBack }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [method, setMethod] = useState<'momo' | 'card'>('momo');
  const [submitting, setSubmitting] = useState(false);

  const firstItem = items[0];
  const total = items.reduce((sum, item) => sum + lineItemTotal(item), 0);

  if (!firstItem) return null;

  const handleViewMap = () => {
    openVenueDirections(router, {
      latitude: firstItem.venueLatitude ?? null,
      longitude: firstItem.venueLongitude ?? null,
      venueName: firstItem.venueName,
      venueAddress: firstItem.venueAddress,
    });
  };

  const handleConfirmPayment = async () => {
    setSubmitting(true);

    const bookingsResult = await createBookingsBulk({
      bookings: items.map(({ fieldId, bookingDate, startTime, endTime, hireReferee, refereeFeeVnd }) => ({
        fieldId,
        bookingDate,
        startTime,
        endTime,
        hireReferee,
        refereeFeeVnd,
      })),
    });

    if (!bookingsResult.success) {
      setSubmitting(false);
      showAlert(t('payment.paymentFailedTitle'), bookingsResult.message || t('common.genericError'));
      return;
    }

    const created = bookingsResult.created ?? [];
    if (created.length === 0) {
      setSubmitting(false);
      showAlert(
        t('payment.paymentFailedTitle'),
        bookingsResult.failed?.[0]?.message || t('selectPitchTime.noneBookedFailure'),
      );
      return;
    }

    const paidResults = await Promise.all(created.map((booking) => markBookingPaidDev(booking.bookingId)));
    const paidIndex = paidResults.findIndex((r) => r.success);
    setSubmitting(false);

    if (paidIndex === -1) {
      showAlert(t('payment.paymentFailedTitle'), paidResults[0]?.message || t('common.genericError'));
      return;
    }

    // Multi-slot bookings create several rows at once — Payment Success only
    // has room to represent one booking (matches the Figma design), so we
    // pick the first one that actually finished paying (not just created[0],
    // which could be one of the ones that failed to mark-paid).
    const paidBooking = paidResults[paidIndex].booking ?? created[paidIndex];
    const matchedItem =
      items.find(
        (item) =>
          item.fieldId === paidBooking.fieldId &&
          item.bookingDate === paidBooking.bookingDate &&
          item.startTime === paidBooking.startTime &&
          item.endTime === paidBooking.endTime,
      ) ?? firstItem;

    clearCheckoutDraft();
    router.replace({
      pathname: '/payment/success',
      params: {
        id: String(paidBooking.bookingId),
        venueName: matchedItem.venueName,
        fieldName: matchedItem.pitchName,
        address: matchedItem.venueAddress,
        sportType: matchedItem.pitchFormat,
        startTime: paidBooking.startTime,
        endTime: paidBooking.endTime,
        bookingDate: paidBooking.bookingDate,
        totalAmountVnd: String(paidBooking.totalAmount),
      },
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('payment.backLabel')}
        >
          <Ionicons name="arrow-back" size={20} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.checkoutTitle')}</Text>
        <View style={styles.iconButton}>
          <Ionicons name="shield-checkmark" size={20} color={c.primary} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t('payment.summaryHeading')}</Text>
          <Text style={styles.pitchName}>{firstItem.pitchName}</Text>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={c.textSecondary} />
            <Text style={styles.detailText}>
              {dateLabel} · {firstItem.startTime} - {firstItem.endTime} ·{' '}
              {formatDuration(durationHours(firstItem.startTime, firstItem.endTime), t)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={c.textSecondary} />
            <Text style={styles.detailText}>{firstItem.venueName}</Text>
            <TouchableOpacity onPress={handleViewMap} accessibilityRole="button">
              <Text style={styles.viewMapLink}>{t('payment.viewMapLabel')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          {items.map((item, index) => {
            const hours = durationHours(item.startTime, item.endTime);
            return (
              <React.Fragment key={`${item.fieldId}-${item.startTime}-${index}`}>
                <View style={styles.lineItem}>
                  <Text style={styles.lineItemLabel}>
                    {t('payment.pitchBookingLabel')} ({hours}{t('payment.hourUnit')})
                  </Text>
                  <Text style={styles.lineItemPrice}>{formatVnd(item.pricePerHour * hours)}</Text>
                </View>
                {item.hireReferee && (
                  <View style={styles.lineItem}>
                    <Text style={styles.lineItemLabel}>{t('payment.refereeAddOn')}</Text>
                    <Text style={styles.lineItemPrice}>{formatVnd(item.refereeFeeVnd ?? 0)}</Text>
                  </View>
                )}
              </React.Fragment>
            );
          })}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('payment.totalLabel')}</Text>
            <Text style={styles.totalValue}>{formatVnd(total)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionLabel, styles.methodHeading]}>{t('payment.methodHeading')}</Text>

          <TouchableOpacity
            style={[styles.methodCard, method === 'momo' && styles.methodCardSelected]}
            onPress={() => setMethod('momo')}
            accessibilityRole="radio"
            accessibilityState={{ selected: method === 'momo' }}
          >
            <Ionicons name="wallet-outline" size={22} color={c.primary} />
            <View style={styles.methodTextWrap}>
              <Text style={styles.methodValue}>{t('payment.methodMomoLabel')}</Text>
              <Text style={styles.methodNote}>{t('payment.methodMomoNote')}</Text>
            </View>
            <Ionicons name={method === 'momo' ? 'radio-button-on' : 'radio-button-off'} size={20} color={c.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, method === 'card' && styles.methodCardSelected]}
            onPress={() => setMethod('card')}
            accessibilityRole="radio"
            accessibilityState={{ selected: method === 'card' }}
          >
            <Ionicons name="card-outline" size={22} color={c.primary} />
            <View style={styles.methodTextWrap}>
              <Text style={styles.methodValue}>{t('payment.methodCardLabel')}</Text>
              <Text style={styles.methodNote}>{t('payment.methodCardNote')}</Text>
            </View>
            <Ionicons name={method === 'card' ? 'radio-button-on' : 'radio-button-off'} size={20} color={c.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotalRow}>
          <View>
            <Text style={styles.footerTotalLabel}>{t('payment.totalLabel')}</Text>
            <Text style={styles.footerTotalValue}>{formatVnd(total)}</Text>
          </View>
          <View style={styles.instantBadge}>
            <Text style={styles.instantBadgeText}>{t('payment.instantConfirmation')}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
          onPress={handleConfirmPayment}
          disabled={submitting}
          accessibilityRole="button"
        >
          <Text style={styles.confirmButtonText}>
            {submitting ? t('payment.confirming') : t('payment.confirmButton')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    iconButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: c.textPrimary,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 16,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    pitchName: {
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    detailText: {
      flex: 1,
      fontSize: 14,
      color: c.textPrimary,
    },
    viewMapLink: {
      fontSize: 13,
      fontWeight: '700',
      color: c.primary,
    },
    lineItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    lineItemLabel: {
      fontSize: 14,
      color: c.textPrimary,
    },
    lineItemPrice: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    totalLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '800',
      color: c.primary,
    },
    methodHeading: {
      marginBottom: 2,
    },
    methodCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.divider,
    },
    methodCardSelected: {
      borderColor: c.primary,
      backgroundColor: c.tintedSurface,
    },
    methodTextWrap: {
      flex: 1,
      gap: 2,
    },
    methodValue: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    methodNote: {
      fontSize: 12,
      color: c.textSecondary,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      backgroundColor: c.background,
      gap: 12,
    },
    footerTotalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerTotalLabel: {
      fontSize: 13,
      color: c.textSecondary,
    },
    footerTotalValue: {
      fontSize: 24,
      fontWeight: '900',
      color: c.textPrimary,
    },
    instantBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
    },
    instantBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.successText,
    },
    confirmButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: c.primary,
    },
    confirmButtonDisabled: {
      opacity: 0.5,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.white,
    },
  });
}
