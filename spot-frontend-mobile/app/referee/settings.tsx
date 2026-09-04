import { useRouter } from 'expo-router';

import { RefereeShell } from '@/components/referee/RefereeShell';
import { ROUTES } from '@/constants/routes';
import SettingsScreen from '@/screens/settings/SettingsScreen';

/** Referee Settings — reuses the player SettingsScreen (same
 *  /users/me/preferences API) inside the referee tab shell. */
export default function RefereeSettingsRoute() {
  const router = useRouter();
  return (
    <RefereeShell activeTab="settings">
      <SettingsScreen
        onEditProfile={() => router.push(ROUTES.REFEREE_PROFILE)}
        onSignedOut={() => router.replace(ROUTES.AUTH_LOGIN)}
      />
    </RefereeShell>
  );
}
