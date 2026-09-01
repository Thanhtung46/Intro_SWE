import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillLabel, skillTierColor } from '@/constants/matchSkills';
import {
  acceptJoinRequest,
  getErrorMessage,
  getMatchDetail,
  kickParticipant,
  listMatchRequests,
  rejectJoinRequest,
} from '@/services/matchService';
import type { JoinRequest, Match, Participant } from '@/types/match';
import { formatVnd } from '@/utils/format';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  matchId: number;
  onBack: () => void;
};

/**
 * Manage Squad (Figma `M1ItLK`) — host-only screen opened from the Active
 * tab's "Manage Squad" button (SPOT-76 Manage Matches redesign, plan mục 2).
 * Not part of MatchDetailScreen — that screen only shows a read-only squad
 * grid, no approve/reject flow.
 */
export default function ManageSquadScreen({ matchId, onBack }: Props) {
  const [match, setMatch] = useState<Match | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [actingRequestId, setActingRequestId] = useState<number | null>(null);
  const [kickTarget, setKickTarget] = useState<Participant | null>(null);
  const [kicking, setKicking] = useState(false);

  const fetchData = useCallback(async () => {
    setStatus('loading');
    try {
      const [detail, requests] = await Promise.all([getMatchDetail(matchId), listMatchRequests(matchId)]);
      setMatch(detail.match);
      setParticipants(detail.participants);
      setPendingRequests(requests.filter((request) => request.status === 'PENDING'));
      setStatus('ready');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setStatus('error');
    }
  }, [matchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAccept = async (requestId: number) => {
    setActingRequestId(requestId);
    try {
      await acceptJoinRequest(matchId, requestId);
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
      await rejectJoinRequest(matchId, requestId);
      await fetchData();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setActingRequestId(null);
    }
  };

  const handleKick = async () => {
    if (!kickTarget) return;
    setKicking(true);
    try {
      await kickParticipant(matchId, kickTarget.userId);
      setKickTarget(null);
      await fetchData();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setKickTarget(null);
    } finally {
      setKicking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="manage-squad-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Manage Squad</Text>
          {match && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {match.title} • {match.spotsLeft} spots left
            </Text>
          )}
        </View>
        <View style={styles.backButtonSpacer} />
      </View>

      {status === 'loading' ? (
        <ActivityIndicator style={styles.spinner} color={colors.primary} />
      ) : status === 'error' ? (
        <ErrorBanner message={errorMessage} onRetry={fetchData} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Approval</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pendingRequests.length}</Text>
            </View>
          </View>
          {pendingRequests.length === 0 ? (
            <Text style={styles.emptyText}>No pending requests.</Text>
          ) : (
            pendingRequests.map((request) => {
              const tier = skillTierColor(match?.sport ?? 'FOOTBALL', request.skill);
              const label = skillLabel(match?.sport ?? 'FOOTBALL', request.skill);
              return (
                <View key={request.requestId} style={styles.requestRow}>
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
                    <View style={styles.requestMetaRow}>
                      {label && (
                        <View style={[styles.skillPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
                          <Text style={[styles.skillPillText, { color: tier.text }]}>{label}</Text>
                        </View>
                      )}
                      {request.phoneNumber && <Text style={styles.requestPhone}>{request.phoneNumber}</Text>}
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      testID={`decline-request-${request.requestId}`}
                      style={styles.declineButton}
                      disabled={actingRequestId === request.requestId}
                      onPress={() => handleReject(request.requestId)}
                    >
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`approve-request-${request.requestId}`}
                      style={styles.approveButton}
                      disabled={actingRequestId === request.requestId}
                      onPress={() => handleAccept(request.requestId)}
                    >
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Squad List</Text>
            {match && (
              <Text style={styles.squadCount}>
                {match.filledCount}/{match.maxPlayers}
              </Text>
            )}
          </View>
          {participants.map((participant) => (
            <View key={participant.userId} style={styles.squadRow}>
              <View style={styles.avatar}>
                {participant.avatarUrl ? (
                  <Image source={{ uri: participant.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{(participant.fullName || 'P').charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <Text style={styles.squadName} numberOfLines={1} ellipsizeMode="tail">
                {participant.fullName}
              </Text>
              {participant.role === 'HOST' ? (
                <View style={styles.hostTag}>
                  <Text style={styles.hostTagText}>HOST</Text>
                </View>
              ) : (
                <>
                  {participant.paymentStatus === 'SUCCESS' && (
                    <Text style={styles.paidText}>Paid: {formatVnd(participant.shareAmount)}</Text>
                  )}
                  <TouchableOpacity
                    testID={`kick-participant-${participant.userId}`}
                    style={styles.kickButton}
                    onPress={() => setKickTarget(participant)}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={kickTarget != null}
        title="Kick this player?"
        message={`${kickTarget?.fullName ?? 'This player'} will be removed from the squad and won't be able to rejoin this match.`}
        confirmLabel={kicking ? 'Kicking…' : 'Kick'}
        destructive
        onConfirm={kicking ? () => {} : handleKick}
        onCancel={() => setKickTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
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

  spinner: { marginTop: spacing.xl },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.headingText },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  squadCount: { fontSize: 12, fontWeight: '700', color: colors.outline },
  emptyText: { fontSize: 13, color: colors.outline },

  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.sm,
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
  requestMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  skillPill: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  skillPillText: { fontSize: 10, fontWeight: '700' },
  requestPhone: { fontSize: 11, color: colors.outline },
  requestActions: { gap: spacing.xxs },
  declineButton: { borderWidth: 1, borderColor: colors.error, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  declineButtonText: { fontSize: 12, fontWeight: '700', color: colors.error, textAlign: 'center' },
  approveButton: { backgroundColor: colors.primaryDark, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  approveButtonText: { fontSize: 12, fontWeight: '700', color: colors.white, textAlign: 'center' },

  squadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.sm,
  },
  squadName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.headingText },
  hostTag: { backgroundColor: colors.primaryDark, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  hostTagText: { fontSize: 10, fontWeight: '700', color: colors.white },
  paidText: { fontSize: 12, fontWeight: '700', color: colors.priceText },
  kickButton: { padding: spacing.xxs },
});
