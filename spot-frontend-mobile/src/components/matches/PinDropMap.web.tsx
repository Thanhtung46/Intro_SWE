import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import type { JumpTo } from './PinDropMap';

type Props = {
  initialLatitude: number;
  initialLongitude: number;
  onMove: (latitude: number, longitude: number) => void;
  jumpTo?: JumpTo | null;
};

// Metro/webpack picks this file over PinDropMap.tsx when bundling for web —
// same reasoning as AppMap.web.tsx (react-native-webview's web support is
// unreliable, `npm run web` isn't this app's primary target).
export default function PinDropMap(_props: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="map-outline" size={28} color={colors.outline} />
      <Text style={styles.text}>Map picker isn't available on web — enter Address/Province/Ward manually below.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.iconBackground,
    padding: spacing.lg,
  },
  text: { fontSize: 13, color: colors.outline, textAlign: 'center' },
});
