import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ROUTES, venueDetailRoute } from '@/constants/routes';
import { ThemeColors } from '@/constants/theme';
import { openVenueDirections } from '@/utils/directions';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import BookingVenueCard, { BookingVenue } from '@/components/booking/BookingVenueCard';
import FiltersSheet from '@/components/booking/FiltersSheet';
import AppHeader from '@/components/layout/AppHeader';
import SportSegmentedToggle from '@/components/venue/SportSegmentedToggle';
import BottomNav from '@/components/navigation/BottomNav';
import { listVenues, PublicVenue } from '@/services/venueService';
import { EMPTY_VENUE_FILTERS, VenueFilters } from '@/types/venueFilters';

// The photo comes from the venue's own uploaded cover image when the owner
// has set one (coverImageUrl); this bundled asset is only the fallback.
const VENUE_PLACEHOLDER_IMAGE = require('../../../assets/booking/venue-skyline-arena-action.jpg');
const NOT_AVAILABLE_LABEL = '—';

const FOOTBALL_VARIANT_LABEL: Record<string, string> = {
  FIVE_A_SIDE: 'Sân 5',
  SEVEN_A_SIDE: 'Sân 7',
};

function mapVenueToCard(venue: PublicVenue): BookingVenue {
  return {
    id: String(venue.venueId),
    name: venue.name,
    image: venue.coverImageUrl ? { uri: venue.coverImageUrl } : VENUE_PLACEHOLDER_IMAGE,
    fallbackImage: VENUE_PLACEHOLDER_IMAGE,
    // Empty (not '—') when unknown — BookingVenueCard hides the row entirely
    // until a real distance is calculated, same as MatchCard.
    distanceLabel: venue.distanceKm != null ? `${venue.distanceKm.toFixed(1)} km` : '',
    rating: venue.avgRating,
    address: venue.address,
    hours:
      venue.openingHours && venue.closingHours
        ? `${venue.openingHours} - ${venue.closingHours}`
        : NOT_AVAILABLE_LABEL,
    latitude: venue.latitude,
    longitude: venue.longitude,
    courtTypeLabel: venue.footballVariants.length
      ? venue.footballVariants.map((v) => FOOTBALL_VARIANT_LABEL[v] ?? v).join(', ')
      : null,
  };
}

type Sport = 'football' | 'badminton';

type Props = {
  /** Opens the account menu (ProfileMenu) — wired by the app/booking.tsx route. */
  onAvatarPress: () => void;
  avatarInitial: string;
  onNotificationsPress: () => void;
  unreadCount: number;
};

