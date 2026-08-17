import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { colors } from '@/constants/colors';
import { comingSoon } from '@/utils/comingSoon';
import BottomNav from '@/components/navigation/BottomNav';
// Alert.alert's button-array form (React Native's only way to offer a
// multi-choice picker without a custom component) is a no-op on web —
// react-native-web ships `class Alert { static alert() {} }`, verified
// directly in node_modules. web-testing convenience only; native behavior
// (Alert.alert) is unchanged.
function notifyError(message: string) {
  if (Platform.OS === 'web') {
    window.alert(message);
    return;
  }
  Alert.alert('Error', message);
}

// Same overlay/sheet/option pattern as SelectField.tsx (used for Gender in
// Register) — a real tappable list, works identically on web and native
// (unlike Alert.alert's button array, which react-native-web doesn't
// implement at all).
function PickerModal<T extends string>({
  visible,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: { label: string; value: T }[];
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.option}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Row({
  testID,
  icon,
  label,
  onPress,
  secondaryLabel,
  toggleValue,
  onToggle,
  danger,
}: {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  secondaryLabel?: string;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
}) {
  const iconColor = danger ? colors.formError : colors.primaryDark;
  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={iconColor} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, danger ? { color: colors.formError, fontWeight: '600' } : null]}>{label}</Text>
      {toggleValue !== undefined ? (
        <Switch
          testID={testID}
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ true: colors.primaryDark, false: colors.border }}
          thumbColor={colors.white}
        />
      ) : secondaryLabel ? (
        <View style={styles.rowRight}>
          <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
        </View>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({
  onEditProfile,
  onSignedOut,
}: {
  onEditProfile: () => void;
  onSignedOut: () => void;
}) {
  const { clearUser } = useUser();

  const [language, setLanguage] = useState<Language>('en');
  const [appearance, setAppearance] = useState<Appearance>('light');
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [appearancePickerOpen, setAppearancePickerOpen] = useState(false);

  useEffect(() => {
    getPreferences().then((result) => {
      if (result.success && result.preferences) {
        setLanguage(result.preferences.language);
        setAppearance(result.preferences.appearance);
        setPushNotifications(result.preferences.pushNotificationsEnabled);
        setLocationServices(result.preferences.locationServicesEnabled);
      }
    });
  }, []);

  const showComingSoon = (feature: string) => {
    Alert.alert('Coming soon', `${feature} is not available yet.`);
  };

  const handleTogglePushNotifications = async (value: boolean) => {
    setPushNotifications(value);
    const result = await updatePreferences({ pushNotificationsEnabled: value });
    if (!result.success) {
      setPushNotifications(!value);
      notifyError(result.message || 'Something went wrong. Please try again.');
    }
  };

  const handleToggleLocationServices = async (value: boolean) => {
    setLocationServices(value);
    const result = await updatePreferences({ locationServicesEnabled: value });
    if (!result.success) {
      setLocationServices(!value);
      notifyError(result.message || 'Something went wrong. Please try again.');
    }
  };

  const handleSelectLanguage = async (value: Language) => {
    const previous = language;
    setLanguage(value);
    const result = await updatePreferences({ language: value });
    if (!result.success) {
      setLanguage(previous);
      notifyError(result.message || 'Something went wrong. Please try again.');
    }
  };

  const handleSelectAppearance = async (value: Appearance) => {
    const previous = appearance;
    setAppearance(value);
    const result = await updatePreferences({ appearance: value });
    if (!result.success) {
      setAppearance(previous);
      notifyError(result.message || 'Something went wrong. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await clearToken();
    clearUser();
    onSignedOut();
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionLabel label="ACCOUNT" />
        <Card>
          <Row
            testID="settings-personal-information"
            icon="person-outline"
            label="Personal Information"
            onPress={onEditProfile}
          />
        </Card>

        <SectionLabel label="PREFERENCE" />
        <Card>
          <Row
            testID="settings-push-notifications-toggle"
            icon="notifications-outline"
            label="Push Notifications"
            toggleValue={pushNotifications}
            onToggle={handleTogglePushNotifications}
          />
          <View style={styles.rowDivider} />
          <Row
            testID="settings-location-services-toggle"
            icon="location-outline"
            label="Location Services"
            toggleValue={locationServices}
            onToggle={handleToggleLocationServices}
          />
        </Card>

        <SectionLabel label="LAYOUT" />
        <Card>
          <Row
            testID="settings-language"
            icon="globe-outline"
            label="Language"
            secondaryLabel={language === 'vi' ? 'Tiếng Việt' : 'English'}
            onPress={() => setLanguagePickerOpen(true)}
          />
          <View style={styles.rowDivider} />
          <Row
            testID="settings-appearance"
            icon="color-palette-outline"
            label="Appearance"
            secondaryLabel={appearance.charAt(0).toUpperCase() + appearance.slice(1)}
            onPress={() => setAppearancePickerOpen(true)}
          />
        </Card>

        <SectionLabel label="OTHER" />
        <Card>
          <Row
            testID="settings-help-center"
            icon="help-circle-outline"
            label="Help Center"
            onPress={() => comingSoon('Help Center')}
          />
          <View style={styles.rowDivider} />
          <Row
            testID="settings-about-us"
            icon="information-circle-outline"
            label="About Us"
            onPress={() => comingSoon('About Us')}
          />
          <View style={styles.rowDivider} />
          <Row
            testID="settings-contact-us"
            icon="mail-outline"
            label="Contact Us"
            onPress={() => comingSoon('Contact Us')}
          />
          <View style={styles.rowDivider} />
          <Row
            testID="settings-report-issue"
            icon="alert-circle-outline"
            label="Report an Issue"
            onPress={() => comingSoon('Report an Issue')}
          />
        </Card>

        <View style={styles.signOutCard}>
          <Row testID="settings-sign-out" icon="log-out-outline" label="Sign Out" onPress={handleSignOut} danger />
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      <PickerModal
        visible={languagePickerOpen}
        options={[
          { label: 'English', value: 'en' },
          { label: 'Tiếng Việt', value: 'vi' },
        ]}
        onSelect={handleSelectLanguage}
        onClose={() => setLanguagePickerOpen(false)}
      />
      <PickerModal
        visible={appearancePickerOpen}
        options={[
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
          { label: 'System', value: 'system' },
        ]}
        onSelect={handleSelectAppearance}
        onClose={() => setAppearancePickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.formScreenBackground,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 128,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtitle,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
  },
  signOutCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryLabel: {
    fontSize: 14,
    color: colors.subtitle,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 48,
  },
  version: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: colors.placeholder,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    maxHeight: 240,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
  },
});
