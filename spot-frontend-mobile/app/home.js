import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../src/constants/colors';

/**
 * "/home" — temporary landing placeholder for after onboarding completes.
 *
 * Not part of SPOT-33; exists only so Skip/Get started have a real
 * destination to test the onboarding flow end-to-end. Replace with the
 * actual auth/tabs entry point once those screens are built.
 */
export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Welcome to SPOT 👋</Text>
      <Text style={styles.subtext}>(placeholder — onboarding flow complete)</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
  },
  text: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.headingText,
  },
  subtext: {
    fontSize: 14,
    color: colors.bodyText,
  },
});
