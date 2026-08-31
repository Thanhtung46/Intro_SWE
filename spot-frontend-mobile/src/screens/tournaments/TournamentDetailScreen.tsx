import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppMap from '@/components/common/AppMap';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import TeamSlotStrip from '@/components/tournaments/TeamSlotStrip';
import TournamentMatchListItem from '@/components/tournaments/TournamentMatchListItem';
import TournamentResultSheet from '@/components/tournaments/TournamentResultSheet';
import TournamentStandingsTable from '@/components/tournaments/TournamentStandingsTable';
import TournamentStatusPill from '@/components/tournaments/TournamentStatusPill';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { ROUND_LABELS, ROUND_ORDER } from '@/constants/tournamentFormats';
import { getErrorMessage } from '@/services/apiErrors';
import {
  cancelTournament,
  completeTournament,
  getTournamentDetail,
  getTournamentPlayers,
  getTournamentStandings,
  listTournamentMatches,
  setTournamentFavorite,
  withdrawTournamentJoin,
} from '@/services/tournamentService';
import type {
  StandingRow,
  TournamentDetail,
  TournamentMatch,
  TournamentRound,
  TournamentTeam,
} from '@/types/tournament';

type Status = 'loading' | 'ready' | 'error';
type DetailTab = 'overview' | 'matches' | 'standings' | 'players';

type Props = {
  tournamentId: number;
  onBack: () => void;
  onJoin: (tournamentId: number) => void;
  onManage: () => void;
  // Organizer-only navigation — passed by the route; undefined for pure viewers.
  onManageRequests?: () => void;
  onAddMatch?: () => void;
  onEditMatch?: (matchId: number) => void;
  onEditTournament?: () => void;
  onSetWinners?: () => void;
  onSetPlayerRanks?: () => void;
};

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'matches', label: 'Matches' },
  { key: 'standings', label: 'Standings' },
  { key: 'players', label: 'Players' },
];

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function vnd(amount: number): string {
  return `${amount.toLocaleString('en-US')} ₫`;
}

/**
 * Tournament Detail (Pencil "Tournament Detail" / "Overview" / "Match Schedule" /
 * "Standings" / "Athletes List" frames). One screen, internal tab bar
 * (Overview | Matches | Standings | Players); Matches + Standings lazy-fetch on
 * first visit. Follows GroupDetailScreen.tsx's hero + tab bar + bottom action
 * bar layout. The action bar is status/role-driven — the full organizer toolset
 * lands in later build steps; here the organizer just gets a "Manage" jump.
 */
