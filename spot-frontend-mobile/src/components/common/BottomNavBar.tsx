import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

// 5-tab bottom nav (Home/Booking/Matches/Schedule/Settings) shown on the
// Matches Homepage (95:2417) and Join Match - Map (426:2). Owns its own
// navigation (like src/components/ProfileMenu.tsx) since it's a shared
// component, not a screen — see .claude/rules/code-style.md's thin-route
// split, which only applies to app/<route>.tsx + src/screens pairs.
// Booking/Schedule have no route yet — "Coming soon" until those tickets land.

export type BottomNavTab = 'home' | 'booking' | 'matches' | 'schedule' | 'settings';

interface BottomNavBarProps {
  active: BottomNavTab;
}

interface TabConfig {
  key: BottomNavTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'booking', label: 'Booking', icon: 'calendar-outline' },
  { key: 'matches', label: 'Matches', icon: 'trophy-outline' },
  { key: 'schedule', label: 'Schedule', icon: 'time-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export function BottomNavBar({ active }: BottomNavBarProps) {
  const router = useRouter();

  const handlePress = (tab: BottomNavTab) => {
    if (tab === active) return;
    if (tab === 'home') return router.replace('/home');
    if (tab === 'settings') return router.push('/settings');
    if (tab === 'matches') return router.push('/matches');
    Alert.alert('Coming soon', `${tab === 'booking' ? 'Booking' : 'Schedule'} is not available yet.`);
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            testID={`bottom-nav-${tab.key}`}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => handlePress(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon} size={18} color={isActive ? colors.white : colors.outline} style={styles.icon} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.glassSurfaceBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  // Active tab is one pill wrapping the icon AND the label together (not
  // just a circle behind the icon) — pencil node CuOaD's t40hDT.
  tabActive: {
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
  },
  labelActive: {
    color: colors.white,
  },
});
