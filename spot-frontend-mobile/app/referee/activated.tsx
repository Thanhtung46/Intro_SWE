import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import RefereeActivatedScreen from '@/screens/referee/RefereeActivatedScreen';

/** "/referee/activated" — shown once right after a referee's first
 *  successful login (LoginScreen routes here when role REFEREE + status
 *  ACTIVE). "Go to Job Board" → the referee tab shell. */
export default function RefereeActivatedRoute() {
  const router = useRouter();
  return <RefereeActivatedScreen onContinue={() => router.replace(ROUTES.REFEREE_BOARD)} />;
}
