import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import GroupJoinRequestListItem from '@/components/groups/GroupJoinRequestListItem';
import ManageGroupCard from '@/components/groups/ManageGroupCard';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
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
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const tabs: { key: GroupMineTab; label: string }[] = [
    { key: 'managed', label: t('groups.tabs.managed') },
    { key: 'joined', label: t('groups.tabs.joined') },
  ];
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

  // Refresh on focus (incl. first mount) so Managed/Joined stays accurate after transfer.
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

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
        <TouchableOpacity testID="manage-groups-back" style={styles.backButton} onPress={onBack} accessibilityLabel={t('groups.actions.back')}>
          <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('groups.manage.title')}</Text>
        <View style={styles.backButtonSpacer} />
      </View>

      <View style={styles.tabs}>
        {tabs.map((item) => {
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
            <SectionHeader title={t('groups.manage.myGroups')} count={managedGroups.length} />
            {managedGroups.length === 0 ? (
              <EmptyState text={t('groups.manage.noManaged')} />
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

            <SectionHeader title={t('groups.manage.pendingRequests')} count={pendingRequests.length} />
            {pendingRequests.length === 0 ? (
              <EmptyState text={t('groups.manage.noPending')} />
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
                        {t('groups.manage.requestedToJoin')} {groupNameById.get(request.groupId) ?? t('groups.manage.thisGroup')}
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
                      <Text style={styles.declineButtonText}>{t('groups.actions.reject')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`approve-group-request-${request.requestId}`}
                      style={styles.approveButton}
                      disabled={actingRequestId === request.requestId}
                      onPress={() => handleAccept(request.requestId)}
                    >
                      <Text style={styles.approveButtonText}>{t('groups.actions.accept')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <SectionHeader title={t('groups.manage.joinedGroups')} count={joinedGroups.length} />
            {joinedGroups.length === 0 ? (
              <EmptyState text={t('groups.manage.noJoined')} />
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

            <SectionHeader title={t('groups.manage.myJoinRequests')} count={myRequests.length} />
            {myRequests.length === 0 ? (
              <EmptyState text={t('groups.manage.noJoinRequests')} />
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
        title={t('groups.confirm.cancelTitle')}
        message={t('groups.confirm.cancelMessage')}
        confirmLabel={t('groups.actions.cancelRequest')}
        cancelLabel={t('groups.actions.keepRequest')}
        onConfirm={handleConfirmCancelRequest}
        onCancel={() => setCancelTarget(null)}
      />
    </SafeAreaView>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>({count})</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={24} color={colors.textMuted} />
      <Text style={styles.emptyStateText}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackgroundAlt },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: { width: 36 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.xxs,
    borderRadius: 12,
    backgroundColor: colors.tintedSurface,
    gap: spacing.xxs,
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 8 },
  tabButtonActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: colors.white },

  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  spinner: { marginTop: spacing.xl },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  emptyStateText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.md },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  sectionCount: { fontSize: 15, fontWeight: '700', color: colors.textMuted },

  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
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
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  requestInfo: { flex: 1, gap: spacing.xxs },
  requestName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  requestGroupName: { fontSize: 12, color: colors.textMuted },
  requestActions: { flexDirection: 'row', gap: spacing.sm },
  declineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 10,
    paddingVertical: spacing.sm,
  },
  declineButtonText: { fontSize: 13, fontWeight: '700', color: colors.error, textAlign: 'center' },
  approveButton: { flex: 1, backgroundColor: colors.successText, borderRadius: 10, paddingVertical: spacing.sm },
  approveButtonText: { fontSize: 13, fontWeight: '700', color: colors.white, textAlign: 'center' },
});
