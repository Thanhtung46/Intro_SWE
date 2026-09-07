import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { ThemeColors } from '@/constants/theme';
import { showAlert } from '@/utils/showAlert';
import { useLanguage } from '@/context/LanguageContext';
import { TranslationKey } from '@/i18n/translations';
import { formatVnd } from '@/utils/format';
import { createBookingsBulk, markBookingPaidDev, CreateBookingPayload } from '@/services/bookingService';

export type PaymentLineItem = CreateBookingPayload & {
  pitchName: string;
  pricePerHour: number;
};

type Props = {
  visible: boolean;
  items: PaymentLineItem[];
  dateLabel: string;
  onBack: () => void;
  /** Called once every line item has been booked *and* marked PAID. */
  onPaid: () => void;
  themeColors?: ThemeColors;
};

/** Line items can span multiple merged 30-min slots (SelectPitchTimeModal
 * merges contiguous picks into one booking) — derive duration from the
 * actual time range instead of assuming a fixed 30 minutes. */
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
 * Payment confirmation step — spot-backend has no live payment gateway yet
 * (spot-backend/CLAUDE.md: domain `payment/` is an empty scaffold). This
 * screen presents a real price summary and, on confirm, creates the
 * bookings then completes each one via the non-prod
 * `POST /bookings/:id/dev/mark-paid` stub so the booking actually leaves
 * PENDING_PAYMENT instead of silently getting stuck there.
 */
export default function PaymentConfirmModal({ visible, items, dateLabel, onBack, onPaid, themeColors }: Props) {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);

  const total = items.reduce((sum, item) => sum + lineItemTotal(item), 0);

  const handleConfirmPayment = async () => {
    if (items.length === 0) return;
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
    const paidCount = paidResults.filter((r) => r.success).length;
    setSubmitting(false);

    if (paidCount === 0) {
      showAlert(t('payment.paymentFailedTitle'), paidResults[0]?.message || t('common.genericError'));
      return;
    }

    const totalRequested = bookingsResult.totalRequested ?? items.length;
    if (paidCount === created.length && created.length === totalRequested) {
      showAlert(t('selectPitchTime.bookedTitle'), `${paidCount} slot${paidCount === 1 ? '' : 's'} booked and paid.`);
    } else {
      showAlert(
        t('payment.partiallyPaidTitle'),
        `${paidCount}/${totalRequested} slots booked and paid. The rest were already taken or failed to complete.`,
      );
    }
    onPaid();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onBack}>
      <TouchableWithoutFeedback onPress={onBack}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheet, themeColors && { backgroundColor: themeColors.screenBackgroundAlt }]}>
        <View style={[styles.header, themeColors && { borderBottomColor: themeColors.chromeBorder }]}>
          <View style={[styles.dragHandle, themeColors && { backgroundColor: themeColors.neutralDivider }]} />
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={t('payment.backLabel')}
            >
              <Ionicons name="arrow-back" size={18} color={themeColors?.venueCardHeadingText ?? colors.headingText} />
            </TouchableOpacity>
            <Text style={[styles.title, themeColors && { color: themeColors.quickActionPrimaryIcon }]}>
              {t('payment.title')}
            </Text>
            <View style={styles.iconButton} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.sectionLabel, themeColors && { color: themeColors.venueCardHeadingText }]}>
            {t('payment.summaryHeading')}
          </Text>
          <Text style={[styles.dateLabel, themeColors && { color: themeColors.textSecondaryAlt }]}>{dateLabel}</Text>

          {items.map((item, index) => (
            <View
              key={`${item.fieldId}-${item.startTime}-${index}`}
              style={[styles.lineItem, themeColors && { borderColor: themeColors.inputBorder }]}
            >
              <View>
                <Text style={[styles.lineItemName, themeColors && { color: themeColors.venueCardHeadingText }]}>
                  {item.pitchName}
                </Text>
                <Text style={[styles.lineItemMeta, themeColors && { color: themeColors.textSecondaryAlt }]}>
                  {item.startTime} - {item.endTime} · {formatDuration(durationHours(item.startTime, item.endTime), t)}
                </Text>
                {item.hireReferee && (
                  <Text style={[styles.lineItemMeta, themeColors && { color: themeColors.textSecondaryAlt }]}>
                    {t('payment.refereeAddOn')} · +{formatVnd(item.refereeFeeVnd ?? 0)}
                  </Text>
                )}
              </View>
              <Text style={[styles.lineItemPrice, themeColors && { color: themeColors.venueCardHeadingText }]}>
                {formatVnd(lineItemTotal(item))}
              </Text>
            </View>
          ))}

          <View style={[styles.totalRow, themeColors && { borderTopColor: themeColors.chromeBorder }]}>
            <Text style={[styles.totalLabel, themeColors && { color: themeColors.venueCardHeadingText }]}>
              {t('payment.totalLabel')}
            </Text>
            <Text style={[styles.totalValue, themeColors && { color: themeColors.primary }]}>{formatVnd(total)}</Text>
          </View>

          <Text style={[styles.sectionLabel, styles.methodHeading, themeColors && { color: themeColors.venueCardHeadingText }]}>
            {t('payment.methodHeading')}
          </Text>
          <View style={[styles.methodCard, themeColors && { borderColor: themeColors.inputBorder }]}>
            <Ionicons name="cash-outline" size={20} color={themeColors?.primary ?? colors.primaryDark} />
            <View style={styles.methodTextWrap}>
              <Text style={[styles.methodValue, themeColors && { color: themeColors.venueCardHeadingText }]}>
                {t('payment.methodValue')}
              </Text>
              <Text style={[styles.methodNote, themeColors && { color: themeColors.textSecondaryAlt }]}>
                {t('payment.methodNote')}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, themeColors && { borderTopColor: themeColors.chromeBorder }]}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              themeColors && { backgroundColor: themeColors.quickActionPrimaryIcon },
              submitting && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmPayment}
            disabled={submitting}
            accessibilityRole="button"
          >
            <Text style={[styles.confirmButtonText, themeColors && { color: themeColors.white }]}>
              {submitting ? t('payment.confirming') : `${t('payment.confirmButton')} · ${formatVnd(total)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 28, 48, 0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: colors.screenBackground,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
  },
  dragHandle: {
    width: 48,
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#C3C6D7',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  body: {
    padding: 16,
    gap: 4,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.headingText,
  },
  dateLabel: {
    fontSize: 13,
    color: colors.bodyText,
    marginBottom: 12,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  lineItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headingText,
  },
  lineItemMeta: {
    fontSize: 12,
    color: colors.bodyText,
    marginTop: 2,
  },
  lineItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headingText,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.headingText,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  methodHeading: {
    marginTop: 16,
    marginBottom: 8,
  },
  methodCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodTextWrap: {
    flex: 1,
    gap: 2,
  },
  methodValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headingText,
  },
  methodNote: {
    fontSize: 12,
    color: colors.bodyText,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
  },
  confirmButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
