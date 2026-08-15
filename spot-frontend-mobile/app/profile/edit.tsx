import { useRouter } from 'expo-router';
import EditProfileScreen from '../../src/screens/profile/EditProfileScreen';

export default function EditProfileRoute() {
  const router = useRouter();
  return <EditProfileScreen onBack={() => router.back()} />;
}
