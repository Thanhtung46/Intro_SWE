import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme/colors';

// Placeholder route so Login (SPOT-116) can navigate here without crashing.
// Real Forgot Password screen is a separate ticket, out of scope for SPOT-116.
export default function ForgotPasswordScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Forgot password screen — coming soon</Text>
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
