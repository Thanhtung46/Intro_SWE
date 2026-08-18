import { Stack } from 'expo-router';
import { SessionExpiredHandler } from '@/components/SessionExpiredHandler';
import { UserProvider } from '@/context/UserContext';

export default function RootLayout() {
  return (
    <UserProvider>
      <SessionExpiredHandler />
      <Stack screenOptions={{ headerShown: false }} />
    </UserProvider>
  );
}
