import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemeColors } from '@/constants/theme';
import { venueDetailRoute } from '@/constants/routes';
import { comingSoon } from '@/utils/comingSoon';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import AppMap, { type AppMapMarker, type Region } from '@/components/common/AppMap';
import MapVenuePopup, { MapVenuePreview } from '@/components/booking/MapVenuePopup';
import BottomNav from '@/components/navigation/BottomNav';
import { listVenues, PublicVenue } from '@/services/venueService';
import useUserLocation from '@/hooks/useUserLocation';

// GET /venues has no per-venue photo at list level (data-model.md PublicVenue)
// — same static placeholder convention as BookingScreen/HomeScreen.
const VENUE_PLACEHOLDER_IMAGE = require('../../../assets/booking/venue-skyline-arena-action.jpg');
const NOT_AVAILABLE_LABEL = '—';

type Sport = 'football' | 'badminton';
type Status = 'loading' | 'ready' | 'error';

// Ho Chi Minh City center — fallback when no returned venue has coords yet.
const DEFAULT_REGION: Region = { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.1, longitudeDelta: 0.1 };

const SPORT_PIN: Record<Sport, { tintColor: string; emoji: string }> = {
  football: { tintColor: '#3B82F6', emoji: '⚽' },
  badminton: { tintColor: '#22C55E', emoji: '🏸' },
};

function toPreview(venue: PublicVenue): MapVenuePreview {
  return {
    id: String(venue.venueId),
    name: venue.name,
    image: venue.coverImageUrl ? { uri: venue.coverImageUrl } : VENUE_PLACEHOLDER_IMAGE,
    fallbackImage: VENUE_PLACEHOLDER_IMAGE,
    distanceLabel:
      venue.distanceKm != null ? `${venue.distanceKm.toFixed(1)} km` : NOT_AVAILABLE_LABEL,
  };
}

type Props = {
  onSwitchToList: () => void;
};

/**
 * Booking Field venue map — Figma node 79:1286 ("Book field - Map"). Real
 * map now — see src/components/common/AppMap.tsx for the WebView + Leaflet +
 * Geoapify wiring (no Google Maps API key needed), same component
 * JoinMatchMapScreen (Matches) uses. Venues without lat/lng can't get a pin,
 * so they're filtered out of the map. No top app bar in this design.
 */
