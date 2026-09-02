import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppMap, { type AppMapMarker } from '@/components/common/AppMap';
import ErrorBanner from '@/components/common/ErrorBanner';
import BoardVenueCard from '@/components/referee/BoardVenueCard';
import RefereeFilterSheet from '@/components/referee/RefereeFilterSheet';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { getErrorMessage } from '@/services/apiErrors';
import {
  buildBoardQuery,
  getRefereeBoard,
  getRefereeMe,
  registerVenue,
  setVenueFavorite,
} from '@/services/refereeService';
import type { BoardVenue, RefereeSport } from '@/types/referee';
import { EMPTY_REFEREE_BOARD_FILTERS, type RefereeBoardFilters } from '@/types/refereeFilters';
import { openVenueDirections } from '@/utils/directions';
import { showAlert } from '@/utils/showAlert';

type Status = 'loading' | 'ready' | 'error';

type Props = {
  onBack: () => void;
  onOpenVenue: (venue: BoardVenue) => void;
};

const DEFAULT_REGION = { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.1, longitudeDelta: 0.1 };

const SPORT_PIN: Record<RefereeSport, { tintColor: string; emoji: string }> = {
  Football: { tintColor: '#3B82F6', emoji: '⚽' },
  Badminton: { tintColor: '#22C55E', emoji: '🏸' },
};

const OVERLAP_SPREAD_DEGREES = 0.00035;

function spreadVenueMarkers(venues: (BoardVenue & { latitude: number; longitude: number })[]): AppMapMarker[] {
  const groups = new Map<string, typeof venues>();
  for (const v of venues) {
    const key = `${v.latitude.toFixed(5)},${v.longitude.toFixed(5)}`;
    const group = groups.get(key);
    if (group) group.push(v);
    else groups.set(key, [v]);
  }

  const markers: AppMapMarker[] = [];
  for (const group of groups.values()) {
    group.forEach((v, index) => {
      const angle = (2 * Math.PI * index) / group.length;
      const offset = group.length > 1 ? OVERLAP_SPREAD_DEGREES : 0;
      markers.push({
        id: String(v.venueId),
        latitude: v.latitude + offset * Math.sin(angle),
        longitude: v.longitude + offset * Math.cos(angle),
        ...SPORT_PIN[v.sportType],
      });
    });
  }
  return markers;
}

/**
 * Referee Job Board map — mirrors JoinMatchMapScreen but pins booking venues
 * from GET /referee/board so referees can apply to venue pools from the map.
 */
