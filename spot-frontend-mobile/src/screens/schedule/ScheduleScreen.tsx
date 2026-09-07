import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMySchedule, ScheduleItem } from '@/services/scheduleService';
import { useScheduleCache } from '@/state/scheduleCache';
import { useCancelledGuard } from '@/hooks/useCancelledGuard';
import { ReviewModal } from '@/components/ReviewModal';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import {
  MONTH_NAMES_EN,
  MONTH_NAMES_VI,
  MONTH_ABBR_EN,
  MONTH_ABBR_VI,
  WEEKDAYS_ABBR_EN,
  WEEKDAYS_ABBR_VI,
} from '@/i18n/translations';

export type ScheduleEvent = {
  id: string;
  date: Date;
  sportType: string;
  time: string;
  location: string;
  host?: string;
  /** Player's own role on a MATCH item — always null for BOOKING. */
  role: 'HOST' | 'PARTICIPANT' | null;
  /** Server-computed time bucket (schedule.entity.js::computeDisplayStatus) — rendered as-is, never re-derived here. */
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
  /** Server-sourced (schema_review.reviews) — survives refetch/remount, unlike relying only on the local "just submitted" Set. */
  alreadyReviewed: boolean;
  bookingId: number | null;
  itemType: 'BOOKING' | 'MATCH';
  matchId: number | null;
  totalAmountVnd: number | null;
  venueName: string;
  fieldName: string;
  address: string;
  /** Raw backend booking status (PENDING_PAYMENT/PAID/CHECKED_IN/NO_SHOW/COMPLETED) —
   * `status` above is the display bucket used for card branching. */
  rawStatus: string;
};

