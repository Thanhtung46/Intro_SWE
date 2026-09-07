// expo-router ships its own slightly-diverged copy of these types (its
// `Tabs`'s `tabBar` prop is typed against this, not the plain
// `@react-navigation/bottom-tabs` package's own `BottomTabBarProps`, which
// fails to structurally match — see specs/002-tab-navigation-performance).
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import SlidingBottomNav, { type SlidingTab, type SlidingTabKey } from '@/components/navigation/SlidingBottomNav';

/**
 * Renders as `Tabs`' `tabBar` prop (app/(tabs)/_layout.tsx) — the single
 * shared instance of the bottom nav bar for all 5 tabs, replacing the
 * previous per-screen copies (`AppShell`'s inline bar for Home/Matches/
 * Schedule/Settings, and `BottomNav` for Booking). Visual output matches
 * the bar `AppShell` used to render; only the navigation trigger changes —
 * `navigation.navigate(routeName)` (switches within the Tabs navigator,
 * keeping every tab mounted) instead of `router.replace()` (which fully
 * unmounted/remounted the destination screen — see research.md §1).
 */
export function AppTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { colors: themeColors } = useTheme();
  const { t } = useLanguage();

  const tabs: SlidingTab[] = [
    { key: 'home', label: t('nav.home'), icon: 'home' },
    { key: 'booking', label: t('nav.booking'), icon: 'ticket-outline' },
    { key: 'matches', label: t('nav.matches'), icon: 'trophy-outline' },
    { key: 'schedule', label: t('nav.schedule'), icon: 'calendar-outline' },
    { key: 'settings', label: t('nav.settings'), icon: 'settings-outline' },
  ];

  const activeRouteName = state.routes[state.index]?.name as SlidingTabKey;

  const handlePress = (key: SlidingTabKey) => {
    if (key === activeRouteName) return;
    const route = state.routes.find((r) => r.name === key);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <View
      style={[
        styles.bottomNav,
        {
          paddingBottom: Math.max(insets.bottom, 6),
          backgroundColor: themeColors.glassBarBg,
          borderTopColor: themeColors.chromeBorder,
        },
      ]}
    >
      <SlidingBottomNav
        tabs={tabs}
        active={activeRouteName}
        onPress={handlePress}
        activeColor={themeColors.activeTabBg}
        inactiveColor={themeColors.inactiveTabText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    paddingHorizontal: 8,
    paddingTop: 6,
    borderTopWidth: 1,
  },
});
