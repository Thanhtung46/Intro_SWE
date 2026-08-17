import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { colors } from '@/constants/colors';
import { comingSoon } from '@/utils/comingSoon';
import BottomNav from '@/components/navigation/BottomNav';

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
  onBack,
  onEditProfile,
  onSignedOut,
}: {
  onBack: () => void;
  onEditProfile: () => void;
  onSignedOut: () => void;
}) {
  const { clearUser } = useUser();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);

  const handleSignOut = () => {
    clearUser();
    onSignedOut();
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="settings-back-button"
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
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
            onToggle={setPushNotifications}
          />
          <View style={styles.rowDivider} />
          <Row
            testID="settings-location-services-toggle"
            icon="location-outline"
            label="Location Services"
            toggleValue={locationServices}
            onToggle={setLocationServices}
          />
        </Card>

        <SectionLabel label="LAYOUT" />
        <Card>
          <Row
            testID="settings-language"
            icon="globe-outline"
            label="Language"
            secondaryLabel="English"
            onPress={() => comingSoon('Language')}
          />
          <View style={styles.rowDivider} />
          <Row
            testID="settings-appearance"
            icon="color-palette-outline"
            label="Appearance"
            secondaryLabel="Light"
            onPress={() => comingSoon('Appearance')}
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
      <BottomNav active="settings" />
    </SafeAreaView>
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
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    marginBottom: 12,
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
});
