import { Stack } from 'expo-router';
import { SessionExpiredHandler } from '@/components/SessionExpiredHandler';
import { UserProvider } from '@/context/UserContext';

const TAB_ROUTES = new Set(['home/index', 'booking/index', 'matches/index', 'schedule/index', 'settings/index']);

export default function RootLayout() {
  return (
    <UserProvider>
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
  );
}
