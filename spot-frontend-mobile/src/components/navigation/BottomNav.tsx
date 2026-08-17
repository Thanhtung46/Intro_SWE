import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';
import { comingSoon } from '@/utils/comingSoon';
import BottomNavItem from '@/components/navigation/BottomNavItem';

export type BottomNavKey = 'home' | 'booking' | 'matches' | 'schedule' | 'settings';

type Props = {
  /** Which tab is currently selected — omit if none of the 5 tabs apply. */
  active?: BottomNavKey;
};

const noop = () => {};

/**
 * Shared bottom navigation bar — was copy-pasted across HomeScreen,
 * BookingScreen, and BookingMapScreen; now a single owner of the 5-item
 * array and its wiring.
 */
export default function BottomNav({ active }: Props) {
  const router = useRouter();

  return (
    <View style={styles.bottomNav}>
      <BottomNavItem
        icon="home"
        label="Home"
        active={active === 'home'}
        onPress={active === 'home' ? noop : () => (router.canGoBack() ? router.back() : router.replace(ROUTES.HOME))}
      />
      <BottomNavItem
        icon="ticket-outline"
        label="Booking"
        active={active === 'booking'}
        onPress={active === 'booking' ? noop : () => router.push(ROUTES.BOOKING)}
      />
      <BottomNavItem
        icon="trophy-outline"
        label="Matches"
        active={active === 'matches'}
        onPress={active === 'matches' ? noop : () => comingSoon('Matches')}
      />
      <BottomNavItem
        icon="calendar-outline"
        label="Schedule"
        active={active === 'schedule'}
        onPress={active === 'schedule' ? noop : () => comingSoon('Schedule')}
      />
      <BottomNavItem
        icon="settings-outline"
        label="Settings"
        active={active === 'settings'}
        onPress={active === 'settings' ? noop : () => comingSoon('Settings')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});
