import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppMap, { type AppMapMarker } from '@/components/common/AppMap';
import { BottomNavBar } from '@/components/common/BottomNavBar';
import ErrorBanner from '@/components/common/ErrorBanner';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage, listMatches } from '@/services/matchService';
import type { Match, Sport } from '@/types/match';

type Status = 'loading' | 'ready' | 'error';
type Category = 'ALL' | Sport;

type Props = {
  onBack: () => void;
  onOpenMatch: (matchId: number) => void;
};

// Ho Chi Minh City center — fallback when no visible match has coords yet.
const DEFAULT_REGION = { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.1, longitudeDelta: 0.1 };

const SPORT_PIN: Record<Sport, { tintColor: string; emoji: string; label: string }> = {
  FOOTBALL: { tintColor: '#3B82F6', emoji: '⚽', label: 'Bóng đá' },
  BADMINTON: { tintColor: '#22C55E', emoji: '🏸', label: 'Cầu lông' },
};

/** Nudge pins apart when one venue hosts multiple sports at the same coords. */
const SPORT_COORD_OFFSET: Record<Sport, { dLat: number; dLng: number }> = {
  BADMINTON: { dLat: 0, dLng: 0 },
  FOOTBALL: { dLat: 0.00028, dLng: 0.00018 },
};

function coordKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

function clusterKey(latitude: number, longitude: number, sport: Sport) {
  return `${coordKey(latitude, longitude)}|${sport}`;
}

function groupMatchesByCoordAndSport(matches: (Match & { latitude: number; longitude: number })[]) {
  const groups = new Map<string, (Match & { latitude: number; longitude: number })[]>();
  for (const match of matches) {
    const key = clusterKey(match.latitude, match.longitude, match.sport);
    const group = groups.get(key);
    if (group) group.push(match);
    else groups.set(key, [match]);
  }
  return groups;
}

function sportsAtCoords(matches: (Match & { latitude: number; longitude: number })[]) {
  const map = new Map<string, Set<Sport>>();
  for (const match of matches) {
    const ck = coordKey(match.latitude, match.longitude);
    const set = map.get(ck) ?? new Set<Sport>();
    set.add(match.sport);
    map.set(ck, set);
  }
  return map;
}

