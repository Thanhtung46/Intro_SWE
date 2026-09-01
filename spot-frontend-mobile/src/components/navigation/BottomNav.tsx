import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
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
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);

  return (
    <View style={styles.bottomNav}>
      <BottomNavItem
        icon="home"
        label={t('nav.home')}
        active={active === 'home'}
        onPress={active === 'home' ? noop : () => (router.canGoBack() ? router.back() : router.replace(ROUTES.HOME))}
      />
      <BottomNavItem
        icon="ticket-outline"
        label={t('nav.booking')}
        active={active === 'booking'}
        onPress={active === 'booking' ? noop : () => router.push(ROUTES.BOOKING)}
      />
      <BottomNavItem
        icon="trophy-outline"
        label={t('nav.matches')}
        active={active === 'matches'}
        onPress={active === 'matches' ? noop : () => router.push(ROUTES.MATCHES)}
      />
      <BottomNavItem
        icon="calendar-outline"
        label={t('nav.schedule')}
        active={active === 'schedule'}
        onPress={active === 'schedule' ? noop : () => router.push(ROUTES.SCHEDULE)}
      />
      <BottomNavItem
        icon="settings-outline"
        label={t('nav.settings')}
        active={active === 'settings'}
        onPress={active === 'settings' ? noop : () => router.push(ROUTES.SETTINGS)}
      />
    </View>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    bottomNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
      borderTopWidth: 1,
      borderTopColor: c.chromeBorder,
      backgroundColor: c.glassBarBg,
    },
  });
}
