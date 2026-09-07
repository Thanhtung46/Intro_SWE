import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { ReactNode, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROUTES } from '@/constants/routes';
import SlidingBottomNav, { type SlidingTab, type SlidingTabKey } from '@/components/navigation/SlidingBottomNav';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '../context/UserContext';
import { getUnreadCount } from '../services/notificationService';
import { NotificationMenu } from './NotificationMenu';
import { ProfileMenu } from './ProfileMenu';

type TabKey = SlidingTabKey;

const TAB_PATH: Record<TabKey, '/home' | '/booking' | '/matches' | '/schedule' | '/settings'> = {
  home: '/home',
  booking: '/booking',
  matches: '/matches',
  schedule: '/schedule',
  settings: '/settings',
};

/**
 * Persistent top header + bottom tab bar shared across Home/Matches/
 * Schedule/Settings (Figma: Football Dashboard.png, Settings.png, View
 * Schedule.png, Matches Homepage all show the same shell). Main Profile/
 * Edit Profile and auth screens intentionally do NOT use this shell
 * (Figma's Main Profile.png has its own back+Edit header, no bottom tabs).
 */
export function AppShell({ activeTab, children }: { activeTab: TabKey; children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { mode, colors: themeColors } = useTheme();
  const { t } = useLanguage();
  const tabs: SlidingTab[] = [
    { key: 'home', label: t('nav.home'), icon: 'home' },
    { key: 'booking', label: t('nav.booking'), icon: 'ticket-outline' },
    { key: 'matches', label: t('nav.matches'), icon: 'trophy-outline' },
    { key: 'schedule', label: t('nav.schedule'), icon: 'calendar-outline' },
    { key: 'settings', label: t('nav.settings'), icon: 'settings-outline' },
  ];
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [notificationMenuVisible, setNotificationMenuVisible] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const refreshUnreadCount = () => {
    getUnreadCount().then((result) => {
      setHasUnreadNotifications((result.count ?? 0) > 0);
    });
  };

  useEffect(() => {
    refreshUnreadCount();
  }, []);

  const goToTab = (tab: TabKey) => {
    if (activeTab === tab) return;
    // replace keeps the tab switch from stacking screens; root Stack uses
    // animation: 'none' for these routes so pages don't overlap while fading.
    router.replace(TAB_PATH[tab]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.screenBackgroundAlt }]} edges={['top']}>
      <BlurView
        intensity={30}
        tint={mode === 'dark' ? 'dark' : 'light'}
        style={[styles.header, { backgroundColor: themeColors.glassBarBg, borderBottomColor: themeColors.chromeBorder }]}
      >
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <Text style={[styles.logoText, { color: themeColors.accentText }]}>SPOT</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: themeColors.glassButtonBg, borderColor: themeColors.glassRingBorder }]}
            onPress={() => router.push(ROUTES.ASSISTANT)}
            accessibilityRole="button"
            accessibilityLabel={t('header.aiAssistant')}
          >
            <MaterialCommunityIcons name="creation" size={20} color={themeColors.accentText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: themeColors.glassButtonBg, borderColor: themeColors.glassRingBorder }]}
            onPress={() => setNotificationMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('header.notifications')}
          >
            <Ionicons name="notifications-outline" size={18} color={themeColors.accentText} />
            {hasUnreadNotifications ? <View style={[styles.notificationDot, { backgroundColor: themeColors.badgeBg, borderColor: themeColors.badgeBorder }]} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.avatarButton, { backgroundColor: themeColors.glassButtonBg, borderColor: themeColors.glassRingBorder }]}
            onPress={() => setProfileMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('header.accountMenu')}
          >
            <Text style={[styles.avatarText, { color: themeColors.accentText }]}>{(user?.fullName || 'G').charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      <View style={styles.content}>{children}</View>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 6), backgroundColor: themeColors.glassBarBg, borderTopColor: themeColors.chromeBorder }]}>
        <SlidingBottomNav tabs={tabs} active={activeTab} onPress={goToTab} activeColor={themeColors.activeTabBg} inactiveColor={themeColors.inactiveTabText} />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    paddingHorizontal: 8,
    paddingTop: 6,
    // paddingBottom set from safe-area inset so the white bar reaches the
    // home-indicator edge (no separate gray strip under the tabs).
    borderTopWidth: 1,
  },
});
