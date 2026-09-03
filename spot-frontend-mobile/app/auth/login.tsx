import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import LoginScreen from '@/screens/auth/LoginScreen';
import { getRefereeMe } from '@/services/refereeService';

export default function LoginRoute() {
  const router = useRouter();
  return (
    <LoginScreen
      onLoggedIn={async (role) => {
        // A referee reaches login only after an admin approval (spot-backend
        // blocks PENDING login). Show the "Account Activated!" celebration
        // exactly once per referee — the flag lives on the server
        // (GET /referee/me → activationAcknowledged), so it stays "seen"
        // across devices. LoginScreen has already stored the token here.
        if (role === 'REFEREE') {
          const acknowledged = await getRefereeMe()
            .then((profile) => profile.activationAcknowledged)
            .catch(() => true); // network error → don't block login / don't show it wrongly
          router.replace(acknowledged ? ROUTES.REFEREE_INVITATIONS : ROUTES.REFEREE_ACTIVATED);
          return;
        }
        router.replace({ pathname: ROUTES.HOME, params: { role } });
      }}
    />
  );
}
