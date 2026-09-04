import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import RefereeActivatedScreen from '@/screens/referee/RefereeActivatedScreen';
import { acknowledgeRefereeActivation } from '@/services/refereeService';

/** "/referee/activated" — shown once right after a referee's first
 *  successful login (LoginScreen routes here when GET /referee/me reports
 *  activationAcknowledged: false). "Go to Job Board" acks it server-side
 *  (fire-and-forget — a failed POST must not trap the user; the next login
 *  will just show this again and retry) then enters the referee tab shell. */
export default function RefereeActivatedRoute() {
  const router = useRouter();
  return (
    <RefereeActivatedScreen
      onContinue={() => {
        void acknowledgeRefereeActivation().catch(() => {});
        router.replace(ROUTES.REFEREE_BOARD);
      }}
    />
  );
}
