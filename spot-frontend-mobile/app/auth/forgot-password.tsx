import { useRouter } from 'expo-router';
import ForgotPasswordScreen from '../../src/screens/auth/ForgotPasswordScreen';

export default function ForgotPasswordRoute() {
  const router = useRouter();
  return (
    <ForgotPasswordScreen
      onCodeSent={(email) => router.push({ pathname: '/auth/forgot-password-otp', params: { email } })}
    />
  );
}
