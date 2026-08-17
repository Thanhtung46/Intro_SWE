import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import MatchCard from '@/components/matches/MatchCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage, listMine, setFavorite } from '@/services/matchService';
import type { Match, MineTab } from '@/types/match';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  onBack: () => void;
  onOpenMatch: (matchId: number) => void;
};

const TABS: { key: MineTab; label: string; emptyText: string }[] = [
  { key: 'active', label: 'Active', emptyText: 'No active hosted matches.' },
  { key: 'completed', label: 'Completed', emptyText: 'No completed matches yet.' },
];

/**
 * Manage/My Matches — new scope (SPOT-76 plan mục 4), the "Manage Matches"
 * action of the Homepage FAB speed-dial (mục 2.5). Not one of the original
 * 6 Figma screens; `GET /matches/mine` was already Done in spot-backend.
 */
export default function ManageMatchesScreen({ onBack, onOpenMatch }: Props) {
  const [tab, setTab] = useState<MineTab>('active');
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchMine = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setStatus('loading');
      try {
        const result = await listMine({ tab });
        setMatches(result.matches);
        setStatus('ready');
      } catch (err) {
        setErrorMessage(getErrorMessage(err));
        setStatus('error');
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [tab]
  );

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  const handleToggleFavorite = async (match: Match) => {
    const nextFavorited = !match.isFavorited;
    setMatches((prev) => prev.map((m) => (m.matchId === match.matchId ? { ...m, isFavorited: nextFavorited } : m)));
    try {
      await setFavorite(match.matchId, nextFavorited);
    } catch {
      setMatches((prev) => prev.map((m) => (m.matchId === match.matchId ? { ...m, isFavorited: match.isFavorited } : m)));
    }
  };

  const activeTab = TABS.find((item) => item.key === tab)!;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="manage-matches-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Matches</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((item) => {
          const isActive = item.key === tab;
          return (
            <TouchableOpacity
              key={item.key}
              testID={`manage-matches-tab-${item.key}`}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMine(true)} />}
      >
        {status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : status === 'error' ? (
          <ErrorBanner message={errorMessage} onRetry={() => fetchMine()} />
        ) : matches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={28} color={colors.outline} />
            <Text style={styles.emptyStateText}>{activeTab.emptyText}</Text>
          </View>
        ) : (
          matches.map((match) => (
            <MatchCard
              key={match.matchId}
              match={match}
              onPress={() => onOpenMatch(match.matchId)}
              onToggleFavorite={() => handleToggleFavorite(match)}
              onShare={() => undefined}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: { width: 36 },
  title: { fontSize: 18, fontWeight: '700', color: colors.headingText },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.xxs,
    borderRadius: 12,
    backgroundColor: colors.iconBackground,
    gap: spacing.xxs,
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 8 },
  tabButtonActive: { backgroundColor: colors.primaryDark },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.outline },
  tabTextActive: { color: colors.white },

  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  spinner: { marginTop: spacing.xl },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  emptyStateText: { fontSize: 13, color: colors.outline, textAlign: 'center' },
});
