import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { comingSoon } from '@/utils/comingSoon';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  onAvatarPress: () => void;
  avatarInitial: string;
  onNotificationsPress: () => void;
  unreadCount: number;
  /** 'blurred' = Home's frosted-glass look (Figma 8:124); 'plain' (default) = Booking's flat look (Figma 79:1521). */
  variant?: 'blurred' | 'plain';
};

/** Shared top app bar — logo + AI/notification/avatar buttons — used by Home and Booking. */
export default function AppHeader({
  onAvatarPress,
  avatarInitial,
  onNotificationsPress,
  unreadCount,
  variant = 'plain',
}: Props) {
  const { t } = useLanguage();
  const content = (
    <>
      <View style={styles.headerLeft}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.logoText}>SPOT</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => comingSoon(t('header.aiAssistant'))}
          accessibilityRole="button"
          accessibilityLabel={t('header.aiAssistant')}
        >
          <MaterialCommunityIcons name="creation" size={20} color={colors.primaryDark} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onNotificationsPress}
          accessibilityRole="button"
          accessibilityLabel={t('header.notifications')}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.primaryDark} />
          {unreadCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={onAvatarPress}
          accessibilityRole="button"
          accessibilityLabel={t('header.accountMenu')}
        >
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (variant === 'blurred') {
    return (
      <BlurView intensity={30} tint="light" style={styles.header}>
        {content}
      </BlurView>
    );
  }

  return <View style={styles.header}>{content}</View>;
}

const styles = StyleSheet.create({
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
  // Colors match Figma node 1:802 (`817:112`/`817:113`) — copied verbatim
  // from AppShell.tsx's `notificationBadge`/`notificationBadgeText` so both
  // headers render the exact same badge.
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
    backgroundColor: '#D2B306',
    borderWidth: 1,
    borderColor: colors.white,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFEDE6',
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
});
