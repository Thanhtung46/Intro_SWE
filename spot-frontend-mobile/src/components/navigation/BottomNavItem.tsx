import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';

const ACTIVE_BG = '#2170E4';
const INACTIVE_TEXT = '#334155';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
};

/** One tab of the bottom navigation shell — Figma node 8:139. */
export default function BottomNavItem({ icon, label, active, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.item, active && styles.itemActive]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={active ? colors.white : INACTIVE_TEXT} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemActive: {
    backgroundColor: ACTIVE_BG,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: INACTIVE_TEXT,
  },
  labelActive: {
    color: colors.white,
  },
});
