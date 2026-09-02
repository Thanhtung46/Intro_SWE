import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import ErrorBanner from '@/components/common/ErrorBanner';
import InfoDialog from '@/components/common/InfoDialog';
import GroupCard from '@/components/groups/GroupCard';
import GroupFilterSheet from '@/components/groups/GroupFilterSheet';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage } from '@/services/apiErrors';
import { joinGroup, listGroups, setGroupFavorite } from '@/services/groupService';
import type { Group } from '@/types/group';
import type { Sport } from '@/types/match';
import type { GroupFilters } from '@/types/groupFilters';
import { formatDistanceKm, haversineKm } from '@/utils/location';

type Status = 'loading' | 'ready' | 'error';

type JoinFeedback = {
  tone: 'success' | 'warning';
  title: string;
  message: string;
};

type Props = {
  sport: Sport;
  appliedLocation: string;
  filters: GroupFilters;
  filterVisible: boolean;
  viewerCoords?: { latitude: number; longitude: number } | null;
  onCloseFilter: () => void;
  onApplyFilters: (filters: GroupFilters) => void;
  onOpenGroup: (groupId: number) => void;
};

/**
 * Groups sub-tab browse list (Pencil "Matches - Homepage 2" frame) —
 * rendered by MatchesHomepageScreen when subTab==='groups', replacing the
 * old locked "coming soon" stub (Groups implementation plan §"MatchesHomepage
 * Screen.tsx changes"). Owns its own groups/status list-fetch state, same
 * shape as MatchesHomepageScreen's own match-list state; the filter sheet's
 * visibility/values are lifted to the parent because the trigger icon lives
 * in the shared search row, not in this component.
 */
export default function GroupsBrowseScreen({
  sport,
  appliedLocation,
  filters,
  filterVisible,
  viewerCoords = null,
  onCloseFilter,
  onApplyFilters,
  onOpenGroup,
}: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);
  const [joinFeedback, setJoinFeedback] = useState<JoinFeedback | null>(null);

  const fetchGroups = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setStatus('loading');
      try {
        // Distance mode (lat/lng/radiusKm) is XOR with free-text location and
        // province/city at the API level — send only one set.
        const distanceMode = filters.radiusKm != null && filters.latitude != null;
        const result = await listGroups({
          sport,
          skill: filters.skill.length ? filters.skill : undefined,
          favorited: filters.favorited,
          location: distanceMode ? undefined : appliedLocation || undefined,
          province: distanceMode ? undefined : filters.province,
          city: distanceMode ? undefined : filters.city,
          latitude: distanceMode ? filters.latitude : undefined,
          longitude: distanceMode ? filters.longitude : undefined,
          radiusKm: distanceMode ? filters.radiusKm : undefined,
        });
        setGroups(result.groups);
        setStatus('ready');
      } catch (err) {
        setErrorMessage(getErrorMessage(err));
        setStatus('error');
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [sport, appliedLocation, filters]
  );

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleToggleFavorite = async (group: Group) => {
    const nextFavorited = !group.isFavorited;
    setGroups((prev) => prev.map((g) => (g.groupId === group.groupId ? { ...g, isFavorited: nextFavorited } : g)));
    try {
      await setGroupFavorite(group.groupId, nextFavorited);
    } catch (err) {
      setGroups((prev) => prev.map((g) => (g.groupId === group.groupId ? { ...g, isFavorited: group.isFavorited } : g)));
      Alert.alert('Something went wrong', getErrorMessage(err));
    }
  };

  const handleJoin = async (group: Group) => {
    if (joiningGroupId != null) return;
    setJoiningGroupId(group.groupId);
    try {
      const result = await joinGroup(group.groupId);
      // Browse hides members + PENDING requests — drop the card immediately.
      setGroups((prev) => prev.filter((g) => g.groupId !== group.groupId));
      const accepted = result.request.status === 'ACCEPTED';
      setJoinFeedback(
        accepted
          ? {
              tone: 'success',
              title: 'Welcome!',
              message: 'You joined the group successfully. Find it anytime under Manage Groups.',
            }
          : {
              tone: 'success',
              title: 'Request sent',
              message: 'The group admin will review your request. We will let you know when they respond.',
            }
      );
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setJoiningGroupId(null);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchGroups(true)} />}
      >
        {status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : status === 'error' ? (
          <ErrorBanner message={errorMessage} onRetry={() => fetchGroups()} />
        ) : groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={28} color={colors.outline} />
            <Text style={styles.emptyStateText}>No groups found. Try a different sport or search.</Text>
          </View>
        ) : (
          groups.map((group) => {
            const distanceLabel =
              viewerCoords && group.latitude != null && group.longitude != null
                ? formatDistanceKm(
                    haversineKm(viewerCoords.latitude, viewerCoords.longitude, group.latitude, group.longitude)
                  )
                : null;
            return (
              <GroupCard
                key={group.groupId}
                group={group}
                distanceLabel={distanceLabel}
                joining={joiningGroupId === group.groupId}
                onPress={() => onOpenGroup(group.groupId)}
                onJoin={() => handleJoin(group)}
                onToggleFavorite={() => handleToggleFavorite(group)}
              />
            );
          })
        )}
      </ScrollView>

      <GroupFilterSheet
        visible={filterVisible}
        sport={sport}
        initialFilters={filters}
        onClose={onCloseFilter}
        onApply={onApplyFilters}
      />

      <InfoDialog
        visible={joinFeedback != null}
        tone={joinFeedback?.tone ?? 'success'}
        title={joinFeedback?.title ?? ''}
        message={joinFeedback?.message ?? ''}
        onDismiss={() => setJoinFeedback(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  spinner: { marginTop: spacing.xl },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  emptyStateText: { fontSize: 13, color: colors.outline, textAlign: 'center' },
});
