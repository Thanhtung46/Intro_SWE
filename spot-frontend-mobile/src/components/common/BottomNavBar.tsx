import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import SlidingBottomNav, { type SlidingTab, type SlidingTabKey } from '@/components/navigation/SlidingBottomNav';

// 5-tab bottom nav (Home/Booking/Matches/Schedule/Settings) shown on Join
// Match - Map. Booking/Schedule stay "Coming soon" here until those tickets land.

export type BottomNavTab = SlidingTabKey;

interface BottomNavBarProps {
  active: BottomNavTab;
}

const TABS: SlidingTab[] = [
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
    if (tab === 'settings') return router.replace('/settings');
    if (tab === 'matches') return router.replace('/matches');
    Alert.alert('Coming soon', `${tab === 'booking' ? 'Booking' : 'Schedule'} is not available yet.`);
  };

  return (
    <View style={styles.container}>
      <SlidingBottomNav
        tabs={TABS}
        active={active}
        onPress={handlePress}
        activeColor={colors.primaryDark}
        inactiveColor={colors.outline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.glassSurfaceBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
});