/** One pin per venue + sport; emoji always visible, count as badge when > 1. */
function buildClusterMarkers(
  matches: (Match & { latitude: number; longitude: number })[]
): AppMapMarker[] {
  const groups = groupMatchesByCoordAndSport(matches);
  const multiSportCoords = sportsAtCoords(matches);

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

function formatMatchStart(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Join Match - Map (Figma node 426:2, SPOT-76 task #6). Real map now — see
 * src/components/common/AppMap.tsx for the WebView + Leaflet + Geoapify
 * wiring (no Google Maps API key needed). Matches without lat/lng (optional
 * field) can't get a pin, so they're filtered out of the map. This screen
 * is map-only — the scrollable match list already lives on the Homepage
 * (95:2417). Shared venue coords render as one cluster pin; tap opens a
 * compact list of kèo at that location (not MatchCard).
 */
export default function JoinMatchMapScreen({ onBack, onOpenMatch }: Props) {
  const [category, setCategory] = useState<Category>('ALL');
  const [searchText, setSearchText] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await listMatches({
        sport: category === 'ALL' ? undefined : category,
        location: appliedLocation || undefined,
      });
      setMatches(result.matches);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setStatus('error');
    }
  }, [category, appliedLocation]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const mappableMatches = useMemo(
    () => matches.filter((m): m is Match & { latitude: number; longitude: number } => m.latitude != null && m.longitude != null),
    [matches]
  );

  const matchGroups = useMemo(() => groupMatchesByCoordAndSport(mappableMatches), [mappableMatches]);

  const markers: AppMapMarker[] = useMemo(() => buildClusterMarkers(mappableMatches), [mappableMatches]);

  const initialRegion = useMemo(() => {
    const first = mappableMatches[0];
    return first ? { ...DEFAULT_REGION, latitude: first.latitude, longitude: first.longitude } : DEFAULT_REGION;
  }, [mappableMatches]);

  const selectedGroup = selectedClusterKey ? matchGroups.get(selectedClusterKey) ?? null : null;

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
            placeholder="Search sports, venues..."
            placeholderTextColor={colors.outline}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => setAppliedLocation(searchText)}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.categoryRow}>
        {([
          { key: 'ALL', label: 'All' },
          { key: 'FOOTBALL', label: 'Football' },
          { key: 'BADMINTON', label: 'Badminton' },
        ] as { key: Category; label: string }[]).map((item) => {
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

      {status === 'error' && <ErrorBanner message={errorMessage} onRetry={fetchMatches} />}

      <View style={styles.mapArea}>
        {status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : (
          <>
            <AppMap
              markers={markers}
              onSelectMarker={(id) => setSelectedClusterKey(id)}
              initialRegion={initialRegion}
            />
            {matches.length > 0 && mappableMatches.length === 0 && (
              <View style={styles.noPinsNotice}>
                <Text style={styles.noPinsNoticeText}>None of these matches have a map location yet.</Text>
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
                    {selectedGroup.length > 1 ? ` · ${selectedGroup.length} kèo` : ''}
                  </Text>
                  <Text style={styles.clusterPanelSport}>
                    {SPORT_PIN[selectedGroup[0].sport].emoji} {SPORT_PIN[selectedGroup[0].sport].label}
                  </Text>
                  <Text style={styles.clusterPanelAddress} numberOfLines={2}>
                    {selectedGroup[0].venueAddress}
                  </Text>
                  <ScrollView style={styles.clusterList} nestedScrollEnabled>
                    {selectedGroup.map((match) => (
                      <TouchableOpacity
                        key={match.matchId}
                        testID={`join-map-cluster-item-${match.matchId}`}
                        style={styles.clusterListRow}
                        onPress={() => onOpenMatch(match.matchId)}
                      >
                        <View style={styles.clusterListRowMain}>
                          <Text style={styles.clusterListTitle} numberOfLines={2}>
                            {match.title}
                          </Text>
                          <Text style={styles.clusterListMeta}>
                            {formatMatchStart(match.startsAt)} · {match.spotsLeft} chỗ trống
                          </Text>
                          {(match.host?.fullName ?? match.hostFullName) ? (
                            <Text style={styles.clusterListHost}>
                              Host: {match.host?.fullName ?? match.hostFullName}
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

  categoryRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  categoryChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  categoryChipText: { fontSize: 13, fontWeight: '700', color: colors.headingText },
  categoryChipTextActive: { color: colors.white },

  mapArea: { flex: 1 },
  noPinsNotice: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.selectedBackground,
    borderRadius: 12,
    padding: spacing.sm,
  },
  noPinsNoticeText: { fontSize: 12, color: colors.primaryDark, textAlign: 'center' },
  popupWrap: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md },
  popupCloseButton: {
    position: 'absolute',
    top: -14,
    right: -6,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterPanel: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    maxHeight: 320,
  },
  clusterPanelTitle: { fontSize: 15, fontWeight: '700', color: colors.headingText },
  clusterPanelSport: { fontSize: 12, fontWeight: '600', color: colors.primaryDark, marginTop: 4 },
  clusterPanelAddress: { fontSize: 12, color: colors.outline, marginTop: 4, marginBottom: spacing.sm },
  clusterList: { maxHeight: 220 },
  clusterListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  clusterListRowMain: { flex: 1, gap: 2 },
  clusterListTitle: { fontSize: 14, fontWeight: '600', color: colors.headingText },
  clusterListMeta: { fontSize: 12, color: colors.outline },
  clusterListHost: { fontSize: 12, color: colors.primaryDark, marginTop: 2 },

  spinner: { marginTop: spacing.xl },
});
