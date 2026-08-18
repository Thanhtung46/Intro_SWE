import { useRouter } from 'expo-router';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import { ROUTES } from '@/constants/routes';

export default function ProfileRoute() {
  const router = useRouter();
  return <ProfileScreen onBack={() => router.back()} onEdit={() => router.push(ROUTES.PROFILE_EDIT)} />;
}
