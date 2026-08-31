import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import ManageTournamentCard from '@/components/tournaments/ManageTournamentCard';
import TournamentJoinRequestListItem from '@/components/tournaments/TournamentJoinRequestListItem';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage } from '@/services/apiErrors';
import {
  acceptTournamentRequest,
  listMyTournamentJoinRequests,
  listMyTournaments,
  rejectTournamentRequest,
  withdrawTournamentJoin,
} from '@/services/tournamentService';
import type {
  MyTournamentJoinRequest,
  Tournament,
  TournamentJoinRequest,
  TournamentMineTab,
} from '@/types/tournament';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  onBack: () => void;
  onOpenTournament: (tournamentId: number) => void;
};

const TABS: { key: TournamentMineTab; label: string }[] = [
  { key: 'hosted', label: 'Hosted by Me' },
  { key: 'joined', label: 'Joined' },
];

/**
 * Manage Tournaments (Pencil "Tournament - Manage (Hosted/Joined/Empty)"
 * frames) — mirrors ManageGroupsScreen: 2 tabs, each 2 stacked sections.
 * Hosted = My Tournaments + Pending Requests (inline accept/reject);
 * Joined = My Tournaments + My Join Requests.
 */
export default function ManageTournamentsScreen({ onBack, onOpenTournament }: Props) {
  const [tab, setTab] = useState<TournamentMineTab>('hosted');
  const [hostedTournaments, setHostedTournaments] = useState<Tournament[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TournamentJoinRequest[]>([]);
  const [joinedTournaments, setJoinedTournaments] = useState<Tournament[]>([]);
  const [myRequests, setMyRequests] = useState<MyTournamentJoinRequest[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<MyTournamentJoinRequest | null>(null);
  const [actingRequestId, setActingRequestId] = useState<number | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setStatus('loading');
      try {
        if (tab === 'hosted') {
          const [tournamentsResult, requestsResult] = await Promise.all([
            listMyTournaments({ tab: 'hosted' }),
            listMyTournaments({ tab: 'hosted', section: 'pending-requests' }),
          ]);
          setHostedTournaments(tournamentsResult.tournaments ?? []);
          setPendingRequests((requestsResult.requests as TournamentJoinRequest[]) ?? []);
        } else {
          const [tournamentsResult, requestsResult] = await Promise.all([
            listMyTournaments({ tab: 'joined' }),
            listMyTournamentJoinRequests(),
          ]);
          setJoinedTournaments(tournamentsResult.tournaments ?? []);
          setMyRequests(requestsResult.requests);
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

  const actOnRequest = async (
    requestId: number,
    action: (tournamentId: number, requestId: number) => Promise<void>
  ) => {
    const request = pendingRequests.find((r) => r.requestId === requestId);
    if (!request) return;
    setActingRequestId(requestId);
    try {
      await action(request.tournamentId, requestId);
      await fetchData();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setActingRequestId(null);
    }
  };

  const handleConfirmCancelRequest = async () => {
    if (!cancelTarget) return;
    const request = cancelTarget;
    setCancelTarget(null);
    try {
      await withdrawTournamentJoin(request.tournament.tournamentId);
      setMyRequests((prev) => prev.filter((r) => r.requestId !== request.requestId));
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const tournamentNameById = new Map(hostedTournaments.map((t) => [t.tournamentId, t.title]));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="manage-tournaments-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Tournaments</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((item) => {
          const isActive = item.key === tab;
          return (
            <TouchableOpacity
              key={item.key}
              testID={`manage-tournaments-tab-${item.key}`}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
      >
        {status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : status === 'error' ? (
          <ErrorBanner message={errorMessage} onRetry={() => fetchData()} />
        ) : tab === 'hosted' ? (
          <>
            <SectionHeader title="My Tournaments" count={hostedTournaments.length} />
            {hostedTournaments.length === 0 ? (
              <EmptyState text="You don't organize any tournaments yet." />
            ) : (
              hostedTournaments.map((tournament) => (
                <ManageTournamentCard
                  key={tournament.tournamentId}
                  tournament={tournament}
                  variant="hosted"
                  onManage={() => onOpenTournament(tournament.tournamentId)}
                  onViewDetails={() => onOpenTournament(tournament.tournamentId)}
                />
              ))
            )}

            <SectionHeader title="Pending Requests" count={pendingRequests.length} />
            {pendingRequests.length === 0 ? (
              <EmptyState text="No pending join requests." />
            ) : (
              pendingRequests.map((request) => (
                <View key={request.requestId} style={styles.requestCard}>
                  <View style={styles.requestRow}>
                    <View style={styles.avatar}>
                      {request.teamLogoUrl ? (
                        <Image source={{ uri: request.teamLogoUrl }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>{(request.teamName || 'T').charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName} numberOfLines={1} ellipsizeMode="tail">
                        {request.teamName}
                      </Text>
                      <Text style={styles.requestSub} numberOfLines={2} ellipsizeMode="tail">
                        wants to join {tournamentNameById.get(request.tournamentId) ?? 'this tournament'}
                        {request.captain.fullName ? ` · Capt. ${request.captain.fullName}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      testID={`decline-tournament-request-${request.requestId}`}
                      style={styles.declineButton}
                      disabled={actingRequestId === request.requestId}
                      onPress={() => actOnRequest(request.requestId, rejectTournamentRequest)}
                    >
                      <Text style={styles.declineButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`approve-tournament-request-${request.requestId}`}
                      style={styles.approveButton}
                      disabled={actingRequestId === request.requestId}
                      onPress={() => actOnRequest(request.requestId, acceptTournamentRequest)}
                    >
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <SectionHeader title="My Tournaments" count={joinedTournaments.length} />
            {joinedTournaments.length === 0 ? (
              <EmptyState text="You haven't joined any tournaments yet." />
            ) : (
              joinedTournaments.map((tournament) => (
                <ManageTournamentCard
                  key={tournament.tournamentId}
                  tournament={tournament}
                  variant="joined"
                  onManage={() => onOpenTournament(tournament.tournamentId)}
                  onViewDetails={() => onOpenTournament(tournament.tournamentId)}
                />
              ))
            )}

            <SectionHeader title="My Join Requests" count={myRequests.length} />
            {myRequests.length === 0 ? (
              <EmptyState text="No pending or rejected join requests." />
            ) : (
              myRequests.map((request) => (
                <TournamentJoinRequestListItem
                  key={request.requestId}
                  request={request}
                  onPress={() => onOpenTournament(request.tournament.tournamentId)}
                  onCancel={request.status === 'PENDING' ? () => setCancelTarget(request) : undefined}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={cancelTarget != null}
        title="Cancel request?"
        message="You can send a new request again later while registration is open."
        confirmLabel="Cancel Request"
        cancelLabel="Keep Request"
        onConfirm={handleConfirmCancelRequest}
        onCancel={() => setCancelTarget(null)}
      />
    </SafeAreaView>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>({count})</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={24} color={colors.outline} />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
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
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  spinner: { marginTop: spacing.xl },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  emptyStateText: { fontSize: 13, color: colors.outline, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.md },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.headingText },
  sectionCount: { fontSize: 15, fontWeight: '700', color: colors.outline },

  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  requestInfo: { flex: 1, gap: spacing.xxs },
  requestName: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  requestSub: { fontSize: 12, color: colors.outline },
  requestActions: { flexDirection: 'row', gap: spacing.sm },
  declineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  declineButtonText: { fontSize: 13, fontWeight: '700', color: colors.error, textAlign: 'center' },
  approveButton: { flex: 1, backgroundColor: colors.success, borderRadius: 10, paddingVertical: spacing.sm },
  approveButtonText: { fontSize: 13, fontWeight: '700', color: colors.white, textAlign: 'center' },
});
