import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VenueBase } from '@/types/venue';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';

export type Venue = VenueBase & {
  priceLabel: string;
  rating: number;
  tag: string;
};

type Props = {
  venue: Venue;
  onPress?: () => void;
};

/** Recommended-venues card — Figma node 8:82 ("Skyline Arena" / "Champions Club"). */
export default function VenueCard({ venue, onPress }: Props) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.photoWrap}>
        <Image source={venue.image} style={styles.photo} resizeMode="cover" />
        <View style={styles.distanceBadge}>
          <Ionicons name="location" size={11} color={themeColors.textSecondaryAlt} />
          <Text style={styles.distanceText}>{venue.distanceLabel}</Text>
        </View>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{venue.priceLabel}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.infoTop}>
          <Text style={styles.name}>{venue.name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color="#F59E0B" />
            <Text style={styles.ratingText}>{venue.rating}</Text>
          </View>
        </View>
        <Text style={styles.tag}>{venue.tag}</Text>
      </View>
    </TouchableOpacity>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: 280,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.surfaceBorder,
      backgroundColor: c.glassCardBg,
      overflow: 'hidden',
    },
    photoWrap: {
      height: 160,
      width: '100%',
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    distanceBadge: {
      position: 'absolute',
      left: 12,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.photoChipBg,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    distanceText: {
      fontSize: 10,
      fontWeight: '500',
      color: c.venueCardMutedText,
    },
    priceBadge: {
      position: 'absolute',
      right: 12,
      top: 12,
      backgroundColor: c.photoChipBg,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    priceText: {
      fontSize: 12,
      fontWeight: '500',
      color: c.venueCardHeadingText,
    },
    info: {
      padding: 16,
      gap: 4,
    },
    infoTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    name: {
      fontSize: 16,
      fontWeight: '800',
      color: c.venueCardHeadingText,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ratingText: {
      fontSize: 12,
      fontWeight: '500',
      color: c.venueCardHeadingText,
    },
    tag: {
      fontSize: 12,
      color: c.textSecondaryAlt,
    },
  });
}
