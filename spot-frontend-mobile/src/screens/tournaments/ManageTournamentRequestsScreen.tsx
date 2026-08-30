import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage } from '@/services/apiErrors';
import {
  acceptTournamentRequest,
  getTournamentDetail,
  listTournamentRequests,
  rejectTournamentRequest,
} from '@/services/tournamentService';
import type { TournamentDetail, TournamentJoinRequest } from '@/types/tournament';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  tournamentId: number;
  onBack: () => void;
};

/**
 * Per-tournament join requests console (Pencil "Tournament - Manage Requests"
 * frame) — mirrors ManageGroupRequestsScreen's role. PENDING list only, with an
 * expandable roster preview + Reject/Accept. (Aggregated pending across all
 * hosted tournaments still lives in ManageTournamentsScreen's Hosted tab.)
 */
export default function ManageTournamentRequestsScreen({ tournamentId, onBack }: Props) {
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [requests, setRequests] = useState<TournamentJoinRequest[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [actingId, setActingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setStatus('loading');
    try {
      const [detail, reqs] = await Promise.all([
        getTournamentDetail(tournamentId),
        listTournamentRequests(tournamentId),
      ]);
      setTournament(detail);
      setRequests(reqs.filter((r) => r.status === 'PENDING'));
      setStatus('ready');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setStatus('error');
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const act = async (
    requestId: number,
    action: (tournamentId: number, requestId: number) => Promise<void>
  ) => {
    setActingId(requestId);
    try {
      await action(tournamentId, requestId);
      await fetchData();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const toggleExpanded = (requestId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(requestId) ? next.delete(requestId) : next.add(requestId);
      return next;
    });
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (status === 'error' || !tournament) {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ErrorBanner message={errorMessage || 'Tournament not found.'} onRetry={fetchData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="manage-tournament-requests-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Join Requests</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {tournament.title} · {tournament.acceptedTeamCount}/{tournament.maxTeams} teams
          </Text>
        </View>
        <View style={styles.backButtonSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pendingCount}>{requests.length} pending</Text>

        {requests.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={24} color={colors.outline} />
            <Text style={styles.emptyText}>No pending requests.</Text>
          </View>
        ) : (
          requests.map((request) => {
            const isActing = actingId === request.requestId;
            const isOpen = expanded.has(request.requestId);
            return (
              <View key={request.requestId} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.logo}>
                    {request.teamLogoUrl ? (
                      <Image source={{ uri: request.teamLogoUrl }} style={styles.logoImage} />
                    ) : (
                      <Text style={styles.logoText}>{(request.teamName || 'T').charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
                      {request.teamName}
                    </Text>
                    <Text style={styles.captainLine} numberOfLines={1} ellipsizeMode="tail">
                      Captain: {request.captain.fullName ?? 'Unknown'}
                      {request.captain.phoneNumber ? ` · ${request.captain.phoneNumber}` : ''}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  testID={`roster-toggle-${request.requestId}`}
                  style={styles.rosterToggle}
                  onPress={() => toggleExpanded(request.requestId)}
                >
                  <Ionicons name="people-outline" size={14} color={colors.outline} />
                  <Text style={styles.rosterToggleText}>
                    {isOpen ? 'Hide' : 'View'} roster ({request.roster.length})
                  </Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.outline} />
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.rosterList}>
                    {request.roster.map((player, index) => (
                      <View key={index} style={styles.rosterRow}>
                        <Text style={styles.rosterName} numberOfLines={1}>
                          {player.name}
                        </Text>
                        {'jerseyNumber' in player && (
                          <Text style={styles.rosterJersey}>#{player.jerseyNumber}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity
                    testID={`reject-request-${request.requestId}`}
                    style={styles.rejectButton}
                    disabled={isActing}
                    onPress={() => act(request.requestId, rejectTournamentRequest)}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`accept-request-${request.requestId}`}
                    style={styles.acceptButton}
                    disabled={isActing}
                    onPress={() => act(request.requestId, acceptTournamentRequest)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.screenBackground },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: { width: 36 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.headingText },
  subtitle: { fontSize: 12, color: colors.outline },

  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  pendingCount: { fontSize: 12, fontWeight: '700', color: colors.outline, letterSpacing: 0.3 },
  empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  emptyText: { fontSize: 13, color: colors.outline },

  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  cardInfo: { flex: 1, gap: spacing.xxs },
  teamName: { fontSize: 15, fontWeight: '700', color: colors.headingText },
  captainLine: { fontSize: 12, color: colors.outline },

  rosterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.formScreenBackground,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rosterToggleText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.bodyText },
  rosterList: { gap: spacing.xxs, paddingHorizontal: spacing.xs },
  rosterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xxs },
  rosterName: { flex: 1, fontSize: 13, color: colors.bodyText },
  rosterJersey: { fontSize: 12, fontWeight: '700', color: colors.outline },

  actions: { flexDirection: 'row', gap: spacing.sm },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  rejectButtonText: { fontSize: 13, fontWeight: '700', color: colors.error },
  acceptButton: { flex: 1, backgroundColor: colors.success, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center' },
  acceptButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
});
