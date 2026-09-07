import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import SlidingBottomNav, { type SlidingTab, type SlidingTabKey } from '@/components/navigation/SlidingBottomNav';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export type BottomNavKey = SlidingTabKey;

type Props = {
  /** Which tab is currently selected — omit if none of the 5 tabs apply. */
  active?: BottomNavKey;
};

const PATH: Record<SlidingTabKey, string> = {
  home: ROUTES.HOME,
  booking: ROUTES.BOOKING,
  matches: ROUTES.MATCHES,
  schedule: ROUTES.SCHEDULE,
  settings: ROUTES.SETTINGS,
};

/**
 * Shared bottom navigation bar — was copy-pasted across HomeScreen,
 * BookingScreen, and BookingMapScreen; now a single owner of the 5-item
 * array and its wiring.
 */
export default function BottomNav({ active = 'home' }: Props) {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { t } = useLanguage();
  const tabs: SlidingTab[] = [
    { key: 'home', label: t('nav.home'), icon: 'home' },
    { key: 'booking', label: t('nav.booking'), icon: 'ticket-outline' },
    { key: 'matches', label: t('nav.matches'), icon: 'trophy-outline' },
    { key: 'schedule', label: t('nav.schedule'), icon: 'calendar-outline' },
    { key: 'settings', label: t('nav.settings'), icon: 'settings-outline' },
  ];

  return (
    <View style={[styles.bottomNav, { backgroundColor: themeColors.glassBarBg, borderTopColor: themeColors.chromeBorder }]}>
      <SlidingBottomNav
        tabs={tabs}
        active={active}
        activeColor={themeColors.activeTabBg}
        inactiveColor={themeColors.inactiveTabText}
        onPress={(key) => {
          if (key === active) return;
          router.replace(PATH[key]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
});
