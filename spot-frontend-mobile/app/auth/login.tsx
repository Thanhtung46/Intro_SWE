import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import LoginScreen from '@/screens/auth/LoginScreen';
import { getRefereeMe } from '@/services/refereeService';

export default function LoginRoute() {
  const router = useRouter();
  return (
    <LoginScreen
      onLoggedIn={async (role, nextStep) => {
        // A PENDING referee who never finished uploading documents can log in
        // to resume onboarding (spot-backend issues a token + this nextStep).
        // Only referees reach here with it — OWNER pending stays a 403.
        if (nextStep === 'SUBMIT_VERIFICATION') {
          router.replace(ROUTES.REFEREE_REGISTER);
          return;
        }
        // A referee otherwise reaches login only after an admin approval.
        // Show the "Account Activated!" celebration
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
