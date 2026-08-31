import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ChooseRoleScreen from '@/screens/auth/ChooseRoleScreen';
import { selectRole } from '@/services/authService';
import type { Role } from '@/types/auth';
import { ROUTES } from '@/constants/routes';

const DESTINATION: Record<Role, string> = {
  player: ROUTES.HOME,
  owner: ROUTES.OWNER_WELCOME,
  referee: ROUTES.REFEREE_REGISTER,
};

/**
 * "/auth/choose-role" — Player / Venue Owner / Referee selection.
 *
 * Player is a terminal choice (replace into the app); Owner/Referee push
 * further into their respective registration flow.
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

    setError(null);
    setSubmitting(true);
    const result = await selectRole(email, selectedRole);
    setSubmitting(false);

    if (!result.success) {
      setError(result.message || 'Something went wrong. Please try again.');
      return;
    }

    if (selectedRole === 'player') {
      router.replace(ROUTES.HOME);
    } else {
      router.push(DESTINATION[selectedRole]);
    }
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
