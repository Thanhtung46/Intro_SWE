import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppMap, { type AppMapMarker, type Region } from '@/components/common/AppMap';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { openDirections } from '@/utils/directions';

type Props = {
  venueName: string;
  venueAddress: string;
  latitude: number | null;
  longitude: number | null;
  onBack: () => void;
};

const VENUE_MARKER_ID = 'venue';

// Ho Chi Minh City center — same fallback BookingMapScreen uses when a venue
// has no pinned coords yet, so a real interactive map still renders instead
// of a text-only placeholder.
const DEFAULT_MAP_REGION: Region = { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.1, longitudeDelta: 0.1 };

/**
 * Venue location — opened from the paper-plane icon (MatchCard, Check
 * Profile, Join Match Map) instead of jumping straight out to the external
 * Google Maps app, *even when the match has no lat/lng* (see
 * src/utils/directions.ts's openVenueDirections — it always routes here
 * now, never straight to Google Maps). Shows the venue pinned on SPOT's own
 * map (AppMap.tsx, WebView + Leaflet + Geoapify tiles) when coords exist;
 * without them, still shows a real interactive map (Ho Chi Minh City
 * fallback region, same as BookingMapScreen) with a small hint banner
 * instead of a pin. No route line yet — that needs the user's own GPS position
 * (expo-location) + a routing API call, deferred per product decision;
 * "Open in Google Maps" below is the fallback for real turn-by-turn
 * directions in the meantime (works off venueName/venueAddress even
 * without coords — see openDirections()).
 */
export default function VenueMapScreen({ venueName, venueAddress, latitude, longitude, onBack }: Props) {
  const hasCoords = latitude != null && longitude != null;
  const markers: AppMapMarker[] = hasCoords
    ? [{ id: VENUE_MARKER_ID, latitude, longitude, tintColor: colors.primaryDark, emoji: '📍' }]
    : [];
  const mapRegion: Region = hasCoords
    ? { ...DEFAULT_MAP_REGION, latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : DEFAULT_MAP_REGION;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="venue-map-back" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.headingText} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.venueName} numberOfLines={1}>
            {venueName}
          </Text>
          <Text style={styles.venueAddress} numberOfLines={1}>
            {venueAddress}
          </Text>
        </View>
      </View>

      <View style={styles.mapArea}>
        <AppMap markers={markers} initialRegion={mapRegion} />
        {!hasCoords && (
          <View style={styles.noCoordsHint} pointerEvents="none">
            <Ionicons name="location-outline" size={16} color={colors.white} />
            <Text style={styles.noCoordsHintText}>No exact pin yet — showing the area</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          testID="venue-map-open-google-maps"
          style={styles.directionsButton}
          onPress={() => openDirections({ latitude, longitude, venueName, venueAddress })}
        >
          <Ionicons name="paper-plane-outline" size={16} color={colors.white} />
          <Text style={styles.directionsButtonText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBackground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.iconBackground,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.iconBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  venueName: { fontSize: 15, fontWeight: '700', color: colors.headingText },
  venueAddress: { fontSize: 12, color: colors.bodyText },

  mapArea: { flex: 1 },
  noCoordsHint: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  noCoordsHintText: { fontSize: 12, fontWeight: '600', color: colors.white },

  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.iconBackground },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingVertical: spacing.md,
  },
  directionsButtonText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
