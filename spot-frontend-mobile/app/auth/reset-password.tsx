import { useLocalSearchParams, useRouter } from 'expo-router';
import ResetPasswordScreen from '../../src/screens/auth/ResetPasswordScreen';

export default function ResetPasswordRoute() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';
  return (
    <ResetPasswordScreen
      email={email}
      onBack={() => router.back()}
      onResetComplete={() => router.replace('/auth/login')}
    />
  );
}
