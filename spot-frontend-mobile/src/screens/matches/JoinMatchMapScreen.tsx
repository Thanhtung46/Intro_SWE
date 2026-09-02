import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import AppMap, { type AppMapMarker, type UserLocation } from '@/components/common/AppMap';
import { BottomNavBar } from '@/components/common/BottomNavBar';
import ErrorBanner from '@/components/common/ErrorBanner';
import MatchCard from '@/components/matches/MatchCard';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { getErrorMessage, listMatches, setFavorite } from '@/services/matchService';
import { openVenueDirections } from '@/utils/directions';
import type { Match, Sport } from '@/types/match';

type Status = 'loading' | 'ready' | 'error';
type Category = 'ALL' | Sport;

type Props = {
  onBack: () => void;
  onOpenMatch: (matchId: number) => void;
};

// Ho Chi Minh City center — fallback when no visible match has coords yet.
const DEFAULT_REGION = { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.1, longitudeDelta: 0.1 };

const SPORT_PIN: Record<Sport, { tintColor: string; emoji: string }> = {
  FOOTBALL: { tintColor: '#3B82F6', emoji: '⚽' },
  BADMINTON: { tintColor: '#22C55E', emoji: '🏸' },
};

// Offsets matches that share the exact same venue coords (common with
// seeded/smoke-test data — several kèo hosted at one venue) so their pins
// don't render pixel-on-pixel and become one untappable blob. Spreads them
// in a small ring (~35m radius) around the shared point; groups of 1 are
// untouched.
const OVERLAP_SPREAD_DEGREES = 0.00035;

function spreadOverlappingMarkers(
  matches: (Match & { latitude: number; longitude: number })[]
): AppMapMarker[] {
  const groups = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = `${m.latitude.toFixed(5)},${m.longitude.toFixed(5)}`;
    const group = groups.get(key);
    if (group) group.push(m);
    else groups.set(key, [m]);
  }

  const markers: AppMapMarker[] = [];
  for (const group of groups.values()) {
    group.forEach((m, index) => {
      const angle = (2 * Math.PI * index) / group.length;
      const offset = group.length > 1 ? OVERLAP_SPREAD_DEGREES : 0;
      markers.push({
        id: String(m.matchId),
        latitude: m.latitude + offset * Math.sin(angle),
        longitude: m.longitude + offset * Math.cos(angle),
        ...SPORT_PIN[m.sport],
      });
    });
  }
  return markers;
}

/**
 * Join Match - Map (Figma node 426:2, SPOT-76 task #6). Real map now — see
 * src/components/common/AppMap.tsx for the WebView + Leaflet + Geoapify
 * wiring (no Google Maps API key needed). Matches without lat/lng (optional
 * field) can't get a pin, so they're filtered out of the map. This screen
 * is map-only — the scrollable match list already lives on the Homepage
 * (95:2417), so duplicating it here added nothing.
 */
export default function JoinMatchMapScreen({ onBack, onOpenMatch }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState<Category>('ALL');
  const [searchText, setSearchText] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted' || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
      } catch {
        // Map still works without GPS.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleToggleFavorite = async (match: Match) => {
    const nextFavorited = !match.isFavorited;
    setMatches((prev) => prev.map((m) => (m.matchId === match.matchId ? { ...m, isFavorited: nextFavorited } : m)));
    try {
      await setFavorite(match.matchId, nextFavorited);
    } catch {
      setMatches((prev) => prev.map((m) => (m.matchId === match.matchId ? { ...m, isFavorited: match.isFavorited } : m)));
    }
  };

  const mappableMatches = useMemo(
    () => matches.filter((m): m is Match & { latitude: number; longitude: number } => m.latitude != null && m.longitude != null),
    [matches]
  );

  const markers: AppMapMarker[] = useMemo(() => spreadOverlappingMarkers(mappableMatches), [mappableMatches]);

  const initialRegion = useMemo(() => {
    if (userLocation) {
      return { ...DEFAULT_REGION, latitude: userLocation.latitude, longitude: userLocation.longitude };
    }
    const first = mappableMatches[0];
    return first ? { ...DEFAULT_REGION, latitude: first.latitude, longitude: first.longitude } : DEFAULT_REGION;
  }, [mappableMatches, userLocation]);

  const selectedMatch = matches.find((m) => m.matchId === selectedMatchId) ?? null;

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
              onSelectMarker={(id) => setSelectedMatchId(Number(id))}
              initialRegion={initialRegion}
              userLocation={userLocation}
            />
            {matches.length > 0 && mappableMatches.length === 0 && (
              <View style={styles.noPinsNotice}>
                <Text style={styles.noPinsNoticeText}>None of these matches have a map location yet.</Text>
              </View>
            )}
            {selectedMatch && (
              <View style={styles.popupWrap}>
                <TouchableOpacity
                  testID="join-map-popup-close"
                  style={styles.popupCloseButton}
                  onPress={() => setSelectedMatchId(null)}
                >
                  <Ionicons name="close" size={16} color={colors.headingText} />
                </TouchableOpacity>
                <MatchCard
                  match={selectedMatch}
                  onPress={() => onOpenMatch(selectedMatch.matchId)}
                  onToggleFavorite={() => handleToggleFavorite(selectedMatch)}
                  onDirections={() => openVenueDirections(router, selectedMatch)}
                />
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

  spinner: { marginTop: spacing.xl },
});
