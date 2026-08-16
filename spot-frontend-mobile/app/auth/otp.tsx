import { useLocalSearchParams, useRouter } from 'expo-router';
import OtpScreen from '../../src/screens/auth/OtpScreen';

export default function OtpRoute() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';

  return (
    <OtpScreen
      email={email}
      onVerified={() => router.push({ pathname: '/auth/choose-role', params: { email } })}
    />
  );
}
