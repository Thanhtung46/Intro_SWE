import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { MONTH_ABBR_EN } from '@/i18n/translations';
import { getErrorMessage } from '@/services/apiErrors';
import { getRefereeEarnings, getRefereeEarningsHistory } from '@/services/refereeService';
import type { ChartPoint, EarningsHistoryItem } from '@/types/referee';
import { formatVnd } from '@/utils/format';
import { bangkokYmd, currentMonth } from '@/utils/refereeFormat';

type Status = 'loading' | 'ready' | 'error';
const PAGE = 20;
const CHART_HEIGHT = 140;
const MIN_BAR = 4;

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function barLabel(day: string): string {
  // BE sends a full ISO UTC timestamp, not YYYY-MM-DD — bucket in Bangkok.
  const [, m, d] = bangkokYmd(day).split('-');
  return `${MONTH_ABBR_EN[Number(m) - 1]} ${Number(d)}`;
}

export default function RefereeEarningsScreen() {
  const { t } = useLanguage();
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [totalFeeVnd, setTotalFeeVnd] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);

  const [history, setHistory] = useState<EarningsHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const fetchHistory = useCallback(async (offset: number) => {
    setHistoryLoading(true);
    try {
      const res = await getRefereeEarningsHistory(PAGE, offset);
      setHistory((prev) => (offset === 0 ? res.items : [...prev, ...res.items]));
      setHistoryTotal(res.total);
    } catch {
      // history is secondary — surface the main error path only
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  useEffect(() => {
    fetchHistory(0);
  }, [fetchHistory]);

  const maxAmount = Math.max(1, ...chartPoints.map((p) => p.amountVnd));

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
          <Text style={styles.sectionTitle}>{t('referee.earnings.performanceGrowth')}</Text>
          {chartPoints.length === 0 ? (
            <Text style={styles.empty}>{t('referee.earnings.emptyChart')}</Text>
          ) : (
            <View style={styles.chart}>
              {chartPoints.map((p) => (
                <View key={p.day} style={styles.barCol}>
                  <Text style={styles.barValue}>{Math.round(p.amountVnd / 1000)}k</Text>
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max(MIN_BAR, (p.amountVnd / maxAmount) * CHART_HEIGHT) },
                    ]}
                  />
                  <Text style={styles.barLabel}>{barLabel(p.day)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('referee.earnings.matchHistory')}</Text>
        {history.length === 0 && !historyLoading ? (
          <Text style={styles.empty}>{t('referee.earnings.emptyHistory')}</Text>
        ) : null}
        {history.map((h) => (
          <View key={h.assignmentId} style={styles.historyRow}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyVenue}>{h.venueName}</Text>
              <Text style={styles.historyMeta}>
                {h.sportType}
                {h.playerName ? ` · ${h.playerName}` : ''}
              </Text>
            </View>
            <Text style={styles.historyFee}>{formatVnd(h.feeVnd)}</Text>
          </View>
        ))}
        {history.length < historyTotal ? (
          <TouchableOpacity style={styles.loadMore} onPress={() => fetchHistory(history.length)} disabled={historyLoading}>
            {historyLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.loadMoreText}>{t('referee.earnings.loadMore')}</Text>
            )}
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
  empty: { fontSize: 13, color: colors.subtitle, paddingVertical: spacing.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, minHeight: CHART_HEIGHT + 40, paddingTop: spacing.md },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 10, color: colors.subtitle },
  bar: { width: '70%', borderRadius: 6, backgroundColor: colors.primary },
  barLabel: { fontSize: 9, color: colors.subtitle },
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
