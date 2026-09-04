import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import ErrorBanner from '@/components/common/ErrorBanner';
import TournamentCard from '@/components/tournaments/TournamentCard';
import TournamentFilterSheet from '@/components/tournaments/TournamentFilterSheet';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage } from '@/services/apiErrors';
import { listTournaments } from '@/services/tournamentService';
import type { Sport } from '@/types/match';
import type { Tournament } from '@/types/tournament';
import type { TournamentFilters } from '@/types/tournamentFilters';
import { formatDistanceKm, haversineKm } from '@/utils/location';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  sport: Sport;
  appliedLocation: string;
  filters: TournamentFilters;
  filterVisible: boolean;
  viewerCoords?: { latitude: number; longitude: number } | null;
  onCloseFilter: () => void;
  onApplyFilters: (filters: TournamentFilters) => void;
  onOpenTournament: (tournamentId: number) => void;
  /** Card "Join Tournament" — opens captain registration form. */
  onJoinTournament: (tournamentId: number) => void;
};

/**
 * Tournaments sub-tab browse list (Pencil "Matches - Homepage 3" frame) —
 * rendered by MatchesHomepageScreen when subTab==='tournaments', replacing the
 * old locked "coming soon" stub. Copied from GroupsBrowseScreen.tsx; the
 * filter sheet's visibility/values are lifted to the parent because the trigger
 * icon lives in the shared search row.
 */
export default function TournamentsBrowseScreen({
  sport,
  appliedLocation,
  filters,
  filterVisible,
  viewerCoords = null,
  onCloseFilter,
  onApplyFilters,
  onOpenTournament,
  onJoinTournament,
}: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchTournaments = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setStatus('loading');
      try {
        // Distance mode (lat/lng/radiusKm) is XOR with free-text location and
        // province/city at the API level — send only one set.
        const distanceMode = filters.radiusKm != null && filters.latitude != null;
        const result = await listTournaments({
          sport,
          favorited: filters.favorited,
          location: distanceMode ? undefined : appliedLocation || undefined,
          province: distanceMode ? undefined : filters.province,
          city: distanceMode ? undefined : filters.city,
          latitude: distanceMode ? filters.latitude : undefined,
          longitude: distanceMode ? filters.longitude : undefined,
          radiusKm: distanceMode ? filters.radiusKm : undefined,
        });
        setTournaments(result.tournaments);
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
    fetchTournaments();
  }, [fetchTournaments]);


  return (
    <>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTournaments(true)} />}
      >
        {status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : status === 'error' ? (
          <ErrorBanner message={errorMessage} onRetry={() => fetchTournaments()} />
        ) : tournaments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={28} color={colors.outline} />
            <Text style={styles.emptyStateText}>No tournaments found. Try a different sport or search.</Text>
          </View>
        ) : (
          tournaments.map((tournament) => {
            const distanceLabel =
              viewerCoords && tournament.latitude != null && tournament.longitude != null
                ? formatDistanceKm(
                    haversineKm(
                      viewerCoords.latitude,
                      viewerCoords.longitude,
                      tournament.latitude,
                      tournament.longitude
                    )
                  )
                : null;
            return (
              <TournamentCard
                key={tournament.tournamentId}
                tournament={tournament}
                distanceLabel={distanceLabel}
                onPress={() => onOpenTournament(tournament.tournamentId)}
                onJoin={() => onJoinTournament(tournament.tournamentId)}
              />
            );
          })
        )}
      </ScrollView>

      <TournamentFilterSheet
        visible={filterVisible}
        initialFilters={filters}
        onClose={onCloseFilter}
        onApply={onApplyFilters}
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
