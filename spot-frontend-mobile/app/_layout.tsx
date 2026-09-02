import { Stack } from 'expo-router';
import { SessionExpiredHandler } from '@/components/SessionExpiredHandler';
import { ThemedStatusBar } from '@/components/ThemedStatusBar';
import { UserProvider } from '@/context/UserContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';

const TAB_ROUTES = new Set(['home/index', 'booking/index', 'matches/index', 'schedule/index', 'settings/index']);

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UserProvider>
          <ThemedStatusBar />
          <SessionExpiredHandler />
          <Stack
            screenOptions={({ route }) => ({
              headerShown: false,
              // Tab switches must not fade/slide — that stacks two screens and looks
              // like overlapping pages. Detail screens keep the default push feel.
              animation: TAB_ROUTES.has(route.name) ? 'none' : 'slide_from_right',
            })}
          />
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
