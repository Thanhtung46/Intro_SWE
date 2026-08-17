import { useRouter } from 'expo-router';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import { ROUTES } from '@/constants/routes';

export default function ForgotPasswordRoute() {
  const router = useRouter();
  return (
    <ForgotPasswordScreen
      onCodeSent={(email) => router.push({ pathname: ROUTES.AUTH_RESET_PASSWORD, params: { email } })}
    />
  );
}