/** Booking Field venue list — Figma node 79:1390 ("Booking Field - Home page"). */
export default function BookingScreen({ onAvatarPress, avatarInitial, onNotificationsPress, unreadCount }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [sport, setSport] = useState<Sport>('football');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<VenueFilters>(EMPTY_VENUE_FILTERS);
  const [searchText, setSearchText] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [venues, setVenues] = useState<BookingVenue[]>([]);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const filtersActive =
    !!filters.date ||
    !!filters.timeFrom ||
    !!filters.timeTo ||
    filters.priceMin != null ||
    filters.priceMax != null ||
    !!filters.province ||
    !!filters.city ||
    filters.radiusKm != null;

  useEffect(() => {
    setVenuesLoading(true);
    // A typed search takes over entirely — backend rejects location together
    // with lat/long/radiusKm ("Use location or distance, not both"), so skip
    // GPS/province-city/distance opts whenever there's an applied search.
    //
    // Device GPS is intentionally NOT fetched/sent here by default: the
    // backend treats any lat/long pair as an active distance filter and
    // defaults radiusKm to 20 when omitted (list-venues.dto.js), so silently
    // including it would narrow every browse to "within 20km of wherever the
    // device currently is" even though the user never asked for that — on an
    // emulator/device whose GPS doesn't match the seeded venues' real
    // coordinates this hid every result (reported as "no venues found" after
    // GPS had time to resolve). Only apply a distance filter when the user
    // explicitly picked Distance mode in the filter sheet.
    const opts = appliedLocation
      ? { location: appliedLocation }
      : filters.province || (filters.radiusKm != null && filters.latitude != null)
        ? {
            lat: filters.latitude,
            long: filters.longitude,
            radiusKm: filters.radiusKm,
            province: filters.province,
            city: filters.city,
          }
        : undefined;
    listVenues(sport, {
      ...opts,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      date: filters.date,
      timeFrom: filters.timeFrom,
      timeTo: filters.timeTo,
    }).then((result) => {
      if (result.success) {
        setVenues((result.venues ?? []).map(mapVenueToCard));
        setVenuesError(null);
      } else {
        setVenues([]);
        setVenuesError(result.message ?? t('common.genericError'));
      }
      setVenuesLoading(false);
    });
  }, [sport, filters, appliedLocation]);

  function submitSearch() {
    const trimmed = searchText.trim();
    setAppliedLocation(trimmed);
    if (trimmed) {
      // Clear distance-mode filters so the XOR rule above never fires a 400.
      setFilters((prev) => ({ ...prev, province: undefined, city: undefined, radiusKm: undefined, latitude: undefined, longitude: undefined }));
    }
  }

  function clearSearch() {
    setSearchText('');
    setAppliedLocation('');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header - Top Navigation Shell (Figma node 79:1521) */}
      <AppHeader
        onAvatarPress={onAvatarPress}
        avatarInitial={avatarInitial}
        onNotificationsPress={onNotificationsPress}
        unreadCount={unreadCount}
        onAssistantPress={() => router.push(ROUTES.ASSISTANT)}
      />

      {/* Sport toggle (Figma node 79:1392) */}
      <View style={styles.sportToggleOuter}>
        <SportSegmentedToggle value={sport} onChange={setSport} inactiveColor={c.textSecondaryAlt} themeColors={c} />
      </View>

      {/* Search & filter bar (Figma node 79:1506) */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Ionicons name="search" size={18} color={c.textSecondaryAlt} />
          <TextInput
            testID="booking-search-input"
            style={styles.searchTextInput}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={submitSearch}
            placeholder={t('booking.searchPlaceholder')}
            placeholderTextColor={c.bookingPlaceholderText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity testID="booking-search-clear" onPress={clearSearch} hitSlop={8} accessibilityRole="button">
              <Ionicons name="close-circle" size={18} color={c.textSecondaryAlt} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setFiltersVisible(true)} accessibilityRole="button" accessibilityLabel={t('booking.filtersLabel')}>
            <Ionicons name="options-outline" size={20} color={filtersActive ? c.primary : c.textSecondaryAlt} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => router.push(ROUTES.BOOKING_MAP)}
          accessibilityRole="button"
          accessibilityLabel={t('booking.mapViewLabel')}
        >
          <Ionicons name="map-outline" size={20} color={c.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {venuesLoading ? (
          <ActivityIndicator style={styles.venuesLoading} color={c.primary} />
        ) : venuesError ? (
          <Text style={styles.venuesEmptyText}>{venuesError}</Text>
        ) : venues.length === 0 ? (
          <Text style={styles.venuesEmptyText}>{t('home.venuesEmpty')}</Text>
        ) : (
          venues.map((venue) => (
            <BookingVenueCard
              key={venue.id}
              venue={venue}
              onBookPress={() => router.push(venueDetailRoute(venue.id, sport))}
              onNavigatePress={() =>
                openVenueDirections(router, {
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                  venueName: venue.name,
                  venueAddress: venue.address,
                })
              }
            />
          ))
        )}
      </ScrollView>

      {/* Bottom navigation */}
      <BottomNav active="booking" />

      <FiltersSheet
        visible={filtersVisible}
        initialFilters={filters}
        onClose={() => setFiltersVisible(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.screenBackgroundAlt,
    },
    sportToggleOuter: {
      backgroundColor: c.screenBackgroundAlt,
      padding: 16,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.bookingSearchBarBg,
      borderBottomWidth: 1,
      borderBottomColor: c.bookingSubtleBorder,
    },
    searchInput: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 13,
      paddingVertical: 11,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
    },
    searchTextInput: {
      flex: 1,
      fontSize: 14,
      color: c.venueCardHeadingText,
      padding: 0,
    },
    mapButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.surface,
    },
    scrollContent: {
      paddingBottom: 32,
      gap: 24,
    },
    venuesEmptyText: {
      marginHorizontal: 16,
      fontSize: 14,
      color: c.textSecondaryAlt,
    },
    venuesLoading: {
      marginTop: 16,
    },
  });
}
