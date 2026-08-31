import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import JoinMatchSheet from '@/components/matches/JoinMatchSheet';
import MatchCoverImage from '@/components/matches/MatchCoverImage';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { skillLabel } from '@/constants/matchSkills';
import { cancelJoinRequest, getErrorMessage, getMatchDetail, setFavorite } from '@/services/matchService';
import type { MatchDetail, Participant } from '@/types/match';
import { formatMatchWhen, formatVnd } from '@/utils/format';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  matchId: number;
  onBack: () => void;
  onOpenMap: () => void;
  onOpenHostProfile: (hostUserId: number) => void;
  onManageSquad?: () => void;
};

type SquadMember = { key: string; name: string; avatarUrl: string | null };

function buildSquadMembers(participants: Participant[]): SquadMember[] {
  const members: SquadMember[] = [];
  for (const participant of participants) {
    if (participant.role === 'HOST') continue; // host has its own card above the grid
    members.push({
      key: `player-${participant.userId}`,
      name: participant.fullName || 'Player',
      avatarUrl: participant.avatarUrl,
    });
    for (const guest of participant.guests) {
      members.push({ key: `guest-${guest.guestId}`, name: guest.name, avatarUrl: null });
    }
  }
  return members;
}

/**
 * Match Detail (Figma node 100:401, SPOT-76). Presentation-only per
 * .claude/rules/code-style.md — matchId + navigation callbacks come from
 * app/matches/[id].tsx. Map (venue-focused) is a separate destination from
 * the browse-all Join Match - Map screen (task #6) — both deferred behind
 * "coming soon" until Geoapify key wiring lands (plan mục 3b).
 */
