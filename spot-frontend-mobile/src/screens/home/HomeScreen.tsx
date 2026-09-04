import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import VenueCard, { Venue } from '@/components/home/VenueCard';
import SportSegmentedToggle from '@/components/venue/SportSegmentedToggle';
import { listVenues, PublicVenue } from '@/services/venueService';
import { getMySchedule, ScheduleItem } from '@/services/scheduleService';
import { getRecommendations, RecommendationItem } from '@/services/recommendationService';
import { venueDetailRoute } from '@/constants/routes';
import useUserLocation from '@/hooks/useUserLocation';

type Sport = 'football' | 'badminton';

const CAROUSEL_IMAGES_BY_SPORT: Record<Sport, number[]> = {
  football: [
    require('../../../assets/home/carousel-football.png'),
    require('../../../assets/home/carousel-stadium.png'),
  ],
  badminton: [
    require('../../../assets/home/carousel-badminton-1.png'),
    require('../../../assets/home/carousel-badminton-2.png'),
  ],
};

const UPCOMING_MATCH_IMAGE_BY_SPORT: Record<Sport, number> = {
  football: require('../../../assets/home/upcoming-match.png'),
  badminton: require('../../../assets/home/upcoming-match-badminton.png'),
};

// GET /venues has no per-venue price at list level (data-model.md
// PublicVenue) — the photo now comes from venue.coverImageUrl when the
// owner has uploaded one; this is only the fallback when they haven't.
const VENUE_PLACEHOLDER_IMAGE_BY_SPORT: Record<Sport, number> = {
  football: require('../../../assets/home/venue-skyline-arena.png'),
  badminton: require('../../../assets/home/venue-badminton-elite.png'),
};
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

// GET /recommendations proxies a separate AI microservice and has no
// per-venue photo (data-model.md Suggestion mapping table) — coverImageUrl
// is cross-referenced from the same-sport GET /venues list fetched above
// (recommended venues are drawn from that same pool), falling back to the
// placeholder only when a match isn't found there either.
function mapRecommendationToCard(item: RecommendationItem, placeholderImage: number, coverImageUrl?: string): Venue {
  return {
    id: String(item.venueId),
    name: item.venueName,
    image: coverImageUrl ? { uri: coverImageUrl } : placeholderImage,
    fallbackImage: placeholderImage,
    distanceLabel: item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : NOT_AVAILABLE_LABEL,
    priceLabel: NOT_AVAILABLE_LABEL,
    rating: 0,
    tag: 'Suggested for you',
  };
}

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
  const carouselScrollRef = useRef<ScrollView>(null);
  const [upcomingBooking, setUpcomingBooking] = useState<ScheduleItem | null>(null);
  const [rawSuggestions, setRawSuggestions] = useState<RecommendationItem[]>([]);
  const [venueCoverById, setVenueCoverById] = useState<Record<number, string>>({});
  const userLocation = useUserLocation();

  // Only used to cross-reference real cover photos onto "Suggested for you"
  // cards (mapRecommendationToCard below) — the plain venue browse grid this
  // used to feed was removed (duplicated "Suggested for you" with the same
  // handful of test venues); Booking screen is the real full venue list now.
  useEffect(() => {
    const opts = userLocation ? { lat: userLocation.latitude, long: userLocation.longitude } : undefined;
    listVenues(sport, opts).then((result) => {
      if (!result.success) return;
      const list = result.venues ?? [];
      setVenueCoverById(
        Object.fromEntries(
          list.filter((v): v is PublicVenue & { coverImageUrl: string } => !!v.coverImageUrl)
            .map((v) => [v.venueId, v.coverImageUrl]),
        ),
      );
    });
  }, [sport, userLocation]);

  useEffect(() => {
    // A failed/unavailable fetch just leaves this section empty — never a
    // visible error, per FR-004 (spec 004-ai-features-frontend-integration).
    getRecommendations(sport).then((result) => {
      setRawSuggestions(result.success ? (result.items ?? []) : []);
    });
  }, [sport]);

  const suggestions = useMemo(
    () =>
      rawSuggestions.map((item) =>
        mapRecommendationToCard(item, VENUE_PLACEHOLDER_IMAGE_BY_SPORT[sport], venueCoverById[item.venueId]),
      ),
    [rawSuggestions, venueCoverById, sport],
  );


  useEffect(() => {
    getMySchedule({ type: 'booking', limit: 1 }).then((result) => {
      setUpcomingBooking(result.success ? (result.items?.[0] ?? null) : null);
    });
  }, []);

  useEffect(() => {
    setCarouselIndex(0);
    carouselScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [sport]);

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!carouselWidth) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setCarouselIndex(index);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search bar — opens the AI assistant chat (nlp-assistant), same
            screen as AppShell's header sparkle icon; voice capture lives
            inside AssistantScreen itself (VoiceRecorderButton), not here. */}
        <View style={styles.searchBarOuter}>
          <TouchableOpacity
            style={styles.searchBarInner}
            onPress={() => router.push(ROUTES.ASSISTANT)}
            accessibilityRole="button"
            accessibilityLabel={t('header.aiAssistant')}
          >
            <MaterialCommunityIcons name="creation" size={18} color={themeColors.primary} />
            <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
            <Ionicons name="mic-outline" size={18} color={themeColors.primary} />
          </TouchableOpacity>
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
            ref={carouselScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleCarouselScroll}
          >
            {CAROUSEL_IMAGES_BY_SPORT[sport].map((source, index) => (
              <Image
                key={index}
                source={source}
                style={{ width: carouselWidth, height: '100%' }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          <View style={styles.carouselDots}>
            {CAROUSEL_IMAGES_BY_SPORT[sport].map((_, index) => (
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
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.replace(ROUTES.MATCHES)}>
            <View style={[styles.quickActionIcon, { backgroundColor: themeColors.quickActionSecondaryBg }]}>
              <Ionicons name="trophy-outline" size={22} color={themeColors.quickActionSecondaryIcon} />
            </View>
            <Text style={styles.quickActionLabel}>{t('home.findMatch')}</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming match */}
        <View style={styles.upcomingCard}>
          <Image
            source={UPCOMING_MATCH_IMAGE_BY_SPORT[sport]}
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
            <TouchableOpacity onPress={() => router.push(ROUTES.BOOKING)}>
              <Text style={styles.exploreAll}>{t('home.exploreAll')}</Text>
            </TouchableOpacity>
          </View>
          {venuesLoading ? (
            <ActivityIndicator style={styles.venuesLoading} color={themeColors.primary} />
          ) : venuesError ? (
            <Text style={styles.venuesEmptyText}>{venuesError}</Text>
          ) : venuesExcludingSuggested.length === 0 ? (
            venues.length === 0 ? <Text style={styles.venuesEmptyText}>{t('home.venuesEmpty')}</Text> : null
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.venuesList}
            >
              {venuesExcludingSuggested.map((venue) => (
                <VenueCard key={venue.id} venue={venue} onPress={() => router.push(venueDetailRoute(venue.id))} />
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
  venuesLoading: {
    marginTop: 8,
  },
  });
}
