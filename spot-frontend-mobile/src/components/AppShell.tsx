import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BottomNavItem from '@/components/navigation/BottomNavItem';
import { showAlert } from '@/utils/showAlert';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { ThemeColors } from '@/constants/theme';
import { useUser } from '../context/UserContext';
import { getUnreadCount } from '../services/notificationService';
import { NotificationMenu } from './NotificationMenu';
import { ProfileMenu } from './ProfileMenu';

type TabKey = 'home' | 'booking' | 'matches' | 'schedule' | 'settings';

const comingSoon = (feature: string) => showAlert('Coming soon', `${feature} is not available yet.`);

/**
 * Persistent top header + bottom tab bar shared across Home/Matches/
 * Schedule/Settings (Figma: Football Dashboard.png, Settings.png, View
 * Schedule.png, Matches Homepage all show the same shell). Main Profile/
 * Edit Profile and auth screens intentionally do NOT use this shell
 * (Figma's Main Profile.png has its own back+Edit header, no bottom tabs).
 */
export function AppShell({ activeTab, children }: { activeTab: TabKey; children: ReactNode }) {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useLanguage();
  const { mode, colors: themeColors } = useTheme();
  const styles = useMemo(() => getStyles(themeColors), [themeColors]);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [notificationMenuVisible, setNotificationMenuVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = () => {
    getUnreadCount().then((result) => {
      setUnreadCount(result.count ?? 0);
    });
  };

  useEffect(() => {
    refreshUnreadCount();
  }, []);

  const goToTab = (tab: TabKey, path: '/home' | '/booking' | '/matches' | '/schedule' | '/settings') => {
    if (activeTab === tab) return;
    router.push(path);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <BlurView intensity={30} tint={mode === 'dark' ? 'dark' : 'light'} style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <Text style={styles.logoText}>SPOT</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => comingSoon(t('header.aiAssistant'))}
            accessibilityRole="button"
            accessibilityLabel={t('header.aiAssistant')}
          >
            <MaterialCommunityIcons name="creation" size={20} color={themeColors.primary} />
          </TouchableOpacity>
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
            <Text style={styles.avatarText}>{(user?.fullName || 'G').charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      <View style={styles.content}>{children}</View>

      <View style={styles.bottomNav}>
        <BottomNavItem icon="home" label={t('nav.home')} active={activeTab === 'home'} onPress={() => goToTab('home', '/home')} />
        <BottomNavItem
          icon="ticket-outline"
          label={t('nav.booking')}
          active={activeTab === 'booking'}
          onPress={() => goToTab('booking', '/booking')}
        />
        <BottomNavItem
          icon="trophy-outline"
          label={t('nav.matches')}
          active={activeTab === 'matches'}
          onPress={() => goToTab('matches', '/matches')}
        />
        <BottomNavItem
          icon="calendar-outline"
          label={t('nav.schedule')}
          active={activeTab === 'schedule'}
          onPress={() => goToTab('schedule', '/schedule')}
        />
        <BottomNavItem
          icon="settings-outline"
          label={t('nav.settings')}
          active={activeTab === 'settings'}
          onPress={() => goToTab('settings', '/settings')}
        />
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
    safeArea: {
      flex: 1,
      backgroundColor: c.screenBackgroundAlt,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.chromeBorder,
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
      color: c.accentText,
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
      backgroundColor: c.glassButtonBg,
      borderWidth: 2,
      borderColor: c.glassRingBorder,
    },
    // Badge colors are a one-off matched to Figma nodes 1:802 (`817:112`/
    // `817:113`, light) and 198:2675/199:4359 (dark) — not app-wide tokens,
    // hence `badgeBg`/`badgeBorder` living in ThemeColors just for this.
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
    notificationBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: c.badgeText,
    },
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
    avatarText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.primary,
    },
    content: {
      flex: 1,
    },
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
