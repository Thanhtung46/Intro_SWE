import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SportIcon } from '@/screens/schedule/ScheduleScreen';
import { ReviewModal } from '@/components/ReviewModal';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { MONTH_ABBR_EN, MONTH_ABBR_VI, TranslationKey } from '@/i18n/translations';
import { formatVnd } from '@/utils/format';

type Props = {
  bookingId: number;
  venueName: string;
  fieldName: string;
  address: string;
  sportType: string;
  startTime: string;
  endTime: string;
  /** YYYY-MM-DD */
  bookingDate: string;
  /** Raw backend booking status — PENDING_PAYMENT | PAID | CHECKED_IN | NO_SHOW | COMPLETED. */
  status: string;
  totalAmountVnd: number | null;
  alreadyReviewed: boolean;
  onBack: () => void;
  onOpenDirections: () => void;
  onReviewSubmitted: (bookingId: number) => void;
};

function statusLabelKey(status: string): TranslationKey {
  switch (status) {
    case 'COMPLETED':
      return 'schedule.statusCompleted';
    case 'PENDING_PAYMENT':
      return 'bookingDetail.statusPendingPayment';
    case 'CHECKED_IN':
      return 'bookingDetail.statusCheckedIn';
    case 'NO_SHOW':
      return 'bookingDetail.statusNoShow';
    case 'PAID':
    default:
      return 'bookingDetail.statusPaid';
  }
}

/** Booking Details — the non-Match branch of Schedule's "Match Details" button
 * (see ScheduleScreen.tsx's openEventDetails). No cancel-booking action by
 * product decision. */
export default function BookingDetailScreen({
  bookingId,
  venueName,
  fieldName,
  address,
  sportType,
  startTime,
  endTime,
  bookingDate,
  status,
  totalAmountVnd,
  alreadyReviewed,
  onBack,
  onOpenDirections,
  onReviewSubmitted,
}: Props) {
  const { t, language } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [reviewed, setReviewed] = useState(alreadyReviewed);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const monthAbbr = language === 'vi' ? MONTH_ABBR_VI : MONTH_ABBR_EN;
  const dateLabel = useMemo(() => {
    const [year, month, day] = bookingDate.split('-').map(Number);
    if (!year || !month || !day) return bookingDate;
    return `${monthAbbr[month - 1]} ${day}, ${year}`;
  }, [bookingDate, monthAbbr]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="booking-detail-back"
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('bookingDetail.backLabel')}
        >
          <Ionicons name="arrow-back" size={20} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bookingDetail.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.sportBadge}>
            <SportIcon type={sportType} color={c.primary} />
            <Text style={styles.sportBadgeText}>{sportType}</Text>
          </View>

          <Text style={styles.venueName}>{venueName}</Text>
          <Text style={styles.fieldName}>{fieldName}</Text>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={c.textSecondary} />
            <Text style={styles.detailText}>{address}</Text>
          </View>

          <TouchableOpacity
            testID="booking-detail-directions"
            style={styles.outlineButton}
            onPress={onOpenDirections}
          >
            <Ionicons name="navigate-outline" size={16} color={c.primary} />
            <Text style={styles.outlineButtonText}>{t('bookingDetail.directionsButton')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('bookingDetail.dateLabel')}</Text>
            <Text style={styles.infoValue}>{dateLabel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('bookingDetail.timeLabel')}</Text>
            <Text style={styles.infoValue}>{startTime} - {endTime}</Text>
          </View>
          {totalAmountVnd != null ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('bookingDetail.totalPaidLabel')}</Text>
              <Text style={styles.infoValue}>{formatVnd(totalAmountVnd)}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('bookingDetail.statusLabel')}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{t(statusLabelKey(status))}</Text>
            </View>
          </View>
        </View>

        {status === 'COMPLETED' ? (
          reviewed ? (
            <Text style={styles.reviewedText}>{t('bookingDetail.reviewedLabel')}</Text>
          ) : (
            <TouchableOpacity
              testID="booking-detail-leave-review"
              style={styles.primaryButton}
              onPress={() => setReviewModalVisible(true)}
            >
              <Text style={styles.primaryButtonText}>{t('bookingDetail.leaveReviewButton')}</Text>
            </TouchableOpacity>
          )
        ) : null}
      </ScrollView>

      <ReviewModal
        visible={reviewModalVisible}
        bookingId={bookingId}
        themeColors={c}
        onClose={() => setReviewModalVisible(false)}
        onSubmitted={(id) => {
          setReviewed(true);
          setReviewModalVisible(false);
          onReviewSubmitted(id);
        }}
      />
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
    backButton: {
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
    content: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 16,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
      gap: 8,
    },
    sportBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: c.tintedSurface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      marginBottom: 4,
    },
    sportBadgeText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.primary,
    },
    venueName: {
      fontSize: 20,
      fontWeight: '800',
      color: c.textPrimary,
    },
    fieldName: {
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 4,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailText: {
      flex: 1,
      fontSize: 14,
      color: c.textPrimary,
    },
    outlineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 8,
      borderWidth: 1.5,
      borderColor: c.primary,
      borderRadius: 12,
      paddingVertical: 10,
    },
    outlineButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.primary,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    infoLabel: {
      fontSize: 14,
      color: c.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textPrimary,
    },
    statusBadge: {
      backgroundColor: c.tintedSurface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
    },
    primaryButton: {
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: c.white,
      fontSize: 15,
      fontWeight: '700',
    },
    reviewedText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
      textAlign: 'center',
    },
  });
}