const DISPLAY_STATUS_MAP: Record<string, ScheduleEvent['status']> = {
  UPCOMING: 'upcoming',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isYesterday(date: Date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

function formatTimeRange(startsAt: string, endsAt: string): string {
  return `${timeFormatter.format(new Date(startsAt))} - ${timeFormatter.format(new Date(endsAt))}`;
}

function mapItemsToEvents(items: ScheduleItem[]): ScheduleEvent[] {
  return items.map((item) => ({
    id: `${item.type}-${item.bookingId}-${item.matchId ?? ''}`,
    date: new Date(item.bookingDate),
    sportType: item.sportType,
    time: formatTimeRange(item.startsAt, item.endsAt),
    location: item.fieldName ? `${item.venueName} • ${item.fieldName}` : item.venueName,
    host: item.hostName ?? undefined,
    role: item.role ?? null,
    status: DISPLAY_STATUS_MAP[item.displayStatus] ?? 'upcoming',
    alreadyReviewed: item.alreadyReviewed ?? false,
    bookingId: item.bookingId,
    itemType: item.type,
    matchId: item.matchId,
    totalAmountVnd: item.totalAmountVnd,
    venueName: item.venueName,
    fieldName: item.fieldName,
    address: item.address,
    rawStatus: item.status,
  }));
}

export function SportIcon({ type, color, size = 14 }: { type: string; color: string; size?: number }) {
  if (type.startsWith('Football')) {
    return <Ionicons name="football" size={size} color={color} />;
  }
  if (type.startsWith('Badminton')) {
    return <MaterialCommunityIcons name="badminton" size={size} color={color} />;
  }
  if (type.startsWith('Tennis')) {
    return <MaterialCommunityIcons name="tennis" size={size} color={color} />;
  }
  if (type.startsWith('Basketball')) {
    return <MaterialCommunityIcons name="basketball" size={size} color={color} />;
  }
  if (type.startsWith('Volleyball')) {
    return <MaterialCommunityIcons name="volleyball" size={size} color={color} />;
  }
  return <Ionicons name="football-outline" size={size} color={color} />;
}

type CalendarCell = {
  key: string;
  day: number;
  date: Date | null;
};

function buildCalendarGrid(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Mon

  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: `prev-${i}`, day: daysInPrevMonth - firstWeekday + 1 + i, date: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ key: `cur-${day}`, day, date: new Date(year, month, day) });
  }
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailing; i++) {
    cells.push({ key: `next-${i}`, day: i + 1, date: null });
  }

  return cells;
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export default function ScheduleScreen({
  justReviewedBookingId,
}: { justReviewedBookingId?: string } = {}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const MONTH_NAMES = language === 'vi' ? MONTH_NAMES_VI : MONTH_NAMES_EN;
  const MONTH_ABBR = language === 'vi' ? MONTH_ABBR_VI : MONTH_ABBR_EN;
  const WEEKDAY_LABELS = language === 'vi' ? WEEKDAYS_ABBR_VI : WEEKDAYS_ABBR_EN;
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const cache = useScheduleCache();
  const allEvents = cache.data ?? [];
  const fetchError = cache.error;
  /** Type filter (US3) — component-local, not persisted to device storage
   * (research.md §5): survives month navigation and tab re-visits within
   * the session since this screen stays mounted under the (tabs) group,
   * but resets on a full app restart. */
  const [selectedType, setSelectedType] = useState<'all' | 'BOOKING' | 'MATCH'>('all');
  const events = useMemo(
    () => (selectedType === 'all' ? allEvents : allEvents.filter((event) => event.itemType === selectedType)),
    [allEvents, selectedType],
  );
  const createGuard = useCancelledGuard();
  /** True only until the very first fetch (any month) resolves — later month
   * navigation keeps showing the previous month's events while refetching,
   * matching data-model.md rule 3 (never blank out last-known-good data). */
  const [isFirstLoad, setIsFirstLoad] = useState(cache.data === null);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<number>>(new Set());

  // Booking Details' own "Leave a review" flow reports back here (via the
  // `/schedule?reviewedBookingId=` route param) since that screen is a
  // separate stack entry with its own ReviewModal instance.
  useEffect(() => {
    const id = Number(justReviewedBookingId);
    if (justReviewedBookingId && !Number.isNaN(id)) {
      setReviewedBookingIds((prev) => new Set(prev).add(id));
    }
  }, [justReviewedBookingId]);

  const openEventDetails = (event: ScheduleEvent) => {
    if (event.itemType === 'MATCH' && event.matchId) {
      router.push(`/matches/${event.matchId}`);
      return;
    }
    if (event.itemType !== 'BOOKING' || event.bookingId == null) return;
    const bookingId = event.bookingId;
    router.push({
      pathname: '/booking/[id]',
      params: {
        id: String(bookingId),
        venueName: event.venueName,
        fieldName: event.fieldName,
        address: event.address,
        sportType: event.sportType,
        startTime: event.time.split(' - ')[0],
        endTime: event.time.split(' - ')[1],
        bookingDate: toLocalDateString(event.date),
        status: event.rawStatus,
        totalAmountVnd: event.totalAmountVnd != null ? String(event.totalAmountVnd) : '',
        alreadyReviewed: event.alreadyReviewed || reviewedBookingIds.has(bookingId) ? '1' : '0',
      },
    });
  };

  /** ~30s TTL (research.md §3) — a focus revisit re-fetches the current
   * month silently in the background once the cache is older than this. */
  const STALE_TTL_MS = 30_000;

  const fetchSchedule = useCallback(() => {
    const guard = createGuard();
    cache.setRefreshing(true);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const from = toLocalDateString(new Date(year, month, 1));
    const to = toLocalDateString(new Date(year, month + 1, 0));

    getMySchedule({ from, to }).then((result) => {
      if (guard.isCancelled()) return;
      if (result.success) {
        cache.applyResult(mapItemsToEvents(result.items ?? []));
      } else {
        cache.applyError(result.message ?? t('common.genericError'));
      }
      setIsFirstLoad(false);
    });
    return guard.cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cache/createGuard/t are stable
  }, [currentMonth]);

  useEffect(() => fetchSchedule(), [fetchSchedule]);

  useFocusEffect(
    useCallback(() => {
      if (!isFirstLoad && cache.isStale(STALE_TTL_MS)) {
        fetchSchedule();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- cache is stable; isFirstLoad/fetchSchedule intentionally re-derive the callback
    }, [fetchSchedule, isFirstLoad])
  );

  const calendarRows = useMemo(() => chunk(buildCalendarGrid(currentMonth), 7), [currentMonth]);

  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    return events.filter((event) => isSameDay(event.date, selectedDate));
  }, [events, selectedDate]);

  const goToMonth = (offset: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSelectedDate(null);
  };

  return (
    <SafeAreaView edges={[]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('schedule.title')}</Text>
          <Text style={styles.subtitle}>{t('schedule.subtitle')}</Text>
        </View>

        <View style={styles.typeFilterRow}>
          {(['all', 'BOOKING', 'MATCH'] as const).map((type) => {
            const label =
              type === 'all'
                ? t('schedule.filterAll')
                : type === 'BOOKING'
                  ? t('schedule.filterBookings')
                  : t('schedule.filterMatches');
            const isActive = selectedType === type;
            return (
              <TouchableOpacity
                key={type}
                testID={`schedule-filter-${type}`}
                style={[styles.typeFilterChip, isActive && styles.typeFilterChipActive]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[styles.typeFilterChipText, isActive && styles.typeFilterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Small, non-blocking background-revalidation indicator (T025) —
            only once real content is already on screen, never during the
            true-first-load state gated by isFirstLoad elsewhere below. */}
        {cache.isRefreshing && !isFirstLoad ? (
          <ActivityIndicator size="small" style={styles.refreshingIndicator} color={c.primary} />
        ) : null}

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>
              {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <View style={styles.monthNav}>
              <TouchableOpacity
                testID="schedule-prev-month"
                style={styles.monthNavButton}
                onPress={() => goToMonth(-1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                testID="schedule-next-month"
                style={styles.monthNavButton}
                onPress={() => goToMonth(1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward" size={20} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          {calendarRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.weekRow}>
              {row.map((cell) => {
                const hasEvent = cell.date ? events.some((event) => isSameDay(event.date, cell.date as Date)) : false;
                const isSelected = cell.date && selectedDate ? isSameDay(cell.date, selectedDate) : false;

                return (
                  <TouchableOpacity
                    key={cell.key}
                    testID={cell.date ? `schedule-day-${cell.date.getDate()}` : undefined}
                    style={styles.dayCell}
                    disabled={!cell.date}
                    onPress={() => cell.date && setSelectedDate(cell.date)}
                  >
                    <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                      <Text
                        style={[
                          styles.dayText,
                          !cell.date && styles.dayTextMuted,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </View>
                    {hasEvent && !isSelected ? <View style={styles.eventDot} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {fetchError ? <Text style={styles.errorText}>{fetchError}</Text> : null}

        {selectedDate ? (
          <View style={styles.matchesSection}>
            <Text style={styles.matchesLabel}>
              {t('schedule.matchesOnPrefix')}{MONTH_ABBR[selectedDate.getMonth()].toUpperCase()} {selectedDate.getDate()}
            </Text>

            {isFirstLoad ? (
              <ActivityIndicator style={styles.emptyState} color={c.primary} />
            ) : eventsForSelectedDate.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-remove-outline" size={28} color={c.textMuted} />
                <Text style={styles.emptyStateText}>{t('schedule.emptyDay')}</Text>
              </View>
            ) : (
              eventsForSelectedDate.map((event) => {
                const hostRow =
                  event.itemType === 'MATCH' ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="person-outline" size={16} color={c.textSecondary} />
                      <Text style={styles.detailText}>
                        {event.role === 'HOST'
                          ? t('schedule.roleHost')
                          : `${t('schedule.hostPrefix')}${event.host ?? t('schedule.hostUnavailable')}`}
                      </Text>
                    </View>
                  ) : null;

                if (event.status === 'upcoming' || event.status === 'in_progress') {
                  return (
                    <View key={event.id} style={styles.upcomingCard}>
                      <Text style={styles.cardStatusLabel}>
                        {t(event.status === 'in_progress' ? 'schedule.statusInProgress' : 'schedule.statusUpcoming')}
                      </Text>
                      <View style={styles.sportBadge}>
                        <SportIcon type={event.sportType} color={c.primary} />
                        <Text style={styles.sportBadgeText}>{event.sportType}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color={c.textSecondary} />
                        <Text style={styles.detailText}>{event.time}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color={c.textSecondary} />
                        <Text style={styles.detailText}>{event.location}</Text>
                      </View>
                      {hostRow}
                      <TouchableOpacity
                        testID={`schedule-match-details-${event.id}`}
                        style={styles.primaryButton}
                        onPress={() => openEventDetails(event)}
                      >
                        <Text style={styles.primaryButtonText}>
                          {t(event.itemType === 'MATCH' ? 'schedule.matchDetails' : 'schedule.details')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                if (event.status === 'cancelled') {
                  return (
                    <View key={event.id} style={styles.completedCard}>
                      <View style={styles.completedHeader}>
                        <Text style={styles.cardStatusLabel}>{t('schedule.statusCancelled')}</Text>
                      </View>
                      <View style={styles.sportBadge}>
                        <SportIcon type={event.sportType} color={c.primary} />
                        <Text style={styles.sportBadgeText}>{event.sportType}</Text>
                      </View>
                      <Text style={styles.detailText}>{event.location}</Text>
                      {hostRow}
                    </View>
                  );
                }

                return (
                  <View key={event.id} style={styles.completedCard}>
                    <View style={styles.completedHeader}>
                      <Text style={styles.cardStatusLabel}>{t('schedule.statusCompleted')}</Text>
                      <Ionicons name="checkmark-circle" size={20} color={c.successText} />
                    </View>
                    <View style={styles.sportBadge}>
                      <SportIcon type={event.sportType} color={c.primary} />
                      <Text style={styles.sportBadgeText}>{event.sportType}</Text>
                    </View>
                    <Text style={styles.completedDate}>
                      {isYesterday(event.date)
                        ? `${t('schedule.yesterdayPrefix')}${event.time.split(' - ')[0]}`
                        : `${MONTH_ABBR[event.date.getMonth()]} ${event.date.getDate()}, ${event.time.split(' - ')[0]}`}
                    </Text>
                    <Text style={styles.detailText}>{event.location}</Text>
                    {hostRow}
                    <TouchableOpacity
                      testID={`schedule-match-details-${event.id}`}
                      style={styles.outlineButton}
                      onPress={() => openEventDetails(event)}
                    >
                      <Text style={styles.outlineButtonText}>
                        {t(event.itemType === 'MATCH' ? 'schedule.matchDetails' : 'schedule.details')}
                      </Text>
                    </TouchableOpacity>
                    {event.itemType === 'BOOKING' && event.bookingId != null ? (
                      event.alreadyReviewed || reviewedBookingIds.has(event.bookingId) ? (
                        <Text style={styles.reviewedText}>{t('schedule.reviewed')}</Text>
                      ) : (
                        <TouchableOpacity
                          testID={`schedule-leave-review-${event.id}`}
                          style={styles.outlineButton}
                          onPress={() => setReviewBookingId(event.bookingId)}
                        >
                          <Text style={styles.outlineButtonText}>{t('schedule.leaveReview')}</Text>
                        </TouchableOpacity>
                      )
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        ) : null}
      </ScrollView>

      <ReviewModal
        visible={reviewBookingId !== null}
        bookingId={reviewBookingId}
        onClose={() => setReviewBookingId(null)}
        onSubmitted={(bookingId) => {
          setReviewedBookingIds((prev) => new Set(prev).add(bookingId));
          setReviewBookingId(null);
        }}
      />
    </SafeAreaView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 128,
    },
    header: {
      paddingTop: 48,
    },
    refreshingIndicator: {
      marginTop: 8,
    },
    typeFilterRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
    },
    typeFilterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.tintedSurface,
    },
    typeFilterChipActive: {
      backgroundColor: c.primary,
    },
    typeFilterChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    typeFilterChipTextActive: {
      color: c.white,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      color: c.textSecondary,
    },
    calendarCard: {
      marginTop: 20,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 16,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    calendarTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
    },
    monthNav: {
      flexDirection: 'row',
      gap: 8,
    },
    monthNavButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    weekRow: {
      flexDirection: 'row',
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
    },
    dayCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircleSelected: {
      backgroundColor: c.primary,
    },
    dayText: {
      fontSize: 14,
      color: c.textPrimary,
    },
    dayTextMuted: {
      color: c.textMuted,
    },
    dayTextSelected: {
      color: c.white,
      fontWeight: '700',
    },
    eventDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.primary,
      marginTop: 2,
    },
    errorText: {
      marginTop: 12,
      fontSize: 13,
      color: c.textSecondary,
    },
    matchesSection: {
      marginTop: 24,
    },
    matchesLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 32,
      backgroundColor: c.tintedSurface,
      borderRadius: 16,
    },
    emptyStateText: {
      fontSize: 14,
      color: c.textSecondary,
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
      marginTop: 8,
      marginBottom: 12,
    },
    sportBadgeText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.primary,
    },
    cardStatusLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.5,
    },
    upcomingCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.primary,
      padding: 16,
      marginBottom: 16,
    },
    completedCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.tintedSurface,
      padding: 16,
      marginBottom: 16,
    },
    completedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    completedDate: {
      fontSize: 13,
      color: c.textSecondary,
      marginBottom: 4,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    detailText: {
      fontSize: 14,
      color: c.textPrimary,
    },
    primaryButton: {
      marginTop: 4,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: c.white,
      fontSize: 15,
      fontWeight: '700',
    },
    outlineButton: {
      marginTop: 8,
      borderWidth: 1.5,
      borderColor: c.primary,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    outlineButtonText: {
      color: c.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    reviewedText: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      textAlign: 'center',
    },
  });
}