export default function MatchDetailScreen({ matchId, onBack, onOpenMap, onOpenHostProfile, onManageSquad }: Props) {
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [joinSheetVisible, setJoinSheetVisible] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);

  const fetchDetail = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await getMatchDetail(matchId);
      setDetail(result);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setStatus('error');
    }
  }, [matchId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleConfirmCancelRequest = async () => {
    if (!detail) return;
    setCancelDialogVisible(false);
    setIsCancelling(true);
    try {
      await cancelJoinRequest(detail.match.matchId);
      await fetchDetail();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!detail) return;
    const nextFavorited = !detail.match.isFavorited;
    setDetail({ ...detail, match: { ...detail.match, isFavorited: nextFavorited } });
    try {
      await setFavorite(detail.match.matchId, nextFavorited);
    } catch (err) {
      setDetail((prev) => (prev ? { ...prev, match: { ...prev.match, isFavorited: !nextFavorited } } : prev));
      Alert.alert('Something went wrong', getErrorMessage(err));
    }
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (status === 'error' || !detail) {
    return (
      <SafeAreaView style={styles.centerFill} edges={['top', 'bottom']}>
        <ErrorBanner message={errorMessage || 'Match not found.'} onRetry={fetchDetail} />
      </SafeAreaView>
    );
  }

  const { match, participants, canJoin, isHost, yourRequest } = detail;
  const isPending = yourRequest?.status === 'PENDING';
  const host = participants.find((p) => p.role === 'HOST');
  const squadMembers = buildSquadMembers(participants);
  const openSlots = Math.max(0, match.maxPlayers - 1 - squadMembers.length);
  const minLabel = skillLabel(match.sport, match.skillMin);
  const maxLabel = skillLabel(match.sport, match.skillMax);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <MatchCoverImage sport={match.sport} coverUrl={match.coverUrl} emojiSize={64} labelSize={14} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{match.sport} · {match.format.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2} ellipsizeMode="tail">
              {match.title}
            </Text>
          </View>
        </View>

        <View style={styles.infoStrip}>
          <InfoStripItem icon="calendar-outline" label="Time" value={formatMatchWhen(match.startsAt, match.endsAt)} />
          <InfoStripItem icon="stats-chart-outline" label="Skill" value={minLabel && maxLabel ? `${minLabel} - ${maxLabel}` : 'All levels'} />
          <InfoStripItem icon="cash-outline" label="Price" value={formatVnd(match.priceMin)} valueColor={colors.priceText} />
        </View>

        <View style={styles.body}>
          <TouchableOpacity testID="match-detail-location" style={styles.locationCard} onPress={onOpenMap} activeOpacity={0.85}>
            <View style={styles.locationIconWrap}>
              <Ionicons name="location-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationName} numberOfLines={1} ellipsizeMode="tail">
                {match.venueName}
              </Text>
              <Text style={styles.locationAddress} numberOfLines={1} ellipsizeMode="tail">
                {match.venueAddress}
              </Text>
            </View>
            <View style={styles.mapButton}>
              <Text style={styles.mapButtonText}>Map</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Squad ({match.filledCount}/{match.maxPlayers})</Text>
              <View style={styles.spotsLeftPill}>
                <Text style={styles.spotsLeftPillText}>
                  {match.spotsLeft > 0 ? `${match.spotsLeft} spots left!` : 'Full'}
                </Text>
              </View>
            </View>

            {host && (
              <TouchableOpacity
                testID="match-detail-host-card"
                style={styles.hostCard}
                onPress={() => onOpenHostProfile(host.userId)}
                activeOpacity={0.85}
              >
                <View style={styles.hostAvatar}>
                  <Text style={styles.hostAvatarText}>{(host.fullName || 'H').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.hostInfo}>
                  <View style={styles.hostNameRow}>
                    <Text style={styles.hostName} numberOfLines={1} ellipsizeMode="tail">
                      {host.fullName}
                    </Text>
                    <View style={styles.hostBadge}>
                      <Text style={styles.hostBadgeText}>MATCH HOST</Text>
                    </View>
                  </View>
                  {host.phoneNumber ? (
                    <Text style={styles.hostPhone} numberOfLines={1} ellipsizeMode="tail">
                      {host.phoneNumber}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.squadGrid}>
              {squadMembers.map((member) => (
                <View key={member.key} style={styles.squadCell}>
                  <View style={styles.squadAvatar}>
                    {member.avatarUrl ? (
                      <Image source={{ uri: member.avatarUrl }} style={styles.squadAvatarImage} />
                    ) : (
                      <Text style={styles.squadAvatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={styles.squadName} numberOfLines={1}>
                    {member.name}
                  </Text>
                </View>
              ))}
              {Array.from({ length: openSlots }).map((_, index) => (
                <View key={`open-${index}`} style={styles.squadCell}>
                  <View style={styles.squadAvatarOpen}>
                    <Ionicons name="add" size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.squadOpenText}>Open</Text>
                </View>
              ))}
            </View>
          </View>

          {match.notes ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Match Notes</Text>
              <View style={styles.notesCard}>
                <Ionicons name="information-circle-outline" size={20} color={colors.bodyText} />
                <Text style={styles.notesText}>{match.notes}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} style={styles.heroTopBarWrap}>
        <View style={styles.heroTopBar}>
          <TouchableOpacity testID="match-detail-back" style={styles.heroIconButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity testID="match-detail-favorite" style={styles.heroIconButton} onPress={handleToggleFavorite}>
            <Ionicons name={match.isFavorited ? 'heart' : 'heart-outline'} size={18} color={match.isFavorited ? colors.error : colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.actionBarWrap}>
        <View style={styles.actionBar}>
          <View>
            <Text style={styles.actionBarLabel}>YOUR SHARE</Text>
            <Text style={styles.actionBarValue}>{formatVnd(match.yourShare)}</Text>
          </View>
          {isHost && onManageSquad ? (
            <TouchableOpacity testID="match-detail-manage-squad" style={styles.joinButton} onPress={onManageSquad}>
              <Text style={styles.joinButtonText}>
                {match.joinMode === 'APPROVAL' && (match.pendingRequestCount ?? 0) > 0 ? 'Manage Squad' : 'View Squad'}
              </Text>
              <Ionicons name="people-outline" size={16} color={colors.white} />
            </TouchableOpacity>
          ) : isPending ? (
            <TouchableOpacity
              testID="match-detail-cancel-request"
              style={[styles.cancelRequestButton, isCancelling && styles.joinButtonDisabled]}
              onPress={() => setCancelDialogVisible(true)}
              disabled={isCancelling}
            >
              <Text style={styles.cancelRequestButtonText}>{isCancelling ? 'Cancelling...' : 'Cancel Request'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="match-detail-join"
              style={[styles.joinButton, !canJoin && styles.joinButtonDisabled]}
              onPress={() => setJoinSheetVisible(true)}
              disabled={!canJoin}
            >
              <Text style={styles.joinButtonText}>{canJoin ? 'Join Match' : match.spotsLeft < 1 ? 'Full' : 'Requested'}</Text>
              {canJoin && <Ionicons name="flash" size={16} color={colors.white} />}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <JoinMatchSheet
        visible={joinSheetVisible}
        matchId={match.matchId}
        matchTitle={match.title}
        sport={match.sport}
        requiredSkillLabels={
          !match.allLevels ? [minLabel, maxLabel].filter((label): label is string => Boolean(label)) : undefined
        }
        onClose={() => setJoinSheetVisible(false)}
        onSubmitted={fetchDetail}
      />

      <ConfirmDialog
        visible={cancelDialogVisible}
        title="Cancel request?"
        message="You'll be removed from the waiting list — you can join again later."
        confirmLabel="Cancel Request"
        cancelLabel="Keep Request"
        onConfirm={handleConfirmCancelRequest}
        onCancel={() => setCancelDialogVisible(false)}
      />
    </View>
  );
}

function InfoStripItem({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoStripItem}>
      <Ionicons name={icon} size={18} color={colors.bodyText} />
      <Text style={styles.infoStripLabel}>{label}</Text>
      <Text style={[styles.infoStripValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.screenBackground },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.screenBackground },
  scrollContent: { paddingBottom: 140 },

  hero: { height: 260, overflow: 'hidden' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.heroScrim },
  heroContent: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.lg, gap: spacing.xs },
  sportBadge: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  sportBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  heroTitle: { color: colors.white, fontSize: 20, fontWeight: '700' },

  heroTopBarWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  heroIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.stickyIconButtonBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoStrip: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: -spacing.xl,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoStripItem: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  infoStripLabel: { fontSize: 10, fontWeight: '700', color: colors.bodyText, textTransform: 'uppercase' },
  infoStripValue: { fontSize: 12, fontWeight: '800', color: colors.headingText, textAlign: 'center' },

  body: { padding: spacing.md, gap: spacing.lg },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.md,
  },
  locationIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: { flex: 1 },
  locationName: { fontSize: 15, fontWeight: '700', color: colors.headingText },
  locationAddress: { fontSize: 13, color: colors.bodyText },
  mapButton: { backgroundColor: colors.selectedBackground, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mapButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  section: { gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.headingText },
  spotsLeftPill: { backgroundColor: colors.selectedBackground, borderRadius: 6, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs },
  spotsLeftPillText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },

  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: spacing.md,
  },
  hostAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.iconBackground, alignItems: 'center', justifyContent: 'center' },
  hostAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  hostInfo: { flex: 1, gap: spacing.xxs },
  hostNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hostName: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: colors.headingText },
  hostBadge: {
    flexShrink: 0,
    backgroundColor: colors.selectedBackground,
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  hostBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  hostPhone: { fontSize: 12, color: colors.bodyText },

  squadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  squadCell: { width: '22%', alignItems: 'center', gap: spacing.xxs },
  squadAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  squadAvatarImage: { width: '100%', height: '100%' },
  squadAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  squadName: { fontSize: 10, color: colors.bodyText, maxWidth: 64 },
  squadAvatarOpen: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.primaryDisabled,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadOpenText: { fontSize: 10, color: colors.primaryDisabled },

  notesCard: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.cardBackground, borderRadius: 16, padding: spacing.md },
  notesText: { flex: 1, fontSize: 13, color: colors.bodyText, lineHeight: 20 },

  actionBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.iconBackground,
  },
  actionBarLabel: { fontSize: 11, fontWeight: '800', color: colors.bodyText, letterSpacing: 0.5 },
  actionBarValue: { fontSize: 22, fontWeight: '800', color: colors.headingText },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  joinButtonDisabled: { backgroundColor: colors.outline },
  joinButtonText: { fontSize: 16, fontWeight: '700', color: colors.white },

  cancelRequestButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cancelRequestButtonText: { fontSize: 16, fontWeight: '700', color: colors.error },
});
