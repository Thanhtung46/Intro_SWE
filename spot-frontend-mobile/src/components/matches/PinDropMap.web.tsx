import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { spacing } from '@/constants/spacing';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
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
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  return (
    <View style={styles.wrap}>
      <Ionicons name="map-outline" size={28} color={colors.outlineMuted} />
      <Text style={styles.text}>{t('matches.host.pinPickerUnavailableWeb')}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.roleCardSelectedBg,
    padding: spacing.lg,
  },
  text: { fontSize: 13, color: colors.outlineMuted, textAlign: 'center' },
});
