import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import ChooseRoleScreen from '@/screens/auth/ChooseRoleScreen';
import { selectRole } from '@/services/authService';
import type { Role } from '@/types/auth';
import { ROUTES } from '@/constants/routes';
import { setRefreshToken, setToken } from '@/utils/authStorage';

const DESTINATION: Record<Role, string> = {
  player: ROUTES.HOME,
  owner: ROUTES.OWNER_WELCOME,
  referee: ROUTES.REFEREE_REGISTER,
};

/**
 * "/auth/choose-role" — Register step 3 (spot-backend's register→otp→
 * role→login flow). Reached two ways:
 * - From app/auth/otp.tsx with an `email` param — a real, OTP-verified
 *   account exists, so Continue calls POST /auth/role for it. For a
 *   PENDING Owner/Referee the backend returns a session token +
 *   `nextStep: SUBMIT_VERIFICATION`, so we store it and go straight to the
 *   verification-document upload; a PLAYER just goes to login.
 * - From app/onboarding.tsx with no `email` — no account exists yet, so
 *   this falls back to the old placeholder navigation (DESTINATION) with
 *   no API call, same as before this fix.
 */
export default function ChooseRoleRoute() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
  };

  const handleContinue = async () => {
    if (!selectedRole || submitting) return;

    if (!email) {
      // No account exists yet (reached from app/onboarding.tsx) — old
      // placeholder navigation, no API call.
      router.push(DESTINATION[selectedRole]);
      return;
    }

    setError(null);
    setSubmitting(true);
    const result = await selectRole(email, selectedRole);
    setSubmitting(false);

    if (!result.success) {
      setError(result.message || 'Something went wrong. Please try again.');
      return;
    }

    // replace, not push: the role is now committed server-side, so coming
    // back here would only hit a 409 "role already selected".
    if (result.nextStep === 'SUBMIT_VERIFICATION' && result.accessToken) {
      await setToken(result.accessToken);
      if (result.refreshToken) await setRefreshToken(result.refreshToken);
      router.replace(
        selectedRole === 'owner' ? ROUTES.OWNER_REGISTER : ROUTES.REFEREE_REGISTER
      );
      return;
    }
    // PLAYER (ACTIVE, no token issued at this step) → log in.
    router.replace(ROUTES.AUTH_LOGIN);
  };

  return (
    <ChooseRoleScreen
      selectedRole={selectedRole}
      onSelectRole={setSelectedRole}
      onBack={handleBack}
      onContinue={handleContinue}
      submitting={submitting}
      error={error}
    />
  );
}
