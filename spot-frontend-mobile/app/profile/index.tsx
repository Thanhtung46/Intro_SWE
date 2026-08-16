import { useRouter } from 'expo-router';
import ProfileScreen from '../../src/screens/profile/ProfileScreen';

export default function ProfileRoute() {
  const router = useRouter();
  return <ProfileScreen onBack={() => router.back()} onEdit={() => router.push('/profile/edit')} />;
}
