import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import JoinRequestListItem from '@/components/matches/JoinRequestListItem';
import ManageMatchCard from '@/components/matches/ManageMatchCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { cancelJoinRequest, cancelMatch, getErrorMessage, listMine, listMyJoinRequests } from '@/services/matchService';
import type { Match, MineTab, MyJoinRequest } from '@/types/match';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  onBack: () => void;
  onOpenMatch: (matchId: number) => void;
  onManageSquad: (matchId: number) => void;
  onEditMatch: (matchId: number) => void;
};

const TABS: { key: MineTab; label: string; emptyText: string }[] = [
  { key: 'active', label: 'Active', emptyText: 'No active hosted matches.' },
  { key: 'completed', label: 'Completed', emptyText: 'No completed matches yet.' },
  { key: 'joinRequests', label: 'Requests', emptyText: 'No pending or rejected join requests.' },
];

/**
 * Manage/My Matches — Figma `101:98`, redesigned per `l3tmW`/`a6BBo`/
 * `N2FQP`/`M1ItLK` (see plan mục 2). Active/Completed use `GET
 * /matches/mine`; Requests uses `GET /matches/my-join-requests` — different
 * response shape, so kept as separate state rather than reusing `matches`.
 */
export default function ManageMatchesScreen({ onBack, onOpenMatch, onManageSquad, onEditMatch }: Props) {
  const [tab, setTab] = useState<MineTab>('active');
  const [matches, setMatches] = useState<Match[]>([]);
  const [joinRequests, setJoinRequests] = useState<MyJoinRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<MyJoinRequest | null>(null);
  const [cancelMatchTarget, setCancelMatchTarget] = useState<Match | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setStatus('loading');
      try {
        if (tab === 'joinRequests') {
          const result = await listMyJoinRequests();
          setJoinRequests(result.requests);
          setPendingCount(result.pendingCount);
        } else {
          const result = await listMine({ tab });
          setMatches(result.matches);
        }
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
    fetchData();
  }, [fetchData]);

  // Pending-count badge on the "Requests" tab must show even while on
  // Active/Completed — fetch it once on mount, independent of `tab`.
  useEffect(() => {
    listMyJoinRequests()
      .then((result) => setPendingCount(result.pendingCount))
      .catch(() => undefined);
  }, []);

  const handleConfirmCancelRequest = async () => {
    if (!cancelTarget) return;
    const request = cancelTarget;
    setCancelTarget(null);
    try {
      await cancelJoinRequest(request.match.matchId);
      setJoinRequests((prev) => prev.filter((r) => r.requestId !== request.requestId));
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const handleConfirmCancelMatch = async () => {
    if (!cancelMatchTarget) return;
    const match = cancelMatchTarget;
    setCancelMatchTarget(null);
    try {
      await cancelMatch(match.matchId);
      setMatches((prev) => prev.filter((m) => m.matchId !== match.matchId));
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const activeTab = TABS.find((item) => item.key === tab)!;
  const isEmpty = tab === 'joinRequests' ? joinRequests.length === 0 : matches.length === 0;

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
              {item.key === 'joinRequests' && pendingCount > 0 && (
                <View testID="manage-matches-requests-badge" style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
      >
        {status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : status === 'error' ? (
          <ErrorBanner message={errorMessage} onRetry={() => fetchData()} />
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={28} color={colors.outline} />
            <Text style={styles.emptyStateText}>{activeTab.emptyText}</Text>
          </View>
        ) : tab === 'joinRequests' ? (
          joinRequests.map((request) => (
            <JoinRequestListItem
              key={request.requestId}
              request={request}
              onPress={() => onOpenMatch(request.match.matchId)}
              onCancel={request.status === 'PENDING' ? () => setCancelTarget(request) : undefined}
            />
          ))
        ) : (
          matches.map((match) => (
            <ManageMatchCard
              key={match.matchId}
              match={match}
              variant={tab === 'completed' ? 'completed' : undefined}
              onManageSquad={() => onManageSquad(match.matchId)}
              onViewDetails={() => onOpenMatch(match.matchId)}
              onEditMatch={
                tab === 'active' && match.myRole === 'HOST'
                  ? () => onEditMatch(match.matchId)
                  : undefined
              }
              onCancelMatch={
                tab === 'active' && match.myRole === 'HOST'
                  ? () => setCancelMatchTarget(match)
                  : undefined
              }
            />
          ))
        )}
      </ScrollView>

      <ConfirmDialog
        visible={cancelTarget != null}
        title="Cancel request?"
        message="You'll be removed from the waiting list — you can join again later."
        confirmLabel="Cancel Request"
        cancelLabel="Keep Request"
        onConfirm={handleConfirmCancelRequest}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmDialog
        visible={cancelMatchTarget != null}
        title="Cancel this match?"
        message="Joiners will be notified. Pending requests are rejected. This cannot be undone."
        confirmLabel="Cancel Match"
        cancelLabel="Keep Match"
        onConfirm={handleConfirmCancelMatch}
        onCancel={() => setCancelMatchTarget(null)}
      />
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
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxs, paddingVertical: spacing.sm, borderRadius: 8 },
  tabButtonActive: { backgroundColor: colors.primaryDark },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.outline },
  tabTextActive: { color: colors.white },
  tabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: { fontSize: 9, fontWeight: '700', color: colors.white },

  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  spinner: { marginTop: spacing.xl },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  emptyStateText: { fontSize: 13, color: colors.outline, textAlign: 'center' },
});
