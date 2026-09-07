import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import JoinMatchSheet from '@/components/matches/JoinMatchSheet';
import MatchCoverImage, { BADMINTON_COVER_ASPECT } from '@/components/matches/MatchCoverImage';
import { spacing } from '@/constants/spacing';
import { skillLabel } from '@/constants/matchSkills';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { cancelJoinRequest, cancelMatch, getErrorMessage, getMatchDetail } from '@/services/matchService';
import type { Guest, MatchDetail, Participant, Sport } from '@/types/match';
import type { TranslationKey } from '@/i18n/translations';
import { formatMatchWhenParts, formatVnd } from '@/utils/format';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  matchId: number;
  /** When true (e.g. /matches/:id?join=1), open JoinMatchSheet once detail is ready. */
  autoOpenJoin?: boolean;
  onBack: () => void;
  onOpenVenueMap: (venue: {
    venueName: string;
    venueAddress: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
  onOpenHostProfile: (hostUserId: number) => void;
  onManageSquad?: () => void;
  /** Host — navigate to edit form (PATCH /matches/:id). */
  onEditMatch?: () => void;
};

type SquadMember = {
  key: string;
  name: string;
  avatarUrl: string | null;
  /** Real accounts only — guests have no profile to open. */
  userId?: number;
  guest?: Guest;
};

function buildSquadMembers(participants: Participant[]): SquadMember[] {
  const members: SquadMember[] = [];
  for (const participant of participants) {
    if (participant.role === 'HOST') continue; // host has its own card above the grid
    members.push({
      key: `player-${participant.userId}`,
      name: participant.fullName || 'Player',
      avatarUrl: participant.avatarUrl,
      userId: participant.userId,
    });
    for (const guest of participant.guests) {
      members.push({
        key: `guest-${guest.guestId}`,
        name: guest.name,
        avatarUrl: null,
        guest,
      });
    }
  }
  return members;
}

function showGuestInfo(sport: Sport, guest: Guest, t: (key: TranslationKey) => string) {
  const skill = skillLabel(sport, guest.skill) || guest.skill;
  const gender = guest.gender === 'female' ? 'F' : guest.gender === 'male' ? 'M' : null;
  const lines = [
    [gender, skill].filter(Boolean).join(' · ') || null,
    guest.phoneNumber ? guest.phoneNumber : null,
  ].filter(Boolean);
  Alert.alert(
    guest.name,
    lines.length ? lines.join('\n') : t('matches.detail.guestNoAccount'),
  );
}

/**
 * Match Detail (Figma node 100:401, SPOT-76). Presentation-only per
 * .claude/rules/code-style.md — matchId + navigation callbacks come from
 * app/matches/[id].tsx. The venue-focused map (location card / "Map"
 * button) opens the shared VenueMapScreen via `onOpenVenueMap`; that's a
 * separate destination from the browse-all Join Match - Map screen
 * (`/matches/map`).
 */
export default function MatchDetailScreen({
  matchId,
  autoOpenJoin = false,
  onBack,
  onOpenVenueMap,
  onOpenHostProfile,
  onManageSquad,
  onEditMatch,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [joinSheetVisible, setJoinSheetVisible] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelMatchDialogVisible, setCancelMatchDialogVisible] = useState(false);
  const [isCancellingMatch, setIsCancellingMatch] = useState(false);
  const didAutoOpenJoin = useRef(false);

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

  useEffect(() => {
    if (!autoOpenJoin || didAutoOpenJoin.current || status !== 'ready' || !detail) return;
    if (!detail.canJoin) return;
    didAutoOpenJoin.current = true;
    setJoinSheetVisible(true);
  }, [autoOpenJoin, status, detail]);

  const handleConfirmCancelRequest = async () => {
    if (!detail) return;
    setCancelDialogVisible(false);
    setIsCancelling(true);
    try {
      await cancelJoinRequest(detail.match.matchId);
      await fetchDetail();
    } catch (err) {
      Alert.alert(t('matches.detail.somethingWrongTitle'), getErrorMessage(err));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmCancelMatch = async () => {
    if (!detail) return;
    setCancelMatchDialogVisible(false);
    setIsCancellingMatch(true);
    try {
      await cancelMatch(detail.match.matchId);
      onBack();
    } catch (err) {
      Alert.alert(t('matches.detail.somethingWrongTitle'), getErrorMessage(err));
    } finally {
      setIsCancellingMatch(false);
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
        <ErrorBanner message={errorMessage || t('matches.detail.notFound')} onRetry={fetchDetail} />
      </SafeAreaView>
    );
  }

  const { match, participants, canJoin, isHost, yourRequest } = detail;
  const isPending = yourRequest?.status === 'PENDING';
  const canHostManage =
    Boolean(isHost) &&
    match.status !== 'CANCELLED' &&
    match.status !== 'COMPLETED' &&
    new Date(match.startsAt).getTime() > Date.now();
  const host = participants.find((p) => p.role === 'HOST');
  const squadMembers = buildSquadMembers(participants);
  const openSlots = Math.max(0, match.maxPlayers - 1 - squadMembers.length);
  const minLabel = skillLabel(match.sport, match.skillMin);
  const maxLabel = skillLabel(match.sport, match.skillMax);
  const whenParts = formatMatchWhenParts(match.startsAt, match.endsAt);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <MatchCoverImage sport={match.sport} coverUrl={match.coverUrl} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{match.sport === 'FOOTBALL' ? t('common.sportFootball') : t('common.sportBadminton')} · {match.format.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2} ellipsizeMode="tail">
              {match.title}
            </Text>
          </View>
        </View>

        <View style={styles.infoStrip}>
          <InfoStripItem
            colors={colors}
            styles={styles}
            icon="calendar-outline"
            label={t('matches.detail.time')}
            value={whenParts.dayLabel}
            valueSecondary={whenParts.timeRange}
          />
          <InfoStripItem colors={colors} styles={styles} icon="stats-chart-outline" label={t('matches.detail.skill')} value={minLabel && maxLabel ? (minLabel === maxLabel ? minLabel : `${minLabel} → ${maxLabel}`) : t('matches.browse.allLevels')} />
          <InfoStripItem colors={colors} styles={styles} icon="cash-outline" label={t('matches.detail.price')} value={formatVnd(match.priceMin)} valueColor={colors.matchPriceValueText} />
        </View>

        <View style={styles.body}>
          <TouchableOpacity
            testID="match-detail-location"
            style={styles.locationCard}
            onPress={() =>
              onOpenVenueMap({
                venueName: match.venueName,
                venueAddress: match.venueAddress,
                latitude: match.latitude,
                longitude: match.longitude,
              })
            }
            activeOpacity={0.85}
          >
            <View style={styles.locationIconWrap}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
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
              <Text style={styles.mapButtonText}>{t('matches.detail.map')}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('matches.detail.squad')} ({match.filledCount}/{match.maxPlayers})</Text>
              <View style={styles.spotsLeftPill}>
                <Text style={styles.spotsLeftPillText}>
                  {match.spotsLeft > 0 ? `${match.spotsLeft} ${t('matches.detail.spotsLeftExcl')}` : t('matches.actions.full')}
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
                      <Text style={styles.hostBadgeText}>{t('matches.detail.matchHost')}</Text>
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
              {squadMembers.map((member) => {
                const cell = (
                  <>
                    <View style={[styles.squadAvatar, member.guest ? styles.squadAvatarGuest : undefined]}>
                      {member.avatarUrl ? (
                        <Image source={{ uri: member.avatarUrl }} style={styles.squadAvatarImage} />
                      ) : (
                        <Text style={styles.squadAvatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <Text style={styles.squadName} numberOfLines={1}>
                      {member.name}
                    </Text>
                    {member.guest ? <Text style={styles.squadGuestLabel}>{t('matches.detail.guest')}</Text> : null}
                  </>
                );
                if (member.userId != null) {
                  return (
                    <TouchableOpacity
                      key={member.key}
                      testID={`match-detail-squad-${member.userId}`}
                      style={styles.squadCell}
                      onPress={() => onOpenHostProfile(member.userId!)}
                      activeOpacity={0.85}
                    >
                      {cell}
                    </TouchableOpacity>
                  );
                }
                if (member.guest) {
                  return (
                    <TouchableOpacity
                      key={member.key}
                      testID={`match-detail-guest-${member.guest.guestId}`}
                      style={styles.squadCell}
                      onPress={() => showGuestInfo(match.sport, member.guest!, t)}
                      activeOpacity={0.85}
                    >
                      {cell}
                    </TouchableOpacity>
                  );
                }
                return (
                  <View key={member.key} style={styles.squadCell}>
                    {cell}
                  </View>
                );
              })}
              {Array.from({ length: openSlots }).map((_, index) => (
                <View key={`open-${index}`} style={styles.squadCell}>
                  <View style={styles.squadAvatarOpen}>
                    <Ionicons name="add" size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.squadOpenText}>{t('matches.detail.open')}</Text>
                </View>
              ))}
            </View>
          </View>

          {match.notes ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('matches.detail.matchNotes')}</Text>
              <View style={styles.notesCard}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textSecondaryAlt} />
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
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.actionBarWrap}>
        {isHost ? (
          <View style={styles.hostActionBar}>
            <View style={styles.actionBar}>
              <View>
                <Text style={styles.actionBarLabel}>{t('matches.detail.yourShare')}</Text>
                <Text style={styles.actionBarValue}>{formatVnd(match.yourShare)}</Text>
              </View>
              {onManageSquad ? (
                <TouchableOpacity testID="match-detail-manage-squad" style={styles.joinButton} onPress={onManageSquad}>
                  <Text style={styles.joinButtonText}>
                    {match.joinMode === 'APPROVAL' && (match.pendingRequestCount ?? 0) > 0 ? t('matches.actions.manageSquad') : t('matches.actions.viewSquad')}
                  </Text>
                  <Ionicons name="people-outline" size={16} color={colors.white} />
                </TouchableOpacity>
              ) : null}
            </View>
            {canHostManage ? (
              <View style={styles.hostSecondaryRow}>
                {onEditMatch ? (
                  <TouchableOpacity testID="match-detail-edit" style={styles.secondaryButton} onPress={onEditMatch}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={styles.secondaryButtonText}>{t('matches.actions.edit')}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  testID="match-detail-cancel-match"
                  style={[styles.secondaryButton, styles.secondaryButtonDanger]}
                  onPress={() => setCancelMatchDialogVisible(true)}
                  disabled={isCancellingMatch}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.roleErrorText} />
                  <Text style={styles.secondaryButtonDangerText}>{isCancellingMatch ? t('matches.detail.cancelling') : t('matches.actions.cancelMatch')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.actionBar}>
            <View>
              <Text style={styles.actionBarLabel}>{t('matches.detail.yourShare')}</Text>
              <Text style={styles.actionBarValue}>{formatVnd(match.yourShare)}</Text>
            </View>
            {isPending ? (
              <TouchableOpacity
                testID="match-detail-cancel-request"
                style={[styles.cancelRequestButton, isCancelling && styles.joinButtonDisabled]}
                onPress={() => setCancelDialogVisible(true)}
                disabled={isCancelling}
              >
                <Text style={styles.cancelRequestButtonText}>{isCancelling ? t('matches.detail.cancelling') : t('matches.actions.cancelRequest')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                testID="match-detail-join"
                style={[styles.joinButton, !canJoin && styles.joinButtonDisabled]}
                onPress={() => setJoinSheetVisible(true)}
                disabled={!canJoin}
              >
                <Text style={styles.joinButtonText}>{canJoin ? t('matches.actions.joinMatch') : match.spotsLeft < 1 ? t('matches.actions.full') : t('matches.detail.requested')}</Text>
                {canJoin && <Ionicons name="flash" size={16} color={colors.white} />}
              </TouchableOpacity>
            )}
          </View>
        )}
      </SafeAreaView>

      <JoinMatchSheet
        visible={joinSheetVisible}
        matchId={match.matchId}
        matchTitle={match.title}
        sport={match.sport}
        requiredSkillLabels={
          !match.allLevels
            ? [minLabel, maxLabel && maxLabel !== minLabel ? maxLabel : null].filter(
                (label): label is string => Boolean(label)
              )
            : undefined
        }
        onClose={() => setJoinSheetVisible(false)}
        onSubmitted={fetchDetail}
      />

      <ConfirmDialog
        visible={cancelDialogVisible}
        title={t('matches.detail.cancelRequestTitle')}
        message={t('matches.detail.cancelRequestMessage')}
        confirmLabel={t('matches.actions.cancelRequest')}
        cancelLabel={t('matches.detail.keepRequest')}
        onConfirm={handleConfirmCancelRequest}
        onCancel={() => setCancelDialogVisible(false)}
      />

      <ConfirmDialog
        visible={cancelMatchDialogVisible}
        title={t('matches.detail.cancelMatchTitle')}
        message={t('matches.detail.cancelMatchMessage')}
        confirmLabel={t('matches.actions.cancelMatch')}
        cancelLabel={t('matches.detail.keepMatch')}
        onConfirm={handleConfirmCancelMatch}
        onCancel={() => setCancelMatchDialogVisible(false)}
      />
    </View>
  );
}

function InfoStripItem({
  icon,
  label,
  value,
  valueSecondary,
  valueColor,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  /** Optional second line (e.g. Time: "Tomorrow" then "16:00 - 18:00"). */
  valueSecondary?: string;
  valueColor?: string;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.infoStripItem}>
      <Ionicons name={icon} size={18} color={colors.textSecondaryAlt} />
      <Text style={styles.infoStripLabel}>{label}</Text>
      <Text style={[styles.infoStripValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      {valueSecondary ? (
        <Text style={[styles.infoStripValueSecondary, valueColor ? { color: valueColor } : null]}>{valueSecondary}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.screenBackgroundAlt },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.screenBackgroundAlt },
  scrollContent: { paddingBottom: 140 },

  hero: {
    width: '100%',
    // Same ratio as assets/match-cover-badminton.png so the full original fits.
    aspectRatio: BADMINTON_COVER_ASPECT,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    backgroundColor: colors.groupImageScrim,
  },
  heroContent: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    // Near the cover's bottom edge (info strip no longer overlaps hero).
    bottom: spacing.sm,
    zIndex: 2,
    gap: spacing.xs,
  },
  sportBadge: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 9999, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  sportBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  heroTitle: { color: colors.white, fontSize: 20, fontWeight: '700' },

  heroTopBarWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, elevation: 5 },
  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  heroIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.matchIconGlassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoStrip: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    // Sit fully below the hero — no negative margin over the cover.
    marginTop: spacing.md,
    backgroundColor: colors.roleCardBg,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoStripItem: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  infoStripLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondaryAlt, textTransform: 'uppercase' },
  infoStripValue: { fontSize: 12, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  infoStripValueSecondary: { fontSize: 11, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },

  body: { padding: spacing.md, gap: spacing.lg },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.roleCardBg,
    borderRadius: 16,
    padding: spacing.md,
  },
  locationIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextWrap: { flex: 1 },
  locationName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  locationAddress: { fontSize: 13, color: colors.textSecondaryAlt },
  mapButton: { backgroundColor: colors.roleCardSelectedBg, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  mapButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },

  section: { gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  spotsLeftPill: { backgroundColor: colors.roleCardSelectedBg, borderRadius: 6, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs },
  spotsLeftPillText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.roleCardBg,
    borderRadius: 16,
    padding: spacing.md,
  },
  hostAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.roleCardSelectedBg, alignItems: 'center', justifyContent: 'center' },
  hostAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  hostInfo: { flex: 1, gap: spacing.xxs },
  hostNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hostName: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  hostBadge: {
    flexShrink: 0,
    backgroundColor: colors.roleCardSelectedBg,
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  hostBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  hostPhone: { fontSize: 12, color: colors.textSecondaryAlt },

  squadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  squadCell: { width: '22%', alignItems: 'center', gap: spacing.xxs },
  squadAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  squadAvatarImage: { width: '100%', height: '100%' },
  squadAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  squadName: { fontSize: 10, color: colors.textSecondaryAlt, maxWidth: 64 },
  squadAvatarGuest: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineMuted,
    backgroundColor: colors.screenBackgroundAlt,
  },
  squadGuestLabel: { fontSize: 9, fontWeight: '700', color: colors.outlineMuted },
  squadAvatarOpen: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.primaryDisabledBg,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadOpenText: { fontSize: 10, color: colors.primaryDisabledBg },

  notesCard: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.roleCardBg, borderRadius: 16, padding: spacing.md },
  notesText: { flex: 1, fontSize: 13, color: colors.textSecondaryAlt, lineHeight: 20 },

  actionBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface },
  hostActionBar: {},
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.roleCardSelectedBg,
  },
  hostSecondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  secondaryButtonDanger: { borderColor: colors.roleErrorText },
  secondaryButtonDangerText: { fontSize: 14, fontWeight: '700', color: colors.roleErrorText },
  actionBarLabel: { fontSize: 11, fontWeight: '800', color: colors.textSecondaryAlt, letterSpacing: 0.5 },
  actionBarValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  joinButtonDisabled: { backgroundColor: colors.outlineMuted },
  joinButtonText: { fontSize: 16, fontWeight: '700', color: colors.white },

  cancelRequestButton: {
    borderWidth: 1,
    borderColor: colors.roleErrorText,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cancelRequestButtonText: { fontSize: 16, fontWeight: '700', color: colors.roleErrorText },
});
