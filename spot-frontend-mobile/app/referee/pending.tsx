import { useRouter } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import { useUser } from '@/context/UserContext';
import RefereePendingScreen from '@/screens/referee/RefereePendingScreen';
import { clearAllTokens } from '@/utils/authStorage';

/** "/referee/pending" — "Application Under Review". Referee cannot log in
 *  until an admin approves, so the only action here is Log Out. */
export default function RefereePendingRoute() {
  const router = useRouter();
  const { clearUser } = useUser();

  const handleLogout = async () => {
    await clearAllTokens();
    clearUser();
    router.replace(ROUTES.AUTH_LOGIN);
  };

  return <RefereePendingScreen onLogout={handleLogout} />;
}
