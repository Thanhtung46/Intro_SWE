import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ROUTES, venueDetailRoute } from '@/constants/routes';
import { ThemeColors } from '@/constants/theme';
import { comingSoon } from '@/utils/comingSoon';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import BookingVenueCard, { BookingVenue } from '@/components/booking/BookingVenueCard';
import FiltersSheet from '@/components/booking/FiltersSheet';
import AppHeader from '@/components/layout/AppHeader';
import SportSegmentedToggle from '@/components/venue/SportSegmentedToggle';
import BottomNav from '@/components/navigation/BottomNav';
import { listVenues, PublicVenue } from '@/services/venueService';

// GET /venues has no per-venue photo/price at list level (data-model.md
// PublicVenue) — this is a static placeholder image/price, not real data.
const VENUE_PLACEHOLDER_IMAGE = require('../../../assets/booking/venue-skyline-arena-action.jpg');
const NOT_AVAILABLE_LABEL = '—';

function mapVenueToCard(venue: PublicVenue): BookingVenue {
  return {
    id: String(venue.venueId),
    name: venue.name,
    image: VENUE_PLACEHOLDER_IMAGE,
    distanceLabel:
      venue.distanceKm !== undefined ? `${venue.distanceKm.toFixed(1)} km` : NOT_AVAILABLE_LABEL,
    price: NOT_AVAILABLE_LABEL,
    rating: venue.avgRating,
    address: venue.address,
    hours:
      venue.openingHours && venue.closingHours
        ? `${venue.openingHours} - ${venue.closingHours}`
        : NOT_AVAILABLE_LABEL,
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
  const [venues, setVenues] = useState<BookingVenue[]>([]);
  const [venuesError, setVenuesError] = useState<string | null>(null);

  useEffect(() => {
    listVenues(sport).then((result) => {
      if (result.success) {
        setVenues((result.venues ?? []).map(mapVenueToCard));
        setVenuesError(null);
      } else {
        setVenues([]);
        setVenuesError(result.message ?? t('common.genericError'));
      }
    });
  }, [sport]);

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
          <Text style={styles.searchPlaceholder}>{t('booking.searchPlaceholder')}</Text>
          <TouchableOpacity onPress={() => setFiltersVisible(true)} accessibilityRole="button" accessibilityLabel={t('booking.filtersLabel')}>
            <Ionicons name="options-outline" size={20} color={c.textSecondaryAlt} />
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
        {venuesError ? (
          <Text style={styles.venuesEmptyText}>{venuesError}</Text>
        ) : venues.length === 0 ? (
          <Text style={styles.venuesEmptyText}>{t('home.venuesEmpty')}</Text>
        ) : (
          venues.map((venue) => (
            <BookingVenueCard
              key={venue.id}
              venue={venue}
              onBookPress={() => router.push(venueDetailRoute(venue.id))}
              onFavoritePress={() => comingSoon(t('booking.saveVenueLabel'))}
              onNavigatePress={() => comingSoon(t('booking.navigateToVenueLabel'))}
            />
          ))
        )}
      </ScrollView>

      {/* Bottom navigation */}
      <BottomNav active="booking" />

      <FiltersSheet visible={filtersVisible} onClose={() => setFiltersVisible(false)} />
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
    searchPlaceholder: {
      flex: 1,
      fontSize: 14,
      color: c.bookingPlaceholderText,
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
  });
}
