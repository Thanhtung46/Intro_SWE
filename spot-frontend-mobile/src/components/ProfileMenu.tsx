import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useUser } from '@/context/UserContext';
import { colors } from '@/constants/colors';
import { ROUTES } from '@/constants/routes';
import { comingSoon } from '@/utils/comingSoon';
import { clearToken } from '@/utils/authStorage';
import { Appearance, getPreferences, Language, updatePreferences } from '@/services/preferencesService';

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

/** Language/Appearance rows expand a small options list directly beneath
 * them, inside the menu card — not a navigation, not a separate modal. */
function ExpandableRow({
  testID,
  icon,
  label,
  valueLabel,
  expanded,
  onToggle,
  options,
  onSelect,
}: {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  valueLabel: string;
  expanded: boolean;
  onToggle: () => void;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
}) {
  return (
    <View>
      <TouchableOpacity testID={testID} style={styles.item} onPress={onToggle}>
        <Ionicons name={icon} size={20} color={colors.text} style={styles.itemIcon} />
        <Text style={styles.itemLabel}>{label}</Text>
        <Text style={styles.secondaryLabel}>{valueLabel}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.subtitle}
          style={styles.expandChevron}
        />
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.expandedList}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              testID={`${testID}-option-${option.value}`}
              style={styles.expandedOption}
              onPress={() => onSelect(option.value)}
            >
              <Text style={styles.expandedOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const LANGUAGE_OPTIONS: { label: string; value: Language }[] = [
  { label: 'English', value: 'en' },
  { label: 'Tiếng Việt', value: 'vi' },
];

const APPEARANCE_OPTIONS: { label: string; value: Appearance }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

export function ProfileMenu({ visible, onClose }: ProfileMenuProps) {
  const router = useRouter();
  const { user, clearUser } = useUser();

  const [language, setLanguage] = useState<Language>('en');
  const [appearance, setAppearance] = useState<Appearance>('light');
  const [expanded, setExpanded] = useState<'language' | 'appearance' | null>(null);

  useEffect(() => {
    if (!visible) {
      setExpanded(null);
      return;
    }
    getPreferences().then((result) => {
      if (result.success && result.preferences) {
        setLanguage(result.preferences.language);
        setAppearance(result.preferences.appearance);
      }
    });
  }, [visible]);

  const handleSignOut = async () => {
    await clearToken();
    clearUser();
    onClose();
    router.replace(ROUTES.AUTH_LOGIN);
  };

  const handleOpenProfile = () => {
    onClose();
    router.push(ROUTES.PROFILE);
  };

  const handleSelectLanguage = async (value: Language) => {
    const previous = language;
    setLanguage(value);
    setExpanded(null);
    const result = await updatePreferences({ language: value });
    if (!result.success) {
      setLanguage(previous);
      Alert.alert('Error', result.message || 'Something went wrong. Please try again.');
    }
  };

  const handleSelectAppearance = async (value: Appearance) => {
    const previous = appearance;
    setAppearance(value);
    setExpanded(null);
    const result = await updatePreferences({ appearance: value });
    if (!result.success) {
      setAppearance(previous);
      Alert.alert('Error', result.message || 'Something went wrong. Please try again.');
    }
  };

  const menuItems: MenuItemConfig[] = [
    { key: 'home', label: 'Home', icon: 'home-outline', onPress: onClose },
    {
      key: 'ai-assistant',
      label: 'AI Assistant',
      mciIcon: 'creation',
      labelColor: colors.primaryDark,
      iconColor: colors.primaryDark,
      onPress: () => comingSoon('AI Assistant'),
    },
  ];

  const supportItems: MenuItemConfig[] = [
    { key: 'help-center', label: 'Help Center', icon: 'help-circle-outline', onPress: () => comingSoon('Help Center') },
    { key: 'contact-us', label: 'Contact Us', icon: 'mail-outline', onPress: () => comingSoon('Contact Us') },
    {
      key: 'report-issue',
      label: 'Report an Issue',
      icon: 'alert-circle-outline',
      onPress: () => comingSoon('Report an Issue'),
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

              <ExpandableRow
                testID="profile-menu-appearance"
                icon="color-palette-outline"
                label="Appearance"
                valueLabel={`${appearance.charAt(0).toUpperCase() + appearance.slice(1)}`}
                expanded={expanded === 'appearance'}
                onToggle={() => setExpanded(expanded === 'appearance' ? null : 'appearance')}
                options={APPEARANCE_OPTIONS}
                onSelect={(value) => handleSelectAppearance(value as Appearance)}
              />
              <ExpandableRow
                testID="profile-menu-language"
                icon="globe-outline"
                label="Language"
                valueLabel={`${language === 'vi' ? 'Tiếng Việt' : 'English'}`}
                expanded={expanded === 'language'}
                onToggle={() => setExpanded(expanded === 'language' ? null : 'language')}
                options={LANGUAGE_OPTIONS}
                onSelect={(value) => handleSelectLanguage(value as Language)}
              />

              <View style={styles.divider} />

              {supportItems.map(renderItem)}

              <TouchableOpacity testID="profile-menu-sign-out" style={styles.item} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={20} color={colors.formError} style={styles.itemIcon} />
                <Text style={[styles.itemLabel, { color: colors.formError, fontWeight: '600' }]}>Sign Out</Text>
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
    color: colors.primaryDark,
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
  expandChevron: {
    marginLeft: 6,
  },
  expandedList: {
    backgroundColor: colors.screenBackground,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  expandedOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  expandedOptionText: {
    fontSize: 13,
    color: colors.text,
  },
});