export default function BookingMapScreen({ onSwitchToList }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [sport, setSport] = useState<Sport>('football');
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const userLocation = useUserLocation();

  const fetchVenues = useCallback(async () => {
    setStatus('loading');
    const opts = userLocation ? { lat: userLocation.latitude, long: userLocation.longitude } : undefined;
    const result = await listVenues(sport, opts);
    if (result.success) {
      setVenues(result.venues ?? []);
      setStatus('ready');
    } else {
      setVenues([]);
      setStatus('error');
    }
  }, [sport, userLocation]);

  useEffect(() => {
    setSelectedVenueId(null);
    fetchVenues();
  }, [fetchVenues]);

  const mappableVenues = useMemo(
    () => venues.filter((v): v is PublicVenue & { latitude: number; longitude: number } => v.latitude != null && v.longitude != null),
    [venues]
  );

  const markers: AppMapMarker[] = useMemo(
    () =>
      mappableVenues.map((v) => ({
        id: String(v.venueId),
        latitude: v.latitude,
        longitude: v.longitude,
        ...SPORT_PIN[sport],
      })),
    [mappableVenues, sport]
  );

  const initialRegion = useMemo(() => {
    const first = mappableVenues[0];
    if (first) return { ...DEFAULT_REGION, latitude: first.latitude, longitude: first.longitude };
    if (userLocation) return { ...DEFAULT_REGION, latitude: userLocation.latitude, longitude: userLocation.longitude };
    return DEFAULT_REGION;
  }, [mappableVenues, userLocation]);

  const selectedVenue = venues.find((v) => String(v.venueId) === selectedVenueId) ?? null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.mapArea}>
        {status === 'loading' ? (
          <ActivityIndicator style={styles.spinner} color={c.primary} />
        ) : (
          <AppMap markers={markers} onSelectMarker={setSelectedVenueId} initialRegion={initialRegion} />
        )}

        {/* Search + view-toggle overlay (Figma node 79:1332) */}
        <View style={styles.searchOverlay}>
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <Ionicons name="search" size={18} color={c.textSecondaryAlt} />
              <Text style={styles.searchPlaceholder}>{t('booking.searchPlaceholder')}</Text>
              <TouchableOpacity onPress={() => comingSoon(t('booking.filtersLabel'))} accessibilityRole="button" accessibilityLabel={t('booking.filtersLabel')}>
                <Ionicons name="options-outline" size={18} color={c.textSecondaryAlt} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.listViewButton}
              onPress={onSwitchToList}
              accessibilityRole="button"
              accessibilityLabel={t('booking.switchToListLabel')}
            >
              <Ionicons name="list" size={22} color={c.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, sport === 'football' && styles.chipActive]}
              onPress={() => setSport('football')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="soccer" size={14} color={sport === 'football' ? c.white : c.venueCardMutedText} />
              <Text style={[styles.chipText, sport === 'football' && styles.chipTextActive]}>{t('common.sportFootball')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, sport === 'badminton' && styles.chipActive]}
              onPress={() => setSport('badminton')}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="badminton" size={14} color={sport === 'badminton' ? c.white : c.venueCardMutedText} />
              <Text style={[styles.chipText, sport === 'badminton' && styles.chipTextActive]}>{t('common.sportBadminton')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {status === 'error' && (
          <View style={styles.noticeWrap}>
            <Text style={styles.noticeText}>{t('common.genericError')}</Text>
          </View>
        )}
        {status === 'ready' && venues.length > 0 && mappableVenues.length === 0 && (
          <View style={styles.noticeWrap}>
            <Text style={styles.noticeText}>{t('home.venuesEmpty')}</Text>
          </View>
        )}

        {selectedVenue && (
          <View style={styles.popupAnchor}>
            <MapVenuePopup venue={toPreview(selectedVenue)} onBookPress={() => router.push(venueDetailRoute(String(selectedVenue.venueId)))} />
          </View>
        )}
      </View>

      {/* Bottom navigation */}
      <BottomNav active="booking" />
    </SafeAreaView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.screenBackgroundAlt,
    },
    mapArea: {
      flex: 1,
      overflow: 'hidden',
    },
    spinner: {
      flex: 1,
    },
    searchOverlay: {
      position: 'absolute',
      left: 16,
      right: 16,
      top: 16,
      gap: 12,
    },
    searchRow: {
      flexDirection: 'row',
      gap: 12,
    },
    searchInput: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 17,
      paddingVertical: 13,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.chromeBorder,
      backgroundColor: c.mapGlassBg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    searchPlaceholder: {
      flex: 1,
      fontSize: 14,
      color: c.mapGlassPlaceholderText,
    },
    listViewButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: c.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    chipRow: {
      flexDirection: 'row',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: c.chromeBorder,
      backgroundColor: c.mapGlassBg,
    },
    chipActive: {
      borderColor: 'transparent',
      backgroundColor: c.primary,
    },
    chipText: {
      fontSize: 14,
      color: c.venueCardMutedText,
    },
    chipTextActive: {
      fontSize: 14,
      fontWeight: '700',
      color: c.white,
    },
    noticeWrap: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: c.mapGlassBg,
      borderWidth: 1,
      borderColor: c.chromeBorder,
    },
    noticeText: {
      fontSize: 13,
      color: c.venueCardMutedText,
      textAlign: 'center',
    },
    popupAnchor: {
      position: 'absolute',
      left: '50%',
      bottom: 16,
      marginLeft: -128,
    },
  });
}
