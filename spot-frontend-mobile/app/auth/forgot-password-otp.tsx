import { useLocalSearchParams, useRouter } from 'expo-router';
import OtpScreen from '@/screens/auth/OtpScreen';
import { ROUTES } from '@/constants/routes';

/**
 * "/auth/forgot-password-otp" — reuses the same OtpScreen UI as Register's
 * OTP step. mode="collect": no /auth/otp/verify call here (that endpoint is
 * REGISTER-only server-side and would consume the OTP), just format-checks
 * the code and forwards it to Reset Password, which verifies + resets in
 * one call (/auth/reset-password already does this atomically).
 */
export default function ForgotPasswordOtpRoute() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';

  return (
    <OtpScreen
      email={email}
      purpose="FORGOT_PASSWORD"
      mode="collect"
      onVerified={(otp) => router.push({ pathname: ROUTES.AUTH_RESET_PASSWORD, params: { email, otp } })}
    />
  );
}
