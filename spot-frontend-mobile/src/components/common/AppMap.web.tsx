import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

export type AppMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  tintColor: string;
  emoji: string;
};

export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

// Metro/webpack picks this file over AppMap.tsx when bundling for web —
// react-native-webview's web support is unreliable for this use case, and
// `npm run web` isn't this app's primary target (see AppMap.tsx). Same
// props signature as the native file so call sites don't need a Platform
// check of their own.
type Props = {
  markers: AppMapMarker[];
  onSelectMarker?: (id: string) => void;
  initialRegion: Region;
};

export default function AppMap(_props: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="map-outline" size={28} color={colors.outline} />
      <Text style={styles.text}>Map view isn't available on web — use the list below.</Text>
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
