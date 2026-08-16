import { useRouter } from 'expo-router';
import SettingsScreen from '../src/screens/settings/SettingsScreen';

export default function SettingsRoute() {
  const router = useRouter();
  return (
    <SettingsScreen
      onBack={() => router.back()}
      onEditProfile={() => router.push('/profile/edit')}
      onSignedOut={() => router.replace('/auth/login')}
    />
  );
}
