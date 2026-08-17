import React, { useState } from 'react';
import {
  Alert,
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
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import VenueCard, { Venue } from '@/components/home/VenueCard';
import BottomNavItem from '@/components/home/BottomNavItem';

const HEADING_TEXT = '#020617';

const CAROUSEL_IMAGES = [
  require('../../../assets/home/carousel-football.png'),
  require('../../../assets/home/carousel-stadium.png'),
];

const VENUES: Venue[] = [
  {
    id: 'skyline-arena',
    name: 'Skyline Arena',
    image: require('../../../assets/home/venue-skyline-arena.png'),
    distanceLabel: '1.2 km',
    priceLabel: '120k/hr',
    rating: 4.9,
    tag: 'Multi-sport, Premium Surface',
  },
  {
    id: 'champions-club',
    name: 'Champions Club',
    image: require('../../../assets/home/venue-champions-club.png'),
    distanceLabel: '2.5 km',
    priceLabel: '$40/hr',
    rating: 4.8,
    tag: 'Indoor Courts, Pro Amenities',
  },
];

type Sport = 'football' | 'badminton';

type Props = {
  /** Opens the account menu (ProfileMenu) — wired by the app/home.tsx route. */
  onAvatarPress: () => void;
  avatarInitial: string;
  /** Bottom nav — Schedule/Settings are real routes now (SPOT-158/66). */
  onNavigateSchedule: () => void;
  onNavigateSettings: () => void;
};

const comingSoon = (feature: string) => Alert.alert('Coming soon', `${feature} is not available yet.`);

/** SPOT home dashboard — Figma node 8:2 ("Football Dashboard"). */
export default function HomeScreen({
  onAvatarPress,
  avatarInitial,
  onNavigateSchedule,
  onNavigateSettings,
}: Props) {
  const [sport, setSport] = useState<Sport>('football');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!carouselWidth) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setCarouselIndex(index);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header - Top Navigation Shell (Figma node 8:124 / 50:603) */}
      <BlurView intensity={30} tint="light" style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} />
          <Text style={styles.logoText}>SPOT</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => comingSoon('AI Assistant')}
            accessibilityRole="button"
            accessibilityLabel="AI Assistant"
          >
            <MaterialCommunityIcons name="creation" size={20} color={colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => comingSoon('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={18} color={colors.primaryDark} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={onAvatarPress}
            accessibilityRole="button"
            accessibilityLabel="Account menu"
          >
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

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
        <View style={styles.sportToggle}>
          <TouchableOpacity
            style={[styles.sportPill, sport === 'football' && styles.sportPillActive]}
            onPress={() => setSport('football')}
          >
            <MaterialCommunityIcons
              name="soccer"
              size={16}
              color={sport === 'football' ? colors.white : colors.primaryDark}
            />
            <Text style={[styles.sportText, sport === 'football' && styles.sportTextActive]}>Football</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sportPill, sport === 'badminton' && styles.sportPillActive]}
            onPress={() => setSport('badminton')}
          >
            <MaterialCommunityIcons
              name="badminton"
              size={16}
              color={sport === 'badminton' ? colors.white : colors.primaryDark}
            />
            <Text style={[styles.sportText, sport === 'badminton' && styles.sportTextActive]}>Badminton</Text>
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.quickActionCard} onPress={() => comingSoon('Book Field')}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(37, 99, 235, 0.2)' }]}>
              <Ionicons name="ticket-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Book Field</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => comingSoon('Find Match')}>
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
            <View>
              <Text style={styles.upcomingTime}>Tonight, 8:00 PM</Text>
              <View style={styles.upcomingLocationRow}>
                <Ionicons name="location" size={13} color={HEADING_TEXT} />
                <Text style={styles.upcomingLocation}>Football Field A @ VietNet Center</Text>
              </View>
            </View>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.venuesList}
          >
            {VENUES.map((venue) => (
              <VenueCard key={venue.id} venue={venue} onPress={() => comingSoon(venue.name)} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Bottom navigation */}
      <View style={styles.bottomNav}>
        <BottomNavItem icon="home" label="Home" active onPress={() => {}} />
        <BottomNavItem icon="ticket-outline" label="Booking" onPress={() => comingSoon('Booking')} />
        <BottomNavItem icon="trophy-outline" label="Matches" onPress={() => comingSoon('Matches')} />
        <BottomNavItem icon="calendar-outline" label="Schedule" onPress={onNavigateSchedule} />
        <BottomNavItem icon="settings-outline" label="Settings" onPress={onNavigateSettings} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: colors.primaryDark,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: colors.ringBorder,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#996100',
    borderWidth: 1,
    borderColor: colors.white,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: colors.ringBorder,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
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
  sportToggle: {
    marginHorizontal: 20,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 227, 229, 0.4)',
  },
  sportPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  sportPillActive: {
    backgroundColor: colors.primaryDark,
  },
  sportText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  sportTextActive: {
    color: colors.white,
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
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});
