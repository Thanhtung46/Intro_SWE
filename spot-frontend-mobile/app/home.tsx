import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/theme/colors';

// Shared placeholder post-login destination — no per-role dashboards exist
// yet (out of SPOT-116's scope). Real per-role routing is a future ticket.
export default function HomeScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const role = typeof roleParam === 'string' && roleParam ? roleParam : 'user';

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Logged in as {role} — dashboard coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
});
