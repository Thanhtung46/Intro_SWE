import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import LoginScreen from '@/screens/auth/LoginScreen';
import { getRefereeActivationSeen, setRefereeActivationSeen } from '@/utils/refereeActivationStorage';

export default function LoginRoute() {
  const router = useRouter();
  return (
    <LoginScreen
      onLoggedIn={async (role) => {
        // A referee reaches login only after an admin approval (spot-backend
        // blocks PENDING login). Show the "Account Activated!" celebration the
        // FIRST time only; every login after that goes straight to the board.
        if (role === 'REFEREE') {
          if (await getRefereeActivationSeen()) {
            router.replace(ROUTES.REFEREE_INVITATIONS);
          } else {
            await setRefereeActivationSeen();
            router.replace(ROUTES.REFEREE_ACTIVATED);
          }
          return;
        }
        router.replace({ pathname: ROUTES.HOME, params: { role } });
      }}
    />
  );
}
