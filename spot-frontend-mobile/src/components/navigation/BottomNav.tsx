import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';
import SlidingBottomNav, { type SlidingTab, type SlidingTabKey } from '@/components/navigation/SlidingBottomNav';

export type BottomNavKey = SlidingTabKey;

type Props = {
  /** Which tab is currently selected — omit if none of the 5 tabs apply. */
  active?: BottomNavKey;
};

const TABS: SlidingTab[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'booking', label: 'Booking', icon: 'ticket-outline' },
  { key: 'matches', label: 'Matches', icon: 'trophy-outline' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

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

  return (
    <View style={styles.bottomNav}>
      <SlidingBottomNav
        tabs={TABS}
        active={active}
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
    borderTopColor: colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});
