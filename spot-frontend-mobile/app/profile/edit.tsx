import { useRouter } from 'expo-router';
import EditProfileScreen from '@/screens/profile/EditProfileScreen';

export default function EditProfileRoute() {
  const router = useRouter();
  return <EditProfileScreen onBack={() => router.back()} />;
}
