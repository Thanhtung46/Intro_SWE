import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppMap, { type AppMapMarker } from '@/components/common/AppMap';
import { BottomNavBar } from '@/components/common/BottomNavBar';
import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage, getVenueSuggestions, listMatches } from '@/services/matchService';
import { listGroups } from '@/services/groupService';
import { listTournaments } from '@/services/tournamentService';
import type { Match, Sport, VenueSuggestion } from '@/types/match';
import type { Group } from '@/types/group';
import type { Tournament } from '@/types/tournament';
import { formatDistanceKm, haversineKm, promptLocationFailure, requestCurrentPosition } from '@/utils/location';

export type BrowseMapMode = 'matches' | 'groups' | 'tournaments';

type Status = 'loading' | 'ready' | 'error';
type Category = 'ALL' | Sport;

type Props = {
  mode?: BrowseMapMode;
  onBack: () => void;
  /** Opens match / group / tournament detail depending on `mode`. */
  onOpenItem: (id: number) => void;
};

type MapPinItem = {
  id: number;
  sport: Sport;
  latitude: number;
  longitude: number;
  venueName: string;
  venueAddress: string;
  title: string;
  meta: string;
  hostLabel?: string;
};

type TextSuggestion = { key: string; title: string; subtitle?: string; applyText: string };

const MAP_PAGE_SIZE = 50;
const DEFAULT_REGION = { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.12, longitudeDelta: 0.12 };

const SPORT_PIN: Record<Sport, { tintColor: string; emoji: string; label: string }> = {
  FOOTBALL: { tintColor: '#3B82F6', emoji: '⚽', label: 'Bóng đá' },
  BADMINTON: { tintColor: '#22C55E', emoji: '🏸', label: 'Cầu lông' },
};

const SPORT_COORD_OFFSET: Record<Sport, { dLat: number; dLng: number }> = {
  BADMINTON: { dLat: 0, dLng: 0 },
  FOOTBALL: { dLat: 0.00028, dLng: 0.00018 },
};

const MODE_COPY: Record<
  BrowseMapMode,
  { unitOne: string; unitMany: string; empty: string; noPins: string; clusterSuffix: string }
> = {
  matches: {
    unitOne: '1 match',
    unitMany: 'matches',
    empty: 'No matches found. Try another sport or search.',
    noPins: 'None of these matches have a map location yet.',
    clusterSuffix: 'kèo',
  },
  groups: {
    unitOne: '1 group',
    unitMany: 'groups',
    empty: 'No groups found. Try another sport or search.',
    noPins: 'None of these groups have a map location yet.',
    clusterSuffix: 'nhóm',
  },
  tournaments: {
    unitOne: '1 tournament',
    unitMany: 'tournaments',
    empty: 'No tournaments found. Try another sport or search.',
    noPins: 'None of these tournaments have a map location yet.',
    clusterSuffix: 'giải',
  },
};

function coordKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

function clusterKey(latitude: number, longitude: number, sport: Sport) {
  return `${coordKey(latitude, longitude)}|${sport}`;
}

