import { useRouter } from 'expo-router';
import { AppShell } from '../src/components/AppShell';
import SettingsScreen from '../src/screens/settings/SettingsScreen';

export default function SettingsRoute() {
  const router = useRouter();
  return (
    <AppShell activeTab="settings">
      <SettingsScreen
        onEditProfile={() => router.push('/profile/edit')}
        onSignedOut={() => router.replace('/auth/login')}
      />
    </AppShell>
  );
}
