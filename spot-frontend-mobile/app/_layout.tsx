import { Stack } from 'expo-router';
import { SessionExpiredHandler } from '@/components/SessionExpiredHandler';
import { UserProvider } from '@/context/UserContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UserProvider>
          <SessionExpiredHandler />
          <Stack screenOptions={{ headerShown: false }} />
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
