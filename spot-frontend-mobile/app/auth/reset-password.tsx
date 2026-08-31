import { useLocalSearchParams, useRouter } from 'expo-router';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';
import { ROUTES } from '@/constants/routes';

export default function ResetPasswordRoute() {
  const router = useRouter();
  const { email: emailParam, otp: otpParam } = useLocalSearchParams<{ email?: string; otp?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';
  const otp = typeof otpParam === 'string' ? otpParam : '';
  return (
    <ResetPasswordScreen
      email={email}
      otp={otp}
      onBack={() => router.back()}
      onResetComplete={() => router.replace(ROUTES.AUTH_LOGIN)}
    />
  );
}
