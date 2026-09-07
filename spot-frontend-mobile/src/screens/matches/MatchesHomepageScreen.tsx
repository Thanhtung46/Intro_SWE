import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ErrorBanner from '@/components/common/ErrorBanner';
import FilterSheet from '@/components/matches/FilterSheet';
import MatchCard from '@/components/matches/MatchCard';
import SlidingSegmentControl from '@/components/navigation/SlidingSegmentControl';
import { spacing } from '@/constants/spacing';
import type { ThemeColors } from '@/constants/theme';
import { getErrorMessage, listMatches } from '@/services/matchService';
import { listGroups } from '@/services/groupService';
import { listTournaments } from '@/services/tournamentService';
import { openVenueDirections } from '@/utils/directions';
import { formatDistanceKm, haversineKm, requestCurrentPosition } from '@/utils/location';
import type { Match, MatchSuggestion, Sport } from '@/types/match';
import { EMPTY_MATCH_FILTERS, type MatchFilters } from '@/types/matchFilters';
import { EMPTY_GROUP_FILTERS, type GroupFilters } from '@/types/groupFilters';
import { EMPTY_TOURNAMENT_FILTERS, type TournamentFilters } from '@/types/tournamentFilters';
import type { GroupSuggestion } from '@/types/group';
import type { TournamentSuggestion } from '@/types/tournament';
import GroupsBrowseScreen from '@/screens/groups/GroupsBrowseScreen';
import TournamentsBrowseScreen from '@/screens/tournaments/TournamentsBrowseScreen';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

type SubTab = 'matches' | 'groups' | 'tournaments';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  /** Map button — opens the map for the current sub-tab (matches / groups / tournaments). */
  onOpenMap: (tab: SubTab) => void;
  onOpenMatch: (matchId: number) => void;
  /** Card "Join Match" CTA — should open join sheet (e.g. /matches/:id?join=1). */
  onJoinMatch?: (matchId: number) => void;
  onHostMatch: (sport: Sport) => void;
  onManageMatches: () => void;
  onOpenGroup: (groupId: number) => void;
  onCreateGroup: (sport: Sport) => void;
  onManageGroups: () => void;
  onOpenTournament: (tournamentId: number) => void;
  onJoinTournament?: (tournamentId: number) => void;
  onCreateTournament: (sport: Sport) => void;
  onManageTournaments: () => void;
};

type FabAction = { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void };

// Each sub-tab routes through its own props (onCreateGroup/onManageGroups,
// onCreateTournament/onManageTournaments) rather than reusing the
// Matches-tab-specific onHostMatch/onManageMatches.
function getFabActions(
  subTab: SubTab,
  sport: Sport,
  props: Props,
  labels: { groupCreate: string; groupManage: string; hostMatch: string; manageMatches: string; createTournament: string; manageTournaments: string }
): FabAction[] {
  if (subTab === 'matches') {
    return [
      { icon: 'megaphone-outline', label: labels.hostMatch, onPress: () => props.onHostMatch(sport) },
      { icon: 'people-outline', label: labels.manageMatches, onPress: props.onManageMatches },
    ];
  }
  if (subTab === 'groups') {
    return [
      { icon: 'add-circle-outline', label: labels.groupCreate, onPress: () => props.onCreateGroup(sport) },
      { icon: 'people-outline', label: labels.groupManage, onPress: props.onManageGroups },
    ];
  }
  return [
    { icon: 'add-circle-outline', label: labels.createTournament, onPress: () => props.onCreateTournament(sport) },
    { icon: 'people-outline', label: labels.manageTournaments, onPress: props.onManageTournaments },
  ];
}

// FAB sits in AppShell's content slot (already above bottom nav), so offset
// is only a small gap from the content bottom — not nav height + FAB size.
const FAB_BOTTOM_OFFSET = 24;
const FAB_MENU_BOTTOM_OFFSET = 88;
const FAB_MENU_WIDTH = 192;

/** Matches list page size — mirrors GET /matches default/max-friendly batch. */
const PAGE_SIZE = 20;

// The map button reads noticeably smaller/tighter than the reference than
// the xs/sm spacing scale gives — sized up a bit past the strict
// pencil-node number per user feedback comparing the rendered app against
// the reference image.
const MAP_BUTTON_SIZE = 44;

