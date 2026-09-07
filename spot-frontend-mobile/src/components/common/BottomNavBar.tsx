import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/spacing';
import SlidingBottomNav, { type SlidingTab, type SlidingTabKey } from '@/components/navigation/SlidingBottomNav';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

// 5-tab bottom nav (Home/Booking/Matches/Schedule/Settings) shown on Join
// Match - Map. Booking/Schedule stay "Coming soon" here until those tickets land.

export type BottomNavTab = SlidingTabKey;

interface BottomNavBarProps {
  active: BottomNavTab;
}

export function BottomNavBar({ active }: BottomNavBarProps) {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { t } = useLanguage();
  const tabs: SlidingTab[] = [
    { key: 'home', label: t('nav.home'), icon: 'home-outline' },
    { key: 'booking', label: t('nav.booking'), icon: 'calendar-outline' },
    { key: 'matches', label: t('nav.matches'), icon: 'trophy-outline' },
    { key: 'schedule', label: t('nav.schedule'), icon: 'time-outline' },
    { key: 'settings', label: t('nav.settings'), icon: 'settings-outline' },
  ];

  const handlePress = (tab: BottomNavTab) => {
    if (tab === active) return;
    if (tab === 'home') return router.replace('/home');
    if (tab === 'settings') return router.replace('/settings');
    if (tab === 'matches') return router.replace('/matches');
    Alert.alert('Coming soon', `${tab === 'booking' ? 'Booking' : 'Schedule'} is not available yet.`);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.glassBarBg, borderTopColor: themeColors.chromeBorder }]}>
      <SlidingBottomNav
        tabs={tabs}
        active={active}
        onPress={handlePress}
        activeColor={themeColors.activeTabBg}
        inactiveColor={themeColors.inactiveTabText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
    borderTopWidth: 1,
  },
});