export default function RefereeBoardMapScreen({ onBack, onOpenVenue }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const [certifiedSports, setCertifiedSports] = useState<RefereeSport[] | null>(null);
  const [sport, setSport] = useState<RefereeSport | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RefereeBoardFilters>(EMPTY_REFEREE_BOARD_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);

  const [venues, setVenues] = useState<BoardVenue[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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

  useEffect(() => {
    getRefereeMe()
      .then((profile) => {
        setCertifiedSports(profile.certifiedSportTypes);
        setSport(profile.certifiedSportTypes[0] ?? null);
      })
      .catch((e) => {
        setCertifiedSports([]);
        setErrorMessage(getErrorMessage(e));
        setStatus('error');
      });
  }, []);

  const fetchBoard = useCallback(async () => {
    if (!sport) return;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    setErrorMessage('');
    try {
      const query = buildBoardQuery(sport, filters, { q: search });
      const result = await getRefereeBoard(query);
      setVenues(result.venues);
      setStatus('ready');
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
      setStatus('error');
    }
  }, [sport, filters, search]);

  useEffect(() => {
    const id = setTimeout(fetchBoard, search ? 350 : 0);
    return () => clearTimeout(id);
  }, [fetchBoard, search]);

  const mappableVenues = useMemo(
    () =>
      venues.filter(
        (v): v is BoardVenue & { latitude: number; longitude: number } =>
          v.latitude != null && v.longitude != null
      ),
    [venues]
  );

  const markers = useMemo(() => {
    const pins = spreadVenueMarkers(mappableVenues);
    if (userLocation) {
      pins.push({
        id: '__me__',
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        tintColor: '#2563EB',
        emoji: '🏠',
      });
    }
    return pins;
  }, [mappableVenues, userLocation]);

  const initialRegion = useMemo(() => {
    if (userLocation) {
      return { ...DEFAULT_REGION, latitude: userLocation.latitude, longitude: userLocation.longitude };
    }
    const first = mappableVenues[0];
    return first ? { ...DEFAULT_REGION, latitude: first.latitude, longitude: first.longitude } : DEFAULT_REGION;
  }, [mappableVenues, userLocation]);

  const selectedVenue = venues.find((v) => v.venueId === selectedVenueId) ?? null;
  const sportTabs = useMemo(() => certifiedSports ?? [], [certifiedSports]);

  const handleFavorite = async (venue: BoardVenue) => {
    const next = !venue.isFavorited;
    setVenues((prev) => prev.map((v) => (v.venueId === venue.venueId ? { ...v, isFavorited: next } : v)));
    try {
      await setVenueFavorite(venue.venueId, next);
    } catch (e) {
      setVenues((prev) => prev.map((v) => (v.venueId === venue.venueId ? { ...v, isFavorited: !next } : v)));
      showAlert(getErrorMessage(e));
    }
  };

  const handleApply = async (venue: BoardVenue) => {
    if (!sport) return;
    setApplyingId(venue.venueId);
    try {
      await registerVenue(venue.venueId, sport);
      setVenues((prev) => prev.filter((v) => v.venueId !== venue.venueId));
      setSelectedVenueId(null);
      showAlert(t('referee.board.applied'));
    } catch (e) {
      showAlert(getErrorMessage(e));
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="referee-map-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={colors.outline} />
          <TextInput
            testID="referee-map-search-input"
            style={styles.searchInput}
            placeholder={t('referee.board.searchPlaceholder')}
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          <TouchableOpacity testID="referee-map-filter" onPress={() => setFilterVisible(true)}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {sportTabs.length > 1 ? (
        <View style={styles.sportRow}>
          {sportTabs.map((s) => {
            const active = sport === s;
            return (
              <TouchableOpacity
                key={s}
                testID={`referee-map-sport-${s.toLowerCase()}`}
                style={[styles.sportChip, active && styles.sportChipActive]}
                onPress={() => setSport(s)}
              >
                <Text style={[styles.sportChipText, active && styles.sportChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {status === 'error' ? <ErrorBanner message={errorMessage} onRetry={fetchBoard} /> : null}

      <View style={styles.mapArea}>
        {certifiedSports != null && certifiedSports.length === 0 ? (
          <Text style={styles.empty}>{t('referee.board.noCerts')}</Text>
        ) : status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : (
          <>
            <AppMap
              markers={markers}
              onSelectMarker={(id) => {
                if (id === '__me__') return;
                setSelectedVenueId(Number(id));
              }}
              initialRegion={initialRegion}
            />
            {venues.length > 0 && mappableVenues.length === 0 ? (
              <View style={styles.noPinsNotice}>
                <Text style={styles.noPinsNoticeText}>{t('referee.board.mapNoCoords')}</Text>
              </View>
            ) : null}
            {selectedVenue ? (
              <View style={styles.popupWrap}>
                <TouchableOpacity
                  testID="referee-map-popup-close"
                  style={styles.popupCloseButton}
                  onPress={() => setSelectedVenueId(null)}
                >
                  <Ionicons name="close" size={16} color={colors.headingText} />
                </TouchableOpacity>
                <BoardVenueCard
                  venue={selectedVenue}
                  onPress={() => onOpenVenue(selectedVenue)}
                  onToggleFavorite={() => handleFavorite(selectedVenue)}
                  onDirections={() =>
                    openVenueDirections(router, {
                      latitude: selectedVenue.latitude ?? null,
                      longitude: selectedVenue.longitude ?? null,
                      venueName: selectedVenue.name,
                      venueAddress: selectedVenue.address ?? '',
                    })
                  }
                  onApply={() => handleApply(selectedVenue)}
                  applyLoading={applyingId === selectedVenue.venueId}
                />
              </View>
            ) : null}
          </>
        )}
      </View>

      <RefereeFilterSheet
        visible={filterVisible}
        initialFilters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={setFilters}
      />
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

  sportRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  sportChip: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  sportChipActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  sportChipText: { fontSize: 13, fontWeight: '700', color: colors.headingText },
  sportChipTextActive: { color: colors.white },

  mapArea: { flex: 1 },
  empty: { fontSize: 14, color: colors.subtitle, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.md },
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