export default function TournamentDetailScreen({
  tournamentId,
  onBack,
  onJoin,
  onManage,
  onManageRequests,
  onAddMatch,
  onEditMatch,
  onEditTournament,
  onSetWinners,
  onSetPlayerRanks,
}: Props) {
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [tab, setTab] = useState<DetailTab>('overview');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawDialogVisible, setWithdrawDialogVisible] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [completeDialogVisible, setCompleteDialogVisible] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState('');
  const [roundFilter, setRoundFilter] = useState<TournamentRound | 'ALL'>('ALL');

  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [standingsLoaded, setStandingsLoaded] = useState(false);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState('');

  const [resultMatch, setResultMatch] = useState<TournamentMatch | null>(null);

  const fetchDetail = useCallback(async () => {
    setStatus('loading');
    try {
      const [detail, players] = await Promise.all([
        getTournamentDetail(tournamentId),
        getTournamentPlayers(tournamentId).catch(() => ({ tournamentId, teams: [] as TournamentTeam[] })),
      ]);
      setTournament(detail);
      setTeams(players.teams);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setStatus('error');
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const fetchMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchesError('');
    try {
      setMatches(await listTournamentMatches(tournamentId));
      setMatchesLoaded(true);
    } catch (err) {
      setMatchesError(getErrorMessage(err));
    } finally {
      setMatchesLoading(false);
    }
  }, [tournamentId]);

  const fetchStandings = useCallback(async () => {
    setStandingsLoading(true);
    setStandingsError('');
    try {
      const result = await getTournamentStandings(tournamentId);
      setStandings(result.standings);
      setStandingsLoaded(true);
    } catch (err) {
      setStandingsError(getErrorMessage(err));
    } finally {
      setStandingsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (tab === 'matches' && !matchesLoaded) fetchMatches();
    if (tab === 'standings' && !standingsLoaded) fetchStandings();
  }, [tab, matchesLoaded, standingsLoaded, fetchMatches, fetchStandings]);

  const handleToggleFavorite = async () => {
    if (!tournament) return;
    const next = !tournament.isFavorited;
    setTournament({ ...tournament, isFavorited: next });
    try {
      await setTournamentFavorite(tournamentId, next);
    } catch (err) {
      setTournament((prev) => (prev ? { ...prev, isFavorited: !next } : prev));
      Alert.alert('Something went wrong', getErrorMessage(err));
    }
  };

  const handleConfirmWithdraw = async () => {
    setWithdrawDialogVisible(false);
    setIsWithdrawing(true);
    try {
      await withdrawTournamentJoin(tournamentId);
      await fetchDetail();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelDialogVisible(false);
    setIsActioning(true);
    try {
      await cancelTournament(tournamentId);
      await fetchDetail();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setIsActioning(false);
    }
  };

  const handleConfirmComplete = async () => {
    setCompleteDialogVisible(false);
    setIsActioning(true);
    try {
      await completeTournament(tournamentId);
      await fetchDetail();
    } catch (err) {
      Alert.alert('Something went wrong', getErrorMessage(err));
    } finally {
      setIsActioning(false);
    }
  };

  const handleShare = () => {
    if (!tournament) return;
    Share.share({
      message: `Check out "${tournament.title}" on SPOT! spot://tournaments/${tournament.tournamentId}`,
    }).catch(() => undefined);
  };

  const roundsPresent = useMemo(
    () => ROUND_ORDER.filter((r) => matches.some((m) => m.round === r)),
    [matches]
  );
  const visibleMatches = useMemo(() => {
    const filtered = roundFilter === 'ALL' ? matches : matches.filter((m) => m.round === roundFilter);
    // Group by round (bracket order), then by kickoff — the API returns them in
    // creation order, which doesn't match the round filter chips.
    return [...filtered].sort((a, b) => {
      const byRound = ROUND_ORDER.indexOf(a.round) - ROUND_ORDER.indexOf(b.round);
      if (byRound !== 0) return byRound;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
  }, [matches, roundFilter]);

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
        <ErrorBanner message={errorMessage || 'Tournament not found.'} onRetry={fetchDetail} />
      </SafeAreaView>
    );
  }

  const locationLine =
    [tournament.cityName, tournament.provinceName].filter(Boolean).join(', ') || tournament.venueName;
  const myStatus = tournament.myJoinRequest?.status;
  const organizer = !!tournament.isOrganizer;
  const preStart = tournament.status === 'OPEN_REGISTRATION' || tournament.status === 'FULL';

  type OrgAction = { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; badge?: string };
  const organizerActions: OrgAction[] = organizer
    ? [
        ...(preStart && onManageRequests
          ? [
              {
                label: 'Manage join requests',
                icon: 'people-outline' as const,
                onPress: onManageRequests,
                badge: tournament.pendingRequestCount ? String(tournament.pendingRequestCount) : undefined,
              },
            ]
          : []),
        ...(tournament.status === 'ACTIVE'
          ? [
              { label: 'Add or edit matches', icon: 'calendar-outline' as const, onPress: () => setTab('matches') },
              { label: 'Enter match results', icon: 'clipboard-outline' as const, onPress: () => setTab('matches') },
            ]
          : []),
        ...(tournament.status === 'COMPLETED' && onSetWinners
          ? [{ label: 'Set winners', icon: 'trophy-outline' as const, onPress: onSetWinners }]
          : []),
        ...(tournament.status === 'COMPLETED' && onSetPlayerRanks
          ? [{ label: 'Set player rankings', icon: 'list-outline' as const, onPress: onSetPlayerRanks }]
          : []),
        ...(onEditTournament && tournament.status !== 'CANCELLED'
          ? [{ label: 'Edit tournament info', icon: 'create-outline' as const, onPress: onEditTournament }]
          : []),
      ]
    : [];

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          {tournament.coverUrl ? (
            <Image source={{ uri: tournament.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <TournamentStatusPill status={tournament.status} />
            <Text style={styles.heroTitle} numberOfLines={2} ellipsizeMode="tail">
              {tournament.title}
            </Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {tournament.hostedByLabel} · {tournament.formatBadge}
            </Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {TABS.map((item) => {
            const isActive = item.key === tab;
            return (
              <TouchableOpacity
                key={item.key}
                testID={`tournament-detail-tab-${item.key}`}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setTab(item.key)}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.body}>
          {tab === 'overview' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{tournament.description || 'No description yet.'}</Text>
                </View>
              </View>

              {organizer && organizerActions.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Organizer</Text>
                  {organizerActions.map((action) => (
                    <TouchableOpacity
                      key={action.label}
                      testID={`tournament-org-action-${action.label}`}
                      style={styles.orgRow}
                      onPress={action.onPress}
                    >
                      <View style={styles.orgRowIcon}>
                        <Ionicons name={action.icon} size={16} color={colors.primaryDark} />
                      </View>
                      <Text style={styles.orgRowLabel}>{action.label}</Text>
                      {action.badge ? (
                        <View style={styles.orgRowBadge}>
                          <Text style={styles.orgRowBadgeText}>{action.badge}</Text>
                        </View>
                      ) : null}
                      <Ionicons name="chevron-forward" size={16} color={colors.outline} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.infoGrid}>
                <InfoCell icon="calendar-outline" label="Dates" value={`${fmtDay(tournament.startsAt)} – ${fmtDay(tournament.endsAt)}`} />
                <InfoCell icon="time-outline" label="Registration closes" value={fmtDateTime(tournament.registrationDeadline)} />
                <InfoCell icon="people-outline" label="Teams" value={`${tournament.acceptedTeamCount} / ${tournament.maxTeams}`} />
                <InfoCell
                  icon="cash-outline"
                  label="Entry / Prize"
                  value={`${tournament.registrationFeeVnd > 0 ? vnd(tournament.registrationFeeVnd) : 'Free'} · ${vnd(tournament.prizePoolVnd)}`}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Registered Teams</Text>
                {teams.length === 0 && tournament.acceptedTeamCount === 0 ? (
                  <Text style={styles.placeholderText}>No teams accepted yet.</Text>
                ) : (
                  <TeamSlotStrip
                    teams={teams.map((t) => ({ teamId: t.teamId, teamName: t.teamName, teamLogoUrl: t.teamLogoUrl }))}
                    maxTeams={tournament.maxTeams}
                  />
                )}
              </View>

              {tournament.winners && tournament.winners.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Winners</Text>
                  {tournament.winners
                    .slice()
                    .sort((a, b) => a.place - b.place)
                    .map((w) => (
                      <View key={w.place} style={styles.winnerRow}>
                        <Text style={styles.winnerPlace}>{w.place}</Text>
                        <Text style={styles.winnerTeam}>
                          {w.teamName ??
                            teams.find((t) => t.teamId === w.teamId)?.teamName ??
                            `Team #${w.teamId}`}
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.venueLabel}>VENUE</Text>
                <View style={styles.venueCard}>
                  <Text style={styles.venueName} numberOfLines={1} ellipsizeMode="tail">
                    {tournament.venueName}
                  </Text>
                  <View style={styles.venueMap}>
                    <AppMap
                      markers={[
                        {
                          id: String(tournament.tournamentId),
                          latitude: tournament.latitude,
                          longitude: tournament.longitude,
                          tintColor: colors.primaryDark,
                          emoji: '📍',
                        },
                      ]}
                      initialRegion={{
                        latitude: tournament.latitude,
                        longitude: tournament.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      }}
                    />
                  </View>
                  <View style={styles.venueAddressRow}>
                    <Ionicons name="location-outline" size={14} color={colors.bodyText} />
                    <Text style={styles.venueAddressText} numberOfLines={2} ellipsizeMode="tail">
                      {tournament.venueAddress}, {locationLine}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity testID="tournament-detail-share" style={styles.shareButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.shareButtonText}>Share Tournament</Text>
              </TouchableOpacity>
            </>
          )}

          {tab === 'matches' && (
            <>
              {organizer && onAddMatch && (
                <TouchableOpacity testID="tournament-add-match" style={styles.addMatchButton} onPress={onAddMatch}>
                  <Ionicons name="add" size={15} color={colors.white} />
                  <Text style={styles.addMatchText}>Add Match</Text>
                </TouchableOpacity>
              )}
              {roundsPresent.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.roundScroller}
                >
                  {(['ALL', ...roundsPresent] as (TournamentRound | 'ALL')[]).map((r) => {
                    const active = r === roundFilter;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[styles.roundChip, active && styles.roundChipActive]}
                        onPress={() => setRoundFilter(r)}
                      >
                        <Text style={[styles.roundChipText, active && styles.roundChipTextActive]}>
                          {r === 'ALL' ? 'All' : ROUND_LABELS[r]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              {matchesLoading ? (
                <ActivityIndicator style={styles.tabSpinner} color={colors.primary} />
              ) : matchesError ? (
                <ErrorBanner message={matchesError} onRetry={fetchMatches} />
              ) : visibleMatches.length === 0 ? (
                <Text style={styles.placeholderText}>No matches scheduled yet.</Text>
              ) : (
                <View style={styles.matchList}>
                  {visibleMatches.map((m) => (
                    <TournamentMatchListItem
                      key={m.matchId}
                      match={m}
                      onEdit={organizer && onEditMatch ? () => onEditMatch(m.matchId) : undefined}
                      onEnterResult={organizer ? () => setResultMatch(m) : undefined}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          {tab === 'standings' &&
            (standingsLoading ? (
              <ActivityIndicator style={styles.tabSpinner} color={colors.primary} />
            ) : standingsError ? (
              <ErrorBanner message={standingsError} onRetry={fetchStandings} />
            ) : (
              <TournamentStandingsTable sport={tournament.sport} standings={standings} />
            ))}

          {tab === 'players' &&
            (teams.length === 0 ? (
              <Text style={styles.placeholderText}>No teams accepted yet.</Text>
            ) : (
              <View style={styles.teamsList}>
                {teams.map((team) => (
                  <View key={team.teamId} style={styles.teamCard}>
                    <View style={styles.teamCardHead}>
                      {team.teamLogoUrl ? (
                        <Image source={{ uri: team.teamLogoUrl }} style={styles.teamLogo} />
                      ) : (
                        <View style={styles.teamLogo} />
                      )}
                      <Text style={styles.teamCardName} numberOfLines={1} ellipsizeMode="tail">
                        {team.teamName}
                      </Text>
                    </View>
                    {team.roster.map((p) => (
                      <View key={p.rosterPlayerId} style={styles.playerRow}>
                        {p.rank != null && <Text style={styles.playerRank}>{p.rank}</Text>}
                        <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                          {p.name}
                        </Text>
                        {p.jerseyNumber != null && <Text style={styles.playerJersey}>#{p.jerseyNumber}</Text>}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} style={styles.heroTopBarWrap}>
        <View style={styles.heroTopBar}>
          <TouchableOpacity testID="tournament-detail-back" style={styles.heroIconButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="tournament-detail-favorite"
            style={styles.heroIconButton}
            onPress={handleToggleFavorite}
          >
            <Ionicons
              name={tournament.isFavorited ? 'heart' : 'heart-outline'}
              size={18}
              color={tournament.isFavorited ? colors.error : colors.white}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.actionBarWrap}>
        <View style={styles.actionBar}>
          {organizer ? (
            preStart ? (
              <TouchableOpacity
                testID="tournament-detail-cancel"
                style={[styles.outlineDanger, isActioning && styles.buttonDisabled]}
                onPress={() => setCancelDialogVisible(true)}
                disabled={isActioning}
              >
                <Text style={styles.outlineDangerText}>Cancel Tournament</Text>
              </TouchableOpacity>
            ) : tournament.status === 'ACTIVE' ? (
              <TouchableOpacity
                testID="tournament-detail-complete"
                style={[styles.primaryButton, styles.completeButton, isActioning && styles.buttonDisabled]}
                onPress={() => setCompleteDialogVisible(true)}
                disabled={isActioning}
              >
                <Ionicons name="checkmark-done" size={16} color={colors.white} />
                <Text style={styles.primaryButtonText}>Complete Tournament</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.organizerNote}>
                You organize this tournament · {tournament.status.replace('_', ' ').toLowerCase()}
              </Text>
            )
          ) : myStatus === 'ACCEPTED' ? (
            <View style={styles.registeredBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.skillTierGreenText} />
              <Text style={styles.registeredBannerText}>You're registered for this tournament</Text>
            </View>
          ) : myStatus === 'PENDING' ? (
            <TouchableOpacity
              testID="tournament-detail-withdraw"
              style={[styles.outlineDanger, isWithdrawing && styles.buttonDisabled]}
              onPress={() => setWithdrawDialogVisible(true)}
              disabled={isWithdrawing}
            >
              <Text style={styles.outlineDangerText}>
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw Join Request'}
              </Text>
            </TouchableOpacity>
          ) : tournament.canJoin ? (
            <TouchableOpacity
              testID="tournament-detail-join"
              style={styles.primaryButton}
              onPress={() => onJoin(tournament.tournamentId)}
            >
              <Text style={styles.primaryButtonText}>Join Tournament</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.primaryButton, styles.buttonDisabled]}>
              <Text style={styles.primaryButtonText}>Registration closed</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      <ConfirmDialog
        visible={withdrawDialogVisible}
        title="Withdraw request?"
        message="You can submit a new join request later while registration is open."
        confirmLabel="Withdraw"
        cancelLabel="Keep Request"
        onConfirm={handleConfirmWithdraw}
        onCancel={() => setWithdrawDialogVisible(false)}
      />

      <ConfirmDialog
        visible={cancelDialogVisible}
        title="Cancel this tournament?"
        message="All registered captains are notified. This can only be done before the start date."
        confirmLabel="Cancel Tournament"
        destructive
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelDialogVisible(false)}
      />

      <ConfirmDialog
        visible={completeDialogVisible}
        title="Complete this tournament?"
        message="It moves to Completed. You can still set winners and player rankings afterwards."
        confirmLabel="Complete"
        destructive={false}
        onConfirm={handleConfirmComplete}
        onCancel={() => setCompleteDialogVisible(false)}
      />

      <TournamentResultSheet
        visible={resultMatch != null}
        sport={tournament.sport}
        match={resultMatch}
        onClose={() => setResultMatch(null)}
        onSaved={() => {
          fetchMatches();
          if (standingsLoaded) fetchStandings();
        }}
      />
    </View>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoCell}>
      <View style={styles.infoCellHead}>
        <Ionicons name={icon} size={13} color={colors.outline} />
        <Text style={styles.infoCellLabel}>{label}</Text>
      </View>
      <Text style={styles.infoCellValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.screenBackground },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.screenBackground,
  },
  scrollContent: { paddingBottom: 140 },

  hero: { height: 210, overflow: 'hidden' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.heroScrim },
  heroContent: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.lg, gap: spacing.xs },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  heroSubtitle: { color: colors.white, fontSize: 12, opacity: 0.9 },

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

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.iconBackground,
    gap: spacing.xxs,
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 8 },
  tabButtonActive: { backgroundColor: colors.primaryDark },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: colors.outline },
  tabButtonTextActive: { color: colors.white },

  body: { padding: spacing.md, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.headingText },
  placeholderText: { fontSize: 13, color: colors.outline, paddingVertical: spacing.sm },

  notesCard: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: spacing.md },
  notesText: { fontSize: 13, color: colors.bodyText, lineHeight: 20 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  infoCell: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  infoCellHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  infoCellLabel: { fontSize: 11, fontWeight: '700', color: colors.outline },
  infoCellValue: { fontSize: 13, fontWeight: '600', color: colors.headingText },

  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  winnerPlace: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
    backgroundColor: colors.amber,
  },
  winnerTeam: { fontSize: 14, fontWeight: '600', color: colors.headingText },

  venueLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, color: colors.outline },
  venueCard: { backgroundColor: colors.cardBackground, borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  venueName: { fontSize: 17, fontWeight: '800', color: colors.headingText },
  venueMap: { height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.iconBackground },
  venueAddressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  venueAddressText: { fontSize: 13, color: colors.bodyText, flexShrink: 1 },

  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  shareButtonText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  roundScroller: { gap: spacing.xs, paddingBottom: spacing.sm },
  roundChip: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 9999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  roundChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roundChipText: { fontSize: 12, fontWeight: '600', color: colors.bodyText },
  roundChipTextActive: { color: colors.white },

  tabSpinner: { marginTop: spacing.lg },
  matchList: { gap: spacing.sm },
  addMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  addMatchText: { fontSize: 13, fontWeight: '700', color: colors.white },

  teamsList: { gap: spacing.md },
  teamCard: { backgroundColor: colors.cardBackground, borderRadius: 14, padding: spacing.md, gap: spacing.xs },
  teamCardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs },
  teamLogo: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.iconBackground },
  teamCardName: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: colors.headingText },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxs },
  playerRank: { width: 18, fontSize: 12, fontWeight: '700', color: colors.outline },
  playerName: { flex: 1, fontSize: 13, color: colors.bodyText },
  playerJersey: { fontSize: 12, fontWeight: '700', color: colors.outline },

  actionBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white },
  actionBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.iconBackground,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: colors.white },
  completeButton: { backgroundColor: colors.success },
  organizerNote: { fontSize: 13, color: colors.outline, textAlign: 'center', paddingVertical: spacing.sm },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: spacing.md,
  },
  orgRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgRowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.headingText },
  orgRowBadge: { backgroundColor: colors.orange, borderRadius: 9999, paddingHorizontal: spacing.xs, paddingVertical: 1 },
  orgRowBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  buttonDisabled: { backgroundColor: colors.outline },
  outlineDanger: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 16,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  outlineDangerText: { fontSize: 16, fontWeight: '700', color: colors.error },
  registeredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.skillTierGreenBg,
    borderRadius: 16,
    paddingVertical: spacing.md,
  },
  registeredBannerText: { fontSize: 14, fontWeight: '700', color: colors.skillTierGreenText },
});