function groupPinsByCoordAndSport(items: MapPinItem[]) {
  const groups = new Map<string, MapPinItem[]>();
  for (const item of items) {
    const key = clusterKey(item.latitude, item.longitude, item.sport);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

function sportsAtCoords(items: MapPinItem[]) {
  const map = new Map<string, Set<Sport>>();
  for (const item of items) {
    const ck = coordKey(item.latitude, item.longitude);
    const set = map.get(ck) ?? new Set<Sport>();
    set.add(item.sport);
    map.set(ck, set);
  }
  return map;
}

function buildClusterMarkers(items: MapPinItem[]): AppMapMarker[] {
  const groups = groupPinsByCoordAndSport(items);
  const multiSportCoords = sportsAtCoords(items);

  return Array.from(groups.entries()).map(([key, group]) => {
    const first = group[0];
    const pin = SPORT_PIN[first.sport];
    const ck = coordKey(first.latitude, first.longitude);
    const offset =
      (multiSportCoords.get(ck)?.size ?? 1) > 1 ? SPORT_COORD_OFFSET[first.sport] : { dLat: 0, dLng: 0 };
    return {
      id: key,
      latitude: first.latitude + offset.dLat,
      longitude: first.longitude + offset.dLng,
      tintColor: pin.tintColor,
      emoji: pin.emoji,
      count: group.length,
    };
  });
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function regionForPins(
  items: { latitude: number; longitude: number }[],
  userPos: { latitude: number; longitude: number } | null
) {
  const points = [...items];
  if (userPos) points.push(userPos);
  if (points.length === 0) return DEFAULT_REGION;
  if (points.length === 1) {
    return { latitude: points[0].latitude, longitude: points[0].longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.45),
    longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.45),
  };
}

function matchToPin(match: Match & { latitude: number; longitude: number }): MapPinItem {
  return {
    id: match.matchId,
    sport: match.sport,
    latitude: match.latitude,
    longitude: match.longitude,
    venueName: match.venueName,
    venueAddress: match.venueAddress,
    title: match.title,
    meta: `${formatWhen(match.startsAt)} · ${match.spotsLeft} chỗ trống`,
    hostLabel: match.host?.fullName ?? match.hostFullName ?? undefined,
  };
}

function groupToPin(group: Group & { latitude: number; longitude: number }): MapPinItem {
  return {
    id: group.groupId,
    sport: group.sport,
    latitude: group.latitude,
    longitude: group.longitude,
    venueName: group.venueName,
    venueAddress: group.venueAddress,
    title: group.name,
    meta: `${group.memberCount} members · ${group.joinMode === 'AUTO' ? 'Open' : 'Approval'}`,
    hostLabel: group.admin?.fullName,
  };
}

function tournamentToPin(tournament: Tournament): MapPinItem {
  return {
    id: tournament.tournamentId,
    sport: tournament.sport,
    latitude: tournament.latitude,
    longitude: tournament.longitude,
    venueName: tournament.venueName,
    venueAddress: tournament.venueAddress,
    title: tournament.title,
    meta: `${tournament.formatBadge} · ${tournament.acceptedTeamCount}/${tournament.maxTeams} teams`,
    hostLabel: tournament.organizer?.fullName,
  };
}

/**
 * Browse map for Matches / Groups / Tournaments — pins every listable row
 * with lat/lng. GPS only places 🏠; search narrows by venue text.
 */
export default function JoinMatchMapScreen({ mode = 'matches', onBack, onOpenItem }: Props) {
  const copy = MODE_COPY[mode];
  const [category, setCategory] = useState<Category>('ALL');
  const [searchText, setSearchText] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [items, setItems] = useState<MapPinItem[]>([]);
  const [totalFetched, setTotalFetched] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapHint, setMapHint] = useState('');
  const [suggestions, setSuggestions] = useState<TextSuggestion[]>([]);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const refreshGps = useCallback(async (silent = false) => {
    if (!silent) setLocating(true);
    const pos = await requestCurrentPosition({ offerEnable: !silent });
    if (!silent) setLocating(false);
    if (!pos.ok) {
      if (!silent) promptLocationFailure(pos.reason);
      return null;
    }
    const next = { latitude: pos.latitude, longitude: pos.longitude };
    setUserPos(next);
    return next;
  }, []);

  useEffect(() => {
    refreshGps(true);
  }, [refreshGps]);

  const fetchItems = useCallback(async () => {
    setStatus('loading');
    setSelectedClusterKey(null);
    try {
      const sport = category === 'ALL' ? undefined : category;
      const location = appliedLocation || undefined;
      const pins: MapPinItem[] = [];
      let fetched = 0;

      if (mode === 'matches') {
        let offset = 0;
        let total = Infinity;
        while (offset < total) {
          const result = await listMatches({ sport, location, limit: MAP_PAGE_SIZE, offset });
          fetched += result.matches.length;
          total = result.total;
          for (const match of result.matches) {
            if (match.latitude != null && match.longitude != null) {
              pins.push(matchToPin(match as Match & { latitude: number; longitude: number }));
            }
          }
          if (result.matches.length === 0) break;
          offset += result.matches.length;
        }
      } else if (mode === 'groups') {
        let offset = 0;
        let total = Infinity;
        while (offset < total) {
          const result = await listGroups({ sport, location, limit: MAP_PAGE_SIZE, offset });
          fetched += result.groups.length;
          total = result.total;
          for (const group of result.groups) {
            if (group.latitude != null && group.longitude != null) {
              pins.push(groupToPin(group as Group & { latitude: number; longitude: number }));
            }
          }
          if (result.groups.length === 0) break;
          offset += result.groups.length;
        }
      } else {
        let offset = 0;
        let total = Infinity;
        while (offset < total) {
          const result = await listTournaments({ sport, location, limit: MAP_PAGE_SIZE, offset });
          fetched += result.tournaments.length;
          total = result.total;
          for (const tournament of result.tournaments) {
            if (tournament.latitude != null && tournament.longitude != null) {
              pins.push(tournamentToPin(tournament));
            }
          }
          if (result.tournaments.length === 0) break;
          offset += result.tournaments.length;
        }
      }

      setItems(pins);
      setTotalFetched(fetched);
      setMapHint(pins.length === 1 ? copy.unitOne : `${pins.length} ${copy.unitMany}`);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setStatus('error');
    }
  }, [category, appliedLocation, mode, copy.unitOne, copy.unitMany]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    setSuggestionsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const sport = category === 'ALL' ? undefined : category;
        if (mode === 'matches') {
          const next = await getVenueSuggestions(trimmed, sport);
          setSuggestions(
            next.map((venue: VenueSuggestion, index) => ({
              key: `${venue.venueName}|${venue.venueAddress}|${index}`,
              title: venue.venueName,
              subtitle: venue.venueAddress || undefined,
              applyText: venue.venueName || venue.venueAddress,
            }))
          );
        } else if (mode === 'groups') {
          const result = await listGroups({ sport, location: trimmed, limit: 5 });
          setSuggestions(
            (result.suggestions ?? []).map((row, index) => ({
              key: `${row.kind}-${row.text}-${index}`,
              title: row.text,
              applyText: row.text,
            }))
          );
        } else {
          const result = await listTournaments({ sport, location: trimmed, limit: 5 });
          setSuggestions(
            (result.suggestions ?? []).map((row, index) => ({
              key: `${row.kind}-${row.text}-${index}`,
              title: row.text,
              applyText: row.text,
            }))
          );
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, category, mode]);

  const applySearch = (text: string) => {
    const trimmed = text.trim();
    setSearchText(trimmed);
    setAppliedLocation(trimmed);
    setSuggestionsVisible(false);
  };

  const clearSearch = () => {
    setSearchText('');
    setAppliedLocation('');
    setSuggestions([]);
    setSuggestionsVisible(false);
  };

  const pinGroups = useMemo(() => groupPinsByCoordAndSport(items), [items]);

  const markers: AppMapMarker[] = useMemo(() => {
    const pins = buildClusterMarkers(items);
    if (userPos) {
      pins.push({
        id: '__me__',
        latitude: userPos.latitude,
        longitude: userPos.longitude,
        tintColor: '#2563EB',
        emoji: '🏠',
      });
    }
    return pins;
  }, [items, userPos]);

  const initialRegion = useMemo(() => regionForPins(items, userPos), [items, userPos]);

  const selectedGroup =
    selectedClusterKey && selectedClusterKey !== '__me__' ? pinGroups.get(selectedClusterKey) ?? null : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="join-map-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={colors.outline} />
          <TextInput
            testID="join-map-search-input"
            style={styles.searchInput}
            placeholder="Search by venue name or address…"
            placeholderTextColor={colors.outline}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              setSuggestionsVisible(true);
            }}
            onFocus={() => setSuggestionsVisible(true)}
            onSubmitEditing={() => applySearch(searchText)}
            returnKeyType="search"
          />
          {searchText.length > 0 ? (
            <TouchableOpacity testID="join-map-clear-search" onPress={clearSearch} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.outline} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          testID="join-map-near-me"
          style={styles.nearMeButton}
          onPress={async () => {
            await refreshGps(false);
          }}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primaryDark} />
          ) : (
            <Ionicons name="navigate" size={18} color={colors.primaryDark} />
          )}
        </TouchableOpacity>
      </View>

      {suggestionsVisible && searchText.trim().length > 0 && (suggestionsLoading || suggestions.length > 0) ? (
        <View testID="join-map-search-suggestions" style={styles.suggestionsBox}>
          {suggestionsLoading ? (
            <ActivityIndicator style={styles.suggestionsSpinner} color={colors.primary} />
          ) : (
            suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={suggestion.key}
                testID={`join-map-search-suggestion-${index}`}
                style={styles.suggestionRow}
                onPress={() => applySearch(suggestion.applyText)}
              >
                <Ionicons name="storefront-outline" size={16} color={colors.outline} />
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {suggestion.title}
                  </Text>
                  {suggestion.subtitle ? (
                    <Text style={styles.suggestionAddress} numberOfLines={1}>
                      {suggestion.subtitle}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : null}

      {mapHint ? (
        <Text style={styles.nearbyHint} numberOfLines={1}>
          {mapHint}
        </Text>
      ) : null}

      <View style={styles.categoryRow}>
        {(
          [
            { key: 'ALL', label: 'All' },
            { key: 'FOOTBALL', label: 'Football' },
            { key: 'BADMINTON', label: 'Badminton' },
          ] as { key: Category; label: string }[]
        ).map((item) => {
          const isActive = item.key === category;
          return (
            <TouchableOpacity
              key={item.key}
              testID={`join-map-category-${item.key.toLowerCase()}`}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setCategory(item.key)}
            >
              <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {status === 'error' && <ErrorBanner message={errorMessage} onRetry={fetchItems} />}

      <View style={styles.mapArea}>
        {status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : (
          <>
            <AppMap
              key={`${mode}-${initialRegion.latitude.toFixed(4)}-${initialRegion.longitude.toFixed(4)}-${items.length}-${appliedLocation}`}
              markers={markers}
              onSelectMarker={(id) => {
                if (id === '__me__') return;
                setSelectedClusterKey(id);
              }}
              initialRegion={initialRegion}
            />
            {totalFetched > 0 && items.length === 0 && (
              <View style={styles.noPinsNotice}>
                <Text style={styles.noPinsNoticeText}>{copy.noPins}</Text>
              </View>
            )}
            {totalFetched === 0 && (
              <View style={styles.noPinsNotice}>
                <Text style={styles.noPinsNoticeText}>{copy.empty}</Text>
              </View>
            )}
            {selectedGroup && selectedGroup.length > 0 && (
              <View style={styles.popupWrap}>
                <TouchableOpacity
                  testID="join-map-popup-close"
                  style={styles.popupCloseButton}
                  onPress={() => setSelectedClusterKey(null)}
                >
                  <Ionicons name="close" size={16} color={colors.headingText} />
                </TouchableOpacity>
                <View style={styles.clusterPanel}>
                  <Text style={styles.clusterPanelTitle}>
                    {selectedGroup[0].venueName}
                    {selectedGroup.length > 1 ? ` · ${selectedGroup.length} ${copy.clusterSuffix}` : ''}
                  </Text>
                  <Text style={styles.clusterPanelSport}>
                    {SPORT_PIN[selectedGroup[0].sport].emoji} {SPORT_PIN[selectedGroup[0].sport].label}
                    {userPos
                      ? ` · ${formatDistanceKm(
                          haversineKm(
                            userPos.latitude,
                            userPos.longitude,
                            selectedGroup[0].latitude,
                            selectedGroup[0].longitude
                          )
                        )}`
                      : ''}
                  </Text>
                  <Text style={styles.clusterPanelAddress} numberOfLines={2}>
                    {selectedGroup[0].venueAddress}
                  </Text>
                  <ScrollView style={styles.clusterList} nestedScrollEnabled>
                    {selectedGroup.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        testID={`join-map-cluster-item-${item.id}`}
                        style={styles.clusterListRow}
                        onPress={() => onOpenItem(item.id)}
                      >
                        <View style={styles.clusterListRowMain}>
                          <Text style={styles.clusterListTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={styles.clusterListMeta}>{item.meta}</Text>
                          {item.hostLabel ? (
                            <Text style={styles.clusterListHost}>
                              {mode === 'groups' ? 'Admin' : mode === 'tournaments' ? 'Organizer' : 'Host'}:{' '}
                              {item.hostLabel}
                            </Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.outline} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      <BottomNavBar active="matches" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearMeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 14, color: colors.headingText },
  suggestionsBox: {
    marginHorizontal: spacing.md,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing.xs,
    zIndex: 20,
    elevation: 6,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  suggestionsSpinner: { paddingVertical: spacing.sm },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionTextWrap: { flex: 1, gap: 2 },
  suggestionText: { fontSize: 13, fontWeight: '600', color: colors.headingText },
  suggestionAddress: { fontSize: 12, color: colors.outline },
  nearbyHint: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    color: colors.outline,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.iconBackground,
  },
  categoryChipActive: { backgroundColor: colors.primaryDark },
  categoryChipText: { fontSize: 12, fontWeight: '700', color: colors.outline },
  categoryChipTextActive: { color: colors.white },
  mapArea: { flex: 1, position: 'relative' },
  spinner: { marginTop: spacing.xl },
  noPinsNotice: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  noPinsNoticeText: { fontSize: 13, color: colors.bodyText, textAlign: 'center' },
  popupWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  popupCloseButton: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  clusterPanel: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: 280,
    gap: spacing.xs,
  },
  clusterPanelTitle: { fontSize: 16, fontWeight: '800', color: colors.headingText },
  clusterPanelSport: { fontSize: 13, fontWeight: '600', color: colors.bodyText },
  clusterPanelAddress: { fontSize: 12, color: colors.outline, marginBottom: spacing.xs },
  clusterList: { maxHeight: 160 },
  clusterListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  clusterListRowMain: { flex: 1, gap: 2 },
  clusterListTitle: { fontSize: 14, fontWeight: '700', color: colors.headingText },
  clusterListMeta: { fontSize: 12, color: colors.bodyText },
  clusterListHost: { fontSize: 12, color: colors.outline },
});
