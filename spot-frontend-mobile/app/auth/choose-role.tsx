import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import ChooseRoleScreen from '@/screens/auth/ChooseRoleScreen';
import { selectRole } from '@/services/authService';
import type { Role } from '@/types/auth';

const DESTINATION: Record<Role, string> = {
  player: '/home',
  owner: '/owner/welcome',
  referee: '/referee/register',
};

/**
 * "/auth/choose-role" — Register step 2 (spot-backend's register→role→
 * otp→login flow). Reached two ways:
 * - From app/auth/register.tsx with an `email` param — a real account
 *   exists, so Continue calls POST /auth/role for it, then goes to OTP
 *   verification (required for every role, not just Owner/Referee).
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
  const [error, setError] = useState('');

  const handleBack = () => {
    if (router.canGoBack()) router.back();
  };

  const handleContinue = async () => {
    if (!selectedRole) return;

    if (!email) {
      if (selectedRole === 'player') {
        router.replace('/home');
      } else {
        router.push(DESTINATION[selectedRole]);
      }
      return;
    }

    setError('');
    setSubmitting(true);
    const result = await selectRole(email, selectedRole);
    setSubmitting(false);
    if (!result.success) {
      setError(result.message || 'Something went wrong. Please try again.');
      return;
    }
    router.push({ pathname: '/auth/otp', params: { email } });
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
