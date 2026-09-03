import { useLocalSearchParams, useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import OtpScreen from '@/screens/auth/OtpScreen';

export default function OtpRoute() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';

  // Backend flow: register → verify OTP → select role. OTP verify only marks
  // the email verified (no token, no role yet), so every role goes to
  // choose-role next; POST /auth/role issues the pending Owner/Referee token.
  const handleVerified = () => {
    router.replace({ pathname: ROUTES.AUTH_CHOOSE_ROLE, params: { email } });
  };

  return <OtpScreen email={email} onVerified={handleVerified} />;
}
