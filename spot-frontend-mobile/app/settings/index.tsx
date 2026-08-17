import { useRouter } from 'expo-router';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import { ROUTES } from '@/constants/routes';

export default function SettingsRoute() {
  const router = useRouter();
  return (
    <SettingsScreen
      onBack={() => router.back()}
      onEditProfile={() => router.push(ROUTES.PROFILE_EDIT)}
      onSignedOut={() => router.replace(ROUTES.AUTH_LOGIN)}
    />
  );
}
