import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';

type Sport = 'football' | 'badminton';

type Props = {
  value: Sport;
  onChange: (sport: Sport) => void;
  /** Icon/text color when a pill is inactive — Home: colors.primaryDark, Booking: colors.bodyText. */
  inactiveColor: string;
  /** 'sm' = Home's preset, 'md' (default) = Booking's preset — differ in container radius/background and pill spacing. */
  size?: 'sm' | 'md';
  themeColors?: ThemeColors;
};

const PRESETS = {
  sm: { borderRadius: 20, background: 'rgba(224, 227, 229, 0.4)', pillGap: 12, fontSize: 12 },
  md: { borderRadius: 16, background: 'rgba(211, 228, 254, 0.4)', pillGap: 8, fontSize: 14 },
};

/** Football/Badminton segmented toggle — Home (Figma 8:2) and Booking (Figma 79:1392) pills. */
export default function SportSegmentedToggle({ value, onChange, inactiveColor, size = 'md', themeColors }: Props) {
  const { t } = useLanguage();
  const preset = PRESETS[size];
  const trackBg = themeColors
    ? size === 'sm'
      ? themeColors.sportToggleTrackBgSubtle
      : themeColors.sportToggleTrackBgTint
    : preset.background;
  const activeIconColor = themeColors?.white ?? colors.white;
  const activeTextColor = themeColors?.white ?? colors.white;
  const activeBg = themeColors?.primary ?? colors.primaryDark;

  return (
    <View style={[styles.container, { borderRadius: preset.borderRadius, backgroundColor: trackBg }]}>
      <TouchableOpacity
        style={[
          styles.pill,
          { gap: preset.pillGap },
          value === 'football' && [styles.pillActive, { backgroundColor: activeBg }],
        ]}
        onPress={() => onChange('football')}
      >
        <MaterialCommunityIcons
          name="soccer"
          size={16}
          color={value === 'football' ? activeIconColor : inactiveColor}
        />
        <Text
          style={[
            styles.text,
            { fontSize: preset.fontSize, color: inactiveColor },
            value === 'football' && [styles.textActive, { color: activeTextColor }],
          ]}
        >
          {t('sportToggle.football')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.pill,
          { gap: preset.pillGap },
          value === 'badminton' && [styles.pillActive, { backgroundColor: activeBg }],
        ]}
        onPress={() => onChange('badminton')}
      >
        <MaterialCommunityIcons
          name="badminton"
          size={16}
          color={value === 'badminton' ? activeIconColor : inactiveColor}
        />
        <Text
          style={[
            styles.text,
            { fontSize: preset.fontSize, color: inactiveColor },
            value === 'badminton' && [styles.textActive, { color: activeTextColor }],
          ]}
        >
          {t('sportToggle.badminton')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  pillActive: {
    backgroundColor: colors.primaryDark,
  },
  text: {
    fontWeight: '700',
  },
  textActive: {
    color: colors.white,
  },
});
