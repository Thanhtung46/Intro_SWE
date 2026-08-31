import React, { useEffect, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';
import { comingSoon } from '@/utils/comingSoon';
import VenueCard, { Venue } from '@/components/home/VenueCard';
import SportSegmentedToggle from '@/components/venue/SportSegmentedToggle';
import { listVenues, PublicVenue } from '@/services/venueService';
import { getMySchedule, ScheduleItem } from '@/services/scheduleService';

const HEADING_TEXT = '#020617';

const CAROUSEL_IMAGES = [
  require('../../../assets/home/carousel-football.png'),
  require('../../../assets/home/carousel-stadium.png'),
];

// GET /venues has no per-venue photo/price at list level (data-model.md
// PublicVenue) — this is a static placeholder image/price, not real data.
const VENUE_PLACEHOLDER_IMAGE = require('../../../assets/home/venue-skyline-arena.png');
const NOT_AVAILABLE_LABEL = '—';

function formatUpcomingTime(startsAt: string): string {
  const date = new Date(startsAt);
  const now = new Date();
  const timeLabel = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
    date,
  );
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${timeLabel}`;
  }
  const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(
    date,
  );
  return `${dateLabel}, ${timeLabel}`;
}

function mapVenueToCard(venue: PublicVenue): Venue {
  return {
    id: String(venue.venueId),
    name: venue.name,
    image: VENUE_PLACEHOLDER_IMAGE,
    distanceLabel:
      venue.distanceKm !== undefined ? `${venue.distanceKm.toFixed(1)} km` : NOT_AVAILABLE_LABEL,
    priceLabel: NOT_AVAILABLE_LABEL,
    rating: venue.avgRating,
    tag: venue.amenities ?? '',
  };
}

type Sport = 'football' | 'badminton';

type Props = {
  /** "Upcoming Match" card's View Schedule pill — Booking/Matches/Home/
   * Settings navigation now lives in the shared AppShell bottom tab bar,
   * not here. */
  onNavigateSchedule: () => void;
};

/** SPOT home dashboard — Figma node 8:2 ("Football Dashboard"). */
export default function HomeScreen({ onNavigateSchedule }: Props) {
  const router = useRouter();
  const [sport, setSport] = useState<Sport>('football');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [upcomingBooking, setUpcomingBooking] = useState<ScheduleItem | null>(null);

  useEffect(() => {
    listVenues(sport).then((result) => {
      if (result.success) {
        setVenues((result.venues ?? []).map(mapVenueToCard));
        setVenuesError(null);
      } else {
        setVenues([]);
        setVenuesError(result.message ?? 'Something went wrong. Please try again.');
      }
    });
  }, [sport]);

  useEffect(() => {
    getMySchedule({ type: 'booking', limit: 1 }).then((result) => {
      setUpcomingBooking(result.success ? (result.items?.[0] ?? null) : null);
    });
  }, []);

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!carouselWidth) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setCarouselIndex(index);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search bar */}
        <View style={styles.searchBarOuter}>
          <View style={styles.searchBarInner}>
            <MaterialCommunityIcons name="creation" size={18} color={colors.primaryDark} />
            <Text style={styles.searchPlaceholder}>Tell me what you need...</Text>
            <TouchableOpacity onPress={() => comingSoon('Voice search')} accessibilityRole="button" accessibilityLabel="Voice search">
              <Ionicons name="mic-outline" size={18} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sport toggle */}
        <View style={styles.sportToggleWrap}>
          <SportSegmentedToggle value={sport} onChange={setSport} inactiveColor={colors.primaryDark} size="sm" />
        </View>

        {/* Photo carousel */}
        <View style={styles.carouselWrap} onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleCarouselScroll}
          >
            {CAROUSEL_IMAGES.map((source, index) => (
              <Image
                key={index}
                source={source}
                style={{ width: carouselWidth, height: '100%' }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          <View style={styles.carouselDots}>
            {CAROUSEL_IMAGES.map((_, index) => (
              <View
                key={index}
                style={[styles.carouselDot, index === carouselIndex && styles.carouselDotActive]}
              />
            ))}
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push(ROUTES.BOOKING)}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(37, 99, 235, 0.2)' }]}>
              <Ionicons name="ticket-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Book Field</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push(ROUTES.MATCHES)}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(33, 112, 228, 0.2)' }]}>
              <Ionicons name="trophy-outline" size={22} color="#2170E4" />
            </View>
            <Text style={styles.quickActionLabel}>Find Match</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming match */}
        <View style={styles.upcomingCard}>
          <Image
            source={require('../../../assets/home/upcoming-match.png')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.upcomingOverlay} />
          <View style={styles.upcomingContent}>
            <View style={styles.upcomingTop}>
              <Text style={styles.upcomingHeading}>Upcoming Match</Text>
              <TouchableOpacity style={styles.viewScheduleButton} onPress={onNavigateSchedule}>
                <Text style={styles.viewScheduleText}>View Schedule</Text>
              </TouchableOpacity>
            </View>
            {upcomingBooking ? (
              <View>
                <Text style={styles.upcomingTime}>{formatUpcomingTime(upcomingBooking.startsAt)}</Text>
                <View style={styles.upcomingLocationRow}>
                  <Ionicons name="location" size={13} color={HEADING_TEXT} />
                  <Text style={styles.upcomingLocation}>
                    {upcomingBooking.fieldName} @ {upcomingBooking.venueName}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.upcomingTime}>No upcoming booking yet</Text>
            )}
          </View>
        </View>

        {/* Recommended venues */}
        <View style={styles.venuesSection}>
          <View style={styles.venuesHeader}>
            <Text style={styles.venuesHeading}>Recommended Venues</Text>
            <TouchableOpacity onPress={() => comingSoon('Explore All')}>
              <Text style={styles.exploreAll}>Explore All</Text>
            </TouchableOpacity>
          </View>
          {venuesError ? (
            <Text style={styles.venuesEmptyText}>{venuesError}</Text>
          ) : venues.length === 0 ? (
            <Text style={styles.venuesEmptyText}>No venues found for this sport yet.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.venuesList}
            >
              {venues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} onPress={() => comingSoon(venue.name)} />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  searchBarOuter: {
    marginHorizontal: 20,
    padding: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBorder,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 17,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.ringBorder,
    backgroundColor: colors.glassBackground,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(51, 65, 85, 0.8)',
  },
  sportToggleWrap: {
    marginHorizontal: 20,
  },
  carouselWrap: {
    marginHorizontal: 20,
    aspectRatio: 16 / 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  carouselDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  carouselDotActive: {
    width: 12,
    backgroundColor: colors.white,
  },
  quickActions: {
    marginHorizontal: 20,
    flexDirection: 'row',
    gap: 16,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: 17,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.glassBackground,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: HEADING_TEXT,
  },
  upcomingCard: {
    marginHorizontal: 20,
    height: 224,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  upcomingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  upcomingContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  upcomingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upcomingHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: HEADING_TEXT,
  },
  viewScheduleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  viewScheduleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  upcomingTime: {
    fontSize: 24,
    fontWeight: '900',
    color: HEADING_TEXT,
  },
  upcomingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  upcomingLocation: {
    fontSize: 14,
    fontWeight: '700',
    color: HEADING_TEXT,
  },
  venuesSection: {
    gap: 8,
  },
  venuesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  venuesHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: HEADING_TEXT,
  },
  exploreAll: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  venuesList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  venuesEmptyText: {
    marginHorizontal: 20,
    fontSize: 14,
    color: colors.bodyText,
  },
});
