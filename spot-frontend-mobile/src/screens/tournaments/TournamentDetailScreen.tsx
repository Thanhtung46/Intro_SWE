import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppMap from '@/components/common/AppMap';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ErrorBanner from '@/components/common/ErrorBanner';
import MatchCoverImage from '@/components/matches/MatchCoverImage';
import TeamSlotStrip from '@/components/tournaments/TeamSlotStrip';
import TournamentMatchListItem from '@/components/tournaments/TournamentMatchListItem';
import TournamentResultSheet from '@/components/tournaments/TournamentResultSheet';
import TournamentStandingsTable from '@/components/tournaments/TournamentStandingsTable';
import TournamentStatusPill from '@/components/tournaments/TournamentStatusPill';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ROUND_LABELS, ROUND_ORDER } from '@/constants/tournamentFormats';
import { getErrorMessage } from '@/services/apiErrors';
import {
  cancelTournament,
  completeTournament,
  getTournamentDetail,
  getTournamentPlayers,
  getTournamentStandings,
  listTournamentMatches,
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
  onOpenVenueMap: (venue: {
    venueName: string;
    venueAddress: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
  // Organizer-only navigation — passed by the route; undefined for pure viewers.
  onManageRequests?: () => void;
  onAddMatch?: () => void;
  onEditMatch?: (matchId: number) => void;
  onEditTournament?: () => void;
  onSetWinners?: () => void;
  onSetPlayerRanks?: () => void;
};

function TabIntro({ title, body, styles }: { title: string; body: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.tabIntro}>
      <Text style={styles.tabIntroTitle}>{title}</Text>
      <Text style={styles.tabIntroBody}>{body}</Text>
    </View>
  );
}

function EmptyHint({
  icon,
  title,
  body,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.emptyHint}>
      <View style={styles.emptyHintIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.emptyHintTitle}>{title}</Text>
      <Text style={styles.emptyHintBody}>{body}</Text>
    </View>
  );
}

function fmtDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDay(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
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
  onOpenVenueMap,
  onManageRequests,
  onAddMatch,
  onEditMatch,
  onEditTournament,
  onSetWinners,
  onSetPlayerRanks,
}: Props) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const styles = createStyles(colors);
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: t('tournaments.detail.overview') },
    { key: 'matches', label: t('tournaments.detail.matches') },
    { key: 'standings', label: t('tournaments.detail.standings') },
    { key: 'players', label: t('tournaments.detail.players') },
  ];
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


  const handleConfirmWithdraw = async () => {
    setWithdrawDialogVisible(false);
    setIsWithdrawing(true);
    try {
      await withdrawTournamentJoin(tournamentId);
      await fetchDetail();
    } catch (err) {
      Alert.alert(t('tournaments.common.error'), getErrorMessage(err));
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
      Alert.alert(t('tournaments.common.error'), getErrorMessage(err));
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
      Alert.alert(t('tournaments.common.error'), getErrorMessage(err));
    } finally {
      setIsActioning(false);
    }
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
          <MatchCoverImage sport={tournament.sport} coverUrl={tournament.coverUrl} />
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
          {tabs.map((item) => {
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
                <Text style={styles.sectionTitle}>{t('tournaments.detail.about')}</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{tournament.description || t('groups.detail.noDescription')}</Text>
                </View>
              </View>

              {organizer && organizerActions.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('tournaments.detail.organizer')}</Text>
                  {organizerActions.map((action) => (
                    <TouchableOpacity
                      key={action.label}
                      testID={`tournament-org-action-${action.label}`}
                      style={styles.orgRow}
                      onPress={action.onPress}
                    >
                      <View style={styles.orgRowIcon}>
                        <Ionicons name={action.icon} size={16} color={colors.primary} />
                      </View>
                      <Text style={styles.orgRowLabel}>{action.label}</Text>
                      {action.badge ? (
                        <View style={styles.orgRowBadge}>
                          <Text style={styles.orgRowBadgeText}>{action.badge}</Text>
                        </View>
                      ) : null}
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.infoGrid}>
                <InfoCell colors={colors} styles={styles} icon="calendar-outline" label={t('tournaments.detail.dateTime')} value={`${fmtDay(tournament.startsAt, locale)} – ${fmtDay(tournament.endsAt, locale)}`} />
                <InfoCell colors={colors} styles={styles} icon="time-outline" label={t('tournaments.status.registrationClosed')} value={fmtDateTime(tournament.registrationDeadline, locale)} />
                <InfoCell colors={colors} styles={styles} icon="people-outline" label={t('tournaments.detail.teams')} value={`${tournament.acceptedTeamCount} / ${tournament.maxTeams}`} />
                <InfoCell
                  colors={colors}
                  styles={styles}
                  icon="cash-outline"
                  label={`${t('tournaments.detail.registrationFee')} / ${t('tournaments.detail.prizePool')}`}
                  value={`${tournament.registrationFeeVnd > 0 ? vnd(tournament.registrationFeeVnd) : 'Free'} · ${vnd(tournament.prizePoolVnd)}`}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('tournaments.detail.registeredTeams')}</Text>
                {teams.length === 0 && tournament.acceptedTeamCount === 0 ? (
                  <Text style={styles.placeholderText}>{t('tournaments.detail.noTeams')}</Text>
                ) : (
                  <TeamSlotStrip
                    teams={teams.map((t) => ({ teamId: t.teamId, teamName: t.teamName, teamLogoUrl: t.teamLogoUrl }))}
                    maxTeams={tournament.maxTeams}
                  />
                )}
              </View>

              {tournament.winners && tournament.winners.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('tournaments.detail.winners')}</Text>
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
                <Text style={styles.venueLabel}>{t('tournaments.detail.venue')}</Text>
                <View style={styles.venueCard}>
                  <Text style={styles.venueName} numberOfLines={1} ellipsizeMode="tail">
                    {tournament.venueName}
                  </Text>
                  {tournament.latitude != null && tournament.longitude != null ? (
                    <TouchableOpacity
                      testID="tournament-detail-map"
                      style={styles.venueMap}
                      onPress={() =>
                        onOpenVenueMap({
                          venueName: tournament.venueName,
                          venueAddress: tournament.venueAddress,
                          latitude: tournament.latitude,
                          longitude: tournament.longitude,
                        })
                      }
                      activeOpacity={0.9}
                    >
                      <AppMap
                        markers={[
                          {
                            id: String(tournament.tournamentId),
                            latitude: tournament.latitude,
                            longitude: tournament.longitude,
                            tintColor: colors.primary,
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
                    </TouchableOpacity>
                  ) : null}
                  <View style={styles.venueAddressRow}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.venueAddressText} numberOfLines={2} ellipsizeMode="tail">
                      {tournament.venueAddress}, {locationLine}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {tab === 'matches' && (
            <>
              <TabIntro styles={styles}
                title="Match schedule"
                body="Fixtures for this tournament by round. Scores appear after the organizer records results."
              />
              {organizer && onAddMatch && (
                <TouchableOpacity testID="tournament-add-match" style={styles.addMatchButton} onPress={onAddMatch}>
                  <Ionicons name="add" size={15} color={colors.white} />
                  <Text style={styles.addMatchText}>{t('tournaments.detail.addMatch')}</Text>
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
                          {r === 'ALL' ? 'All rounds' : ROUND_LABELS[r]}
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
                <EmptyHint colors={colors} styles={styles}
                  icon="calendar-outline"
                  title="No fixtures yet"
                  body={
                    organizer
                      ? 'Add matches to build the schedule (group stage, knockouts, final…). Viewers will see them here.'
                      : 'The organizer has not published any fixtures yet. Check back later.'
                  }
                />
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

          {tab === 'standings' && (
            <>
              <TabIntro styles={styles}
                title="Team table"
                body={
                  tournament.sport === 'FOOTBALL'
                    ? 'Ranking from recorded match results. P=played, W=won, D=draw, L=lost, GD=goal difference, PTS=points.'
                    : 'Ranking from recorded match results. P=played, W=won, L=lost, SD=set difference, PTS=points.'
                }
              />
              {standingsLoading ? (
                <ActivityIndicator style={styles.tabSpinner} color={colors.primary} />
              ) : standingsError ? (
                <ErrorBanner message={standingsError} onRetry={fetchStandings} />
              ) : standings.length === 0 ? (
                <EmptyHint colors={colors} styles={styles}
                  icon="podium-outline"
                  title="Table is empty"
                  body="Standings fill in automatically after match results are entered. No results yet."
                />
              ) : (
                <TournamentStandingsTable sport={tournament.sport} standings={standings} />
              )}
            </>
          )}

          {tab === 'players' && (
            <>
              <TabIntro styles={styles}
                title="Team rosters"
                body="Players on each accepted team. Numbers on the left are optional in-team ranks set by the organizer."
              />
              {teams.length === 0 ? (
                <EmptyHint colors={colors} styles={styles}
                  icon="people-outline"
                  title="No accepted teams"
                  body="Rosters appear here after teams join and the organizer approves them."
                />
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
                        <View style={styles.teamCardHeadText}>
                          <Text style={styles.teamCardName} numberOfLines={1} ellipsizeMode="tail">
                            {team.teamName}
                          </Text>
                          <Text style={styles.teamCardMeta}>
                            {team.roster.length} player{team.roster.length === 1 ? '' : 's'}
                          </Text>
                        </View>
                      </View>
                      {team.roster.length === 0 ? (
                        <Text style={styles.placeholderText}>{t('tournaments.detail.noPlayers')}</Text>
                      ) : (
                        <>
                          <View style={styles.playerHeadRow}>
                            <Text style={styles.playerHeadRank}>#</Text>
                            <Text style={styles.playerHeadName}>{t('tournaments.common.player')}</Text>
                            <Text style={styles.playerHeadJersey}>No.</Text>
                          </View>
                          {team.roster.map((p) => (
                            <View key={p.rosterPlayerId} style={styles.playerRow}>
                              <Text style={styles.playerRank}>{p.rank != null ? p.rank : '—'}</Text>
                              <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                                {p.name}
                              </Text>
                              {p.jerseyNumber != null ? (
                                <Text style={styles.playerJersey}>#{p.jerseyNumber}</Text>
                              ) : (
                                <Text style={styles.playerJerseyMuted}>—</Text>
                              )}
                            </View>
                          ))}
                        </>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} style={styles.heroTopBarWrap}>
        <View style={styles.heroTopBar}>
          <TouchableOpacity testID="tournament-detail-back" style={styles.heroIconButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color={colors.white} />
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
                <Text style={styles.outlineDangerText}>{t('tournaments.detail.cancelTournament')}</Text>
              </TouchableOpacity>
            ) : tournament.status === 'ACTIVE' ? (
              <TouchableOpacity
                testID="tournament-detail-complete"
                style={[styles.primaryButton, styles.completeButton, isActioning && styles.buttonDisabled]}
                onPress={() => setCompleteDialogVisible(true)}
                disabled={isActioning}
              >
                <Ionicons name="checkmark-done" size={16} color={colors.white} />
                <Text style={styles.primaryButtonText}>{t('tournaments.detail.completeTournament')}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.organizerNote}>
                You organize this tournament · {tournament.status.replace('_', ' ').toLowerCase()}
              </Text>
            )
          ) : myStatus === 'ACCEPTED' ? (
            <View style={styles.registeredBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.successText} />
              <Text style={styles.registeredBannerText}>{t('tournaments.detail.registered')}</Text>
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
              <Text style={styles.primaryButtonText}>{t('tournaments.browse.join')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.primaryButton, styles.buttonDisabled]}>
              <Text style={styles.primaryButtonText}>{t('tournaments.detail.registrationClosed')}</Text>
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
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.infoCell}>
      <View style={styles.infoCellHead}>
        <Ionicons name={icon} size={13} color={colors.textMuted} />
        <Text style={styles.infoCellLabel}>{label}</Text>
      </View>
      <Text style={styles.infoCellValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.screenBackgroundAlt },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.screenBackgroundAlt,
  },
  scrollContent: { paddingBottom: 140 },

  hero: { height: 210, overflow: 'hidden', position: 'relative' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.groupImageScrim, zIndex: 1 },
  heroContent: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    gap: spacing.xs,
    zIndex: 2,
  },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: '800' },
  heroSubtitle: { color: colors.white, fontSize: 12, opacity: 0.9 },

  heroTopBarWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  heroIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.matchIconGlassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.tintedSurface,
    gap: spacing.xxs,
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 8 },
  tabButtonActive: { backgroundColor: colors.primary },
  tabButtonText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  tabButtonTextActive: { color: colors.white },

  body: { padding: spacing.md, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  placeholderText: { fontSize: 13, color: colors.textMuted, paddingVertical: spacing.sm },

  notesCard: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md },
  notesText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  infoCell: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  infoCellHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  infoCellLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  infoCellValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },

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
    backgroundColor: colors.warningText,
  },
  winnerTeam: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  venueLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, color: colors.textMuted },
  venueCard: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  venueName: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  venueMap: { height: 140, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.tintedSurface },
  venueAddressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  venueAddressText: { fontSize: 13, color: colors.textSecondary, flexShrink: 1 },

  roundScroller: { gap: spacing.xs, paddingBottom: spacing.sm },
  roundChip: {
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 9999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  roundChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roundChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  roundChipTextActive: { color: colors.white },

  tabSpinner: { marginTop: spacing.lg },
  matchList: { gap: spacing.sm },
  addMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  addMatchText: { fontSize: 13, fontWeight: '700', color: colors.white },

  teamsList: { gap: spacing.md },
  teamCard: { backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, gap: spacing.xs },
  teamCardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs },
  teamLogo: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tintedSurface },
  teamCardHeadText: { flex: 1, gap: 2 },
  teamCardName: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  teamCardMeta: { fontSize: 12, color: colors.textMuted },
  playerHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xxs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    marginBottom: spacing.xxs,
  },
  playerHeadRank: { width: 22, fontSize: 11, fontWeight: '800', color: colors.textMuted },
  playerHeadName: { flex: 1, fontSize: 11, fontWeight: '800', color: colors.textMuted },
  playerHeadJersey: { width: 36, textAlign: 'right', fontSize: 11, fontWeight: '800', color: colors.textMuted },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxs },
  playerRank: { width: 22, fontSize: 12, fontWeight: '700', color: colors.textMuted },
  playerName: { flex: 1, fontSize: 13, color: colors.textPrimary },
  playerJersey: { width: 36, textAlign: 'right', fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  playerJerseyMuted: { width: 36, textAlign: 'right', fontSize: 12, color: colors.textMuted },

  tabIntro: {
    backgroundColor: colors.tintedSurface,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  tabIntroTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  tabIntroBody: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  emptyHint: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyHintIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  emptyHintTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  emptyHintBody: { fontSize: 13, lineHeight: 18, color: colors.textMuted, textAlign: 'center' },

  actionBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface },
  actionBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
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
  completeButton: { backgroundColor: colors.successText },
  organizerNote: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  orgRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.tintedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgRowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  orgRowBadge: { backgroundColor: colors.warningText, borderRadius: 9999, paddingHorizontal: spacing.xs, paddingVertical: 1 },
  orgRowBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  buttonDisabled: { backgroundColor: colors.textMuted },
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
    backgroundColor: colors.successSurface,
    borderRadius: 16,
    paddingVertical: spacing.md,
  },
  registeredBannerText: { fontSize: 14, fontWeight: '700', color: colors.successText },
});
