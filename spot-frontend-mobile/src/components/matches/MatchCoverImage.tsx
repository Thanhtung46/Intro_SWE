import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MATCH_COVER_FALLBACK } from '@/constants/matchCover';
import { colors } from '@/constants/colors';
import type { Sport } from '@/types/match';

type Props = {
  sport: Sport;
  coverUrl: string | null;
  style?: StyleProp<ViewStyle>;
  emojiSize?: number;
  labelSize?: number;
};

/**
 * Match card / detail hero — real cover when available, otherwise a
 * sport-themed placeholder (gradient + emoji) instead of a flat tint.
 */
export default function MatchCoverImage({
  sport,
  coverUrl,
  style,
  emojiSize = 52,
  labelSize = 13,
}: Props) {
  if (coverUrl) {
    return <Image source={{ uri: coverUrl }} style={[StyleSheet.absoluteFill, style]} resizeMode="cover" />;
  }

  const fallback = MATCH_COVER_FALLBACK[sport];

  return (
    <LinearGradient
      colors={fallback.gradient}
      style={[StyleSheet.absoluteFill, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.placeholderContent} pointerEvents="none">
        <Text style={[styles.emoji, { fontSize: emojiSize }]}>{fallback.emoji}</Text>
        <Text style={[styles.label, { fontSize: labelSize }]}>{fallback.label}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  placeholderContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emoji: {
    lineHeight: undefined,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  label: {
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
