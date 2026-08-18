import { useRouter } from 'expo-router';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import { ROUTES } from '@/constants/routes';

export default function RegisterRoute() {
  const router = useRouter();
  return (
    <RegisterScreen
      onBack={() => router.back()}
      onRegistered={(email) => router.push({ pathname: ROUTES.AUTH_OTP, params: { email } })}
    />
  );
}
