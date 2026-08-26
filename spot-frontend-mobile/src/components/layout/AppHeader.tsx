import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/constants/colors';
import { comingSoon } from '@/utils/comingSoon';

type Props = {
  onAvatarPress: () => void;
  avatarInitial: string;
  /** 'blurred' = Home's frosted-glass look (Figma 8:124); 'plain' (default) = Booking's flat look (Figma 79:1521). */
  variant?: 'blurred' | 'plain';
  /** Opens the AI assistant (spec 004). Falls back to the "coming soon" alert if not provided. */
  onAssistantPress?: () => void;
};

/** Shared top app bar — logo + AI/notification/avatar buttons — used by Home and Booking. */
export default function AppHeader({ onAvatarPress, avatarInitial, variant = 'plain', onAssistantPress }: Props) {
  const content = (
    <>
      <View style={styles.headerLeft}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.logoText}>SPOT</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onAssistantPress ?? (() => comingSoon('AI Assistant'))}
          accessibilityRole="button"
          accessibilityLabel="AI Assistant"
        >
          <MaterialCommunityIcons name="creation" size={20} color={colors.primaryDark} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => comingSoon('Notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={18} color={colors.primaryDark} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={onAvatarPress}
          accessibilityRole="button"
          accessibilityLabel="Account menu"
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
});
