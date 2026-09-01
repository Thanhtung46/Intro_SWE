import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Sport } from '@/types/match';

/**
 * Exact pixel size of assets/match-cover-badminton.png — keep card/hero
 * aspectRatio in sync so `contain` shows the full original with no crop.
 */
export const BADMINTON_COVER_ASPECT = 800 / 447;

const BADMINTON_DEFAULT_COVER = require('../../../assets/match-cover-badminton.png');

const FOOTBALL_DEFAULT_COVER =
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80';

type Props = {
  sport: Sport;
  coverUrl: string | null | undefined;
  style?: StyleProp<ViewStyle>;
};

function usableRemoteCoverUri(value: string): string | null {
  const uri = value.trim();
  if (!/^https?:\/\//i.test(uri)) return null;
  const lower = uri.toLowerCase();
  if (
    lower.includes('/avatars/') ||
    lower.includes('/avatar/') ||
    lower.includes('profile-covers') ||
    lower.includes('profile_covers') ||
    lower.includes('externalauthor') ||
    lower.includes('fbcdn')
  ) {
    return null;
  }
  return uri;
}

/**
 * Badminton default = the exact photo you supplied, full frame (`contain`).
 * Never zoom/crop that asset. Scraped remotes still use `cover` to fill.
 */
export default function MatchCoverImage({ sport, coverUrl, style }: Props) {
  const remoteUri = typeof coverUrl === 'string' ? usableRemoteCoverUri(coverUrl) : null;
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setRemoteFailed(false);
  }, [remoteUri]);

  const showRemote = Boolean(remoteUri) && !remoteFailed;
  const badmintonDefault = sport === 'BADMINTON';
  const defaultSource = badmintonDefault
    ? BADMINTON_DEFAULT_COVER
    : { uri: FOOTBALL_DEFAULT_COVER };

  return (
    <View style={[styles.fill, style]} pointerEvents="none">
      <Image
        source={defaultSource}
        style={styles.image}
        // Full original for bundled court photo; stock football may letterbox lightly.
        resizeMode={badmintonDefault ? 'contain' : 'cover'}
      />
      {showRemote && remoteUri ? (
        <Image
          source={{ uri: remoteUri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setRemoteFailed(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
    overflow: 'hidden',
    backgroundColor: '#0B3D2E',
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
