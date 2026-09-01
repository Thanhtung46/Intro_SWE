import { Stack } from 'expo-router';
import { SessionExpiredHandler } from '@/components/SessionExpiredHandler';
import { ThemedStatusBar } from '@/components/ThemedStatusBar';
import { UserProvider } from '@/context/UserContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UserProvider>
          <ThemedStatusBar />
          <SessionExpiredHandler />
          <Stack screenOptions={{ headerShown: false }} />
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
