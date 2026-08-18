import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

type Sport = 'football' | 'badminton';

type Props = {
  value: Sport;
  onChange: (sport: Sport) => void;
  /** Icon/text color when a pill is inactive — Home: colors.primaryDark, Booking: colors.bodyText. */
  inactiveColor: string;
  /** 'sm' = Home's preset, 'md' (default) = Booking's preset — differ in container radius/background and pill spacing. */
  size?: 'sm' | 'md';
};

const PRESETS = {
  sm: { borderRadius: 20, background: 'rgba(224, 227, 229, 0.4)', pillGap: 12, fontSize: 12 },
  md: { borderRadius: 16, background: 'rgba(211, 228, 254, 0.4)', pillGap: 8, fontSize: 14 },
};

/** Football/Badminton segmented toggle — Home (Figma 8:2) and Booking (Figma 79:1392) pills. */
export default function SportSegmentedToggle({ value, onChange, inactiveColor, size = 'md' }: Props) {
  const preset = PRESETS[size];

  return (
    <View style={[styles.container, { borderRadius: preset.borderRadius, backgroundColor: preset.background }]}>
      <TouchableOpacity
        style={[styles.pill, { gap: preset.pillGap }, value === 'football' && styles.pillActive]}
        onPress={() => onChange('football')}
      >
        <MaterialCommunityIcons name="soccer" size={16} color={value === 'football' ? colors.white : inactiveColor} />
        <Text style={[styles.text, { fontSize: preset.fontSize, color: inactiveColor }, value === 'football' && styles.textActive]}>
          Football
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.pill, { gap: preset.pillGap }, value === 'badminton' && styles.pillActive]}
        onPress={() => onChange('badminton')}
      >
        <MaterialCommunityIcons name="badminton" size={16} color={value === 'badminton' ? colors.white : inactiveColor} />
        <Text style={[styles.text, { fontSize: preset.fontSize, color: inactiveColor }, value === 'badminton' && styles.textActive]}>
          Badminton
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
