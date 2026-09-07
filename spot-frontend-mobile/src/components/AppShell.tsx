import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { ReactNode, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ROUTES } from '@/constants/routes';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '../context/UserContext';
import { getUnreadCount } from '../services/notificationService';
import { NotificationMenu } from './NotificationMenu';
import { ProfileMenu } from './ProfileMenu';

/**
 * Persistent top header shared across Home/Matches/Schedule/Settings
 * (Figma: Football Dashboard.png, Settings.png, View Schedule.png, Matches
 * Homepage all show the same shell). Main Profile/Edit Profile and auth
 * screens intentionally do NOT use this shell.
 *
 * The bottom tab bar previously rendered here (its own copy of
 * `SlidingBottomNav`, driven by `router.replace()`) moved to `AppTabBar`,
 * rendered once by `app/(tabs)/_layout.tsx`'s `Tabs` as the shared `tabBar`
 * — see specs/002-tab-navigation-performance. Rendering it per-screen here
 * would duplicate it under `Tabs` (which already supplies one bar for the
 * whole group) and fight the mount-persistence fix this feature relies on.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useUser();
  const { mode, colors: themeColors } = useTheme();
  const { t } = useLanguage();
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
});
