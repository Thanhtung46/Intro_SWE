import { useLocalSearchParams, useRouter } from 'expo-router';
import OtpScreen from '@/screens/auth/OtpScreen';
import { ROUTES } from '@/constants/routes';

export default function OtpRoute() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';

  return (
    <OtpScreen
      email={email}
      onVerified={() => router.push({ pathname: ROUTES.AUTH_CHOOSE_ROLE, params: { email } })}
    />
  );
}
