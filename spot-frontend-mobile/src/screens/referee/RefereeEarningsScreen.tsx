import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ErrorBanner from '@/components/common/ErrorBanner';
import EarningsChart, { EarningsChartDatum } from '@/components/referee/EarningsChart';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { MONTH_ABBR_EN, MONTH_ABBR_VI } from '@/i18n/translations';
import { getErrorMessage } from '@/services/apiErrors';
import {
  getRefereeEarnings,
  getRefereeEarningsHistory,
  getRefereeEarningsMonthly,
} from '@/services/refereeService';
import type { ChartPoint, EarningsBucket, EarningsHistoryItem } from '@/types/referee';
import { formatVnd } from '@/utils/format';
import {
  bangkokYmd,
  currentMonth,
  formatWhen,
  recentMonths,
  weekKeyOf,
  weeksOfMonth,
} from '@/utils/refereeFormat';

type Status = 'loading' | 'ready' | 'error';
type ChartMode = 'week' | 'month';
const MONTHS_BACK = 6;
const HISTORY_PREVIEW = 2; // rows shown before "View All"
const HISTORY_MAX = 50; // one page is plenty for a single month

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function RefereeEarningsScreen() {
  const { t, language } = useLanguage();
  const monthAbbr = language === 'vi' ? MONTH_ABBR_VI : MONTH_ABBR_EN;
  const [month, setMonth] = useState(currentMonth());
  const [chartMode, setChartMode] = useState<ChartMode>('week');
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [totalFeeVnd, setTotalFeeVnd] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [monthlyBuckets, setMonthlyBuckets] = useState<EarningsBucket[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [history, setHistory] = useState<EarningsHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const fetchEarnings = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    setErrorMessage('');
    try {
      const res = await getRefereeEarnings(month);
      setTotalFeeVnd(res.totalFeeVnd);
      setMatchCount(res.matchCount);
      setChartPoints(res.chartPoints);
      setStatus('ready');
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
      setStatus('error');
    }
  }, [month]);

  // Match History tracks the month picker: only that month's completed matches.
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryExpanded(false);
    try {
      const res = await getRefereeEarningsHistory({ month, limit: HISTORY_MAX });
      setHistory(res.items);
      setHistoryTotal(res.total);
    } catch {
      // history is secondary — surface the main error path only
    } finally {
      setHistoryLoading(false);
    }
  }, [month]);

  const todayYmd = bangkokYmd(new Date().toISOString());
  const thisMonth = currentMonth();

  // The month-trend chart is always the last N months up to *now* — the
  // month-picker arrows only scope the total card + the weekly view.
  const fetchMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const res = await getRefereeEarningsMonthly({ anchor: thisMonth, months: MONTHS_BACK });
      setMonthlyBuckets(res.buckets);
    } catch {
      setMonthlyBuckets([]);
    } finally {
      setMonthlyLoading(false);
    }
  }, [thisMonth]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (chartMode === 'month') fetchMonthly();
  }, [chartMode, fetchMonthly]);

  const weekData = useMemo<EarningsChartDatum[]>(() => {
    const sums: Record<string, number> = {};
    for (const p of chartPoints) {
      const wk = weekKeyOf(bangkokYmd(p.day));
      sums[wk] = (sums[wk] ?? 0) + p.amountVnd;
    }
    return weeksOfMonth(month).map((w) => {
      const amountVnd = sums[w.key] ?? 0;
      return {
        key: w.key,
        label: t('referee.earnings.weekLabel').replace('{n}', String(w.index)),
        amountVnd,
        // "not started yet" only when the week's Monday is ahead *and* there's
        // nothing recorded (earnings prove the period has happened).
        future: amountVnd === 0 && w.key > todayYmd,
      };
    });
  }, [chartPoints, month, t, todayYmd]);

  const monthData = useMemo<EarningsChartDatum[]>(() => {
    const byKey = Object.fromEntries(monthlyBuckets.map((b) => [b.key, b.amountVnd]));
    return recentMonths(thisMonth, MONTHS_BACK).map((m) => {
      const amountVnd = byKey[m.key] ?? 0;
      return {
        key: m.key,
        label: monthAbbr[m.monthIndex],
        amountVnd,
        future: amountVnd === 0 && m.key > thisMonth,
      };
    });
  }, [monthlyBuckets, thisMonth, monthAbbr]);

  const isWeek = chartMode === 'week';
  const chartData = isWeek ? weekData : monthData;
  // Accent bar = the period the user is looking at: the current week when the
  // picker is on the calendar-current month, or the picked month itself in
  // month mode. (The month *window* is still fixed to the last N calendar
  // months — see the caption below.)
  const currentKey = isWeek
    ? month === thisMonth
      ? weekKeyOf(todayYmd)
      : undefined
    : month;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('referee.earnings.title')}</Text>

      <View style={styles.totalCard}>
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => setMonth((m) => shiftMonth(m, -1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{month}</Text>
          <TouchableOpacity onPress={() => setMonth((m) => shiftMonth(m, 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.totalValue}>{formatVnd(totalFeeVnd)}</Text>
        <Text style={styles.totalSub}>
          {t('referee.earnings.totalThisMonth')} · {t('referee.earnings.matches').replace('{count}', String(matchCount))}
        </Text>
      </View>

      {status === 'loading' ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      {status === 'error' ? <ErrorBanner message={errorMessage} onRetry={fetchEarnings} /> : null}

      {status === 'ready' ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{t('referee.earnings.performanceGrowth')}</Text>
            <View style={styles.modeToggle}>
              {(['week', 'month'] as ChartMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeButton, chartMode === m && styles.modeButtonActive]}
                  onPress={() => setChartMode(m)}
                >
                  <Text style={[styles.modeText, chartMode === m && styles.modeTextActive]}>
                    {t(m === 'week' ? 'referee.earnings.viewWeek' : 'referee.earnings.viewMonth')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {chartMode === 'month' ? (
            <Text style={styles.chartNote}>
              {t('referee.earnings.monthlyNote').replace('{n}', String(MONTHS_BACK))}
            </Text>
          ) : null}
          {chartMode === 'month' && monthlyLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.chartLoader} />
          ) : (
            <EarningsChart data={chartData} currentKey={currentKey} />
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('referee.earnings.matchHistory')}</Text>
        {historyLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.chartLoader} />
        ) : history.length === 0 ? (
          <Text style={styles.empty}>{t('referee.earnings.emptyHistory')}</Text>
        ) : null}
        {(historyExpanded ? history : history.slice(0, HISTORY_PREVIEW)).map((h) => (
          <View key={h.assignmentId} style={styles.historyRow}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyVenue}>{h.venueName}</Text>
              <Text style={styles.historyMeta}>{formatWhen(h.startsAt, null)}</Text>
              <Text style={styles.historyMeta}>
                {h.sportType}
                {h.playerName ? ` · ${h.playerName}` : ''}
              </Text>
            </View>
            <Text style={styles.historyFee}>{formatVnd(h.feeVnd)}</Text>
          </View>
        ))}
        {historyTotal > HISTORY_PREVIEW ? (
          <TouchableOpacity style={styles.loadMore} onPress={() => setHistoryExpanded((v) => !v)}>
            <Text style={styles.loadMoreText}>
              {historyExpanded
                ? t('referee.earnings.showLess')
                : t('referee.earnings.viewAll').replace('{n}', String(historyTotal))}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.screenBackground },
  content: { padding: spacing.md, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: colors.headingText },
  totalCard: { backgroundColor: colors.primary, borderRadius: 20, padding: spacing.lg, gap: 6 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { fontSize: 13, fontWeight: '700', color: colors.white, opacity: 0.9 },
  totalValue: { fontSize: 32, fontWeight: '900', color: colors.white },
  totalSub: { fontSize: 12, color: colors.white, opacity: 0.85 },
  loader: { marginTop: spacing.lg },
  section: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.headingText },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeToggle: { flexDirection: 'row', backgroundColor: colors.selectedBackground, borderRadius: 10, padding: 3 },
  modeButton: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
  modeButtonActive: { backgroundColor: colors.primary },
  modeText: { fontSize: 12, fontWeight: '700', color: colors.subtitle },
  modeTextActive: { color: colors.white },
  chartLoader: { marginVertical: spacing.xl },
  chartNote: { fontSize: 11, color: colors.subtitle, marginTop: -spacing.xs },
  empty: { fontSize: 13, color: colors.subtitle, paddingVertical: spacing.sm },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyLeft: { flex: 1, gap: 2 },
  historyVenue: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  historyMeta: { fontSize: 12, color: colors.subtitle },
  historyFee: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  loadMore: { alignItems: 'center', paddingVertical: spacing.sm },
  loadMoreText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
