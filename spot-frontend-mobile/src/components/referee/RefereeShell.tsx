import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BottomNavItem from '@/components/navigation/BottomNavItem';
import { NotificationMenu } from '@/components/NotificationMenu';
import { ProfileMenu } from '@/components/ProfileMenu';
import { ROUTES } from '@/constants/routes';
import { ThemeColors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { getUnreadCount } from '@/services/notificationService';

export type RefereeTabKey = 'invitations' | 'board' | 'schedule' | 'earnings' | 'settings';

const TABS: {
  key: RefereeTabKey;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}[] = [
  { key: 'invitations', icon: 'mail-outline', route: ROUTES.REFEREE_INVITATIONS },
  { key: 'board', icon: 'grid-outline', route: ROUTES.REFEREE_BOARD },
  { key: 'schedule', icon: 'calendar-outline', route: ROUTES.REFEREE_SCHEDULE },
  { key: 'earnings', icon: 'cash-outline', route: ROUTES.REFEREE_EARNINGS },
  { key: 'settings', icon: 'settings-outline', route: ROUTES.REFEREE_SETTINGS },
];

/**
 * Referee-side equivalent of src/components/AppShell.tsx — same header
 * (logo, notifications w/ unread badge, avatar → ProfileMenu) but a
 * referee-only 5-tab bottom bar (Invitations · Board · Schedule ·
 * Earnings · Settings) routing under app/referee/*. Kept separate from
 * AppShell so the player and referee navigation never cross-link.
 */
export function RefereeShell({ activeTab, children }: { activeTab: RefereeTabKey; children: ReactNode }) {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useLanguage();
  const { mode, colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [notificationMenuVisible, setNotificationMenuVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = () => {
    getUnreadCount().then((result) => setUnreadCount(result.count ?? 0));
  };

  useEffect(() => {
    refreshUnreadCount();
  }, []);

  const goToTab = (key: RefereeTabKey, route: string) => {
    if (activeTab === key) return;
    router.push(route);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <BlurView intensity={30} tint={mode === 'dark' ? 'dark' : 'light'} style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} />
          <Text style={styles.logoText}>SPOT</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setNotificationMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('header.notifications')}
          >
            <Ionicons name="notifications-outline" size={18} color={themeColors.primary} />
            {unreadCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => setProfileMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('header.accountMenu')}
          >
            <Text style={styles.avatarText}>{(user?.fullName || 'R').charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      <View style={styles.content}>{children}</View>

      <View style={styles.bottomNav}>
        {TABS.map((tab) => (
          <BottomNavItem
            key={tab.key}
            icon={tab.icon}
            label={t(`referee.nav.${tab.key}` as const)}
            active={activeTab === tab.key}
            onPress={() => goToTab(tab.key, tab.route)}
          />
        ))}
      </View>

      <ProfileMenu visible={profileMenuVisible} onClose={() => setProfileMenuVisible(false)} />
      <NotificationMenu
        visible={notificationMenuVisible}
        onClose={() => {
          setNotificationMenuVisible(false);
          refreshUnreadCount();
        }}
      />
    </SafeAreaView>
  );
}

function getStyles(c: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.screenBackgroundAlt },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.chromeBorder,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logo: { width: 40, height: 40, borderRadius: 20 },
    logoText: { fontSize: 24, fontWeight: '900', letterSpacing: -0.6, color: c.accentText },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.glassButtonBg,
      borderWidth: 2,
      borderColor: c.glassRingBorder,
    },
    notificationBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 3,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.badgeBg,
      borderWidth: 1,
      borderColor: c.badgeBorder,
    },
    notificationBadgeText: { fontSize: 10, fontWeight: '700', color: c.badgeText },
    avatarButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.glassButtonBg,
      borderWidth: 2,
      borderColor: c.glassRingBorder,
    },
    avatarText: { fontSize: 15, fontWeight: '700', color: c.primary },
    content: { flex: 1 },
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
