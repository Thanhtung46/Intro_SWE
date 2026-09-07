import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { VenueBase } from '@/types/venue';

export type MapVenuePreview = VenueBase;

type Props = {
  venue: MapVenuePreview;
  onBookPress: () => void;
};

/** Floating venue card anchored to a selected map pin — Figma node 79:1316. */
export default function MapVenuePopup({ venue, onBookPress }: Props) {
  const { t } = useLanguage();
  const { colors: c } = useTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <View style={styles.card}>
      <Image
        source={imageFailed ? venue.fallbackImage : venue.image}
        style={styles.photo}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
      />
      <View style={styles.body}>
        <Text style={styles.name}>{venue.name}</Text>
        <Text style={styles.distance}>{venue.distanceLabel}</Text>
        <TouchableOpacity style={styles.bookButton} onPress={onBookPress} activeOpacity={0.85}>
          <Text style={styles.bookButtonText}>{t('home.bookField')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.pointer} />
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      width: 256,
      borderRadius: 24,
      backgroundColor: c.photoChipBg,
      borderWidth: 1,
      borderColor: c.chromeBorder,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 8,
    },
    photo: {
      width: '100%',
      height: 128,
    },
    body: {
      padding: 16,
      gap: 4,
    },
    name: {
      fontSize: 14,
      fontWeight: '700',
      color: c.venueCardHeadingText,
    },
    distance: {
      fontSize: 12,
      color: c.textSecondaryAlt,
      marginBottom: 8,
    },
    bookButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    bookButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.white,
    },
    pointer: {
      position: 'absolute',
      bottom: -8,
      left: '50%',
      marginLeft: -8,
      width: 16,
      height: 16,
      backgroundColor: c.photoChipBg,
      borderWidth: 1,
      borderColor: c.chromeBorder,
      transform: [{ rotate: '45deg' }],
    },
  });
}
