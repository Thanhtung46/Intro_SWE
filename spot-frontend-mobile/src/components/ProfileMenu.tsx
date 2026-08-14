import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useUser } from '../context/UserContext';
import { colors } from '../theme/colors';

interface ProfileMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItemConfig {
  key: string;
  label: string;
  // Most items use Ionicons; set mciIcon instead for the rare item that needs
  // a glyph Ionicons' Expo SDK49 bundle doesn't have (e.g. a sparkle icon).
  icon?: keyof typeof Ionicons.glyphMap;
  mciIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  secondaryLabel?: string;
  labelColor?: string;
  iconColor?: string;
  onPress: () => void;
}

export function ProfileMenu({ visible, onClose }: ProfileMenuProps) {
  const router = useRouter();
  const { user, clearUser } = useUser();

  const showComingSoon = (feature: string) => {
    Alert.alert('Coming soon', `${feature} is not available yet.`);
  };

  const handleSignOut = () => {
    clearUser();
    onClose();
    router.replace('/auth/login');
  };

  const handleOpenProfile = () => {
    onClose();
    router.push('/profile');
  };

  const handleOpenSettings = () => {
    onClose();
    router.push('/settings');
  };

  const menuItems: MenuItemConfig[] = [
    { key: 'home', label: 'Home', icon: 'home-outline', onPress: onClose },
    {
      key: 'appearance',
      label: 'Appearance',
      icon: 'color-palette-outline',
      secondaryLabel: 'Light >',
      onPress: handleOpenSettings,
    },
    {
      key: 'language',
      label: 'Language',
      icon: 'globe-outline',
      secondaryLabel: 'English >',
      onPress: handleOpenSettings,
    },
    {
      key: 'ai-assistant',
      label: 'AI Assistant',
      mciIcon: 'creation',
      labelColor: colors.primary,
      iconColor: colors.primary,
      onPress: () => showComingSoon('AI Assistant'),
    },
  ];

  const supportItems: MenuItemConfig[] = [
    { key: 'help-center', label: 'Help Center', icon: 'help-circle-outline', onPress: () => showComingSoon('Help Center') },
    { key: 'contact-us', label: 'Contact Us', icon: 'mail-outline', onPress: () => showComingSoon('Contact Us') },
    {
      key: 'report-issue',
      label: 'Report an Issue',
      icon: 'alert-circle-outline',
      onPress: () => showComingSoon('Report an Issue'),
    },
  ];

  const renderItem = (item: MenuItemConfig) => (
    <TouchableOpacity key={item.key} testID={`profile-menu-${item.key}`} style={styles.item} onPress={item.onPress}>
      {item.mciIcon ? (
        <MaterialCommunityIcons
          name={item.mciIcon}
          size={20}
          color={item.iconColor || colors.text}
          style={styles.itemIcon}
        />
      ) : (
        <Ionicons name={item.icon!} size={20} color={item.iconColor || colors.text} style={styles.itemIcon} />
      )}
      <Text style={[styles.itemLabel, item.labelColor ? { color: item.labelColor } : null]}>{item.label}</Text>
      {item.secondaryLabel ? <Text style={styles.secondaryLabel}>{item.secondaryLabel}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card} testID="profile-menu-card">
              <TouchableOpacity testID="profile-menu-header" style={styles.header} onPress={handleOpenProfile}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(user?.fullName || 'G').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.name}>{user?.fullName || 'Guest'}</Text>
                  <Text style={styles.email}>{user?.email || ''}</Text>
                </View>
              </TouchableOpacity>

              {menuItems.map(renderItem)}

              <View style={styles.divider} />

              {supportItems.map(renderItem)}

              <TouchableOpacity testID="profile-menu-sign-out" style={styles.item} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={20} color={colors.error} style={styles.itemIcon} />
                <Text style={[styles.itemLabel, { color: colors.error, fontWeight: '600' }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  card: {
    position: 'absolute',
    top: 64,
    right: 16,
    width: 260,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  headerText: {
    flexShrink: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  email: {
    fontSize: 12,
    color: colors.subtitle,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  secondaryLabel: {
    fontSize: 12,
    color: colors.subtitle,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
});
