import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import GroupJoinRequestListItem from '@/components/groups/GroupJoinRequestListItem';
import ManageGroupCard from '@/components/groups/ManageGroupCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import {
  acceptGroupJoinRequest,
  cancelGroupJoinRequest,
  listMyGroupJoinRequests,
  listMyGroups,
  rejectGroupJoinRequest,
} from '@/services/groupService';
import { getErrorMessage } from '@/services/apiErrors';
import type { Group, GroupJoinRequest, GroupMineTab, MyGroupJoinRequest } from '@/types/group';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  onBack: () => void;
  onOpenGroup: (groupId: number) => void;
  onOpenGroupRequests: (groupId: number) => void;
};

const TABS: { key: GroupMineTab; label: string }[] = [
  { key: 'managed', label: 'Managed' },
  { key: 'joined', label: 'Joined' },
];

/**
 * Manage Groups (Pencil "Matches - Manage Group" + "Managed by Me" +
 * "Joined Groups" frames, Groups implementation plan). 2 tabs, each **2
 * stacked sections on one screen** (resolved decision #2 — not a toggle):
 * Managed = My Groups + Pending Requests (inline accept/reject, resolved
 * decision #5); Joined = Joined Groups + My Join Requests. Loosely mirrors
 * ManageMatchesScreen.tsx's shell, but that screen's 3 tabs each show one
 * flat list — this screen's 2 tabs each show two.
 */
export default function ManageGroupsScreen({ onBack, onOpenGroup, onOpenGroupRequests }: Props) {
  const [tab, setTab] = useState<GroupMineTab>('managed');
  const [managedGroups, setManagedGroups] = useState<Group[]>([]);
  const [pendingRequests, setPendingRequests] = useState<GroupJoinRequest[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([]);
  const [myRequests, setMyRequests] = useState<MyGroupJoinRequest[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<MyGroupJoinRequest | null>(null);
  const [actingRequestId, setActingRequestId] = useState<number | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setStatus('loading');
      try {
        if (tab === 'managed') {
          const [groupsResult, requestsResult] = await Promise.all([
            listMyGroups({ tab: 'managed' }),
            listMyGroups({ tab: 'managed', section: 'pending-requests' }),
          ]);
          setManagedGroups(groupsResult.groups ?? []);
          setPendingRequests((requestsResult.requests as GroupJoinRequest[]) ?? []);
        } else {
          const [groupsResult, requestsResult] = await Promise.all([
            listMyGroups({ tab: 'joined' }),
            listMyGroupJoinRequests(),
          ]);
          setJoinedGroups(groupsResult.groups ?? []);
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

  const handleAccept = async (requestId: number) => {
    setActingRequestId(requestId);
    try {
      await acceptGroupJoinRequest(pendingRequests.find((r) => r.requestId === requestId)!.groupId, requestId);
      await fetchData();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setActingRequestId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    setActingRequestId(requestId);
    try {
      await rejectGroupJoinRequest(pendingRequests.find((r) => r.requestId === requestId)!.groupId, requestId);
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
      await cancelGroupJoinRequest(request.group.groupId);
      setMyRequests((prev) => prev.filter((r) => r.requestId !== request.requestId));
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    }
  };

  const groupNameById = new Map(managedGroups.map((g) => [g.groupId, g.name]));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="manage-groups-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Groups</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((item) => {
          const isActive = item.key === tab;
          return (
            <TouchableOpacity
              key={item.key}
              testID={`manage-groups-tab-${item.key}`}
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
        ) : tab === 'managed' ? (
          <>
            <SectionHeader title="My Groups" count={managedGroups.length} />
            {managedGroups.length === 0 ? (
              <EmptyState text="You don't manage any groups yet." />
            ) : (
              managedGroups.map((group) => (
                <ManageGroupCard
                  key={group.groupId}
                  group={group}
                  variant="managed"
                  onManage={() => onOpenGroupRequests(group.groupId)}
                  onViewDetails={() => onOpenGroup(group.groupId)}
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
                      {request.avatarUrl ? (
                        <Image source={{ uri: request.avatarUrl }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>{(request.fullName || 'P').charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName} numberOfLines={1} ellipsizeMode="tail">
                        {request.fullName}
                      </Text>
                      <Text style={styles.requestGroupName} numberOfLines={1} ellipsizeMode="tail">
                        Requested to join {groupNameById.get(request.groupId) ?? 'this group'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      testID={`decline-group-request-${request.requestId}`}
                      style={styles.declineButton}
                      disabled={actingRequestId === request.requestId}
                      onPress={() => handleReject(request.requestId)}
                    >
                      <Text style={styles.declineButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`approve-group-request-${request.requestId}`}
                      style={styles.approveButton}
                      disabled={actingRequestId === request.requestId}
                      onPress={() => handleAccept(request.requestId)}
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
            <SectionHeader title="Joined Groups" count={joinedGroups.length} />
            {joinedGroups.length === 0 ? (
              <EmptyState text="You haven't joined any groups yet." />
            ) : (
              joinedGroups.map((group) => (
                <ManageGroupCard
                  key={group.groupId}
                  group={group}
                  variant="joined"
                  onManage={() => onOpenGroupRequests(group.groupId)}
                  onViewDetails={() => onOpenGroup(group.groupId)}
                />
              ))
            )}

            <SectionHeader title="My Join Requests" count={myRequests.length} />
            {myRequests.length === 0 ? (
              <EmptyState text="No pending or rejected join requests." />
            ) : (
              myRequests.map((request) => (
                <GroupJoinRequestListItem
                  key={request.requestId}
                  request={request}
                  onPress={() => onOpenGroup(request.group.groupId)}
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
        message="You can send a new request again later."
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
      <Ionicons name="people-outline" size={24} color={colors.outline} />
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
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
  requestGroupName: { fontSize: 12, color: colors.outline },
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
