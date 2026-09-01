import { useLocalSearchParams, useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import OtpScreen from '@/screens/auth/OtpScreen';
import type { VerifyOtpResult } from '@/services/authService';
import { setRefreshToken, setToken } from '@/utils/authStorage';

export default function OtpRoute() {
  const router = useRouter();
  const { email: emailParam, role: roleParam } = useLocalSearchParams<{ email?: string; role?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';
  const role = typeof roleParam === 'string' ? roleParam : '';

  const handleVerified = async (_otp: string, result?: VerifyOtpResult) => {
    // A PENDING Owner/Referee gets a session token + nextStep here — they
    // must submit verification documents before login works.
    if (result?.nextStep === 'SUBMIT_VERIFICATION' && result.accessToken) {
      await setToken(result.accessToken);
      if (result.refreshToken) await setRefreshToken(result.refreshToken);
      router.replace(role === 'owner' ? ROUTES.OWNER_REGISTER : ROUTES.REFEREE_REGISTER);
      return;
    }
    router.push({ pathname: ROUTES.AUTH_CHOOSE_ROLE, params: { email } });
  };

  return <OtpScreen email={email} onVerified={handleVerified} />;
}
