import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme/colors';

// Placeholder route so Register (SPOT-110) can navigate here on success.
// Real OTP screen is SPOT-113, out of scope for this ticket.
export default function OtpScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>OTP screen — coming soon (SPOT-113)</Text>
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
