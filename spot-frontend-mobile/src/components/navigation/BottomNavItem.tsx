import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
};

/** One tab of the bottom navigation shell — Figma node 8:139. */
export default function BottomNavItem({ icon, label, active, onPress }: Props) {
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);

  return (
    <TouchableOpacity
      style={[styles.item, active && styles.itemActive]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={active ? colors.white : themeColors.inactiveTabText} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: 6,
      borderRadius: 12,
    },
    itemActive: {
      backgroundColor: c.activeTabBg,
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: c.inactiveTabText,
    },
    labelActive: {
      color: colors.white,
    },
  });
}