/**
 * Matches Homepage (Figma node 95:2417, SPOT-76). Presentation-only per
 * .claude/rules/code-style.md: navigation decisions (onOpenMap/onOpenMatch/
 * ...) are callback props owned by app/matches/index.tsx. Header/bottom
 * nav/ProfileMenu now live in AppShell (see app/matches/index.tsx), same as
 * Home/Schedule/Settings. FilterSheet is a self-contained Modal-based
 * component (owns its own visibility state, like src/components/
 * ProfileMenu.tsx) so rendering it here isn't a routing decision by this
 * screen — Filter has no destination to navigate to.
 *
 * Groups and Tournaments sub-tabs + their FAB actions are wired
 * (GroupsBrowseScreen / TournamentsBrowseScreen, /groups/* and /tournaments/*).
 */
export default function MatchesHomepageScreen(props: Props) {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(themeColors);
  const [sport, setSport] = useState<Sport>('FOOTBALL');
  const [subTab, setSubTab] = useState<SubTab>('matches');
  const [searchText, setSearchText] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  const toggleFab = useCallback(
    (next: boolean) => {
      setFabOpen(next);
      Animated.spring(fabAnim, {
        toValue: next ? 1 : 0,
        useNativeDriver: true,
        friction: 8,
        tension: 90,
      }).start();
    },
    [fabAnim]
  );
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<MatchFilters>(EMPTY_MATCH_FILTERS);
  /** Viewer GPS for card distance labels — refreshed on focus / pull / distance Apply. */
  const [viewerCoords, setViewerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const viewerCoordsRef = useRef(viewerCoords);
  viewerCoordsRef.current = viewerCoords;
  const viewerCoordsFetchedAt = useRef(0);

  const refreshViewerCoords = useCallback(async (force = false) => {
    // Avoid spamming the GPS stack on every focus; force on pull-to-refresh.
    if (!force && viewerCoordsRef.current && Date.now() - viewerCoordsFetchedAt.current < 60_000) {
      return;
    }
    const pos = await requestCurrentPosition();
    if (!pos.ok) return;
    viewerCoordsFetchedAt.current = Date.now();
    setViewerCoords({ latitude: pos.latitude, longitude: pos.longitude });
  }, []);
  const [groupFilterVisible, setGroupFilterVisible] = useState(false);
  const [groupFilters, setGroupFilters] = useState<GroupFilters>(EMPTY_GROUP_FILTERS);
  const [tournamentFilterVisible, setTournamentFilterVisible] = useState(false);
  const [tournamentFilters, setTournamentFilters] = useState<TournamentFilters>(EMPTY_TOURNAMENT_FILTERS);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[] | GroupSuggestion[] | TournamentSuggestion[]>([]);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const buildListQuery = useCallback(
    (offset: number) => {
      // Distance mode (lat/lng/radiusKm) is XOR with free-text location and
      // province/city at the API level — send only one set.
      const distanceMode =
        filters.latitude != null && filters.longitude != null && filters.radiusKm != null;
      return {
        sport,
        location: distanceMode ? undefined : appliedLocation || undefined,
        date: filters.date,
        timeFrom: filters.timeFrom,
        timeTo: filters.timeTo,
        skill: filters.skill?.length ? filters.skill : undefined,
        format: filters.format?.length ? filters.format : undefined,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        province: distanceMode ? undefined : filters.province,
        city: distanceMode ? undefined : filters.city,
        latitude: distanceMode ? filters.latitude : undefined,
        longitude: distanceMode ? filters.longitude : undefined,
        radiusKm: distanceMode ? Math.round(filters.radiusKm!) : undefined,
        favorited: filters.favorited,
        limit: PAGE_SIZE,
        offset,
      };
    },
    [sport, appliedLocation, filters]
  );

  // Guards against an earlier, superseded fetchMatches call (e.g. a rapid
  // filter change while a previous request is still in flight) applying its
  // stale result after a newer call has already started — only the most
  // recently *started* call is allowed to write into state.
  const fetchRequestIdRef = useRef(0);
  /** Set after every successful/failed fetch — read by the staleness check
   * in the focus-revalidation effect below (T023). */
  const matchesFetchedAtRef = useRef<number | null>(null);
  /** ~30s TTL (research.md §3). */
  const MATCHES_STALE_TTL_MS = 30_000;

  const fetchMatches = useCallback(
    async (isRefresh = false) => {
      const requestId = ++fetchRequestIdRef.current;
      isRefresh ? setRefreshing(true) : setStatus('loading');
      try {
        if (isRefresh) await refreshViewerCoords(true);
        const result = await listMatches(buildListQuery(0));
        if (fetchRequestIdRef.current !== requestId) return;
        setMatches(result.matches);
        setTotal(result.total);
        setStatus('ready');
        matchesFetchedAtRef.current = Date.now();
      } catch (err) {
        if (fetchRequestIdRef.current !== requestId) return;
        setErrorMessage(getErrorMessage(err));
        setStatus('error');
      } finally {
        if (isRefresh && fetchRequestIdRef.current === requestId) setRefreshing(false);
      }
    },
    [buildListQuery, refreshViewerCoords]
  );

  // Screens stay mounted across tab switches now (US1) — on a stale revisit,
  // silently revalidate via the same `isRefresh` path pull-to-refresh uses
  // (RefreshControl spinner, matches stay visible throughout — no full-screen
  // loading state, per data-model.md rule 3).
  useFocusEffect(
    useCallback(() => {
      if (subTab === 'matches' && status === 'ready' && matchesFetchedAtRef.current != null &&
        Date.now() - matchesFetchedAtRef.current > MATCHES_STALE_TTL_MS) {
        fetchMatches(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately re-checked on every focus + subTab/status change
    }, [fetchMatches, subTab, status])
  );

  const loadMoreMatches = useCallback(async () => {
    if (status !== 'ready' || loadingMoreRef.current || matches.length >= total) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await listMatches(buildListQuery(matches.length));
      setMatches((prev) => {
        const seen = new Set(prev.map((m) => m.matchId));
        return [...prev, ...result.matches.filter((m) => !seen.has(m.matchId))];
      });
      setTotal(result.total);
    } catch {
      // Keep what we already have; user can pull-to-refresh.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [status, matches.length, total, buildListQuery]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // When Location Services is on, keep viewer GPS fresh so every card can
  // show distance — on screen focus and when returning to the app.
  useFocusEffect(
    useCallback(() => {
      refreshViewerCoords(false);
    }, [refreshViewerCoords])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshViewerCoords(false);
    });
    return () => sub.remove();
  }, [refreshViewerCoords]);

  // Search-as-you-type dropdown — separate from `appliedLocation`/`fetchMatches`
  // above so the visible match list only changes on submit/tap, not on every
  // keystroke (spot-backend/CLAUDE.md "Homepage search": debounce ~300ms).
  // Shared search bar branches which list API it hits based on `subTab`
  // (Groups implementation plan — no separate search UI for Groups).
  useEffect(() => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    const timer = setTimeout(async () => {
      try {
        if (subTab === 'groups') {
          const result = await listGroups({ sport, location: trimmed });
          setSuggestions(result.suggestions ?? []);
        } else if (subTab === 'tournaments') {
          const result = await listTournaments({ sport, location: trimmed });
          setSuggestions(result.suggestions ?? []);
        } else {
          const result = await listMatches({ sport, location: trimmed });
          setSuggestions(result.suggestions ?? []);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, sport, subTab]);

  const applySuggestion = (suggestion: MatchSuggestion | GroupSuggestion | TournamentSuggestion) => {
    setSearchText(suggestion.text);
    setAppliedLocation(suggestion.text);
    setSuggestionsVisible(false);
    // Search XOR Distance — drop GPS radius when applying a text location.
    setFilters((prev) => ({
      ...prev,
      latitude: undefined,
      longitude: undefined,
      radiusKm: undefined,
    }));
    setGroupFilters((prev) => ({
      ...prev,
      latitude: undefined,
      longitude: undefined,
      radiusKm: undefined,
    }));
  };

  const suggestionIcon = (kind: string): keyof typeof Ionicons.glyphMap => {
    if (kind === 'name') return 'people-outline';
    if (kind === 'venueName') return 'storefront-outline';
    if (kind === 'venueAddress') return 'location-outline';
    if (kind === 'title') return 'pricetag-outline';
    return 'pricetag-outline';
  };

  const handleSubTabPress = (tab: SubTab) => {
    setSubTab(tab);
  };

  const fabActions = getFabActions(subTab, sport, props, {
    groupCreate: t('groups.actions.create'),
    groupManage: t('groups.actions.manage'),
    hostMatch: t('matches.actions.hostMatch'),
    manageMatches: t('matches.actions.manageMatches'),
    createTournament: t('matches.actions.createTournament'),
    manageTournaments: t('matches.actions.manageTournaments'),
  });

  const matchFiltersActive =
    (filters.skill?.length ?? 0) > 0 ||
    (filters.format?.length ?? 0) > 0 ||
    !!filters.date ||
    !!filters.timeFrom ||
    !!filters.timeTo ||
    filters.priceMin != null ||
    filters.priceMax != null ||
    !!filters.province ||
    !!filters.city ||
    filters.radiusKm != null ||
    !!filters.favorited;
  const filterActive = subTab === 'matches' && matchFiltersActive;

  const clearSearch = () => {
    setSearchText('');
    setAppliedLocation('');
    setSuggestionsVisible(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.screenBackgroundAlt }]} edges={[]}>
      <SlidingSegmentControl
        style={styles.sportToggle}
        active={sport}
        inactiveColor={themeColors.accentText}
        pillColor={themeColors.primary}
        activeColor={themeColors.white}
        segmentPaddingVertical={14}
        onChange={(next) => {
          setSport(next);
          setFilters((prev) => ({ ...prev, skill: [], format: [] }));
        }}
        items={[
          {
            key: 'FOOTBALL',
            label: t('common.sportFootball'),
            testID: 'sport-toggle-football',
            renderIcon: (isActive) => (
              <Ionicons name="football-outline" size={16} color={isActive ? themeColors.white : (themeColors.accentText)} />
            ),
          },
          {
            key: 'BADMINTON',
            label: t('common.sportBadminton'),
            testID: 'sport-toggle-badminton',
            renderIcon: (isActive) => (
              <MaterialCommunityIcons name="badminton" size={16} color={isActive ? themeColors.white : (themeColors.accentText)} />
            ),
          },
        ]}
      />

      <View style={styles.searchRow}>
        <View style={[styles.searchInputWrap, { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder }]}>
          <Ionicons name="search-outline" size={18} color={themeColors.textMuted} />
          <TextInput
            testID="matches-search-input"
            style={[styles.searchInput, { color: themeColors.textPrimary }]}
            placeholder={
              subTab === 'groups'
                ? t('groups.browse.searchPlaceholder')
                : subTab === 'tournaments'
                  ? t('matches.browse.tournamentsSearchPlaceholder')
                  : t('matches.browse.searchPlaceholder')
            }
            placeholderTextColor={themeColors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSuggestionsVisible(true)}
            onSubmitEditing={() => {
              const trimmed = searchText.trim();
              setAppliedLocation(trimmed);
              setSuggestionsVisible(false);
              if (trimmed) {
                setFilters((prev) => ({
                  ...prev,
                  latitude: undefined,
                  longitude: undefined,
                  radiusKm: undefined,
                }));
                setGroupFilters((prev) => ({
                  ...prev,
                  latitude: undefined,
                  longitude: undefined,
                  radiusKm: undefined,
                }));
              }
            }}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity testID="matches-search-clear" onPress={clearSearch} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={themeColors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID="matches-filter-button"
            onPress={() =>
              subTab === 'groups'
                ? setGroupFilterVisible(true)
                : subTab === 'tournaments'
                  ? setTournamentFilterVisible(true)
                  : setFilterVisible(true)
            }
            hitSlop={8}
          >
            <View>
              <Ionicons name="options-outline" size={18} color={themeColors.textSecondary} />
              {filterActive && <View style={styles.filterDot} />}
            </View>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          testID="matches-map-button"
          style={[styles.mapButton, { backgroundColor: themeColors.glassButtonBg, borderColor: themeColors.glassRingBorder }]}
          onPress={() => props.onOpenMap(subTab)}
        >
          <Ionicons name="map-outline" size={18} color={themeColors.accentText} />
        </TouchableOpacity>
      </View>

      {suggestionsVisible && searchText.trim().length > 0 && (suggestionsLoading || suggestions.length > 0) && (
        <View testID="matches-search-suggestions" style={[styles.suggestionsBox, { backgroundColor: themeColors.surface, borderColor: themeColors.surfaceBorder }]}>
          {suggestionsLoading ? (
            <ActivityIndicator style={styles.suggestionsSpinner} color={themeColors.primary} />
          ) : (
            suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion.kind}-${suggestion.text}`}
                testID={`matches-search-suggestion-${index}`}
                style={styles.suggestionRow}
                onPress={() => applySuggestion(suggestion)}
              >
                <Ionicons name={suggestionIcon(suggestion.kind)} size={16} color={themeColors.textMuted} />
                <Text style={[styles.suggestionText, { color: themeColors.textPrimary }]} numberOfLines={1}>
                  {suggestion.text}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      <SlidingSegmentControl
        style={[styles.subTabs, { backgroundColor: themeColors.tintedSurface }]}
        active={subTab}
        inactiveColor={themeColors.textMuted}
        pillColor={themeColors.primary}
        activeColor={themeColors.white}
        segmentPaddingVertical={spacing.md}
        labelStyle={styles.subTabText}
        onChange={handleSubTabPress}
        items={[
          { key: 'matches', label: t('groups.tabs.matches'), testID: 'sub-tab-matches' },
          { key: 'groups', label: t('groups.tabs.groups'), testID: 'sub-tab-groups' },
          { key: 'tournaments', label: t('groups.tabs.tournaments'), testID: 'sub-tab-tournaments' },
        ]}
      />

      {subTab === 'groups' ? (
        <GroupsBrowseScreen
          sport={sport}
          appliedLocation={appliedLocation}
          filters={groupFilters}
          filterVisible={groupFilterVisible}
          viewerCoords={viewerCoords}
          onCloseFilter={() => setGroupFilterVisible(false)}
          onApplyFilters={(next) => {
            setGroupFilters(next);
            if (next.latitude != null && next.longitude != null) {
              viewerCoordsFetchedAt.current = Date.now();
              setViewerCoords({ latitude: next.latitude, longitude: next.longitude });
            }
          }}
          onOpenGroup={props.onOpenGroup}
        />
      ) : subTab === 'tournaments' ? (
        <TournamentsBrowseScreen
          sport={sport}
          appliedLocation={appliedLocation}
          filters={tournamentFilters}
          filterVisible={tournamentFilterVisible}
          viewerCoords={viewerCoords}
          onCloseFilter={() => setTournamentFilterVisible(false)}
          onApplyFilters={(next) => {
            setTournamentFilters(next);
            if (next.latitude != null && next.longitude != null) {
              viewerCoordsFetchedAt.current = Date.now();
              setViewerCoords({ latitude: next.latitude, longitude: next.longitude });
            }
          }}
          onOpenTournament={props.onOpenTournament}
          onJoinTournament={(tournamentId) =>
            (props.onJoinTournament ?? props.onOpenTournament)(tournamentId)
          }
        />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={matches}
          keyExtractor={(item) => String(item.matchId)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMatches(true)} />}
          onEndReached={loadMoreMatches}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            // Only shown on a true first load (no matches yet) — a
            // sport/filter change re-fetches with status:'loading' too, but
            // `matches` keeps its previous results visible throughout per
            // data-model.md rule 3, instead of blanking to a spinner.
            status === 'loading' && matches.length === 0 ? (
              <ActivityIndicator style={styles.spinner} color={themeColors.primary} />
            ) : status === 'error' ? (
              <ErrorBanner message={errorMessage} onRetry={() => fetchMatches()} />
            ) : null
          }
          ListEmptyComponent={
            status === 'ready' ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={28} color={themeColors.outlineMuted} />
                <Text style={styles.emptyStateText}>{t('matches.browse.empty')}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.loadMoreSpinner} color={themeColors.primary} /> : null
          }
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          renderItem={({ item: match }) => {
            const distanceLabel =
              viewerCoords && match.latitude != null && match.longitude != null
                ? formatDistanceKm(
                    haversineKm(viewerCoords.latitude, viewerCoords.longitude, match.latitude, match.longitude)
                  )
                : null;
            return (
              <MatchCard
                match={match}
                distanceLabel={distanceLabel}
                onPress={() => props.onOpenMatch(match.matchId)}
                onJoin={() => (props.onJoinMatch ?? props.onOpenMatch)(match.matchId)}
                onDirections={() => openVenueDirections(router, match)}
              />
            );
          }}
        />
      )}

      {fabOpen && (
        <TouchableOpacity
          testID="matches-fab-backdrop"
          style={styles.fabBackdrop}
          activeOpacity={1}
          onPress={() => toggleFab(false)}
        />
      )}
      <Animated.View
        pointerEvents={fabOpen ? 'auto' : 'none'}
        style={[
          styles.fabMenu,
          { backgroundColor: themeColors.surface, borderColor: themeColors.surfaceBorder, borderWidth: 1 },
          {
            opacity: fabAnim,
            transform: [
              { scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
              { translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            ],
          },
        ]}
      >
        {fabActions.map((action, index) => (
          <React.Fragment key={action.label}>
            {index > 0 && <View style={[styles.fabMenuDivider, { backgroundColor: themeColors.divider }]} />}
            <TouchableOpacity
              testID={`fab-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              style={styles.fabMenuItem}
              onPress={() => {
                toggleFab(false);
                action.onPress();
              }}
            >
              <View style={[styles.fabMenuIcon, { backgroundColor: themeColors.tintedSurface }]}>
                <Ionicons name={action.icon} size={16} color={themeColors.accentText} />
              </View>
              <Text style={[styles.fabMenuLabel, { color: themeColors.textPrimary }]}>{action.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </Animated.View>
      <TouchableOpacity
        testID="matches-fab"
          style={[styles.fab, { backgroundColor: themeColors.primary, borderColor: themeColors.screenBackgroundAlt }]}
        onPress={() => toggleFab(!fabOpen)}
        activeOpacity={0.85}
      >
        <Animated.View
          style={{
            transform: [
              {
                rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] }),
              },
            ],
          }}
        >
          <Ionicons name="add" size={26} color={themeColors.white} />
        </Animated.View>
      </TouchableOpacity>

      <FilterSheet
        visible={filterVisible}
        sport={sport}
        initialFilters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={(next) => {
          setFilters(next);
          if (next.latitude != null && next.longitude != null) {
            // Distance mode XOR free-text search — clear the search bar so we
            // never send both `location` and lat/lng/radiusKm (BE 400).
            setSearchText('');
            setAppliedLocation('');
            setSuggestionsVisible(false);
            viewerCoordsFetchedAt.current = Date.now();
            setViewerCoords({ latitude: next.latitude, longitude: next.longitude });
          }
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackgroundAlt },
  sportToggle: {
    marginHorizontal: spacing.md,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 14, color: colors.textPrimary },
  filterDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  // White bg + blue icon while idle, not filled blue — pencil node
  // 95:2417's sgHdE (map button next to the search bar). Sized up past
  // the pencil-node 40x40, matching the header buttons' bump.
  mapButton: {
    width: MAP_BUTTON_SIZE,
    height: MAP_BUTTON_SIZE,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  suggestionsBox: {
    marginHorizontal: spacing.md,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.chromeBorder,
    paddingVertical: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  suggestionsSpinner: { paddingVertical: spacing.sm },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: { flex: 1, fontSize: 13, color: colors.textPrimary },

  subTabs: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    padding: spacing.xs,
    gap: spacing.xxs,
  },
  subTabText: { fontSize: 12, fontWeight: '700' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  listSeparator: { height: spacing.lg },
  spinner: { marginTop: spacing.xl },
  loadMoreSpinner: { marginVertical: spacing.md },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl * 2 },
  emptyStateText: { fontSize: 13, color: colors.outlineMuted, textAlign: 'center' },

  // Transparent full-screen catcher rendered behind the open FAB menu so a
  // tap anywhere outside the panel/button closes it (the menu + fab render
  // after this in source order, so they stay tappable — no zIndex needed).
  fabBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: FAB_BOTTOM_OFFSET,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
  fabMenu: {
    position: 'absolute',
    right: spacing.lg,
    bottom: FAB_MENU_BOTTOM_OFFSET,
    width: FAB_MENU_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  fabMenuDivider: { height: 1, backgroundColor: colors.roleCardSelectedBg, marginHorizontal: spacing.sm },
  fabMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.roleCardSelectedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenuLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
});
