import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppMap, { type AppMapMarker } from '@/components/common/AppMap';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { openDirections } from '@/utils/directions';
import { requestCurrentPosition } from '@/utils/location';
import { getMotorcycleRoute, type LatLng } from '@/services/geoapifyService';

type Props = {
  venueName: string;
  venueAddress: string;
  latitude: number | null;
  longitude: number | null;
  onBack: () => void;
};

type RouteStatus = 'idle' | 'locating' | 'routing' | 'shown';

const VENUE_MARKER_ID = 'venue';

/** 8 → "8m", 120 → "2h", 237 → "3h 57m". */
function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Venue location — opened from the paper-plane icon (MatchCard, Check
 * Profile, Join Match Map) and the venue mini-map on Match / Group /
 * Tournament detail, instead of jumping straight out to the external Google
 * Maps app (see src/utils/directions.ts's openVenueDirections). Shows the
 * venue pinned on SPOT's own map (AppMap.tsx, WebView + Leaflet + Geoapify
 * tiles) when coords exist; without them, a text-only placeholder.
 *
 * "Directions" requests the device GPS (expo-location — the OS prompts once
 * ever) and calls Geoapify Routing (mode=motorcycle — the only mode; not
 * surfaced in the UI) to draw the blue route line + show distance/ETA. Any
 * failure (no venue coords, permission declined, routing error, web) falls
 * back to the external Google Maps handoff (openDirections(), works off
 * name/address without coords).
 */
export default function VenueMapScreen({ venueName, venueAddress, latitude, longitude, onBack }: Props) {
  const hasCoords = latitude != null && longitude != null;
  const venue: LatLng | null = hasCoords ? { latitude, longitude } : null;

  const [routeStatus, setRouteStatus] = useState<RouteStatus>('idle');
  const [routeLine, setRouteLine] = useState<{ latitude: number; longitude: number }[] | undefined>(undefined);
  const [routeInfo, setRouteInfo] = useState<{ km: string; minutes: number } | null>(null);

  const markers: AppMapMarker[] = venue
    ? [{ id: VENUE_MARKER_ID, latitude: venue.latitude, longitude: venue.longitude, tintColor: colors.primaryDark, emoji: '📍' }]
    : [];

  const busy = routeStatus === 'locating' || routeStatus === 'routing';

  const fallbackToGoogleMaps = () => openDirections({ latitude, longitude, venueName, venueAddress });

  const handleDirections = async () => {
    // No venue coords, or web (no in-app map) → straight to Google Maps.
    if (!venue || Platform.OS === 'web') {
      fallbackToGoogleMaps();
      return;
    }

    const openGoogleMaps = { text: 'Open Google Maps', onPress: fallbackToGoogleMaps };
    const cancel = { text: 'Close', style: 'cancel' as const };

    setRouteStatus('locating');
    const pos = await requestCurrentPosition();
    if (!pos.ok) {
      setRouteStatus('idle');
      if (pos.reason === 'denied') {
        Alert.alert(
          'Location permission needed',
          'SPOT needs your location to draw directions to this venue. Grant it in Settings, or open Google Maps instead.',
          [cancel, { text: 'Open Settings', onPress: () => Linking.openSettings() }, openGoogleMaps]
        );
      } else {
        Alert.alert(
          "Couldn't get your location",
          "Your location couldn't be determined. Check that location is turned on, then try again — or open Google Maps instead.",
          [cancel, openGoogleMaps]
        );
      }
      return;
    }
    const from: LatLng = { latitude: pos.latitude, longitude: pos.longitude };

    setRouteStatus('routing');
    const route = await getMotorcycleRoute(from, venue);
    if (!route) {
      setRouteStatus('idle');
      Alert.alert(
        'No route found',
        "There's no route from your location to this venue. Open Google Maps instead?",
        [cancel, openGoogleMaps]
      );
      return;
    }

    setRouteLine(route.line);
    setRouteInfo({ km: (route.distanceMeters / 1000).toFixed(1), minutes: Math.max(1, Math.round(route.timeSeconds / 60)) });
    setRouteStatus('shown');
  };

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

      {routeInfo && (
        <View testID="venue-map-route-info" style={styles.routeInfo}>
          <Ionicons name="time-outline" size={14} color={colors.primaryDark} />
          <Text style={styles.routeInfoText}>
            ~{routeInfo.km} km · {formatDuration(routeInfo.minutes)}
          </Text>
        </View>
      )}

      <View style={styles.mapArea}>
        {hasCoords ? (
          <AppMap
            markers={markers}
            routeLine={routeLine}
            initialRegion={{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          />
        ) : (
          <View style={styles.noCoordsWrap}>
            <Ionicons name="location-outline" size={28} color={colors.outline} />
            <Text style={styles.noCoordsText}>This venue doesn't have a pinned location yet — use Google Maps below.</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          testID="venue-map-directions"
          style={[styles.directionsButton, busy && styles.directionsButtonBusy]}
          onPress={handleDirections}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="navigate-outline" size={16} color={colors.white} />
              <Text style={styles.directionsButtonText}>Directions</Text>
            </>
          )}
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

  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.selectedBackground,
  },
  routeInfoText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },

  mapArea: { flex: 1 },
  noCoordsWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.iconBackground,
    padding: spacing.lg,
  },
  noCoordsText: { fontSize: 13, color: colors.outline, textAlign: 'center' },

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
  directionsButtonBusy: { opacity: 0.7 },
  directionsButtonText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
