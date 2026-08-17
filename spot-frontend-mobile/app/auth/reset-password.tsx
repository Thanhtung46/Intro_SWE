import { useLocalSearchParams, useRouter } from 'expo-router';
import ResetPasswordScreen from '../../src/screens/auth/ResetPasswordScreen';

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
      onResetComplete={() => router.replace('/auth/login')}
    />
  );
}
