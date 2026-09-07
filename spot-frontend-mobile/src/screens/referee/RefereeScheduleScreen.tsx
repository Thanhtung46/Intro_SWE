import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { MONTH_NAMES_EN, MONTH_NAMES_VI, WEEKDAYS_MIN_EN, WEEKDAYS_MIN_VI } from '@/i18n/translations';
import { getErrorMessage } from '@/services/apiErrors';
import { getRefereeSchedule } from '@/services/refereeService';
import type { ScheduleItem } from '@/types/referee';
import { formatVnd } from '@/utils/format';
import { bangkokYmd, currentMonth, formatTimeRange } from '@/utils/refereeFormat';

type Props = { onOpenAssignment: (assignmentId: number) => void };
type Status = 'loading' | 'ready' | 'error';

function monthMeta(month: string) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  // Monday-first grid (WEEKDAYS_MIN_EN starts Mo).
  const leadingBlanks = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  return { year: y, monthIndex: m - 1, leadingBlanks, daysInMonth };
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function RefereeScheduleScreen({ onOpenAssignment }: Props) {
  const { t, language } = useLanguage();
  const monthNames = language === 'vi' ? MONTH_NAMES_VI : MONTH_NAMES_EN;
  const weekdayLabels = language === 'vi' ? WEEKDAYS_MIN_VI : WEEKDAYS_MIN_EN;
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedDates, setConfirmedDates] = useState<string[]>([]);
  const [items, setItems] = useState<ScheduleItem[]>([]);

  const fetch = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    setErrorMessage('');
    try {
      const res = await getRefereeSchedule(month);
      setConfirmedDates(res.confirmedDates);
      setItems(res.items);
      setStatus('ready');
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
      setStatus('error');
    }
  }, [month]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const meta = useMemo(() => monthMeta(month), [month]);
  const dotDays = useMemo(() => {
    const set = new Set<number>();
    for (const d of confirmedDates) {
      // BE sends full ISO UTC timestamps, not YYYY-MM-DD — bucket in Bangkok.
      const ymd = bangkokYmd(d);
      if (ymd.startsWith(`${month}-`)) set.add(Number(ymd.slice(8, 10)));
    }
    return set;
  }, [confirmedDates, month]);

  const cells: (number | null)[] = [
    ...Array(meta.leadingBlanks).fill(null),
    ...Array.from({ length: meta.daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('referee.schedule.title')}</Text>

      <View style={styles.calendar}>
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={() => setMonth((m) => shiftMonth(m, -1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.headingText} />
          </TouchableOpacity>
          <Text style={styles.calMonth}>
            {monthNames[meta.monthIndex]} {meta.year}
          </Text>
          <TouchableOpacity onPress={() => setMonth((m) => shiftMonth(m, 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={colors.headingText} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {weekdayLabels.map((d) => (
            <Text key={d} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.weekRow}>
            {row.map((day, ci) => (
              <View key={ci} style={styles.dayCell}>
                {day ? (
                  <>
                    <Text style={styles.dayText}>{day}</Text>
                    {dotDays.has(day) ? <View style={styles.dot} /> : null}
                  </>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>

      {status === 'loading' ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      {status === 'error' ? <ErrorBanner message={errorMessage} onRetry={fetch} /> : null}
      {status === 'ready' ? (
        <>
          <Text style={styles.listTitle}>{t('referee.schedule.matchesTotal').replace('{count}', String(items.length))}</Text>
          {items.length === 0 ? <Text style={styles.empty}>{t('referee.schedule.empty')}</Text> : null}
          {items.map((item) => (
            <TouchableOpacity
              key={item.assignmentId}
              style={[styles.item, !item.isUpcoming && styles.itemMuted]}
              onPress={() => onOpenAssignment(item.assignmentId)}
            >
              <View style={styles.itemLeft}>
                <Text style={styles.itemVenue}>{item.venueName}</Text>
                <Text style={styles.itemMeta}>
                  {item.sportType} · {formatTimeRange(item.startsAt, item.endsAt)}
                </Text>
                {item.playerName ? <Text style={styles.itemMeta}>{item.playerName}</Text> : null}
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemFee}>{formatVnd(item.feeVnd)}</Text>
                {!item.isUpcoming ? <Text style={styles.itemUpcoming}>{t('referee.schedule.upcoming')}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBackground },
  content: { padding: spacing.md, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: colors.headingText },
  calendar: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calMonth: { fontSize: 16, fontWeight: '800', color: colors.headingText },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.subtitle },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayText: { fontSize: 13, color: colors.headingText },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  loader: { marginTop: spacing.lg },
  listTitle: { fontSize: 14, fontWeight: '700', color: colors.subtitle },
  empty: { fontSize: 14, color: colors.subtitle, paddingVertical: spacing.md },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemMuted: { opacity: 0.6 },
  itemLeft: { flex: 1, gap: 2 },
  itemVenue: { fontSize: 15, fontWeight: '800', color: colors.headingText },
  itemMeta: { fontSize: 12, color: colors.subtitle },
  itemRight: { alignItems: 'flex-end', gap: 2 },
  itemFee: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  itemUpcoming: { fontSize: 10, fontWeight: '700', color: colors.subtitle },
});
