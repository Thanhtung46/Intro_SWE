import { useRouter } from 'expo-router';
import LoginScreen from '../../src/screens/auth/LoginScreen';

export default function LoginRoute() {
  const router = useRouter();
  return <LoginScreen onLoggedIn={(role) => router.push({ pathname: '/home', params: { role } })} />;
}
