import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { ReactNode, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';
import SlidingBottomNav, { type SlidingTab, type SlidingTabKey } from '@/components/navigation/SlidingBottomNav';
import { useUser } from '../context/UserContext';
import { getUnreadCount } from '../services/notificationService';
import { NotificationMenu } from './NotificationMenu';
import { ProfileMenu } from './ProfileMenu';

type TabKey = SlidingTabKey;

const SHELL_TABS: SlidingTab[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'booking', label: 'Booking', icon: 'ticket-outline' },
  { key: 'matches', label: 'Matches', icon: 'trophy-outline' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <BlurView intensity={30} tint="light" style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <Text style={styles.logoText}>SPOT</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push(ROUTES.ASSISTANT)}
            accessibilityRole="button"
            accessibilityLabel="AI Assistant"
          >
            <MaterialCommunityIcons name="creation" size={20} color={colors.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setNotificationMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={18} color={colors.primaryDark} />
            {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => setProfileMenuVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Account menu"
          >
            <Text style={styles.avatarText}>{(user?.fullName || 'G').charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      <View style={styles.content}>{children}</View>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        <SlidingBottomNav tabs={SHELL_TABS} active={activeTab} onPress={goToTab} />
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
    backgroundColor: colors.screenBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
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
    color: colors.primaryDark,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: colors.ringBorder,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#996100',
    borderWidth: 1,
    borderColor: colors.white,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: colors.ringBorder,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
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
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
});
