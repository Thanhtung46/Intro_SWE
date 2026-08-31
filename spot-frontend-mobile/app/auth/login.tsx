import { useRouter } from 'expo-router';
import LoginScreen from '@/screens/auth/LoginScreen';
import { ROUTES } from '@/constants/routes';

export default function LoginRoute() {
  const router = useRouter();
  return <LoginScreen onLoggedIn={(role) => router.push({ pathname: ROUTES.HOME, params: { role } })} />;
}
