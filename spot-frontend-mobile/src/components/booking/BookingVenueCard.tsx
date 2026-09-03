import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { VenueBase } from '@/types/venue';

export type BookingVenue = VenueBase & {
  rating: number;
  address: string;
  hours: string;
  latitude: number | null;
  longitude: number | null;
  /** e.g. "Sân 5, Sân 7" for football venues with multiple court sizes; null
   * for badminton or when the venue only has one unlabeled size. */
  courtTypeLabel: string | null;
};

type Props = {
  venue: BookingVenue;
  onBookPress: () => void;
  onNavigatePress?: () => void;
};

/** Immersive venue card — Figma node 79:1405 ("Venue Card 1", Booking Field screen). */
export default function BookingVenueCard({ venue, onBookPress, onNavigatePress }: Props) {
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.photoWrap}>
        <Image
          source={imageFailed ? venue.fallbackImage : venue.image}
          style={styles.photo}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.topLeftActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onNavigatePress}
            accessibilityRole="button"
            accessibilityLabel={t('booking.navigateToVenueLabel')}
          >
            <Ionicons name="navigate-outline" size={18} color={c.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={styles.ratingText}>{venue.rating}</Text>
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.bookButton} onPress={onBookPress} activeOpacity={0.85}>
            <Text style={styles.bookButtonText}>{t('home.bookField')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.name}>{venue.name}</Text>
        {venue.distanceLabel ? (
          <View style={styles.metaRow}>
            <Ionicons name="location" size={13} color={c.textSecondaryAlt} />
            <Text style={styles.metaText}>{venue.distanceLabel}</Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={13} color={c.textSecondaryAlt} />
          <Text style={styles.metaText}>{venue.address}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={c.textSecondaryAlt} />
          <Text style={styles.metaText}>{t('booking.openPrefix')}{venue.hours}</Text>
        </View>
        {venue.courtTypeLabel && (
          <View style={styles.metaRow}>
            <Ionicons name="grid-outline" size={13} color={c.textSecondaryAlt} />
            <Text style={styles.metaText}>{venue.courtTypeLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: '100%',
      backgroundColor: c.surface,
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
      backgroundColor: c.photoChipBg,
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
      backgroundColor: c.venueCardChipBg,
    },
    ratingText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.venueCardHeadingText,
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
    bookButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    bookButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.white,
    },
    details: {
      padding: 16,
      gap: 8,
    },
    name: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: -0.6,
      color: c.venueCardHeadingText,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metaText: {
      fontSize: 13,
      color: c.textSecondaryAlt,
    },
  });
}
