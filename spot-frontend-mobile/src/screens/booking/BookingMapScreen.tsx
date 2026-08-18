import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { venueDetailRoute } from '@/constants/routes';
import { comingSoon } from '@/utils/comingSoon';
import MapVenuePopup, { MapVenuePreview } from '@/components/booking/MapVenuePopup';
import BottomNav from '@/components/navigation/BottomNav';

type Sport = 'all' | 'football' | 'badminton';

const SKYLINE_ARENA: MapVenuePreview = {
  id: 'skyline-arena',
  name: 'Skyline Arena',
  image: require('../../../assets/booking/venue-skyline-arena-action.jpg'),
  distanceLabel: '2.4 km away',
};

// Pin positions as a % of the map area, lifted from the Figma layout.
const FOOTBALL_PIN = { top: '43%', left: '43%' } as const;
const BADMINTON_PIN = { top: '33%', left: '57%' } as const;

type Props = {
  onSwitchToList: () => void;
};

/** Booking Field venue map — Figma node 79:1286 ("Book field - Map"). No top app bar in this design. */
export default function BookingMapScreen({ onSwitchToList }: Props) {
  const router = useRouter();
  const [sport, setSport] = useState<Sport>('all');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(SKYLINE_ARENA.id);

  const showFootball = sport === 'all' || sport === 'football';
  const showBadminton = sport === 'all' || sport === 'badminton';
  const selectedVenue = selectedVenueId === SKYLINE_ARENA.id ? SKYLINE_ARENA : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.mapArea}>
        <Image
          source={require('../../../assets/booking/map-background.jpg')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        {/* Search + view-toggle overlay (Figma node 79:1332) */}
        <View style={styles.searchOverlay}>
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <Ionicons name="search" size={18} color={colors.bodyText} />
              <Text style={styles.searchPlaceholder}>Search sports, venues...</Text>
              <TouchableOpacity onPress={() => comingSoon('Filters')} accessibilityRole="button" accessibilityLabel="Filters">
                <Ionicons name="options-outline" size={18} color={colors.bodyText} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.listViewButton}
              onPress={onSwitchToList}
              accessibilityRole="button"
              accessibilityLabel="Switch to list view"
            >
              <Ionicons name="list" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, styles.chipActive]}
              onPress={() => setSport('all')}
              accessibilityRole="button"
            >
              <Ionicons name="grid-outline" size={14} color={colors.white} />
              <Text style={styles.chipTextActive}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => setSport('football')} accessibilityRole="button">
              <View style={[styles.chipDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.chipText}>Football</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip} onPress={() => setSport('badminton')} accessibilityRole="button">
              <View style={[styles.chipDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.chipText}>Badminton</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Venue pins (Figma nodes 79:1306 / 79:1311) */}
        {showFootball && (
          <TouchableOpacity
            style={[styles.pin, FOOTBALL_PIN, { backgroundColor: colors.primaryDark }]}
            onPress={() => setSelectedVenueId(SKYLINE_ARENA.id)}
            accessibilityRole="button"
            accessibilityLabel={SKYLINE_ARENA.name}
          >
            <MaterialCommunityIcons name="soccer" size={18} color={colors.white} />
          </TouchableOpacity>
        )}
        {showBadminton && (
          <TouchableOpacity
            style={[styles.pin, BADMINTON_PIN, { backgroundColor: '#22C55E' }]}
            onPress={() => comingSoon('Badminton venues')}
            accessibilityRole="button"
            accessibilityLabel="Badminton venue"
          >
            <MaterialCommunityIcons name="badminton" size={18} color={colors.white} />
          </TouchableOpacity>
        )}

        {selectedVenue && (
          <View style={styles.popupAnchor}>
            <MapVenuePopup venue={selectedVenue} onBookPress={() => router.push(venueDetailRoute(selectedVenue.id))} />
          </View>
        )}

        {/* Map controls (Figma node 79:1289) */}
        <View style={styles.mapControls}>
          <View style={styles.zoomCluster}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => comingSoon('Zoom in')}
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
            >
              <Ionicons name="add" size={20} color={colors.primaryDark} />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => comingSoon('Zoom out')}
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
            >
              <Ionicons name="remove" size={20} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => comingSoon('My location')}
            accessibilityRole="button"
            accessibilityLabel="My location"
          >
            <Ionicons name="locate-outline" size={20} color={colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.primaryDark }]}
            onPress={onSwitchToList}
            accessibilityRole="button"
            accessibilityLabel="Switch to list view"
          >
            <Ionicons name="eye-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom navigation */}
      <BottomNav active="booking" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  mapArea: {
    flex: 1,
    overflow: 'hidden',
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
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(67, 70, 85, 0.6)',
  },
  listViewButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.primaryDark,
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
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  chipActive: {
    borderColor: 'transparent',
    backgroundColor: colors.primaryDark,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 14,
    color: '#0B1C30',
  },
  chipTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  pin: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  popupAnchor: {
    position: 'absolute',
    left: '48%',
    top: '46%',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 12,
    alignItems: 'flex-end',
  },
  zoomCluster: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  zoomButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#C3C6D7',
  },
  controlButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
});
