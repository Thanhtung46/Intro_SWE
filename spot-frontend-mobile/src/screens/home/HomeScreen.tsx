import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ProfileMenu } from '../../components/ProfileMenu';
import { useUser } from '../../context/UserContext';
import { colors } from '../../theme/colors';

// Shared placeholder post-login destination — no per-role dashboards exist
// yet (out of SPOT-116's scope). Real per-role routing is a future ticket.
export default function HomeScreen({ role }: { role: string }) {
  const { user } = useUser();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Image source={require('../../../assets/Logo.png')} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity testID="avatar-button" style={styles.avatarButton} onPress={() => setMenuVisible(true)}>
          <Text style={styles.avatarButtonText}>{(user?.fullName || 'G').charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.text}>Logged in as {role} — dashboard coming soon</Text>
      </View>

      <ProfileMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  logo: {
    width: 32,
    height: 32,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
});
