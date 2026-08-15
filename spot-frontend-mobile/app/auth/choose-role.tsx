import { useState } from 'react';
import { useRouter } from 'expo-router';

import ChooseRoleScreen from '@/screens/auth/ChooseRoleScreen';
import type { Role } from '@/types/auth';

const DESTINATION: Record<Role, string> = {
  player: '/home',
  owner: '/owner/welcome',
  referee: '/referee/register',
};

/**
 * "/auth/choose-role" — Player / Venue Owner / Referee selection.
 *
 * Player is a terminal choice (replace into the app); Owner/Referee push
 * further into their respective registration flow.
 */
export default function ChooseRoleRoute() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
  };

  const handleContinue = () => {
    if (!selectedRole) return;
    if (selectedRole === 'player') {
      router.replace('/home');
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
    />
  );
}
