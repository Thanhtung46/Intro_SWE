import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import { groupSkillLabel, groupSkillTier } from '@/components/groups/groupPresentation';
import { spacing } from '@/constants/spacing';
import { skillLabel } from '@/constants/matchSkills';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import type { TranslationKey } from '@/i18n/translations';
import {
  acceptJoinRequest,
  getErrorMessage,
  getMatchDetail,
  kickParticipant,
  listMatchRequests,
  rejectJoinRequest,
} from '@/services/matchService';
import type { Guest, JoinRequest, Match, Participant, Sport } from '@/types/match';
import { formatVnd } from '@/utils/format';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  matchId: number;
  onBack: () => void;
  /** Opens Check Profile (`GET /users/:id`) — host + joiner rows. Guests have no account. */
  onOpenProfile: (userId: number) => void;
};

function genderShort(gender: string | null | undefined): 'M' | 'F' | null {
  if (gender === 'female') return 'F';
  if (gender === 'male') return 'M';
  return null;
}

function GuestMeta({ sport, guest, colors, t }: { sport: Sport; guest: Guest; colors: ThemeColors; t: (key: TranslationKey) => string }) {
  const styles = createStyles(colors);
  const tier = groupSkillTier(colors, sport, guest.skill);
  const label = groupSkillLabel(t, guest.skill) ?? skillLabel(sport, guest.skill);
  const gender = genderShort(guest.gender);
  return (
    <View style={styles.guestMeta}>
      <View style={styles.guestMetaChips}>
        {gender ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{gender}</Text>
          </View>
        ) : null}
        {label ? (
          <View style={[styles.skillPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
            <Text style={[styles.skillPillText, { color: tier.text }]}>{label}</Text>
          </View>
        ) : null}
      </View>
      {guest.phoneNumber ? (
        <View style={styles.phoneRow}>
          <Ionicons name="call-outline" size={12} color={colors.outlineMuted} />
          <Text style={styles.phoneText} numberOfLines={1}>
            {guest.phoneNumber}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Manage Squad (Figma `M1ItLK`) — host-only screen opened from the Active
 * tab's "Manage Squad" button (SPOT-76 Manage Matches redesign, plan mục 2).
 * Not part of MatchDetailScreen — that screen only shows a read-only squad
 * grid, no approve/reject flow.
 */
export default function ManageSquadScreen({ matchId, onBack, onOpenProfile }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const [match, setMatch] = useState<Match | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [actingRequestId, setActingRequestId] = useState<number | null>(null);
  const [kickTarget, setKickTarget] = useState<Participant | null>(null);
  const [kicking, setKicking] = useState(false);

  const sport: Sport = match?.sport ?? 'FOOTBALL';

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
          <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{t('matches.squad.title')}</Text>
          {match && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {match.title} • {match.spotsLeft} {t('matches.browse.spotsLeft')}
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
            <Text style={styles.sectionTitle}>{t('matches.squad.pendingApproval')}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pendingRequests.length}</Text>
            </View>
          </View>
          {pendingRequests.length === 0 ? (
            <Text style={styles.emptyText}>{t('matches.squad.noPending')}</Text>
          ) : (
            pendingRequests.map((request) => {
              const tier = groupSkillTier(colors, sport, request.skill);
              const label = groupSkillLabel(t, request.skill) ?? skillLabel(sport, request.skill);
              return (
                <View key={request.requestId} style={styles.requestBlock}>
                  <View style={styles.requestRow}>
                    <TouchableOpacity
                      testID={`pending-profile-${request.userId}`}
                      style={styles.profileHit}
                      onPress={() => onOpenProfile(request.userId)}
                      activeOpacity={0.85}
                    >
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
                          {request.guests.length > 0 ? ` +${request.guests.length}` : ''}
                        </Text>
                        <View style={styles.guestMeta}>
                          {label ? (
                            <View style={styles.guestMetaChips}>
                              <View style={[styles.skillPill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
                                <Text style={[styles.skillPillText, { color: tier.text }]}>{label}</Text>
                              </View>
                            </View>
                          ) : null}
                          {request.phoneNumber ? (
                            <View style={styles.phoneRow}>
                              <Ionicons name="call-outline" size={12} color={colors.outlineMuted} />
                              <Text style={styles.phoneText} numberOfLines={1}>
                                {request.phoneNumber}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        testID={`decline-request-${request.requestId}`}
                        style={styles.declineButton}
                        disabled={actingRequestId === request.requestId}
                        onPress={() => handleReject(request.requestId)}
                      >
                        <Text style={styles.declineButtonText}>{t('matches.squad.decline')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        testID={`approve-request-${request.requestId}`}
                        style={styles.approveButton}
                        disabled={actingRequestId === request.requestId}
                        onPress={() => handleAccept(request.requestId)}
                      >
                        <Text style={styles.approveButtonText}>{t('matches.squad.approve')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {request.guests.map((guest) => (
                    <View key={guest.guestId} style={styles.guestRow} testID={`pending-guest-${guest.guestId}`}>
                      <View style={styles.guestAvatar}>
                        <Text style={styles.guestAvatarText}>{(guest.name || 'G').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.requestInfo}>
                        <View style={styles.guestNameRow}>
                          <Text style={styles.guestName} numberOfLines={1} ellipsizeMode="tail">
                            {guest.name}
                          </Text>
                          <View style={styles.guestTag}>
                            <Text style={styles.guestTagText}>{t('matches.detail.guest').toUpperCase()}</Text>
                          </View>
                        </View>
                        <GuestMeta sport={sport} guest={guest} colors={colors} t={t} />
                      </View>
                    </View>
                  ))}
                </View>
              );
            })
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('matches.squad.squadList')}</Text>
            {match && (
              <Text style={styles.squadCount}>
                {match.filledCount}/{match.maxPlayers}
              </Text>
            )}
          </View>
          {participants.map((participant) => (
            <View key={participant.userId} style={styles.squadBlock}>
              <View style={styles.squadRow}>
                <TouchableOpacity
                  testID={`squad-profile-${participant.userId}`}
                  style={styles.profileHit}
                  onPress={() => onOpenProfile(participant.userId)}
                  activeOpacity={0.85}
                >
                  <View style={styles.avatar}>
                    {participant.avatarUrl ? (
                      <Image source={{ uri: participant.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{(participant.fullName || 'P').charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.squadName} numberOfLines={1} ellipsizeMode="tail">
                      {participant.fullName}
                      {participant.guests.length > 0 ? ` +${participant.guests.length}` : ''}
                    </Text>
                    {participant.role !== 'HOST' && (participant.skill || participant.phoneNumber) ? (
                      <View style={styles.guestMeta}>
                        {participant.skill ? (
                          <View style={styles.guestMetaChips}>
                            <View
                              style={[
                                styles.skillPill,
                                {
                                  backgroundColor: groupSkillTier(colors, sport, participant.skill).bg,
                                  borderColor: groupSkillTier(colors, sport, participant.skill).border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.skillPillText,
                                  { color: groupSkillTier(colors, sport, participant.skill).text },
                                ]}
                              >
                                {groupSkillLabel(t, participant.skill) ?? skillLabel(sport, participant.skill)}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                        {participant.phoneNumber ? (
                          <View style={styles.phoneRow}>
                            <Ionicons name="call-outline" size={12} color={colors.outlineMuted} />
                            <Text style={styles.phoneText} numberOfLines={1}>
                              {participant.phoneNumber}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
                {participant.role === 'HOST' ? (
                  <View style={styles.hostTag}>
                    <Text style={styles.hostTagText}>{t('matches.squad.host')}</Text>
                  </View>
                ) : (
                  <>
                    {participant.paymentStatus === 'SUCCESS' && (
                      <Text style={styles.paidText}>{t('matches.squad.paidPrefix')} {formatVnd(participant.shareAmount)}</Text>
                    )}
                    <TouchableOpacity
                      testID={`kick-participant-${participant.userId}`}
                      style={styles.kickButton}
                      onPress={() => setKickTarget(participant)}
                    >
                      <Ionicons name="close-circle-outline" size={20} color={colors.roleErrorText} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
              {participant.guests.map((guest) => (
                <View key={guest.guestId} style={styles.guestRow} testID={`squad-guest-${guest.guestId}`}>
                  <View style={styles.guestAvatar}>
                    <Text style={styles.guestAvatarText}>{(guest.name || 'G').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <View style={styles.guestNameRow}>
                      <Text style={styles.guestName} numberOfLines={1} ellipsizeMode="tail">
                        {guest.name}
                      </Text>
                      <View style={styles.guestTag}>
                        <Text style={styles.guestTagText}>{t('matches.detail.guest').toUpperCase()}</Text>
                      </View>
                    </View>
                    <GuestMeta sport={sport} guest={guest} colors={colors} t={t} />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={kickTarget != null}
        title={t('matches.squad.kickTitle')}
        message={
          kickTarget?.guests.length
            ? t('matches.squad.kickMessageWithGuests')
                .replace('{name}', kickTarget.fullName ?? t('matches.squad.playerFallback'))
                .replace('{count}', String(kickTarget.guests.length))
            : t('matches.squad.kickMessage').replace('{name}', kickTarget?.fullName ?? t('matches.squad.playerFallback'))
        }
        confirmLabel={kicking ? t('matches.squad.kicking') : t('matches.squad.kick')}
        destructive
        onConfirm={kicking ? () => {} : handleKick}
        onCancel={() => setKickTarget(null)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackgroundAlt },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: { width: 36 },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.outlineMuted },

  spinner: { marginTop: spacing.xl },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  squadCount: { fontSize: 12, fontWeight: '700', color: colors.outlineMuted },
  emptyText: { fontSize: 13, color: colors.outlineMuted },

  requestBlock: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    overflow: 'hidden',
  },
  squadBlock: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    overflow: 'hidden',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  profileHit: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  requestInfo: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  requestName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  guestMeta: { gap: 4 },
  guestMetaChips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaChipText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  skillPill: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  skillPillText: { fontSize: 10, fontWeight: '700' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phoneText: { flexShrink: 1, fontSize: 12, color: colors.textSecondary, letterSpacing: 0.2 },
  requestActions: { gap: spacing.xxs },
  declineButton: {
    borderWidth: 1,
    borderColor: colors.roleErrorText,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  declineButtonText: { fontSize: 12, fontWeight: '700', color: colors.roleErrorText, textAlign: 'center' },
  approveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  approveButtonText: { fontSize: 12, fontWeight: '700', color: colors.white, textAlign: 'center' },

  squadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  squadName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  hostTag: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  hostTagText: { fontSize: 10, fontWeight: '700', color: colors.white },
  paidText: { fontSize: 12, fontWeight: '700', color: colors.matchPriceValueText },
  kickButton: { padding: spacing.xxs },

  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.lg,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.chromeBorder,
  },
  guestAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.screenBackgroundAlt,
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAvatarText: { fontSize: 12, fontWeight: '700', color: colors.outlineMuted },
  guestNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0 },
  guestName: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  guestTag: {
    backgroundColor: colors.roleCardSelectedBg,
    borderRadius: 8,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  guestTagText: { fontSize: 9, fontWeight: '800', color: colors.primary },
});
