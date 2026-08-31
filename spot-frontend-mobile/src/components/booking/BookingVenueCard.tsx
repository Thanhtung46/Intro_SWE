import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { VenueBase } from '@/types/venue';

export type BookingVenue = VenueBase & {
  price: string;
  rating: number;
  address: string;
  hours: string;
};

type Props = {
  venue: BookingVenue;
  onBookPress: () => void;
  onFavoritePress?: () => void;
  onNavigatePress?: () => void;
};

/** Immersive venue card — Figma node 79:1405 ("Venue Card 1", Booking Field screen). */
export default function BookingVenueCard({ venue, onBookPress, onFavoritePress, onNavigatePress }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.photoWrap}>
        <Image source={venue.image} style={styles.photo} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.topLeftActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onFavoritePress}
            accessibilityRole="button"
            accessibilityLabel="Save venue"
          >
            <Ionicons name="heart-outline" size={18} color={colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onNavigatePress}
            accessibilityRole="button"
            accessibilityLabel="Navigate to venue"
          >
            <Ionicons name="navigate-outline" size={18} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>

        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={styles.ratingText}>{venue.rating}</Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceBadge}>
            <Text style={styles.priceValue}>{venue.price}</Text>
            <Text style={styles.priceUnit}>/hr</Text>
          </View>
          <TouchableOpacity style={styles.bookButton} onPress={onBookPress} activeOpacity={0.85}>
            <Text style={styles.bookButtonText}>Book Field</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.name}>{venue.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location" size={13} color={colors.bodyText} />
          <Text style={styles.metaText}>{venue.distanceLabel} away</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={13} color={colors.bodyText} />
          <Text style={styles.metaText}>{venue.address}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={colors.bodyText} />
          <Text style={styles.metaText}>Open: {venue.hours}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.white,
  },
  photoWrap: {
    height: 320,
    width: '100%',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  topLeftActions: {
    position: 'absolute',
    left: 16,
    top: 16,
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  ratingBadge: {
    position: 'absolute',
    right: 16,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1C30',
  },
  bottomRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  priceUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.bodyText,
  },
  bookButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  details: {
    padding: 16,
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    color: '#0B1C30',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: colors.bodyText,
  },
});
