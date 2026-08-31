import { useRouter } from 'expo-router';
import { AppShell } from '@/components/AppShell';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import { ROUTES } from '@/constants/routes';

export default function SettingsRoute() {
  const router = useRouter();
  return (
    <AppShell activeTab="settings">
      <SettingsScreen
        onEditProfile={() => router.push(ROUTES.PROFILE)}
        onSignedOut={() => router.replace(ROUTES.AUTH_LOGIN)}
      />
    </AppShell>
  );
}
