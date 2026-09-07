import { Stack } from 'expo-router';
import { SessionExpiredHandler } from '@/components/SessionExpiredHandler';
import { ThemedStatusBar } from '@/components/ThemedStatusBar';
import { UserProvider } from '@/context/UserContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';

// The 5 bottom-nav tabs now live inside one `(tabs)` group with its own
// nested `Tabs` navigator (specs/002-tab-navigation-performance) — tab-to-
// tab switches happen entirely inside that nested navigator and never hit
// this root Stack at all anymore. `(tabs)` itself is still a single root
// Stack entry (e.g. arriving here from the login screen), so it keeps the
// no-animation treatment for that one transition.
const TAB_ROUTES = new Set(['(tabs)']);

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
