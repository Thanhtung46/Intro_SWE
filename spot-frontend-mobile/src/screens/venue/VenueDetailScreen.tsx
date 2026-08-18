import React, { useState } from 'react';
import { Image, ImageSourcePropType, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { comingSoon } from '@/utils/comingSoon';
import SelectPitchTimeModal, { Pitch } from '@/components/booking/SelectPitchTimeModal';

type VenueDetail = {
  name: string;
  heroImage: ImageSourcePropType;
  address: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  hours: string;
  capacityLabel: string;
  amenities: { parking: boolean; wifi?: string };
  schedule: { dateLabel: string; timeLabel: string; pitchLabel: string };
  extraService: { label: string; priceLabel: string };
  contact: { name: string; phone: string };
  pitches: Pitch[];
  price: string;
  priceUnit: string;
};

const VENUE_DETAILS: Record<string, VenueDetail> = {
  'skyline-arena': {
    name: 'Skyline Arena',
    heroImage: require('../../../assets/booking/venue-skyline-arena-action.jpg'),
    address: '123 Sports Lane, District 1, HCMC',
    rating: 4.8,
    reviewCount: 120,
    verified: true,
    hours: '06:00 - 23:00',
    capacityLabel: '6 Pitches',
    amenities: { parking: true, wifi: 'Skyline_Guest' },
    schedule: { dateLabel: 'Tue, Jul 28', timeLabel: '19:00 - 20:30', pitchLabel: 'Pitch A (7v7) • Turf' },
    extraService: { label: 'Hire a Referee', priceLabel: '+ 150,000 VND' },
    contact: { name: 'Venue Management', phone: '0909 123 456' },
    pitches: [
      { name: 'Pitch A', format: '7V7' },
      { name: 'Pitch B', format: '5V5' },
      { name: 'Pitch C', format: '5V5' },
      { name: 'Pitch D', format: '7V7' },
    ],
    price: '250,000',
    priceUnit: 'VND / hr',
  },
  'metro-futsal-hub': {
    name: 'Metro Futsal Hub',
    heroImage: require('../../../assets/booking/venue-metro-futsal-hub.jpg'),
    address: '456 Metro Blvd, District 7, HCMC',
    rating: 4.6,
    reviewCount: 86,
    verified: true,
    hours: '07:00 - 22:00',
    capacityLabel: '4 Pitches',
    amenities: { parking: false, wifi: 'MetroFutsal_5G' },
    schedule: { dateLabel: 'Wed, Jul 29', timeLabel: '18:00 - 19:00', pitchLabel: 'Court 2 (5v5) • Indoor' },
    extraService: { label: 'Hire a Referee', priceLabel: '+ 150,000 VND' },
    contact: { name: 'Venue Management', phone: '0912 345 678' },
    pitches: [
      { name: 'Court 1', format: '5V5' },
      { name: 'Court 2', format: '5V5' },
      { name: 'Court 3', format: '7V7' },
      { name: 'Court 4', format: '7V7' },
    ],
    price: '220,000',
    priceUnit: 'VND / hr',
  },
};

/** Parses "HH:MM - HH:MM" into [openHour, closeHour]; falls back to a sane default. */
function parseHours(hours: string): [number, number] {
  const match = hours.match(/(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/);
  if (!match) return [6, 23];
  return [Number(match[1]), Number(match[2])];
}

type Tab = 'about' | 'pricing' | 'gallery' | 'reviews';
const TABS: { key: Tab; label: string }[] = [
  { key: 'about', label: 'About' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'reviews', label: 'Reviews' },
];

type Props = {
  venueId: string;
  onBack: () => void;
};

/** Venue detail — Figma node 19:297 ("Booking field - Venue Detail"). */
export default function VenueDetailScreen({ venueId, onBack }: Props) {
  const venue = VENUE_DETAILS[venueId] ?? VENUE_DETAILS['skyline-arena'];
  const [saved, setSaved] = useState(false);
  const [refereeHired, setRefereeHired] = useState(false);
  const [pitchTimeVisible, setPitchTimeVisible] = useState(false);
  const [openHour, closeHour] = parseHours(venue.hours);

  const openInMaps = () => {
    const query = encodeURIComponent(`${venue.name}, ${venue.address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const callVenue = () => {
    Linking.openURL(`tel:${venue.contact.phone.replace(/\s/g, '')}`);
  };

  const selectTab = (tab: Tab) => {
    if (tab !== 'about') {
      comingSoon(TABS.find((t) => t.key === tab)?.label || 'Tab');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={venue.heroImage} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={18} color={colors.headingText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => setSaved((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Save venue"
            >
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={18} color={saved ? '#DC2626' : colors.headingText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.badgeRow}>
            {venue.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#D97706" />
              <Text style={styles.ratingText}>
                {venue.rating} ({venue.reviewCount} Reviews)
              </Text>
            </View>
          </View>
          <Text style={styles.venueName}>{venue.name.toUpperCase()}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={colors.bodyText} />
            <Text style={styles.addressText}>{venue.address}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              onPress={() => selectTab(tab.key)}
              accessibilityRole="button"
            >
              <Text style={[styles.tabText, tab.key === 'about' && styles.tabTextActive]}>{tab.label}</Text>
              {tab.key === 'about' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {/* Quick info */}
          <View style={styles.quickInfoRow}>
            <View style={styles.quickInfoCard}>
              <View style={styles.quickInfoIcon}>
                <Ionicons name="time-outline" size={20} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickInfoLabel}>Hours</Text>
              <Text style={styles.quickInfoValue}>{venue.hours}</Text>
            </View>
            <View style={styles.quickInfoCard}>
              <View style={styles.quickInfoIcon}>
                <Ionicons name="grid-outline" size={20} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickInfoLabel}>Capacity</Text>
              <Text style={styles.quickInfoValue}>{venue.capacityLabel}</Text>
            </View>
          </View>

          {/* Amenities */}
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Ionicons name="sparkles-outline" size={18} color={colors.headingText} />
              <Text style={styles.sectionTitle}>Amenities</Text>
            </View>
            <View style={styles.amenitiesRow}>
              {venue.amenities.parking && (
                <View style={styles.amenityChip}>
                  <View style={styles.parkingBadge}>
                    <Text style={styles.parkingBadgeText}>P</Text>
                  </View>
                  <Text style={styles.amenityText}>Parking</Text>
                </View>
              )}
              {venue.amenities.wifi && (
                <View style={styles.amenityChip}>
                  <Ionicons name="wifi" size={16} color={colors.bodyText} />
                  <Text style={styles.amenityText}>Wifi: {venue.amenities.wifi}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Ionicons name="map-outline" size={18} color={colors.headingText} />
              <Text style={styles.sectionTitle}>Location</Text>
            </View>
            <View style={styles.locationCard}>
              <View style={styles.mapPreview}>
                <Image
                  source={require('../../../assets/booking/map-background.jpg')}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
                <View style={styles.mapPin}>
                  <Ionicons name="location" size={20} color={colors.white} />
                </View>
              </View>
              <TouchableOpacity style={styles.mapsButton} onPress={openInMaps} accessibilityRole="button">
                <Ionicons name="navigate-outline" size={18} color={colors.primaryDark} />
                <Text style={styles.mapsButtonText}>Open in Google Maps</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Schedule */}
          <View style={styles.section}>
            <View style={styles.scheduleHeader}>
              <Text style={styles.sectionTitleDark}>Schedule</Text>
              <TouchableOpacity onPress={() => comingSoon('Calendar')} accessibilityRole="button">
                <Text style={styles.linkText}>View Calendar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleIcon}>
                <Ionicons name="calendar-outline" size={20} color={colors.primaryDark} />
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleDateTime}>
                  {venue.schedule.dateLabel} {venue.schedule.timeLabel}
                </Text>
                <Text style={styles.schedulePitch}>{venue.schedule.pitchLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.editRow}
                onPress={() => comingSoon('Edit booking')}
                accessibilityRole="button"
              >
                <Text style={styles.editText}>Edit</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Extra services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extra Services</Text>
            <View style={styles.extraServiceCard}>
              <View style={styles.extraServiceIcon}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#2563EB" />
              </View>
              <View style={styles.extraServiceInfo}>
                <Text style={styles.extraServiceLabel}>{venue.extraService.label}</Text>
                <Text style={styles.extraServicePrice}>{venue.extraService.priceLabel}</Text>
              </View>
              <Switch
                value={refereeHired}
                onValueChange={setRefereeHired}
                trackColor={{ true: '#2563EB', false: colors.border }}
                thumbColor={colors.white}
              />
            </View>
          </View>

          {/* Contact venue */}
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Ionicons name="call-outline" size={18} color={colors.headingText} />
              <Text style={styles.sectionTitle}>Contact Venue</Text>
            </View>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>{venue.contact.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.contactName}>{venue.contact.name}</Text>
                  <Text style={styles.contactPhone}>{venue.contact.phone}</Text>
                </View>
              </View>
              <View style={styles.contactButtons}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => comingSoon('Zalo')}
                  accessibilityRole="button"
                >
                  <Ionicons name="chatbubble-outline" size={18} color={colors.primaryDark} />
                  <Text style={styles.contactButtonText}>Zalo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactButton} onPress={callVenue} accessibilityRole="button">
                  <Ionicons name="call-outline" size={18} color={colors.primaryDark} />
                  <Text style={styles.contactButtonText}>Call Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.startsAt}>Starts at</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>{venue.price}</Text>
            <Text style={styles.priceUnit}>{venue.priceUnit}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.bookNowButton} onPress={() => setPitchTimeVisible(true)} accessibilityRole="button">
          <Text style={styles.bookNowText}>Book Now</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>

      <SelectPitchTimeModal
        visible={pitchTimeVisible}
        pitches={venue.pitches}
        openHour={openHour}
        closeHour={closeHour}
        onClose={() => setPitchTimeVisible(false)}
        onConfirm={() => setPitchTimeVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    height: 260,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: -48,
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  venueName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: colors.headingText,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 15,
    color: colors.bodyText,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(211, 228, 254, 0.6)',
  },
  tabButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.bodyText,
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  tabIndicator: {
    marginTop: 12,
    height: 3,
    width: 28,
    borderRadius: 9999,
    backgroundColor: colors.primaryDark,
  },
  content: {
    padding: 16,
    gap: 32,
  },
  quickInfoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quickInfoCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: 17,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 74, 198, 0.1)',
  },
  quickInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bodyText,
  },
  quickInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headingText,
  },
  section: {
    gap: 16,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.headingText,
  },
  sectionTitleDark: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  parkingBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
  parkingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  amenityText: {
    fontSize: 14,
    color: colors.bodyText,
  },
  locationCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    gap: 12,
  },
  mapPreview: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#DCE9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderWidth: 4,
    borderColor: colors.white,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 74, 198, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(0, 74, 198, 0.2)',
  },
  mapsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 17,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scheduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  scheduleInfo: {
    flex: 1,
    gap: 2,
  },
  scheduleDateTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  schedulePitch: {
    fontSize: 14,
    color: '#64748B',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  extraServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 17,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  extraServiceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBE1FF',
  },
  extraServiceInfo: {
    flex: 1,
    gap: 2,
  },
  extraServiceLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.headingText,
  },
  extraServicePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  contactCard: {
    padding: 25,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D3E4FE',
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headingText,
  },
  contactPhone: {
    fontSize: 16,
    color: colors.bodyText,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(0, 74, 198, 0.2)',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  startsAt: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bodyText,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.bodyText,
  },
  bookNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#2563EB',
  },
  bookNowText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
