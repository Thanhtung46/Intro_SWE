import React, { useEffect, useMemo, useState } from 'react';
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
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import VenueCard, { Venue } from '@/components/home/VenueCard';
import SportSegmentedToggle from '@/components/venue/SportSegmentedToggle';
import { listVenues, PublicVenue } from '@/services/venueService';
import { getMySchedule, ScheduleItem } from '@/services/scheduleService';
import { getRecommendations, RecommendationItem } from '@/services/recommendationService';
import { venueDetailRoute } from '@/constants/routes';

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

// GET /recommendations has no per-venue photo/price either (data-model.md
// Suggestion mapping table) — same placeholder convention as mapVenueToCard.
function mapRecommendationToCard(item: RecommendationItem): Venue {
  return {
    id: String(item.venueId),
    name: item.venueName,
    image: VENUE_PLACEHOLDER_IMAGE,
    distanceLabel: item.distanceKm !== undefined ? `${item.distanceKm.toFixed(1)} km` : NOT_AVAILABLE_LABEL,
    priceLabel: NOT_AVAILABLE_LABEL,
    rating: 0,
    tag: 'Suggested for you',
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
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);
  const [sport, setSport] = useState<Sport>('football');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [upcomingBooking, setUpcomingBooking] = useState<ScheduleItem | null>(null);
  const [suggestions, setSuggestions] = useState<Venue[]>([]);

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

  useEffect(() => {
    // A failed/unavailable fetch just leaves this section empty — never a
    // visible error, per FR-004 (spec 004-ai-features-frontend-integration).
    getRecommendations(sport).then((result) => {
      setSuggestions(result.success ? (result.items ?? []).map(mapRecommendationToCard) : []);
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
            <MaterialCommunityIcons name="creation" size={18} color={themeColors.primary} />
            <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
            <TouchableOpacity onPress={() => comingSoon('Voice search')} accessibilityRole="button" accessibilityLabel="Voice search">
              <Ionicons name="mic-outline" size={18} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sport toggle */}
        <View style={styles.sportToggleWrap}>
          <SportSegmentedToggle
            value={sport}
            onChange={setSport}
            inactiveColor={colors.primaryDark}
            size="sm"
            themeColors={themeColors}
          />
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
            <View style={[styles.quickActionIcon, { backgroundColor: themeColors.quickActionPrimaryBg }]}>
              <Ionicons name="ticket-outline" size={22} color={themeColors.quickActionPrimaryIcon} />
            </View>
            <Text style={styles.quickActionLabel}>{t('home.bookField')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => comingSoon(t('home.findMatch'))}>
            <View style={[styles.quickActionIcon, { backgroundColor: themeColors.quickActionSecondaryBg }]}>
              <Ionicons name="trophy-outline" size={22} color={themeColors.quickActionSecondaryIcon} />
            </View>
            <Text style={styles.quickActionLabel}>{t('home.findMatch')}</Text>
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
              <Text style={styles.upcomingHeading}>{t('home.upcomingMatchHeading')}</Text>
              <TouchableOpacity style={styles.viewScheduleButton} onPress={onNavigateSchedule}>
                <Text style={styles.viewScheduleText}>{t('home.viewSchedule')}</Text>
              </TouchableOpacity>
            </View>
            {upcomingBooking ? (
              <View>
                <Text style={styles.upcomingTime}>{formatUpcomingTime(upcomingBooking.startsAt)}</Text>
                <View style={styles.upcomingLocationRow}>
                  <Ionicons name="location" size={13} color={themeColors.textSecondaryAlt} />
                  <Text style={styles.upcomingLocation}>
                    {upcomingBooking.fieldName} @ {upcomingBooking.venueName}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.upcomingTime}>{t('home.upcomingMatchEmpty')}</Text>
            )}
          </View>
        </View>

        {/* Suggested for you — personalized recommendations (spec 004); omitted
            entirely when unavailable, never a visible error (FR-004). */}
        {suggestions.length > 0 ? (
          <View style={styles.venuesSection}>
            <View style={styles.venuesHeader}>
              <Text style={styles.venuesHeading}>Suggested for you</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.venuesList}
            >
              {suggestions.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  onPress={() => router.push(venueDetailRoute(venue.id))}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Recommended venues */}
        <View style={styles.venuesSection}>
          <View style={styles.venuesHeader}>
            <Text style={styles.venuesHeading}>{t('home.venuesHeading')}</Text>
            <TouchableOpacity onPress={() => comingSoon(t('home.exploreAll'))}>
              <Text style={styles.exploreAll}>{t('home.exploreAll')}</Text>
            </TouchableOpacity>
          </View>
          {venuesError ? (
            <Text style={styles.venuesEmptyText}>{venuesError}</Text>
          ) : venues.length === 0 ? (
            <Text style={styles.venuesEmptyText}>{t('home.venuesEmpty')}</Text>
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

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.screenBackgroundAlt,
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
    borderColor: c.surfaceBorder,
    backgroundColor: c.searchOuterBg,
    // Shadow tint left as the original light-only accent — a subtle iOS
    // polish detail with no equivalent field sourced from Figma dark yet.
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
    borderColor: c.divider,
    backgroundColor: c.searchInnerBg,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: c.searchPlaceholderText,
  },
  sportToggleWrap: {
    marginHorizontal: 20,
  },
  carouselWrap: {
    marginHorizontal: 20,
    aspectRatio: 16 / 9,
    borderRadius: 20,
    // Unchanged in dark per Figma (node 198:2470's border is the same
    // rgba(255,255,255,0.4)) — a "chip/border floating on a photo" style
    // that doesn't theme, same rule as the carousel dots below.
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
    borderColor: c.surfaceBorder,
    backgroundColor: c.glassCardBg,
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
    color: c.homeHeadingText,
  },
  upcomingCard: {
    marginHorizontal: 20,
    height: 224,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.surfaceBorder,
    overflow: 'hidden',
  },
  upcomingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.upcomingOverlayBg,
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
    color: c.homeHeadingText,
  },
  viewScheduleButton: {
    backgroundColor: c.scheduleAccentBg,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: c.scheduleAccentBorder,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  viewScheduleText: {
    fontSize: 16,
    fontWeight: '700',
    color: c.accentGold,
  },
  upcomingTime: {
    fontSize: 24,
    fontWeight: '900',
    color: c.homeHeadingText,
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
    color: c.homeLocationText,
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
    color: c.homeHeadingText,
  },
  exploreAll: {
    fontSize: 16,
    fontWeight: '700',
    color: c.accentText,
  },
  venuesList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  venuesEmptyText: {
    marginHorizontal: 20,
    fontSize: 14,
    color: c.textSecondaryAlt,
  },
  });
}
