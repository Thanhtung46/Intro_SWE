import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import RefereeRegisterScreen from '@/screens/referee/RefereeRegisterScreen';

/**
 * "/referee/register" — the 3-document verification upload, reached after
 * a PENDING referee verifies their OTP (app/auth/otp.tsx stores the token
 * spot-backend issues there and replaces to here). On success → the
 * pending / "under review" screen. Also reached from the login screen
 * (app/auth/login.tsx) when a PENDING referee who never submitted documents
 * logs back in and the backend returns nextStep: SUBMIT_VERIFICATION.
 */
export default function RefereeRegisterRoute() {
  const router = useRouter();

  return (
    <RefereeRegisterScreen
      onBack={() => {
        if (router.canGoBack()) router.back();
      }}
      onSubmitted={() => router.replace(ROUTES.REFEREE_PENDING)}
    />
  );
}
