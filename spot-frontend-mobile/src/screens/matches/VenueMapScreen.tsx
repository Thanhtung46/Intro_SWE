import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppMap, { type AppMapMarker, type RouteLatLng, type UserLocation } from '@/components/common/AppMap';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import {
  fetchDrivingRoute,
  formatRouteDistance,
  formatRouteDuration,
} from '@/services/routingService';

type Props = {
  venueName: string;
  venueAddress: string;
  latitude: number | null;
  longitude: number | null;
  onBack: () => void;
};

const VENUE_MARKER_ID = 'venue';

/**
 * In-app venue directions (match + referee). Uses device GPS + Geoapify
 * routing — no external Google Maps handoff.
 */
export default function VenueMapScreen({ venueName, venueAddress, latitude, longitude, onBack }: Props) {
  const hasCoords = latitude != null && longitude != null;
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteLatLng[] | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [timeSeconds, setTimeSeconds] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading');
  const [routeStatus, setRouteStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [routeError, setRouteError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGpsStatus('loading');
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setGpsStatus('denied');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (cancelled) return;
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGpsStatus('ready');
      } catch {
        if (!cancelled) setGpsStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userLocation || !hasCoords) {
      setRouteCoordinates(null);
      setDistanceMeters(null);
      setTimeSeconds(null);
      setRouteStatus('idle');
      return;
    }

    let cancelled = false;
    (async () => {
      setRouteStatus('loading');
      setRouteError('');
      try {
        const route = await fetchDrivingRoute(userLocation, {
          latitude: latitude!,
          longitude: longitude!,
        });
        if (cancelled) return;
        setRouteCoordinates(route.coordinates);
        setDistanceMeters(route.distanceMeters);
        setTimeSeconds(route.timeSeconds);
        setRouteStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setRouteCoordinates(null);
        setRouteStatus('error');
        setRouteError(e instanceof Error ? e.message : 'Could not calculate a route.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userLocation, hasCoords, latitude, longitude]);

  const markers: AppMapMarker[] = useMemo(
    () =>
      hasCoords
        ? [{ id: VENUE_MARKER_ID, latitude: latitude!, longitude: longitude!, tintColor: colors.primaryDark, emoji: '📍' }]
        : [],
    [hasCoords, latitude, longitude]
  );

  const initialRegion = useMemo(() => {
    if (hasCoords && userLocation) {
      const midLat = (latitude! + userLocation.latitude) / 2;
      const midLng = (longitude! + userLocation.longitude) / 2;
      const latSpan = Math.max(Math.abs(latitude! - userLocation.latitude) * 2.2, 0.02);
      const lngSpan = Math.max(Math.abs(longitude! - userLocation.longitude) * 2.2, 0.02);
      return {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: latSpan,
        longitudeDelta: lngSpan,
      };
    }
    if (hasCoords) {
      return { latitude: latitude!, longitude: longitude!, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    }
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }, [hasCoords, latitude, longitude, userLocation]);

  const statusMessage =
    gpsStatus === 'loading'
      ? 'Getting your GPS location…'
      : gpsStatus === 'denied'
        ? 'Allow location access to see directions from where you are.'
        : gpsStatus === 'error'
          ? 'Could not read GPS. Check that location is on in the emulator.'
          : !hasCoords
            ? "This venue doesn't have map coordinates yet."
            : routeStatus === 'loading'
              ? 'Drawing route from your location…'
              : routeStatus === 'error'
                ? routeError
                : null;

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
        {hasCoords || userLocation ? (
          <AppMap
            markers={markers}
            initialRegion={initialRegion}
            userLocation={userLocation}
            routeCoordinates={routeCoordinates}
          />
        ) : (
          <View style={styles.noCoordsWrap}>
            <Ionicons name="location-outline" size={28} color={colors.outline} />
            <Text style={styles.noCoordsText}>{statusMessage ?? 'Waiting for location…'}</Text>
          </View>
        )}

        <View style={styles.legend}>
          <Text style={styles.legendItem}>🏠 You</Text>
          {hasCoords ? <Text style={styles.legendItem}>📍 Venue</Text> : null}
        </View>

        {(gpsStatus === 'loading' || routeStatus === 'loading') && (
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={colors.primaryDark} />
            <Text style={styles.loadingText}>{statusMessage}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {routeStatus === 'ready' && distanceMeters != null && timeSeconds != null ? (
          <View style={styles.routeSummary}>
            <View style={styles.routeStat}>
              <Ionicons name="navigate" size={16} color={colors.primaryDark} />
              <Text style={styles.routeStatValue}>{formatRouteDistance(distanceMeters)}</Text>
              <Text style={styles.routeStatLabel}>Distance</Text>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeStat}>
              <Ionicons name="time-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.routeStatValue}>{formatRouteDuration(timeSeconds)}</Text>
              <Text style={styles.routeStatLabel}>Est. drive</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.footerHint}>
            {statusMessage ?? 'Route from your GPS to this venue appears on the map.'}
          </Text>
        )}
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
  legend: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  legendItem: { fontSize: 12, fontWeight: '700', color: colors.headingText },
  loadingPill: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  loadingText: { flex: 1, fontSize: 12, color: colors.bodyText },
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
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.selectedBackground,
    borderRadius: 14,
    paddingVertical: spacing.md,
  },
  routeStat: { flex: 1, alignItems: 'center', gap: 2 },
  routeStatValue: { fontSize: 16, fontWeight: '800', color: colors.headingText },
  routeStatLabel: { fontSize: 11, color: colors.outline },
  routeDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.cardBorder },
  footerHint: { fontSize: 13, color: colors.outline, textAlign: 'center' },
});
